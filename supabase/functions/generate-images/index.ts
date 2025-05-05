// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'

type GenerateRequest = {
  jobId: string;
  templateId: string;
  templateName: string;
  templateDescription?: string;
  numVariants: number;
  dataType: 'csv' | 'script' | 'natural-language';
  dataContent?: Record<string, string>[] | string;
}

interface GeneratedPrompt {
  id: string;
  prompt: string;
  dataVariables?: Record<string, string>;
}

interface GeneratedImage {
  id: string;
  promptId: string;
  imageUrl: string;
  width: number;
  height: number;
  generatedAt: string;
}

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the request body
    const { jobId, templateId, templateName, templateDescription, numVariants, dataType, dataContent } = await req.json() as GenerateRequest;
    
    if (!jobId || !templateId || !templateName || !numVariants) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect if this is actually natural language content stored as 'script' type
    const isNaturalLanguage = dataType === 'script' && 
                            typeof dataContent === 'string' && 
                            !dataContent.includes('function') && 
                            !dataContent.includes('return') &&
                            !dataContent.includes('{') &&
                            !dataContent.includes('}');

    // Update job status - Started
    await updateJobStatus(supabase, jobId, 'processing', 10, 'Starting generation process');
    
    // Step 1: Generate prompts using GPT-4o
    await updateJobStatus(supabase, jobId, 'processing', 20, 'Generating prompts with GPT-4o');
    const prompts = await generatePrompts(templateId, templateName, templateDescription, numVariants, dataType, dataContent, isNaturalLanguage);
    
    // Save prompts to database
    await supabase
      .from('carousel_prompts')
      .insert(prompts.map(prompt => ({
        id: prompt.id,
        job_id: jobId,
        prompt_text: prompt.prompt,
        data_variables: prompt.dataVariables || null,
        created_at: new Date().toISOString()
      })));
    
    // Update job with prompts data
    await updateJobStatus(
      supabase, 
      jobId, 
      'processing', 
      40, 
      'Prompts generated, starting image generation',
      undefined,
      prompts
    );
    
    // Step 2: Generate images from prompts
    await updateJobStatus(supabase, jobId, 'processing', 50, 'Generating images with GPT-image-1');
    
    const images: GeneratedImage[] = [];
    let completedImages = 0;
    
    // Generate images in batches of 5 to avoid rate limits
    const batchSize = 5;
    const promptBatches = [];
    
    for (let i = 0; i < prompts.length; i += batchSize) {
      promptBatches.push(prompts.slice(i, i + batchSize));
    }
    
    for (const [batchIndex, promptBatch] of promptBatches.entries()) {
      // Process each batch in parallel
      const batchPromises = promptBatch.map(async (prompt) => {
        try {
          const image = await generateImage(prompt);
          images.push(image);
          
          // Save image to database
          await supabase
            .from('carousel_images')
            .insert({
              id: image.id,
              job_id: jobId,
              prompt_id: prompt.id,
              image_url: image.imageUrl,
              width: image.width,
              height: image.height,
              created_at: image.generatedAt
            });
          
          completedImages++;
          const progress = Math.floor(50 + (completedImages / prompts.length) * 50);
          
          // Update job progress but keep status as processing
          await updateJobStatus(
            supabase, 
            jobId, 
            'processing', 
            progress, 
            `Generated image ${completedImages} of ${prompts.length}`,
            images.map(img => img.imageUrl)
          );
        } catch (error) {
          console.error(`Error generating image for prompt ${prompt.id}:`, error);
          // Continue with other images even if one fails
        }
      });
      
      await Promise.all(batchPromises);
      
      // Add a small delay between batches to avoid rate limits
      if (batchIndex < promptBatches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Step 3: Finalize job
    const imageUrls = images.map(img => img.imageUrl);
    await updateJobStatus(
      supabase, 
      jobId, 
      'completed', 
      100, 
      `Successfully generated ${images.length} images`,
      imageUrls,
      prompts
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${images.length} images for job ${jobId}`,
        imageUrls
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate prompts using GPT-4o
 */
async function generatePrompts(
  templateId: string,
  templateName: string,
  templateDescription: string | undefined,
  numVariants: number,
  dataType: 'csv' | 'script' | 'natural-language',
  dataContent?: Record<string, string>[] | string,
  isNaturalLanguage: boolean = false
): Promise<GeneratedPrompt[]> {
  try {
    const dataVariables = dataType === 'csv' && Array.isArray(dataContent) 
      ? dataContent 
      : undefined;
    
    // Get natural language content - either from explicit natural-language type or detected
    const naturalLanguagePrompt = (dataType === 'natural-language' || isNaturalLanguage) && typeof dataContent === 'string'
      ? dataContent
      : undefined;

    // In a production environment, you would call the OpenAI API
    // For this example, we'll simulate the response
    
    // If we have real API access, this is how we'd call it
    if (OPENAI_API_KEY) {
      // Build a system prompt for GPT-4o that explains how to create carousel image prompts
      const systemPrompt = `
        You are an expert at creating detailed image generation prompts for social media carousels.
        
        You'll be given a template name and optionally a description and data variables.
        Your task is to create unique, detailed image prompts that would work well with GPT-image-1
        for generating visually appealing carousel images.
        
        The prompts should:
        1. Be highly detailed with clear art direction
        2. Include specific style guidance (e.g., photorealistic, illustration, etc.)
        3. Describe composition, colors, mood, and lighting
        4. Include any text elements that should appear in the image
        5. Maintain brand consistency if applicable
        
        For each prompt, create something unique but related to the template theme.
      `;
      
      // Build user prompt based on template and variables
      let userPrompt = `Create ${numVariants} unique image generation prompts for a carousel template called "${templateName}"`;
      
      if (templateDescription) {
        userPrompt += ` that ${templateDescription}`;
      }
      
      if (naturalLanguagePrompt) {
        userPrompt += `\n\nUse the following description to guide the content of your prompts:\n${naturalLanguagePrompt}`;
      } else if (dataVariables && dataVariables.length > 0) {
        userPrompt += `\n\nFor each prompt, incorporate these data variables where appropriate:`;
        userPrompt += `\n${JSON.stringify(dataVariables, null, 2)}`;
        userPrompt += `\n\nMap each set of variables to a different prompt.`;
      }
      
      // Call OpenAI API for prompt generation
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${result.error?.message || 'Unknown error'}`);
      }
      
      // Parse the generated prompts from the response
      const generatedContent = result.choices[0].message.content;
      const promptTexts = extractPromptsFromText(generatedContent);
      
      // Map to the expected format
      return promptTexts.map((promptText, index) => ({
        id: `prompt-${templateId}-${index}`,
        prompt: promptText,
        dataVariables: dataVariables && index < dataVariables.length ? dataVariables[index] : undefined
      }));
    }
    
    // Fallback to mock data if no API key
    const prompts: GeneratedPrompt[] = [];
    
    // Generate mock prompts for the specified number of variants
    for (let i = 0; i < numVariants; i++) {
      // Use data variables if available, otherwise generate random prompts
      const currentVariables = dataVariables && dataVariables[i % dataVariables.length];
      
      let promptText = `Create a visually stunning carousel image for "${templateName}"`;
      
      if (templateDescription) {
        promptText += ` that ${templateDescription}`;
      }
      
      if (currentVariables) {
        // Add variables to the prompt
        Object.entries(currentVariables).forEach(([key, value]) => {
          promptText += ` with ${key}: "${value}"`;
        });
      }
      
      // Add some variation to each prompt
      const styles = [
        "in a minimalist style with clean typography and soft pastel colors",
        "with vibrant colors, bold typography, and eye-catching graphics",
        "in a professional corporate style with blue and gray color scheme",
        "with a youthful energetic feel using bright colors and playful icons",
        "with elegant typography on a gradient background with subtle patterns",
        "using a dark mode aesthetic with neon accents and modern sans-serif fonts",
        "with a vintage filter applied, sepia tones and classic serif typography",
        "in a hand-drawn illustration style with sketched elements and handwritten text"
      ];
      
      promptText += ` ${styles[i % styles.length]}.`;
      
      prompts.push({
        id: `prompt-${templateId}-${i}`,
        prompt: promptText,
        dataVariables: currentVariables
      });
    }
    
    return prompts;
  } catch (error) {
    console.error("Error generating prompts:", error);
    throw error;
  }
}

/**
 * Helper function to extract prompts from GPT-4o response text
 */
function extractPromptsFromText(text: string): string[] {
  // This is a simple implementation that assumes the model returns numbered prompts
  // A more robust implementation would handle various response formats
  const promptRegex = /\d+[\.\)]\s*(.*?)(?=\n\d+[\.\)]|$)/gs;
  const matches = [...text.matchAll(promptRegex)];
  
  if (matches.length === 0) {
    // Fallback: split by double newlines if no numbered format is detected
    return text.split(/\n\n+/).filter(Boolean);
  }
  
  return matches.map(match => match[1].trim());
}

/**
 * Generate an image using GPT-image-1
 */
async function generateImage(prompt: GeneratedPrompt): Promise<GeneratedImage> {
  try {
    // In a production environment, you would call the OpenAI API
    if (OPENAI_API_KEY) {
      // First we'll use the correct endpoint for GPT-image-1
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-image-1', // The correct GPT image generation model name
          prompt: prompt.prompt,
          n: 1,
          size: '1024x1024',
          quality: 'hd',
          response_format: 'url'
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${result.error?.message || 'Unknown error'}`);
      }
      
      // The response structure for the image API
      const generatedImage = result.data[0];
      
      return {
        id: `image-${prompt.id}`,
        promptId: prompt.id,
        imageUrl: generatedImage.url,
        width: 1024,
        height: 1024,
        generatedAt: new Date().toISOString()
      };
    }
    
    // Fallback to mock data
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // For the example, use random placeholder images
    const randomId = Math.floor(Math.random() * 1000);
    return {
      id: `image-${prompt.id}`,
      promptId: prompt.id,
      imageUrl: `https://picsum.photos/seed/${prompt.id}-${randomId}/1024/1024`,
      width: 1024,
      height: 1024,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error generating image for prompt ${prompt.id}:`, error);
    throw error;
  }
}

/**
 * Update job status in the database
 */
async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: 'queued' | 'processing' | 'completed' | 'failed',
  progress: number,
  message?: string,
  imageUrls?: string[],
  prompts?: GeneratedPrompt[]
) {
  try {
    const { error } = await supabase
      .from('jobs')
      .update({
        status,
        progress,
        message,
        image_urls: imageUrls,
        prompts: prompts ? JSON.stringify(prompts) : undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error updating job status for job ${jobId}:`, error);
    throw error;
  }
} 
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.land/manual/examples/supabase

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { corsHeaders } from '../_shared/cors.ts'
import { decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

type GenerateRequest = {
  jobId: string;
  templateId: string;
  templateName: string;
  templateDescription?: string;
  numVariants: number;
  dataType: 'csv' | 'script' | 'natural-language';
  dataContent?: Record<string, string>[] | string;
}

interface Prompt {
  id: string;
  content: string;
  dataVariables?: Record<string, string>;
}

interface GeneratedImage {
  b64_json: string | null;
  url: string | null;
  revised_prompt: string;
}

interface UploadResult {
  path: string;
}

console.log("Generate Images function booting up!");

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const STORAGE_BUCKET = 'generated-images-carousel';

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("Request received");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the request body
    const { jobId, templateId, templateName, templateDescription, numVariants, dataType, dataContent } = await req.json() as GenerateRequest;
    
    if (!jobId || !templateId || !templateName || !numVariants) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing job: ${jobId}, variants: ${numVariants}`);

    // Detect if this is actually natural language content stored as 'script' type
    const isNaturalLanguage = dataType === 'script' && 
                            typeof dataContent === 'string' && 
                            !dataContent.includes('function') && 
                            !dataContent.includes('return') &&
                            !dataContent.includes('{') &&
                            !dataContent.includes('}');

    // First, check if storage bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    
    if (!bucketExists) {
      console.log(`Creating storage bucket: ${STORAGE_BUCKET}`);
      const { error: bucketError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true, // Make images publicly accessible
        fileSizeLimit: 5 * 1024 * 1024, // Limit to 5MB max file size
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'] // Only allow image formats
      });
      
      if (bucketError) {
        console.error('Error creating storage bucket:', bucketError);
        throw new Error(`Failed to create storage bucket: ${bucketError.message}`);
      }
      
      // Update the bucket policy to ensure public access
      const { error: policyError } = await supabase.storage.from(STORAGE_BUCKET).createSignedUrl('test.txt', 10);
      if (policyError) {
        console.error('Warning: Error testing bucket policy:', policyError);
      }
      
      console.log(`Successfully created bucket: ${STORAGE_BUCKET}`);
    } else {
      console.log(`Using existing bucket: ${STORAGE_BUCKET}`);
      
      // Check bucket permissions
      try {
        const { data: policy, error: policyError } = await supabase.storage.from(STORAGE_BUCKET).getPublicUrl('test.txt');
        if (policyError) {
          console.error('Warning: Error checking bucket policy:', policyError);
        } else {
          console.log('Bucket is properly configured for public access');
        }
      } catch (e) {
        console.error('Error checking bucket policy:', e);
      }
    }

    // Update job status - Started
    await updateJobStatus(supabase, jobId, 'processing', 10, 'Starting generation process');
    
    // Step 1: Generate prompts using GPT-4o
    await updateJobStatus(supabase, jobId, 'processing', 20, 'Generating prompts with GPT-4o');
    const prompts = await generatePrompts(templateId, templateName, templateDescription, numVariants, dataType, dataContent, isNaturalLanguage);
    
    console.log(`Generated ${prompts.length} prompts`);
    
    // Save prompts to database
    await supabase
      .from('carousel_prompts')
      .insert(prompts.map(prompt => ({
        id: prompt.id,
        job_id: jobId,
        prompt_text: prompt.content,
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
    const promptBatches: Prompt[][] = [];
    
    for (let i = 0; i < prompts.length; i += batchSize) {
      promptBatches.push(prompts.slice(i, i + batchSize));
    }
    
    for (const [batchIndex, promptBatch] of promptBatches.entries()) {
      // Process each batch in parallel
      const batchPromises = promptBatch.map(async (prompt) => {
        try {
          console.log(`Processing prompt: ${prompt.id}`);
          
          // Generate the image using OpenAI
          const imageResult = await generateImageWithB64(prompt);
          
          if (!imageResult) {
            console.error(`Failed to generate image for prompt ${prompt.id}`);
            throw new Error(`Image generation failed for prompt ${prompt.id}`);
          }
          
          let imageUrl = '';
          let uploadResult: UploadResult | null = null;
          
          // Create a simpler unique filename
          const filename = `${jobId}/${prompt.id}-${Date.now()}.png`;
          
          try {
            if (imageResult.b64_json && imageResult.b64_json.length > 0) {
              console.log(`Using base64 image data for prompt ${prompt.id}`);
              
              // Create blob directly as in the example
              const imageBlob = new Blob([decode(imageResult.b64_json)], { type: 'image/png' });
              const imageSize = imageBlob.size;
              console.log(`Image blob size: ${(imageSize / (1024 * 1024)).toFixed(2)} MB`);
              
              // Upload with simpler parameters
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filename, imageBlob, {
                  contentType: 'image/png',
                  cacheControl: '3600',
                  upsert: true
                });
              
              if (uploadError) {
                console.error('Error uploading image to storage:', JSON.stringify(uploadError));
                throw uploadError;
              }
              
              console.log(`Upload successful for prompt ${prompt.id}`);
              uploadResult = { path: filename };
            } else if (imageResult.url) {
              console.log(`Fetching image from URL: ${imageResult.url}`);
              
              // Simple URL fetch
              const imageResponse = await fetch(imageResult.url);
              if (!imageResponse.ok) {
                throw new Error(`Failed to fetch image from URL`);
              }
              
              // Get as blob directly
              const imageBlob = await imageResponse.blob();
              console.log(`Image blob size: ${(imageBlob.size / (1024 * 1024)).toFixed(2)} MB`);
              
              // Upload with simpler parameters
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from(STORAGE_BUCKET)
                .upload(filename, imageBlob, {
                  contentType: 'image/png',
                  cacheControl: '3600',
                  upsert: true
                });
              
              if (uploadError) {
                console.error('Error uploading image from URL:', JSON.stringify(uploadError));
                // Use the direct URL if upload fails
                imageUrl = imageResult.url;
              } else {
                console.log(`Successfully uploaded image from URL`);
                uploadResult = { path: filename };
              }
            } else {
              throw new Error(`No image data or URL available`);
            }
            
            // Get the public URL for the uploaded image
            if (uploadResult) {
              const { data: publicUrlData } = supabase.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(uploadResult.path);
              
              if (!publicUrlData || !publicUrlData.publicUrl) {
                throw new Error('Failed to get public URL');
              }
              
              imageUrl = publicUrlData.publicUrl;
              console.log(`Using storage URL: ${imageUrl}`);
            } else if (!imageUrl) {
              throw new Error(`Failed to get image URL`);
            }
          } catch (uploadError) {
            console.error(`Error in upload process:`, uploadError);
            
            // If we have direct URL, use it as fallback
            if (imageResult.url && !imageUrl) {
              console.log(`Using direct URL as fallback: ${imageResult.url}`);
              imageUrl = imageResult.url;
            } else {
              throw uploadError;
            }
          }
          
          // Create the image object
          const image: GeneratedImage = {
            b64_json: imageResult.b64_json,
            url: imageResult.url,
            revised_prompt: imageResult.revised_prompt || prompt.content
          };
          
          images.push(image);
          
          // Save image to database
          try {
            console.log(`Saving image record to database: ${image.id}`);
            const { error: dbError } = await supabase
              .from('carousel_images')
              .insert({
                id: image.id,
                job_id: jobId,
                prompt_id: prompt.id,
                image_url: image.url,
                b64_json: image.b64_json,
                revised_prompt: image.revised_prompt,
                created_at: new Date().toISOString()
              });
              
            if (dbError) {
              console.error(`Error saving image to database: ${JSON.stringify(dbError)}`);
            } else {
              console.log(`Image saved to database successfully`);
            }
          } catch (dbError) {
            console.error(`Exception saving image to database: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
          }
          
          completedImages++;
          const progress = Math.floor(50 + (completedImages / prompts.length) * 50);
          
          // Update job progress but keep status as processing
          await updateJobStatus(
            supabase, 
            jobId, 
            'processing', 
            progress, 
            `Generated image ${completedImages} of ${prompts.length}`,
            images.map(img => img.url || ''),
            prompts
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
    const imageUrls = images.map(img => img.url || '');
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
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Generate an image using OpenAI API
 */
async function generateImageWithB64(prompt: Prompt): Promise<GeneratedImage | null> {
  try {
    // Use a simple request with just the essential parameters
    console.log(`Generating image for prompt: "${prompt.content.substring(0, 50)}..."`);
    
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt.content,
        n: 1,
        size: '1024x1024', // Standard size for better file size
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenAI API error: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const responseJson = await response.json();
    console.log(`OpenAI API response status: ${response.status}`);
    
    if (!responseJson.data || responseJson.data.length === 0) {
      console.error('No image data returned from OpenAI');
      return null;
    }

    // Extract the image data - focus on b64_json
    const imageData = responseJson.data[0];
    
    return {
      b64_json: imageData.b64_json || null,
      url: imageData.url || null,
      revised_prompt: imageData.revised_prompt || prompt.content
    };
  } catch (error) {
    console.error('Error generating image:', error);
    return null;
  }
}

/**
 * Generate prompts using GPT-4o
 */
async function generatePrompts(
  templateId: string,
  templateName: string,
  templateDescription?: string,
  numVariants: number = 1,
  dataType?: string,
  dataContent?: Record<string, string>[] | string,
  isNaturalLanguage?: boolean
): Promise<Prompt[]> {
  try {
    if (!OPENAI_API_KEY) {
      console.error('No OpenAI API key available for prompt generation');
      throw new Error('OpenAI API key is required for prompt generation');
    }
    
    console.log('Generating prompts with OpenAI API');

    let content: string;
    
    // Handle based on data type
    if (isNaturalLanguage || dataType === 'natural-language') {
      // If it's natural language, use it directly as part of the prompt
      content = `
        Create detailed prompts for ${numVariants} images using GPT-image-1 that would work well in a carousel template named "${templateName}"${templateDescription ? ' that ' + templateDescription : ''}.
        
        User's instructions:
        ${dataContent}
        
        For each image, provide a comprehensive prompt that covers:
        - Art Direction: Overall style and visual approach
        - Composition: Layout and arrangement of elements
        - Colors: Color palette and tone
        - Mood: Emotional feel of the image
        - Lighting: How the image should be lit
        - Text Elements: Any text to include in the image
        
        Format each prompt as: "**Art Direction:** [details]" etc.
        
        Return ONLY the array of ${numVariants} prompts with NO extra text or explanation.
      `;
    } else if (dataType === 'script' && typeof dataContent === 'string') {
      // If it's a script, extract variables from it if possible
      content = `
        Create detailed prompts for ${numVariants} images using GPT-image-1 that would work well in a carousel template named "${templateName}"${templateDescription ? ' that ' + templateDescription : ''}.
        
        Use this JavaScript code to understand what variables/data to include:
        \`\`\`javascript
        ${dataContent}
        \`\`\`
        
        For each image, provide a comprehensive prompt that covers:
        - Art Direction: Overall style and visual approach
        - Composition: Layout and arrangement of elements
        - Colors: Color palette and tone
        - Mood: Emotional feel of the image
        - Lighting: How the image should be lit
        - Text Elements: Any text to include in the image
        
        Format each prompt as: "**Art Direction:** [details]" etc.
        
        Return ONLY the array of ${numVariants} prompts with NO extra text or explanation.
      `;
    } else if (dataType === 'csv' && Array.isArray(dataContent)) {
      // If it's CSV data, add it to the prompt
      content = `
        Create detailed prompts for ${numVariants} images using GPT-image-1 that would work well in a carousel template named "${templateName}"${templateDescription ? ' that ' + templateDescription : ''}.
        
        Use these data variables for each prompt:
        ${JSON.stringify(dataContent)}
        
        For each image, provide a comprehensive prompt that covers:
        - Art Direction: Overall style and visual approach
        - Composition: Layout and arrangement of elements
        - Colors: Color palette and tone
        - Mood: Emotional feel of the image
        - Lighting: How the image should be lit
        - Text Elements: Any text to include in the image
        
        Format each prompt as: "**Art Direction:** [details]" etc.
        
        Return ONLY the array of ${numVariants} prompts with NO extra text or explanation.
      `;
    } else {
      // Default case
      content = `
        Create detailed prompts for ${numVariants} images using GPT-image-1 that would work well in a carousel template named "${templateName}"${templateDescription ? ' that ' + templateDescription : ''}.
        
        For each image, provide a comprehensive prompt that covers:
        - Art Direction: Overall style and visual approach
        - Composition: Layout and arrangement of elements
        - Colors: Color palette and tone
        - Mood: Emotional feel of the image
        - Lighting: How the image should be lit
        - Text Elements: Any text to include in the image
        
        Format each prompt as: "**Art Direction:** [details]" etc.
        
        Return ONLY the array of ${numVariants} prompts with NO extra text or explanation.
      `;
    }

    // Call the OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert at creating descriptive prompts for image generation. Your task is to create detailed prompts that will be used to generate images with GPT-image-1.' },
          { role: 'user', content }
        ],
        temperature: 0.7
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${result.error?.message || 'Unknown error'}`);
    }
    
    // Parse the response to extract the prompts
    const generatedText = result.choices[0].message.content;
    
    // Extract prompts - the format will depend on how GPT-4o formats its response
    // We expect each prompt to be formatted as "**Art Direction:** [details]" etc.
    // Split the text into separate prompts
    const promptMatches = generatedText.split(/\n{2,}/).filter(Boolean);
    
    if (promptMatches.length === 0) {
      throw new Error('No valid prompts were generated');
    }

    // Create the array of prompts
    return promptMatches.slice(0, numVariants).map((promptText, index) => {
      return {
        id: `prompt-${templateId}-${index}`,
        content: promptText.trim(),
        dataVariables: Array.isArray(dataContent) && index < dataContent.length ? dataContent[index] : undefined
      };
    });
  } catch (error) {
    console.error('Error generating prompts:', error);
    throw error;
  }
}

/**
 * Update job status in the database
 */
async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: 'queued' | 'processing' | 'completed' | 'failed',
  progress: number,
  message?: string,
  imageUrls?: string[],
  prompts?: Prompt[]
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
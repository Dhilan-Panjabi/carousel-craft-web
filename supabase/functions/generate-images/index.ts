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
  templateImageUrl?: string; // Reference image URL to base variations on
  numVariants: number;
  dataType?: 'csv' | 'script' | 'natural-language';
  dataContent?: Record<string, string>[] | string;
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
    const { jobId, templateId, templateName, templateDescription, templateImageUrl: providedImageUrl, numVariants, dataType, dataContent } = await req.json() as GenerateRequest;
    
    if (!jobId || !templateId || !templateName || !numVariants) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing job: ${jobId}, variants: ${numVariants}`);
    
    // After checking if the images bucket exists
    const TEMPLATES_BUCKET = 'templates';

    // First, check if storage bucket exists, if not create it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === STORAGE_BUCKET);
    const templatesBucketExists = buckets?.some(bucket => bucket.name === TEMPLATES_BUCKET);

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

    // Check if templates bucket exists
    if (!templatesBucketExists) {
      console.log(`Templates bucket not found. This could be why template images aren't accessible.`);
      console.log(`Expected templates bucket name: ${TEMPLATES_BUCKET}`);
      
      // List all buckets for troubleshooting
      console.log('Available buckets:');
      buckets?.forEach(bucket => {
        console.log(`- ${bucket.name}`);
      });
    }

    // Fetch template image from database
    let templateImageUrl = providedImageUrl;
    console.log(`Template image URL: ${templateImageUrl}`);
    
    if (!templateImageUrl) {
      console.log(`No image URL provided directly, looking up template: ${templateId}`);
      
      // First try to get the template from the templates table
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('image_url')
        .eq('id', templateId)
        .single();
      
      if (templateError) {
        console.log(`Error fetching template: ${templateError.message}`);
      } else if (templateData && templateData.image_url) {
        templateImageUrl = templateData.image_url;
        console.log(`Found template image URL in database: ${templateImageUrl}`);
      } else {
        // If not in database, try to generate URL from storage
        try {
          // Try with .png extension first
          let { data: publicUrlData } = supabase.storage
            .from(TEMPLATES_BUCKET)
            .getPublicUrl(`${templateId}.png`);
          
          // If that doesn't work, try listing files to find the correct one
          if (!publicUrlData || !publicUrlData.publicUrl) {
            console.log('PNG not found, trying to list template files to find correct extension');
            
            // List files with the template ID prefix
            const { data: fileList, error: listError } = await supabase.storage
              .from(TEMPLATES_BUCKET)
              .list('', {
                search: templateId
              });
            
            if (listError) {
              console.error('Error listing template files:', listError);
            } else if (fileList && fileList.length > 0) {
              // Find the first file that matches the template ID
              const templateFile = fileList.find(file => 
                file.name.startsWith(templateId) || file.name === templateId
              );
              
              if (templateFile) {
                console.log(`Found template file: ${templateFile.name}`);
                publicUrlData = supabase.storage
                  .from(TEMPLATES_BUCKET)
                  .getPublicUrl(templateFile.name);
              }
            } else {
              console.log(`No files found for template ID: ${templateId}`);
              
              // Try common image extensions as a fallback
              for (const ext of ['.jpg', '.jpeg', '.webp']) {
                publicUrlData = supabase.storage
                  .from(TEMPLATES_BUCKET)
                  .getPublicUrl(`${templateId}${ext}`);
                
                // Break if we found a valid URL
                if (publicUrlData && publicUrlData.publicUrl) {
                  console.log(`Found template with ${ext} extension`);
                  break;
                }
              }
            }
          }
          
          if (publicUrlData && publicUrlData.publicUrl) {
            templateImageUrl = publicUrlData.publicUrl;
            console.log(`Generated template image URL from storage: ${templateImageUrl}`);
          } else {
            console.log(`Could not find image for template ID: ${templateId}`);
          }
        } catch (storageError) {
          console.error('Error generating template URL from storage:', storageError);
        }
      }
    }
    
    if (!templateImageUrl) {
      return new Response(
        JSON.stringify({ error: 'Cannot find template image to use as reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job status - Started
    await updateJobStatus(supabase, jobId, 'processing', 10, 'Starting generation process');
    
    // Generate variations of the template image using GPT-image-1
    await updateJobStatus(supabase, jobId, 'processing', 50, 'Generating image variations with GPT-image-1');
    
    // Generate all variations at once using the 'n' parameter
    const generatedImages = await generateImageVariations(templateName, templateDescription || '', templateImageUrl, numVariants, dataType, dataContent);
    
    if (!generatedImages || generatedImages.length === 0) {
      throw new Error('Failed to generate image variations');
    }
    
    console.log(`Generated ${generatedImages.length} image variations`);
    
    // Update job status
    await updateJobStatus(
      supabase, 
      jobId, 
      'processing', 
      70, 
      'Images generated, uploading to storage'
    );
    
    // Process and upload all generated images
    const imageUrls: string[] = [];
    let completedImages = 0;
    
    // First, create prompt entries in the database to satisfy the foreign key constraint
    try {
      const promptEntries = Array.from({ length: generatedImages.length }, (_, index) => {
        const promptId = `prompt-${templateId}-${index}`;
        return {
          id: promptId,
          job_id: jobId,
          prompt_text: `Variation ${index + 1} of ${templateName}`,
          data_variables: null,
          created_at: new Date().toISOString()
        };
      });
      
      console.log(`Creating ${promptEntries.length} prompt entries in database`);
      const { error: promptError } = await supabase
        .from('carousel_prompts')
        .insert(promptEntries);
        
      if (promptError) {
        console.error(`Error creating prompt entries: ${JSON.stringify(promptError)}`);
        // Continue anyway, as we'll handle individual image inserts later
      } else {
        console.log('Prompt entries created successfully');
      }
    } catch (err) {
      console.error('Error creating prompt entries:', err);
      // Continue with processing images
    }

    for (const [index, imageResult] of generatedImages.entries()) {
      try {
        console.log(`Processing image ${index + 1} of ${generatedImages.length}`);
        
        let imageUrl = '';
        let uploadResult: UploadResult | null = null;
        
        // Create a simpler unique filename
        const filename = `${jobId}/${templateId}-${index}-${Date.now()}.png`;
        
        try {
          if (imageResult.b64_json && imageResult.b64_json.length > 0) {
            console.log(`Using base64 image data for image ${index + 1}`);
            
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
            
            console.log(`Upload successful for image ${index + 1}`);
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
        
        imageUrls.push(imageUrl);
        
        // Save image to database
        try {
          console.log(`Saving image record to database: ${index + 1}`);
          // Use the correct prompt ID format to match what we created earlier
          const promptId = `prompt-${templateId}-${index}`;
          const imageId = `image-${templateId}-${index}`;
          const { error: dbError } = await supabase
            .from('carousel_images')
            .insert({
              id: imageId,
              job_id: jobId,
              prompt_id: promptId, // Use the prompt ID that matches our entries in carousel_prompts
              image_url: imageUrl,
              width: 1024,
              height: 1536, // Update height to match the 1024x1536 dimensions
              b64_json: null, // Store null since we don't need to duplicate the data
              revised_prompt: imageResult.revised_prompt || `Variation ${index + 1} of ${templateName}`,
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
        const progress = Math.floor(70 + (completedImages / generatedImages.length) * 30);
        
        // Update job progress but keep status as processing
        await updateJobStatus(
          supabase, 
          jobId, 
          'processing', 
          progress, 
          `Processed image ${completedImages} of ${generatedImages.length}`,
          imageUrls
        );
      } catch (error) {
        console.error(`Error processing image ${index + 1}:`, error);
        // Continue with other images even if one fails
      }
    }
    
    // Finalize job
    await updateJobStatus(
      supabase, 
      jobId, 
      'completed', 
      100, 
      `Successfully generated ${imageUrls.length} images`,
      imageUrls
    );
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Generated ${imageUrls.length} images for job ${jobId}`,
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

interface OpenAIImageData {
  b64_json?: string;
  url?: string;
  revised_prompt?: string;
}

/**
 * Generate image variations using OpenAI API
 */
async function generateImageVariations(
  templateName: string,
  templateDescription: string,
  referenceImageUrl: string,
  numVariants: number,
  dataType?: string,
  dataContent?: Record<string, string>[] | string
): Promise<GeneratedImage[]> {
  try {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is required for image generation');
    }
    
    console.log(`Generating ${numVariants} image variations based on template image`);
    
    // Process data content based on type
    let additionalInstructions = '';
    
    if (dataType === 'natural-language' && typeof dataContent === 'string') {
      additionalInstructions = `
        Additional user instructions: ${dataContent}
      `;
      console.log('Using natural language instructions for prompt');
    } else if (dataType === 'script' && typeof dataContent === 'string') {
      // Check if this is actually natural language content labeled as script
      const isNaturalLanguage = !dataContent.includes('function') && 
                              !dataContent.includes('return') &&
                              !dataContent.includes('{') &&
                              !dataContent.includes('}');
      
      if (isNaturalLanguage) {
        additionalInstructions = `
          Additional user instructions: ${dataContent}
        `;
        console.log('Using script content as natural language instructions');
      } else {
        additionalInstructions = `
          Consider this logic when creating variations: ${dataContent}
        `;
        console.log('Using script content as logical guidelines');
      }
    } else if (dataType === 'csv' && Array.isArray(dataContent)) {
      // For CSV data, we'll use the first entry's values as guidance
      if (dataContent.length > 0) {
        const firstEntry = dataContent[0];
        const dataPoints = Object.entries(firstEntry)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
          
        additionalInstructions = `
          Include these data points in the image: ${dataPoints}
        `;
        console.log('Using CSV data points for prompt enhancement');
      }
    }
    
    // Create a prompt for TikTok carousel variation
    const basePrompt = `Create a variation of this image that would be perfect for a TikTok carousel post. 
                      The variation should maintain the essential style and content of the original 
                      while being visually distinct. IMPORTANT: Format as a vertical 9:16 aspect ratio image for TikTok.
                      Ensure all important content fits well in this vertical format without being cut off.
                      ${templateName ? `This is for "${templateName}".` : ''} 
                      ${templateDescription ? templateDescription : ''}
                      ${additionalInstructions}`;
    
    console.log("Downloading template image");
    
    // 1. Download the template image as an ArrayBuffer
    const imgResp = await fetch(referenceImageUrl);
    if (!imgResp.ok) {
      throw new Error(`Could not download template image: ${imgResp.status} ${imgResp.statusText}`);
    }
    const imgBuffer = await imgResp.arrayBuffer();
    console.log(`Downloaded template image: ${(imgBuffer.byteLength / 1024).toFixed(2)} KB`);
    
    // 2. Build multipart form
    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("prompt", basePrompt);
    form.append("n", String(numVariants));
    form.append("size", "1024x1536"); // Vertical portrait format (closest to 9:16 supported by the API)
    form.append(
      "image",
      new Blob([imgBuffer], { type: "image/png" }), 
      "template.png"
    );
    
    // 3. Call the edits endpoint
    console.log("Sending request to OpenAI Image Edits API");
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: form
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
      return [];
    }

    // Extract the image data
    return responseJson.data.map((imageData: OpenAIImageData) => ({
      b64_json: imageData.b64_json || null,
      url: imageData.url || null,
      revised_prompt: imageData.revised_prompt || basePrompt
    }));
  } catch (error) {
    console.error('Error generating image variations:', error);
    return [];
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
  imageUrls?: string[]
) {
  try {
    const { error } = await supabase
      .from('jobs')
      .update({
        status,
        progress,
        message,
        image_urls: imageUrls,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    if (error) throw error;
  } catch (error) {
    console.error(`Error updating job status for job ${jobId}:`, error);
    throw error;
  }
} 
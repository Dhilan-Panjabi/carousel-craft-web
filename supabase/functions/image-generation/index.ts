import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Define the API URL and key for OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

interface ImageGenerationRequest {
  prompt: string;
  n?: number;
  size?: string;
  style?: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { prompt, n = 1, size = '1024x1024', style = 'vivid' } = await req.json() as ImageGenerationRequest;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required and must be a non-empty string' }),
        { 
          status: 400, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
    // Create a Supabase client for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Enhanced marketing prompt
    const enhancedPrompt = `Create a professional, high-quality marketing image: ${prompt}`;
    
    // Call the OpenAI API to generate images
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n,
        size,
        style,
        response_format: 'url',
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    // Store the generated images in Supabase Storage
    const storedImages = [];
    
    for (const [index, image] of data.data.entries()) {
      const imageUrl = image.url;
      
      try {
        // Fetch the image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) throw new Error('Failed to fetch image from OpenAI');
        
        const imageBlob = await imageResponse.blob();
        
        // Generate a unique filename
        const timestamp = Date.now();
        const filename = `ai-generated-${timestamp}-${index}.png`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin
          .storage
          .from('ai-images')
          .upload(filename, imageBlob, {
            contentType: 'image/png',
            cacheControl: '3600',
          });
        
        if (uploadError) throw uploadError;
        
        // Get the public URL
        const { data: urlData } = supabaseAdmin
          .storage
          .from('ai-images')
          .getPublicUrl(filename);
        
        storedImages.push({
          originalUrl: imageUrl,
          storedUrl: urlData.publicUrl,
          prompt,
        });
      } catch (storageError) {
        // If storage fails, still return the original URL
        console.error('Storage error:', storageError);
        storedImages.push({
          originalUrl: imageUrl,
          storedUrl: null,
          prompt,
          error: storageError.message,
        });
      }
    }
    
    // Return the stored images or original URLs
    return new Response(
      JSON.stringify({
        images: storedImages,
        original_response: data,
      }),
      { 
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        } 
      }
    );
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during the request' }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        } 
      }
    );
  }
}); 
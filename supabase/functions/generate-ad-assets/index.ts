import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { OpenAI } from 'https://esm.sh/openai@4.28.0'

interface AdAssetRequest {
  carouselId: string
  carouselName: string
  imageUrls: string[]
  numVariations?: number
}

interface AdAsset {
  id: string
  text: string
  type: 'hook' | 'headline' | 'script'
  carouselId: string
}

interface AdAssetsResponse {
  hooks: AdAsset[]
  headlines: AdAsset[]
  scripts: AdAsset[]
}

// Message content types for OpenAI API
type MessageContent = {
  type: string
  text?: string
  image_url?: {
    url: string
  }
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
})

// Initialize Supabase client
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { carouselId, carouselName, imageUrls, numVariations = 3 } = await req.json() as AdAssetRequest

    if (!carouselId || !carouselName || !imageUrls || !imageUrls.length) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log(`Generating ad assets for carousel: ${carouselName} with ${imageUrls.length} images`)

    // Extract topic from carousel name
    const topic = getTopicFromCarouselName(carouselName)

    // Generate prompt for GPT-4o
    const systemPrompt = `You are a professional social media content creator specializing in creating engaging carousel content for platforms like TikTok and Instagram. Your task is to generate creative text content for carousel images based on the topic: "${topic}".

I'm going to show you the actual images for a carousel post, and I need you to:
1. Analyze what's in these images
2. Generate content that directly references and relates to what you can see in the images
3. Make the content cohesive across the carousel flow

For each request, generate the following types of content:
1. Attention-grabbing hooks (short, engaging opening lines that make viewers stop scrolling)
2. Strong headlines (clear, compelling titles that summarize the carousel content)
3. Full carousel scripts (complete caption text with slide-by-slide instructions using emojis and hashtags)

Ensure your content is:
- Engaging and conversational
- Optimized for social media with emojis and hashtags where appropriate
- In the voice of an authentic creator (not corporate or formal)
- Designed to maximize engagement (views, likes, shares)
- Free from excessive punctuation like "!!!" or "..."
- DIRECTLY REFERENCES what you see in the images

The response should be formatted as JSON with three arrays: hooks, headlines, and scripts, each containing ${numVariations} variations.`

    const userPrompt = `Generate ${numVariations} variations each of hooks, headlines, and scripts for a carousel about: "${topic}".
    
Include hooks that grab attention, headlines that clearly communicate value, and scripts that guide viewers through the carousel with engaging language.

The carousel contains ${imageUrls.length} images which I'm sharing with you now. Please analyze these images and create content that directly references what you see.`

    // Set up the initial message content with text
    const initialUserContent: MessageContent[] = [
      { type: 'text', text: userPrompt }
    ]
    
    // Fetch and process images for the API call
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: initialUserContent }
    ]

    // Add images to the user message content array
    for (const imageUrl of imageUrls) {
      try {
        // Add each image to the message content
        const imageContent: MessageContent = {
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        }
        initialUserContent.push(imageContent)
      } catch (error) {
        console.error(`Error processing image ${imageUrl}:`, error)
        // Continue with other images if one fails
      }
    }

    console.log(`Sending request to OpenAI with ${imageUrls.length} images`)

    // Call OpenAI API with images included
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    console.log('Received response from OpenAI')

    // Parse the response
    const responseText = completion.choices[0].message.content
    let generatedContent
    
    try {
      generatedContent = JSON.parse(responseText ?? '{}')
    } catch (e) {
      console.error('Error parsing JSON response:', e)
      generatedContent = {
        hooks: [],
        headlines: [],
        scripts: []
      }
    }

    // Format the response
    const hooks: AdAsset[] = (generatedContent.hooks || []).map((text: string, i: number) => ({
      id: `hook-${carouselId}-${i}`,
      text,
      type: 'hook',
      carouselId
    }))

    const headlines: AdAsset[] = (generatedContent.headlines || []).map((text: string, i: number) => ({
      id: `headline-${carouselId}-${i}`,
      text,
      type: 'headline',
      carouselId
    }))

    const scripts: AdAsset[] = (generatedContent.scripts || []).map((text: string, i: number) => ({
      id: `script-${carouselId}-${i}`,
      text,
      type: 'script',
      carouselId
    }))

    const response: AdAssetsResponse = {
      hooks,
      headlines,
      scripts
    }

    // Optional: Store assets in database if needed
    // await storeAdAssets(carouselId, [...hooks, ...headlines, ...scripts])

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating ad assets:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Helper function to extract meaningful topic from carousel name
function getTopicFromCarouselName(name: string): string {
  const commonWords = ['my', 'tiktok', 'carousel', 'the', 'a', 'an', 'for']
  const words = name.toLowerCase().split(/\s+/)
  const meaningfulWords = words.filter(word => !commonWords.includes(word))
  
  return meaningfulWords.length > 0 
    ? meaningfulWords.join(' ') 
    : 'products'
}

// Function to store assets in database (optional implementation)
async function storeAdAssets(carouselId: string, assets: AdAsset[]): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('carousel_ad_assets')
      .insert(
        assets.map(asset => ({
          carousel_id: carouselId,
          text: asset.text,
          type: asset.type,
          created_at: new Date().toISOString()
        }))
      )
    
    if (error) throw error
  } catch (error) {
    console.error('Error storing ad assets in database:', error)
  }
} 
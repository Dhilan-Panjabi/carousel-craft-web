import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Define the API URL and key for OpenAI
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || '';

// Message history interface
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatCompletionRequest {
  messages: Message[];
  searchQuery?: string;
}

// Basic web search function using Bing or other search API
async function searchWeb(query: string): Promise<string> {
  try {
    // For demo purposes, we'll return mock search results
    // In production, this would use a real search API like Bing, Google, or a web scraping service
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 300));
    
    return `Web search results for "${query}":
1. Top marketing strategies for social media in 2025 include video-first content, AI-powered personalization, and community-building.
2. Recent studies show that interactive ads have 3x more engagement than static ads.
3. Marketing experts recommend focusing on micro-influencers for better ROI compared to celebrity endorsements.`;
  } catch (error) {
    console.error('Web search error:', error);
    return `Web search for "${query}" failed.`;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const { messages, searchQuery } = await req.json() as ChatCompletionRequest;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { 
          status: 400, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          }
        }
      );
    }
    
    // Create a Supabase client for any database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    
    // If a search query is provided, perform a web search
    if (searchQuery) {
      try {
        // Perform web search
        const searchResults = await searchWeb(searchQuery);
        
        // Add search results as context to the system message
        const systemMessageIndex = messages.findIndex(m => m.role === 'system');
        if (systemMessageIndex >= 0) {
          messages[systemMessageIndex].content += `\n\n${searchResults}`;
        } else {
          messages.unshift({
            role: 'system',
            content: `You are a helpful marketing assistant. ${searchResults}`
          });
        }
      } catch (searchError) {
        console.error('Search error:', searchError);
        // Continue without search results if there's an error
      }
    }
    
    // Add default system message if none exists
    const messagesWithSystem = [...messages];
    if (!messagesWithSystem.some(m => m.role === 'system')) {
      messagesWithSystem.unshift({
        role: 'system',
        content: 'You are a helpful marketing assistant that specializes in creating ad creatives and marketing content. Use web search when you need up-to-date information or specific facts to answer questions accurately.'
      });
    }

    // Define available tools - the correct way to enable web browsing
    const tools = [
      {
        type: "function",
        function: {
          name: "web_browsing",
          description: "Browse the web for current information",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to look up on the web"
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    // Prepare the request to OpenAI with web search capability
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: messagesWithSystem,
        tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }
    
    const data = await response.json();
    
    // Return the response
    return new Response(
      JSON.stringify({
        message: data.choices[0].message,
        usage: data.usage,
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
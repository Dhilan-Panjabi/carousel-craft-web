import { supabase } from '../supabase/client';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatResponse {
  message: Message;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface ImageResult {
  originalUrl: string;
  storedUrl: string | null;
  prompt: string;
  error?: string;
}

/**
 * Send a message to the AI chat assistant
 * @param messages Array of message objects with role and content
 * @param searchQuery Optional search query to enhance context
 * @returns Promise with the AI response
 */
export const sendChatMessage = async (
  messages: Message[],
  searchQuery?: string
): Promise<ChatResponse> => {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('chat-completion', {
      body: { messages, searchQuery },
    });

    if (error) {
      console.error('Error calling chat-completion function:', error);
      throw new Error(error.message || 'Failed to get chat response');
    }

    return data as ChatResponse;
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    
    // For now, provide a fallback response if the API call fails
    // This helps during development or if the edge function is not yet deployed
    return {
      message: {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again later.',
      }
    };
  }
};

/**
 * Generate images based on a text prompt
 * @param prompt The description of the image to generate
 * @param count Number of images to generate (default: 1)
 * @returns Promise with the generated image URLs
 */
export const generateImages = async (
  prompt: string,
  count: number = 1
): Promise<string[]> => {
  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('image-generation', {
      body: { 
        prompt,
        n: count,
        size: '1024x1024',
        style: 'vivid'
      },
    });

    if (error) {
      console.error('Error calling image-generation function:', error);
      throw new Error(error.message || 'Failed to generate images');
    }

    // Extract the URLs from the response
    return data.images.map((img: ImageResult) => img.storedUrl || img.originalUrl);
  } catch (error) {
    console.error('Error in generateImages:', error);
    
    // Provide placeholder images during development or if the edge function fails
    return Array(count).fill(0).map((_, i) => 
      `https://placehold.co/1024x1024/blue/white?text=Image+Generation+Failed+${i+1}`
    );
  }
}; 
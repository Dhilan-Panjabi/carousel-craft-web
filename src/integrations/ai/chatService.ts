import { supabase } from '../supabase/client';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ApiResponse {
  message: {
    content: string;
    tool_calls?: {
      id: string;
      type: string;
      function: {
        name: string;
        arguments: string;
      };
    }[];
  };
  total_tokens?: number;
}

export interface Conversation {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ImageResult {
  originalUrl: string;
  storedUrl: string | null;
  prompt: string;
  error?: string;
}

/**
 * Create a new chat conversation
 * @param title The title of the conversation
 * @returns The created conversation
 */
export async function createConversation(title: string): Promise<Conversation> {
  try {
    // Check if user is authenticated
    const { data: user, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user.user) {
      console.error('Authentication error:', authError || 'No user found');
      throw new Error('Authentication required');
    }
    
    // Create conversation in database
    // Using any type to bypass TypeScript errors with Supabase schema
    const { data, error } = await (supabase
      .from('chat_conversations') as any)
      .insert([
        { 
          title,
          user_id: user.user.id
        }
      ])
      .select()
      .single();
      
    if (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
    
    if (!data) {
      throw new Error('Failed to create conversation: No data returned');
    }
    
    return data as Conversation;
  } catch (err) {
    console.error('Error in createConversation:', err);
    throw err;
  }
}

/**
 * Get a list of conversations for the current user
 * @param limit The maximum number of conversations to return
 * @returns Array of conversations ordered by most recent
 */
export async function getConversations(limit = 5): Promise<Conversation[]> {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user.user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await (supabase
    .from('chat_conversations') as any)
    .select('*')
    .eq('user_id', user.user.id)
    .order('updated_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
  
  return data as Conversation[] || [];
}

/**
 * Get messages for a specific conversation
 * @param conversationId The ID of the conversation
 * @returns Array of messages in the conversation
 */
export async function getConversationMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await (supabase
    .from('chat_messages') as any)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
  
  return data as Message[] || [];
}

/**
 * Save a message to a conversation
 * @param conversationId The ID of the conversation
 * @param message The message to save
 * @returns The saved message
 */
export async function saveMessage(conversationId: string, message: Message): Promise<void> {
  // Insert the message
  const { error: messageError } = await (supabase
    .from('chat_messages') as any)
    .insert([
      {
        conversation_id: conversationId,
        role: message.role,
        content: message.content
      }
    ]);
    
  if (messageError) {
    console.error('Error saving message:', messageError);
    throw messageError;
  }
  
  // Update the conversation's updated_at timestamp
  const { error: conversationError } = await (supabase
    .from('chat_conversations') as any)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId);
    
  if (conversationError) {
    console.error('Error updating conversation timestamp:', conversationError);
    throw conversationError;
  }
}

/**
 * Generate a title for a conversation based on the first message
 * @param firstMessage The first user message in the conversation
 * @returns A title for the conversation
 */
export function generateConversationTitle(firstMessage: string): string {
  // Create a truncated title from the first message
  const title = firstMessage.length > 30 
    ? `${firstMessage.substring(0, 30)}...` 
    : firstMessage;
    
  return title;
}

/**
 * Send a message to the AI chat assistant
 * @param messages Array of message objects with role and content
 * @returns Promise with the AI response
 */
export async function sendChatMessage(messages: Message[]): Promise<ApiResponse> {
  try {
    console.log('Sending chat message to edge function:', messages);
    
    // Use the absolute Supabase URL instead of relative path
    const supabaseUrl = "https://qthuuijgmhstzfefzzpf.supabase.co";
    const apiUrl = `${supabaseUrl}/functions/v1/chat-completion?t=${Date.now()}`;
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    console.log('API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API error response:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    return data;
  } catch (error) {
    console.error('Error calling chat API:', error);
    throw error;
  }
}

/**
 * Generate images based on a text prompt
 * @param prompt The description of the image to generate
 * @returns Promise with the generated image URLs
 */
export async function generateImages(prompt: string): Promise<string[]> {
  try {
    // Use the absolute Supabase URL instead of relative path
    const supabaseUrl = "https://qthuuijgmhstzfefzzpf.supabase.co";
    const apiUrl = `${supabaseUrl}/functions/v1/image-generation?t=${Date.now()}`;
    console.log('Image API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    console.log('Image API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image API error response:', errorText);
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Image API response data:', data);
    return data.imageUrls;
  } catch (error) {
    console.error('Error calling image generation API:', error);
    throw error;
  }
}

/**
 * Check if a conversation exists and is accessible to the current user
 * @param conversationId The ID of the conversation to check
 * @returns True if the conversation exists and is accessible to the user
 */
export async function checkConversationExists(conversationId: string): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    
    if (!user.user) {
      return false;
    }
    
    const { data, error } = await (supabase
      .from('chat_conversations') as any)
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', user.user.id)
      .single();
      
    if (error || !data) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking conversation:', error);
    return false;
  }
} 
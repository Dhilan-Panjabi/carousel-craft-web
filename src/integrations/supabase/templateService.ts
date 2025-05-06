import { v4 as uuidv4 } from 'uuid';
import supabase from "@/supabase/supabaseClient";
import type { Database } from './types';

export interface TemplateField {
  name: string;
  type: "text" | "image";
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  maxWidth?: number;
}

export interface TemplateSlide {
  id: string;
  name: string;
  fields: TemplateField[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  slides: TemplateSlide[];
  createdAt: string;
  updatedAt: string;
  // Optional YAML config serialized from slides
  yamlConfig?: string;
  // Additional images for the template
  additionalImages?: string[];
  // Whether this template is marked as a favorite
  favorite?: boolean;
}

/**
 * Converts a Template object to a format ready for database storage
 */
const templateToDbObject = async (template: Partial<Template>): Promise<Database['public']['Tables']['templates']['Insert']> => {
  console.log('Converting template to DB object:', template);
  
  // Get current user's ID
  const { data: { user } } = await supabase.auth.getUser();
  
  const dbObject = {
    name: template.name!,
    description: template.description || null,
    thumbnail_url: template.thumbnailUrl || null,
    yaml_config: template.yamlConfig || null,
    slides: template.slides ? JSON.stringify(template.slides) : null,
    additional_images: template.additionalImages ? JSON.stringify(template.additionalImages) : null,
    favorite: template.favorite || false,
    user_id: user?.id || null
  };
  
  console.log('DB object:', dbObject);
  return dbObject;
};

/**
 * Maps a database template record to the Template interface
 */
const dbObjectToTemplate = (record: Database['public']['Tables']['templates']['Row']): Template => {
  console.log('Converting DB record to template:', record);
  
  let additionalImages: string[] = [];
  try {
    if (record.additional_images) {
      additionalImages = JSON.parse(record.additional_images as string);
      if (!Array.isArray(additionalImages)) {
        console.warn('additional_images is not an array:', additionalImages);
        additionalImages = [];
      }
    }
  } catch (error) {
    console.error('Error parsing additional_images:', error);
    additionalImages = [];
  }
  
  const template = {
    id: record.id,
    name: record.name,
    description: record.description || '',
    thumbnailUrl: record.thumbnail_url || '',
    yamlConfig: record.yaml_config || undefined,
    slides: record.slides ? JSON.parse(record.slides as string) : [],
    additionalImages,
    favorite: record.favorite || false,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
  
  console.log('Converted template:', template);
  return template;
};

/**
 * Upload a template image to Supabase Storage
 */
export const uploadTemplateImage = async (file: Blob | File, fileName: string): Promise<string> => {
  try {
    console.log('Starting template image upload...');
    console.log(`File details: name=${fileName}, type=${file.type}, size=${file.size} bytes`);
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('User not authenticated');
      throw new Error('You must be logged in to upload templates');
    }
    
    // Extract the file extension
    const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
    console.log(`File extension: ${extension}`);
    
    // Validate file type
    const validImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!validImageTypes.includes(extension)) {
      console.error(`Invalid file type: ${extension}. Allowed types: ${validImageTypes.join(', ')}`);
      throw new Error(`Invalid file type: ${extension}. Please upload a valid image file.`);
    }
    
    // Generate unique file name
    const uuid = uuidv4();
    const storagePath = `${uuid}.${extension}`;
    console.log(`Generated storage path: ${storagePath}`);
    
    // Prepare file for upload
    let uploadFile: File;
    if (file instanceof File) {
      uploadFile = file;
    } else {
      // If it's a Blob, convert to File
      uploadFile = new File([file], storagePath, { 
        type: file.type || `image/${extension}` 
      });
    }
    console.log(`Prepared file for upload: type=${uploadFile.type}, size=${uploadFile.size} bytes`);
    
    // Upload to Supabase Storage
    console.log('Uploading to Supabase storage...');
    const { data, error } = await supabase
      .storage
      .from('templates')
      .upload(storagePath, uploadFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: uploadFile.type
      });
    
    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Error uploading image: ${error.message}`);
    }
    
    if (!data) {
      console.error('No data returned from Supabase storage upload');
      throw new Error('No data returned from upload');
    }
    
    console.log('Upload successful, getting public URL...');
    
    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('templates')
      .getPublicUrl(data.path);
    
    console.log(`Public URL generated: ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('Error in uploadTemplateImage:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error during template image upload');
    }
  }
};

/**
 * Saves a template to the database
 */
export const saveTemplate = async (template: Partial<Template>): Promise<Template> => {
  try {
    const dbObject = await templateToDbObject(template);
    const { data, error } = await supabase
      .from('templates')
      .insert([dbObject])
      .select()
      .single();
    
    if (error) throw error;
    
    return dbObjectToTemplate(data);
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
};

/**
 * Updates an existing template
 */
export const updateTemplate = async (id: string, template: Partial<Template>): Promise<Template> => {
  try {
    const dbObject = await templateToDbObject(template);
    const { data, error } = await supabase
      .from('templates')
      .update(dbObject)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return dbObjectToTemplate(data);
  } catch (error) {
    console.error('Error updating template:', error);
    throw error;
  }
};

/**
 * Fetches all templates from the database
 */
export const getAllTemplates = async (): Promise<Template[]> => {
  try {
    // RLS policies will automatically filter to only show templates for the current user
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data.map(dbObjectToTemplate);
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

/**
 * Fetches a template by ID
 */
export const getTemplateById = async (id: string): Promise<Template | null> => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return dbObjectToTemplate(data);
  } catch (error) {
    console.error('Error fetching template:', error);
    throw error;
  }
};

/**
 * Deletes a template by ID
 */
export const deleteTemplate = async (id: string): Promise<void> => {
  try {
    // First, get template to find thumbnail URL
    const template = await getTemplateById(id);
    
    if (template?.thumbnailUrl) {
      // Extract path from URL to delete from storage
      const url = new URL(template.thumbnailUrl);
      const pathMatch = url.pathname.match(/\/templates\/([^?]+)/);
      if (pathMatch && pathMatch[1]) {
        await supabase.storage
          .from('templates')
          .remove([pathMatch[1]]);
      }
    }
    
    // Then delete the database record
    const { error } = await supabase
      .from('templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
};

// Add toggleFavorite function to update favorite status
export const toggleFavorite = async (id: string, favorite: boolean): Promise<Template> => {
  try {
    const { data, error } = await supabase
      .from('templates')
      .update({ favorite })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return dbObjectToTemplate(data);
  } catch (error) {
    console.error('Error toggling favorite status:', error);
    throw error;
  }
}; 
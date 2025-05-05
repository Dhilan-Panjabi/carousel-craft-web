import { supabase } from '../supabase/client';

interface PromptGenerationParams {
  templateId: string;
  templateName: string;
  templateDescription?: string;
  numVariants: number;
  dataVariables?: Record<string, string>[];
}

interface GeneratedPrompt {
  id: string;
  prompt: string;
  dataVariables?: Record<string, string>;
}

/**
 * Generate image prompts for carousel variants using GPT-4o
 */
export const generateImagePrompts = async ({
  templateId,
  templateName,
  templateDescription,
  numVariants,
  dataVariables
}: PromptGenerationParams): Promise<GeneratedPrompt[]> => {
  try {
    // In production, this would call the OpenAI API via Supabase Edge Functions
    // or a secure backend endpoint to keep API keys secure
    
    // For the prototype, we'll simulate the API call with a delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate mock prompts for the specified number of variants
    const prompts: GeneratedPrompt[] = [];
    
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
        "in a minimalist style",
        "with vibrant colors",
        "in a professional corporate style",
        "with a youthful energetic feel",
        "with elegant typography",
        "using a dark mode aesthetic",
        "with a vintage filter applied",
        "in a hand-drawn illustration style"
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
};

/**
 * Generate images from prompts using GPT-4o
 */
export const generateImagesFromPrompts = async (
  prompts: GeneratedPrompt[],
  jobId: string
): Promise<string[]> => {
  try {
    // In production, this would call the OpenAI API via Supabase Edge Functions
    // For the prototype, we'll simulate the API call with a delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock image URLs
    const imageUrls = prompts.map((prompt, index) => {
      // In production, this would be the URL of the generated image
      // For now, we'll use placeholder images
      return `https://picsum.photos/seed/${jobId}-${index}/800/600`;
    });
    
    // In production, store references in the database
    // await storeGeneratedImages(jobId, imageUrls);
    
    return imageUrls;
  } catch (error) {
    console.error("Error generating images:", error);
    throw error;
  }
};

/**
 * Store references to generated images in the database
 */
export const storeGeneratedImages = async (
  jobId: string,
  imageUrls: string[]
): Promise<void> => {
  try {
    // Store image references in Supabase
    const { error } = await supabase
      .from('carousel_images')
      .insert(
        imageUrls.map((url, index) => ({
          job_id: jobId,
          image_url: url,
          position: index,
          created_at: new Date().toISOString()
        }))
      );
    
    if (error) throw error;
  } catch (error) {
    console.error("Error storing image references:", error);
    throw error;
  }
}; 
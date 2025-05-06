import { supabase } from '../supabase/client';
import { generateImagePrompts, generateImagesFromPrompts } from '../ai/aiService';
import { nanoid } from 'nanoid';
import { Json } from '../supabase/types';

export interface JobData {
  id: string;
  name: string;
  templateId: string;
  templateName: string;
  templateDescription: string;
  templateImageUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  variants: number;
  dataType: 'csv' | 'script' | 'natural-language';
  dataContent?: Record<string, unknown>[] | string;
  createdAt: string;
  updatedAt: string;
  imageUrls?: string[];
  message?: string;
  prompts?: Array<{
    id: string;
    prompt: string;
    dataVariables?: Record<string, string>;
  }>;
  userId?: string;
}

// Type for Supabase job updates
interface JobDatabaseUpdate {
  status?: string;
  progress?: number;
  message?: string | null;
  image_urls?: string[] | null;
  prompts?: Json | null;
  updated_at?: string;
}

/**
 * Create a new carousel generation job
 */
export const createJob = async (
  name: string,
  templateId: string,
  templateName: string,
  variants: number,
  dataType: 'csv' | 'script' | 'natural-language',
  dataContent: Record<string, unknown>[] | string
): Promise<string> => {
  try {
    const jobId = nanoid();
    const now = new Date().toISOString();
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('You must be logged in to create jobs');
    }
    
    // Fetch template details to get the thumbnail URL
    const { data: templateData, error: templateError } = await supabase
      .from('templates')
      .select('thumbnail_url, description')
      .eq('id', templateId)
      .single();
    
    if (templateError) {
      console.error("Error fetching template details:", templateError);
    }
    
    const templateImageUrl = templateData?.thumbnail_url || "";
    const templateDescription = templateData?.description || "";
    
    const jobData: JobData = {
      id: jobId,
      name,
      templateId,
      templateName,
      templateDescription,
      templateImageUrl,
      status: 'queued',
      progress: 0,
      variants,
      dataType,
      dataContent,
      createdAt: now,
      updatedAt: now
    };
    
    // Store job in the Supabase database
    const { error } = await supabase
      .from('jobs')
      .insert({
        id: jobId,
        name: name,
        template_id: templateId,
        template_name: templateName,
        template_description: templateDescription,
        template_image_url: templateImageUrl,
        status: 'queued',
        progress: 0,
        variants,
        data_type: dataType === 'natural-language' ? 'script' : dataType,
        data_content: dataContent as Json,
        created_at: now,
        updated_at: now,
        user_id: user.id
      });
    
    if (error) {
      console.error("Error saving job to Supabase:", error);
      throw error;
    }
    
    // Also store in localStorage for offline/faster access
    const existingJobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]');
    localStorage.setItem('carousel_jobs', JSON.stringify([...existingJobs, jobData]));
    
    // Start processing the job by calling the Edge Function
    setTimeout(() => processJob(jobId), 1000);
    
    return jobId;
  } catch (error) {
    console.error("Error creating job:", error);
    throw error;
  }
};

/**
 * Process a carousel generation job
 */
export const processJob = async (jobId: string): Promise<void> => {
  try {
    // Fetch the job data
    const { data: jobData, error } = await supabase
      .from('jobs')
      .select()
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error("Error fetching job:", error);
      throw error;
    }
    
    // Cast the job data to include the variants field
    const job = jobData as typeof jobData & { variants: number };
    
    // Call the Supabase Edge Function to generate images
    const response = await supabase.functions.invoke('generate-images', {
      body: {
        jobId: job.id,
        templateId: job.template_id,
        templateName: job.template_name,
        templateDescription: job.template_description,
        templateImageUrl: job.template_image_url,
        numVariants: job.variants || 1, // Use the variants count from the job
        dataType: job.data_type,
        dataContent: job.data_content
      }
    });
    
    if (response.error) {
      console.error("Error invoking Edge Function:", response.error);
      // Update job status to failed
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          message: `Failed to start processing: ${response.error.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);
      
      // Update local storage
      updateJobInLocalStorage(jobId, {
        status: 'failed',
        message: `Failed to start processing: ${response.error.message}`
      });
      
      dispatchJobUpdateEvent(jobId);
      return;
    }
    
    console.log("Edge Function invoked successfully, job is processing:", response.data);
    
    // Start polling for job updates
    startPollingForJobUpdates(jobId);
    
  } catch (error) {
    console.error("Error processing job:", error);
    
    // Update job status to failed
    await supabase
      .from('jobs')
      .update({
        status: 'failed',
        message: `Error: ${error instanceof Error ? error.message : String(error)}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    // Update local storage
    updateJobInLocalStorage(jobId, {
      status: 'failed',
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    });
    
    dispatchJobUpdateEvent(jobId);
  }
};

/**
 * Start polling for job updates from the database
 */
const startPollingForJobUpdates = (jobId: string): void => {
  const pollIntervalMs = 2000; // Poll every 2 seconds
  const maxPollTimeMs = 30 * 60 * 1000; // Stop polling after 30 minutes to prevent memory leaks
  const startTime = Date.now();
  
  const pollInterval = setInterval(async () => {
    try {
      // Check if we should stop polling
      if (Date.now() - startTime > maxPollTimeMs) {
        clearInterval(pollInterval);
        console.log(`Stopped polling for job ${jobId} after reaching max poll time`);
        return;
      }
      
      // Fetch the latest job data
      const { data: job, error } = await supabase
        .from('jobs')
        .select()
        .eq('id', jobId)
        .single();
      
      if (error) {
        console.error("Error fetching job updates:", error);
        return;
      }
      
      // Update local storage with latest data
      updateJobInLocalStorage(jobId, {
        status: job.status,
        progress: job.progress,
        message: job.message,
        image_urls: job.image_urls,
        prompts: job.prompts
      });
      
      // Dispatch event to notify UI of updates
      dispatchJobUpdateEvent(jobId);
      
      // If job is complete or failed, stop polling
      if (job.status === 'completed' || job.status === 'failed') {
        clearInterval(pollInterval);
        console.log(`Stopped polling for job ${jobId} as it is now ${job.status}`);
      }
    } catch (pollError) {
      console.error("Error during job update polling:", pollError);
    }
  }, pollIntervalMs);
};

/**
 * Get a job by ID
 */
export const getJob = async (jobId: string): Promise<JobData | null> => {
  try {
    // Fetch job from Supabase
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) {
      console.error("Error fetching job from Supabase:", error);
      // Fall back to localStorage if there's an error
      const jobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]');
      return jobs.find(job => job.id === jobId) || null;
    }
    
    if (!data) {
      return null;
    }
    
    // Handle data content types
    let dataContent: Record<string, unknown>[] | string = '';
    if (typeof data.data_content === 'string') {
      dataContent = data.data_content;
    } else if (Array.isArray(data.data_content)) {
      dataContent = data.data_content as Record<string, unknown>[];
    }
    
    // Convert Supabase job to JobData format
    const job: JobData = {
      id: data.id,
      name: data.name,
      templateId: data.template_id,
      templateName: data.template_name,
      templateDescription: data.template_description || '',
      templateImageUrl: data.template_image_url || '',
      status: data.status as JobData['status'],
      progress: data.progress,
      variants: 1, // Default if variants not provided
      dataType: (data.data_type || 'script') as JobData['dataType'],
      dataContent,
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      imageUrls: data.image_urls || [],
      message: data.message || undefined,
      prompts: data.prompts as JobData['prompts'] || undefined,
      userId: data.user_id || undefined
    };
    
    return job;
  } catch (error) {
    console.error("Error getting job:", error);
    // Fall back to localStorage if there's an error
    const jobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]');
    return jobs.find(job => job.id === jobId) || null;
  }
};

/**
 * Get all jobs
 */
export const getAllJobs = async (): Promise<JobData[]> => {
  try {
    // Fetch jobs from Supabase - RLS will automatically filter to the current user's jobs
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching jobs from Supabase:", error);
      // Fall back to localStorage if there's an error
      return JSON.parse(localStorage.getItem('carousel_jobs') || '[]');
    }
    
    // Convert Supabase jobs to JobData format
    const jobs: JobData[] = data.map(job => {
      // Handle data content types
      let dataContent: Record<string, unknown>[] | string = '';
      if (typeof job.data_content === 'string') {
        dataContent = job.data_content;
      } else if (Array.isArray(job.data_content)) {
        dataContent = job.data_content as Record<string, unknown>[];
      }
      
      return {
        id: job.id,
        name: job.name,
        templateId: job.template_id,
        templateName: job.template_name,
        templateDescription: job.template_description || '',
        templateImageUrl: job.template_image_url || '',
        status: job.status as JobData['status'],
        progress: job.progress,
        variants: 1, // Default if variants not provided
        dataType: (job.data_type || 'script') as JobData['dataType'],
        dataContent,
        createdAt: job.created_at || new Date().toISOString(),
        updatedAt: job.updated_at || new Date().toISOString(),
        imageUrls: job.image_urls || [],
        message: job.message || undefined,
        prompts: job.prompts as JobData['prompts'] || undefined,
        userId: job.user_id || undefined
      };
    });
    
    // Update localStorage with the latest jobs
    localStorage.setItem('carousel_jobs', JSON.stringify(jobs));
    
    return jobs;
  } catch (error) {
    console.error("Error getting all jobs:", error);
    // Fall back to localStorage if there's an error
    return JSON.parse(localStorage.getItem('carousel_jobs') || '[]');
  }
};

/**
 * Get jobs by template ID
 */
export const getJobsByTemplateId = async (templateId: string): Promise<JobData[]> => {
  try {
    // Fetch jobs from Supabase filtered by template ID - RLS will also filter by user_id
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching jobs by template ID from Supabase:", error);
      // Fall back to localStorage if there's an error
      const allJobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]') as JobData[];
      return allJobs.filter(job => job.templateId === templateId);
    }
    
    // Convert Supabase jobs to JobData format
    const jobs: JobData[] = data.map(job => {
      // Handle data content types
      let dataContent: Record<string, unknown>[] | string = '';
      if (typeof job.data_content === 'string') {
        dataContent = job.data_content;
      } else if (Array.isArray(job.data_content)) {
        dataContent = job.data_content as Record<string, unknown>[];
      }
      
      return {
        id: job.id,
        name: job.name,
        templateId: job.template_id,
        templateName: job.template_name,
        templateDescription: job.template_description || '',
        templateImageUrl: job.template_image_url || '',
        status: job.status as JobData['status'],
        progress: job.progress,
        variants: 1, // Default if variants not provided
        dataType: (job.data_type || 'script') as JobData['dataType'],
        dataContent,
        createdAt: job.created_at || new Date().toISOString(),
        updatedAt: job.updated_at || new Date().toISOString(),
        imageUrls: job.image_urls || [],
        message: job.message || undefined,
        prompts: job.prompts as JobData['prompts'] || undefined,
        userId: job.user_id || undefined
      };
    });
    
    return jobs;
  } catch (error) {
    console.error("Error getting jobs by template ID:", error);
    // Fall back to localStorage if there's an error
    const allJobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]') as JobData[];
    return allJobs.filter(job => job.templateId === templateId);
  }
};

/**
 * Delete a job by ID
 */
export const deleteJob = async (jobId: string): Promise<boolean> => {
  try {
    // Remove from Supabase database
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', jobId);
    
    if (error) {
      console.error("Error deleting job from Supabase:", error);
      throw error;
    }
    
    // Also remove from localStorage
    const existingJobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]');
    const updatedJobs = existingJobs.filter((job: JobData) => job.id !== jobId);
    localStorage.setItem('carousel_jobs', JSON.stringify(updatedJobs));
    
    // Dispatch update event
    dispatchJobUpdateEvent(jobId);
    
    return true;
  } catch (error) {
    console.error("Error deleting job:", error);
    return false;
  }
};

/**
 * Update job status
 */
export const updateJobStatus = (
  jobId: string, 
  status: JobData['status'], 
  progress: number,
  message?: string,
  imageUrls?: string[],
  prompts?: Array<{
    id: string;
    prompt: string;
    dataVariables?: Record<string, string>;
  }>
): void => {
  try {
    const jobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]');
    const updatedJobs = jobs.map(job => {
      if (job.id === jobId) {
        // Fix for existing null image URLs in jobs
        const currentImageUrls = job.imageUrls || [];
        const newImageUrls = imageUrls || currentImageUrls;
        
        // For testing - if no image URLs are available and job is completed,
        // generate some placeholder URLs
        const finalImageUrls = newImageUrls.length === 0 && status === 'completed' ? 
          Array(6).fill(0).map((_, i) => 
            `https://picsum.photos/seed/${jobId}-${i}/800/600`) : 
          newImageUrls;
          
        return {
          ...job,
          status,
          progress,
          message,
          imageUrls: finalImageUrls.length > 0 ? finalImageUrls : undefined,
          prompts,
          updatedAt: new Date().toISOString()
        };
      }
      return job;
    });
    
    localStorage.setItem('carousel_jobs', JSON.stringify(updatedJobs));
    
    // Dispatch an event to notify listeners of the job update
    window.dispatchEvent(new CustomEvent('job-updated', { detail: { jobId, status, progress } }));
  } catch (error) {
    console.error("Error updating job status:", error);
  }
};

/**
 * Update a job in localStorage
 */
const updateJobInLocalStorage = (jobId: string, updates: Partial<JobData> | { 
  status?: string;
  progress?: number;
  message?: string | null;
  image_urls?: string[] | null;
  prompts?: Json | null;
}) => {
  const jobs = JSON.parse(localStorage.getItem('carousel_jobs') || '[]') as JobData[];
  const updatedJobs = jobs.map((job: JobData) => {
    if (job.id === jobId) {
      // Convert database field names to JobData field names
      const jobUpdates: Partial<JobData> = {};
      
      if ('status' in updates) {
        jobUpdates.status = updates.status as JobData['status'];
      }
      
      if ('progress' in updates) {
        jobUpdates.progress = updates.progress ?? 0;
      }
      
      if ('message' in updates) {
        jobUpdates.message = updates.message ?? undefined;
      }
      
      // Handle image URLs properly
      let imageUrls: string[] | undefined = undefined;
      
      if ('imageUrls' in updates) {
        imageUrls = updates.imageUrls ?? undefined;
      } else if ('image_urls' in updates) {
        imageUrls = updates.image_urls ?? undefined;
      }
      
      // Current image URLs from job
      const currentImageUrls = job.imageUrls || [];
      
      // New image URLs from updates or current ones
      const newImageUrls = imageUrls || currentImageUrls;
      
      // For testing - if no image URLs but job is completed, create placeholders
      const status = jobUpdates.status || job.status;
      const finalImageUrls = newImageUrls.length === 0 && status === 'completed' ? 
        Array(6).fill(0).map((_, i) => 
          `https://picsum.photos/seed/${jobId}-${i}/800/600`) : 
        newImageUrls;
      
      jobUpdates.imageUrls = finalImageUrls.length > 0 ? finalImageUrls : undefined;
      
      if ('prompts' in updates) {
        // Handle prompts JSON parsing if needed
        if (updates.prompts && typeof updates.prompts === 'string') {
          try {
            jobUpdates.prompts = JSON.parse(updates.prompts);
          } catch (e) {
            console.error('Error parsing prompts JSON:', e);
          }
        } else if (updates.prompts) {
          jobUpdates.prompts = updates.prompts as unknown as Array<{
            id: string;
            prompt: string;
            dataVariables?: Record<string, string>;
          }>;
        } else {
          jobUpdates.prompts = undefined;
        }
      }
      
      return { ...job, ...jobUpdates };
    }
    return job;
  });
  
  localStorage.setItem('carousel_jobs', JSON.stringify(updatedJobs));
};

/**
 * Dispatch a job update event
 */
const dispatchJobUpdateEvent = (jobId: string) => {
  window.dispatchEvent(new CustomEvent('job-updated', { 
    detail: { jobId } 
  }));
}; 
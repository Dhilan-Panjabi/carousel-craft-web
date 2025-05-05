import { useState, useEffect } from 'react';
import { JobData, getJob } from '@/integrations/jobs/jobService';

interface UseJobUpdatesProps {
  jobId?: string;
}

interface UseJobUpdatesReturn {
  job: JobData | null;
  isLoading: boolean;
}

/**
 * Hook to subscribe to job updates for a specific job or all jobs
 */
export function useJobUpdates({ jobId }: UseJobUpdatesProps = {}): UseJobUpdatesReturn {
  const [job, setJob] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!jobId);
  
  useEffect(() => {
    if (jobId) {
      // Initial load
      const loadJob = async () => {
        setIsLoading(true);
        try {
          const jobData = await getJob(jobId);
          setJob(jobData);
        } catch (error) {
          console.error("Error loading job:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadJob();
      
      // Listen for updates
      const handleJobUpdate = (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.jobId === jobId) {
          loadJob();
        }
      };
      
      window.addEventListener('job-updated', handleJobUpdate);
      
      return () => {
        window.removeEventListener('job-updated', handleJobUpdate);
      };
    }
  }, [jobId]);
  
  return { job, isLoading };
} 
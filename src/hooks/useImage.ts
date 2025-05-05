import { useState, useEffect } from 'react';

// Global cache for failed image URLs to prevent repeated attempts across components
const failedImageCache = new Set<string>();

// Global cache for successfully loaded images
const loadedImageCache = new Map<string, string>();

interface UseImageResult {
  isLoading: boolean;
  isError: boolean;
  url: string | null;
  retry: () => void;
}

/**
 * Custom hook to handle image loading with caching of successes and failures
 */
export function useImage(imageUrl: string | null | undefined): UseImageResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const loadImage = async () => {
      // Handle null or undefined URL
      if (!imageUrl) {
        if (isMounted) {
          setIsLoading(false);
          setIsError(true);
        }
        return;
      }
      
      // Check if this URL is known to fail
      if (failedImageCache.has(imageUrl)) {
        if (isMounted) {
          setIsLoading(false);
          setIsError(true);
          setUrl(null);
        }
        return;
      }
      
      // Check if we already have this image cached
      if (loadedImageCache.has(imageUrl)) {
        if (isMounted) {
          setIsLoading(false);
          setIsError(false);
          setUrl(loadedImageCache.get(imageUrl) || null);
        }
        return;
      }
      
      // Otherwise, load the image
      setIsLoading(true);
      setIsError(false);
      
      const img = new Image();
      
      img.onload = () => {
        if (isMounted) {
          setIsLoading(false);
          setIsError(false);
          setUrl(imageUrl);
          loadedImageCache.set(imageUrl, imageUrl);
        }
      };
      
      img.onerror = () => {
        if (isMounted) {
          console.error(`Failed to load image: ${imageUrl}`);
          setIsLoading(false);
          setIsError(true);
          setUrl(null);
          failedImageCache.add(imageUrl);
        }
      };
      
      img.src = imageUrl;
    };
    
    loadImage();
    
    return () => {
      isMounted = false;
    };
  }, [imageUrl]);
  
  // Function to retry loading a failed image
  const retry = () => {
    if (!imageUrl) return;
    
    // Remove from failed cache and try again
    failedImageCache.delete(imageUrl);
    setIsLoading(true);
    setIsError(false);
    
    const img = new Image();
    img.onload = () => {
      setIsLoading(false);
      setIsError(false);
      setUrl(imageUrl);
      loadedImageCache.set(imageUrl, imageUrl);
    };
    
    img.onerror = () => {
      console.error(`Retry failed for image: ${imageUrl}`);
      setIsLoading(false);
      setIsError(true);
      setUrl(null);
      failedImageCache.add(imageUrl);
    };
    
    img.src = imageUrl;
  };
  
  return { isLoading, isError, url, retry };
}

/**
 * Helper function to preload an array of images
 */
export function preloadImages(urls: string[]): void {
  urls.forEach(url => {
    // Skip already failed or loaded images
    if (failedImageCache.has(url) || loadedImageCache.has(url)) {
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      loadedImageCache.set(url, url);
    };
    img.onerror = () => {
      failedImageCache.add(url);
    };
    img.src = url;
  });
} 
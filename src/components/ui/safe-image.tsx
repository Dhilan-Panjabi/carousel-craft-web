import React from 'react';
import { useImage, preloadImages } from '@/hooks/useImage';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafeImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
  showPlaceholder?: boolean;
  onImageClick?: (url: string) => void;
}

export function SafeImage({
  src,
  alt,
  className,
  fallback,
  showPlaceholder = true,
  onImageClick,
  ...props
}: SafeImageProps) {
  const { isLoading, isError, url, retry } = useImage(src);

  // Custom fallback content if image fails to load
  const defaultFallback = (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-center p-4">
        <AlertCircle className="h-6 w-6 mx-auto mb-2 text-muted-foreground opacity-60" />
        <p className="text-sm text-muted-foreground">Image not available</p>
        {src && (
          <button 
            className="px-2 py-1 mt-2 text-xs bg-muted hover:bg-muted/90 rounded"
            onClick={() => retry()}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
  
  if (isLoading) {
    return (
      <div className={cn('animate-pulse bg-muted', className)} {...props} />
    );
  }
  
  if (isError || !url) {
    if (!showPlaceholder) return null;
    
    return (
      <div 
        className={cn('bg-muted', className)} 
        {...props}
      >
        {fallback || defaultFallback}
      </div>
    );
  }
  
  return (
    <img 
      src={url} 
      alt={alt || 'Image'} 
      className={className} 
      onClick={() => onImageClick && url && onImageClick(url)}
      {...props} 
    />
  );
}

// Simple preloader component that can be used anywhere in the app
export function ImagePreloader({ urls }: { urls: string[] }) {
  React.useEffect(() => {
    if (urls && urls.length > 0) {
      preloadImages(urls);
    }
  }, [urls]);
  
  return null; // This component doesn't render anything
} 
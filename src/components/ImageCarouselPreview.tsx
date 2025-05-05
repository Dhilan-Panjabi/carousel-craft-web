import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

export interface CarouselImage {
  id: string;
  url: string;
  jobName: string;
}

interface ImageCarouselPreviewProps {
  images: CarouselImage[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoveImage: (imageId: string) => void;
}

export function ImageCarouselPreview({
  images,
  open,
  onOpenChange,
  onRemoveImage,
}: ImageCarouselPreviewProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleCarouselChange = (api: CarouselApi) => {
    if (api) {
      setActiveIndex(api.selectedScrollSnap());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl">
        <DialogHeader>
          <DialogTitle>TikTok Carousel Preview</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {images.length > 0 ? (
            <div className="tiktok-carousel">
              <div className="tiktok-carousel-frame">
                <Carousel 
                  className="tiktok-carousel-content" 
                  setApi={(api) => {
                    api?.on("select", () => handleCarouselChange(api));
                  }}
                >
                  <CarouselContent>
                    {images.map((image, index) => (
                      <CarouselItem key={image.id}>
                        <div className="relative h-full">
                          <img
                            src={image.url}
                            alt={`Image from ${image.jobName}`}
                            className="w-full h-full object-contain bg-black"
                          />
                          <button 
                            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveImage(image.id);
                            }}
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="tiktok-carousel-controls">
                    {images.map((_, index) => (
                      <div 
                        key={index}
                        className={`tiktok-carousel-dot ${index === activeIndex ? 'active' : ''}`}
                      />
                    ))}
                  </div>
                  <CarouselPrevious className="left-2 bg-black/50 hover:bg-black/70 border-none text-white" />
                  <CarouselNext className="right-2 bg-black/50 hover:bg-black/70 border-none text-white" />
                </Carousel>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">No images selected for the carousel</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
          <p className="text-sm text-muted-foreground">
            {images.length} image{images.length !== 1 ? 's' : ''} in carousel
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 
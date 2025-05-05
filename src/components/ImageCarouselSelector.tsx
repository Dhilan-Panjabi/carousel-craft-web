import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Plus, Images } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CarouselImage } from "./ImageCarouselPreview";

interface LibraryImage {
  id: string;
  url: string;
  jobId: string;
  jobName: string;
  template: string;
  templateId?: string;
  createdAt: string;
  promptId?: string;
  prompt?: string;
}

interface ImagesByJob {
  job: {
    id: string;
    name: string;
    template: string;
  };
  images: LibraryImage[];
}

interface ImageCarouselSelectorProps {
  imagesByJob: Record<string, ImagesByJob>;
  onPreviewCarousel: (images: CarouselImage[]) => void;
}

export function ImageCarouselSelector({
  imagesByJob,
  onPreviewCarousel,
}: ImageCarouselSelectorProps) {
  const [selectedImages, setSelectedImages] = useState<CarouselImage[]>([]);
  
  const handleImageSelect = (image: LibraryImage) => {
    const carouselImage: CarouselImage = {
      id: image.id,
      url: image.url,
      jobName: image.jobName,
    };
    
    // Check if the image is already selected
    const isSelected = selectedImages.some((img) => img.id === image.id);
    
    if (isSelected) {
      // Remove the image if already selected
      setSelectedImages(selectedImages.filter((img) => img.id !== image.id));
    } else {
      // Add the image if not selected
      setSelectedImages([...selectedImages, carouselImage]);
    }
  };
  
  const handlePreviewClick = () => {
    onPreviewCarousel(selectedImages);
  };
  
  const isImageSelected = (imageId: string) => {
    return selectedImages.some((img) => img.id === imageId);
  };
  
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Images className="h-5 w-5" />
          <h2 className="text-lg font-medium">Carousel Image Selection</h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {selectedImages.length} image{selectedImages.length !== 1 ? "s" : ""} selected
          </Badge>
          <Button
            onClick={handlePreviewClick}
            disabled={selectedImages.length === 0}
            size="sm"
          >
            Preview Carousel
          </Button>
        </div>
      </div>
      
      <ScrollArea className="h-[300px] rounded-md border p-4">
        <div className="space-y-6">
          {Object.values(imagesByJob).map(({ job, images }) => (
            <div key={job.id} className="space-y-2">
              <h3 className="text-sm font-medium">{job.name}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                {images.map((image) => (
                  <div 
                    key={image.id} 
                    className={`relative aspect-square rounded-md overflow-hidden border cursor-pointer ${
                      isImageSelected(image.id) ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => handleImageSelect(image)}
                  >
                    <img 
                      src={image.url}
                      alt={`Image from ${image.jobName}`}
                      className="w-full h-full object-cover"
                    />
                    {isImageSelected(image.id) && (
                      <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                    {!isImageSelected(image.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 
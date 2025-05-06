import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash, Download, Share2, Sparkles } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import driveService, { CarouselImageExport, AdAssetExport } from "@/integrations/google/driveService";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AdAssetsEditor } from "./AdAssetsEditor";
import { generateAdAssets, AdAsset } from "@/integrations/ai/adAssetsService";

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
  const [carouselName, setCarouselName] = useState("My TikTok Carousel");
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAssets, setIsExportingAssets] = useState(false);
  const [showAdAssets, setShowAdAssets] = useState(false);
  const [isGeneratingAssets, setIsGeneratingAssets] = useState(false);
  const [adAssets, setAdAssets] = useState<{
    hooks: AdAsset[];
    headlines: AdAsset[];
    scripts: AdAsset[];
  }>({
    hooks: [],
    headlines: [],
    scripts: []
  });
  const [selectedAssetsForExport, setSelectedAssetsForExport] = useState<AdAssetExport[]>([]);

  const handleCarouselChange = (api: CarouselApi) => {
    if (api) {
      setActiveIndex(api.selectedScrollSnap());
    }
  };

  const handleExportToDrive = async () => {
    if (!images.length) {
      toast.error("No images to export");
      return;
    }

    try {
      setIsExporting(true);

      // First check if authenticated
      if (!driveService.isAuthenticated()) {
        // Save the current state in localStorage before redirecting
        localStorage.setItem('carousel_pending_export', JSON.stringify({
          images,
          name: carouselName
        }));
        
        // Initiate OAuth flow
        toast.info("Please authenticate with Google Drive", {
          description: "Make sure your Google OAuth credentials include this site's URL as an authorized redirect URI"
        });
        driveService.initiateOAuth();
        return;
      }

      // Prepare images for export
      const exportImages: CarouselImageExport[] = images.map((img, index) => ({
        url: img.url,
        name: img.jobName || `carousel_image_${index}`,
        index
      }));

      // Export to Drive
      await driveService.exportCarouselToDrive(carouselName, exportImages);
      
      toast.success("Carousel exported to Google Drive");
    } catch (error) {
      console.error("Error exporting to Drive:", error);
      toast.error("Failed to export carousel", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportComplete = async (selectedAssets: AdAssetExport[]) => {
    if (!images.length) {
      toast.error("No images to export");
      return;
    }

    try {
      setIsExporting(true);
      setIsExportingAssets(true);

      // First check if authenticated
      if (!driveService.isAuthenticated()) {
        // Save the current state in localStorage before redirecting
        localStorage.setItem('carousel_pending_export', JSON.stringify({
          images,
          name: carouselName,
          assets: selectedAssets
        }));
        
        // Initiate OAuth flow
        toast.info("Please authenticate with Google Drive", {
          description: "Make sure your Google OAuth credentials include this site's URL as an authorized redirect URI"
        });
        driveService.initiateOAuth();
        return;
      }

      // Prepare images for export
      const exportImages: CarouselImageExport[] = images.map((img, index) => ({
        url: img.url,
        name: img.jobName || `carousel_image_${index}`,
        index
      }));

      // Export complete carousel (images and assets) to Drive
      await driveService.exportCompleteCarouselToDrive(carouselName, exportImages, selectedAssets);
      
      toast.success("Complete carousel exported to Google Drive");
    } catch (error) {
      console.error("Error exporting to Drive:", error);
      toast.error("Failed to export carousel", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsExporting(false);
      setIsExportingAssets(false);
    }
  };

  const handleExportAdAssets = async (selectedAssets: AdAssetExport[]) => {
    try {
      setIsExportingAssets(true);
      setSelectedAssetsForExport(selectedAssets);

      // First check if authenticated
      if (!driveService.isAuthenticated()) {
        // Save the current state in localStorage before redirecting
        localStorage.setItem('carousel_ad_assets_pending_export', JSON.stringify({
          assets: selectedAssets,
          name: carouselName
        }));
        
        // Initiate OAuth flow
        toast.info("Please authenticate with Google Drive", {
          description: "Make sure your Google OAuth credentials include this site's URL as an authorized redirect URI"
        });
        driveService.initiateOAuth();
        return;
      }

      // Export ad assets to Drive
      await driveService.exportAdAssetsToDrive(carouselName, selectedAssets);
      
      toast.success("Ad assets exported to Google Drive");
    } catch (error) {
      console.error("Error exporting ad assets to Drive:", error);
      toast.error("Failed to export ad assets", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsExportingAssets(false);
    }
  };

  const handleGenerateAdAssets = async () => {
    if (!images.length) {
      toast.error("No images to generate assets for");
      return;
    }

    try {
      setIsGeneratingAssets(true);
      setShowAdAssets(true);
      
      // Generate a unique ID for this carousel
      const carouselId = `carousel-${Date.now()}`;
      
      // Extract image URLs for the ad asset generation
      const imageUrls = images.map(img => img.url);
      
      // Call the ad assets generation service
      const generatedAssets = await generateAdAssets({
        carouselId,
        carouselName,
        imageUrls,
        numVariations: 3 // Generate 3 variations of each asset type
      });
      
      setAdAssets(generatedAssets);
      setSelectedAssetsForExport([]);
      
    } catch (error) {
      console.error("Error generating ad assets:", error);
      toast.error("Failed to generate ad assets", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsGeneratingAssets(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-4xl max-h-[90vh] overflow-y-auto">
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

        {images.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carousel-name">Carousel Name</Label>
              <Input 
                id="carousel-name" 
                value={carouselName} 
                onChange={(e) => setCarouselName(e.target.value)} 
                placeholder="Enter a name for your carousel" 
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                className="flex-1"
                onClick={handleExportToDrive}
                disabled={isExporting || !images.length}
              >
                <Share2 className="h-4 w-4 mr-2" />
                {isExporting && !isExportingAssets ? "Exporting images..." : "Export Images to Drive"}
              </Button>
              
              <Button 
                className="flex-1"
                variant="secondary"
                onClick={handleGenerateAdAssets}
                disabled={isGeneratingAssets || !images.length}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isGeneratingAssets ? "Generating..." : "Generate Ad Assets"}
              </Button>
              
              {showAdAssets && adAssets.hooks.length > 0 && (
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => handleExportComplete(selectedAssetsForExport)}
                  disabled={isExporting || isExportingAssets || !images.length || selectedAssetsForExport.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting && isExportingAssets ? "Exporting..." : `Export All (${selectedAssetsForExport.filter(a => a.selected).length})`}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {showAdAssets && images.length > 0 && (
          <>
            <Separator className="my-6" />
            
            <AdAssetsEditor 
              hooks={adAssets.hooks}
              headlines={adAssets.headlines}
              scripts={adAssets.scripts}
              isLoading={isGeneratingAssets}
              onRegenerateClick={handleGenerateAdAssets}
              onExportSelected={handleExportAdAssets}
            />
          </>
        )}

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
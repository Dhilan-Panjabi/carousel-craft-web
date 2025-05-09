import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SafeImage, ImagePreloader } from "@/components/ui/safe-image";
import { 
  ArrowLeft, 
  Download, 
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Image as ImageIcon,
  DownloadCloud,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Images,
  X,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useJobUpdates } from "@/hooks/useJobUpdates";
import { downloadZip } from "@/lib/downloadZip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { deleteJob } from "@/integrations/jobs/jobService";

export default function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [isDownloading, setIsDownloading] = useState(false);
  const [openPromptsSection, setOpenPromptsSection] = useState(false);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { job, isLoading } = useJobUpdates({ jobId });
  
  // Preload images when they're available
  useEffect(() => {
    if (job?.imageUrls && job.imageUrls.length > 0) {
      // Add the preloader component
      console.log(`Preloading ${job.imageUrls.length} images`);
    }
  }, [job?.imageUrls]);
  
  if (isLoading || !job) {
    return (
      <div className="container py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/jobs')} className="mr-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
        
        <div className="space-y-6">
          <Skeleton className="h-12 w-2/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Skeleton className="aspect-square" />
            <Skeleton className="aspect-square" />
            <Skeleton className="aspect-square" />
          </div>
        </div>
      </div>
    );
  }

  const handleImagePreview = (url: string) => {
    setSelectedImageUrl(url);
    setIsImagePreviewOpen(true);
  };
  
  const handleDownload = async () => {
    if (!job || !job.imageUrls || job.imageUrls.length === 0) return;
    
    setIsDownloading(true);
    toast({
      title: "Download started",
      description: "Your carousel is being prepared for download",
    });
    
    try {
      // In production, this would generate a zip of all the images
      // For the prototype, we'll simulate this
      await new Promise(resolve => setTimeout(resolve, 1500));
      await downloadZip('', `${job.name.toLowerCase().replace(/\s+/g, '-')}.zip`);
      
      toast({
        title: "Download complete",
        description: "Your carousel has been downloaded",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download failed",
        description: "There was a problem downloading your carousel",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };
  
  const getStatusIcon = (status: typeof job.status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "processing":
        return <Play className="h-4 w-4 text-blue-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "queued":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };
  
  const getStatusColor = (status: typeof job.status) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "processing": return "bg-blue-500";
      case "failed": return "bg-red-500";
      case "queued": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  // Get the matching image for a prompt if available
  const getImageForPrompt = (promptId: string): string | undefined => {
    if (!job.imageUrls) return undefined;
    
    // In a real app, we would have a more robust way to match images to prompts
    // For the prototype, we'll assume the order matches
    const promptIndex = job.prompts?.findIndex(p => p.id === promptId) || -1;
    const imageUrl = promptIndex >= 0 && promptIndex < job.imageUrls.length 
      ? job.imageUrls[promptIndex] 
      : undefined;
    
    // Don't return URLs that have already failed
    return imageUrl && !failedImageUrls.has(imageUrl) ? imageUrl : undefined;
  };

  // Handler for image load errors
  const handleImageError = (url: string, element: HTMLImageElement) => {
    // Only log once and add to failed URLs set
    if (!failedImageUrls.has(url)) {
      console.error(`Failed to load image from URL: ${url}`);
      setFailedImageUrls(prev => new Set(prev).add(url));
    }
    
    // Hide the image
    element.classList.add("hidden");
    
    // Add an error placeholder if it doesn't exist already
    if (!element.nextElementSibling || !element.nextElementSibling.classList.contains("image-error-placeholder")) {
      const parent = element.parentElement;
      if (parent) {
        parent.classList.add("flex", "items-center", "justify-center");
        
        const errorDiv = document.createElement("div");
        errorDiv.className = "text-center p-4 image-error-placeholder";
        errorDiv.innerHTML = `
          <div class="mx-auto mb-2 text-muted-foreground">Image failed to load</div>
          <div class="flex justify-center mt-2">
            <div class="px-2 py-1 text-xs bg-muted text-muted-foreground rounded cursor-pointer hover:bg-muted/90">View URL</div>
          </div>
        `;
        
        // View URL div click handler
        const viewUrlDiv = errorDiv.querySelector("div.flex div");
        if (viewUrlDiv) {
          viewUrlDiv.addEventListener("click", () => {
            window.open(url, '_blank');
          });
        }
        
        parent.appendChild(errorDiv);
      }
    }
  };

  const handleSingleImageDownload = (url: string, index: number) => {
    // Create a temporary link to download the image
    const link = document.createElement('a');
    link.href = url;
    link.download = `image-${job.id}-${index}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!job) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteJob(job.id);
      if (success) {
        toast({
          title: "Job deleted",
          description: `${job.name} has been deleted successfully.`,
        });
        navigate('/jobs'); // Navigate back to jobs list
      } else {
        toast({
          title: "Delete failed",
          description: "There was a problem deleting the job.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Delete failed",
        description: "There was a problem deleting the job.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate("/jobs")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Jobs
        </Button>
        
        <div className="flex space-x-2">
          {job?.status === "completed" && job?.imageUrls && job?.imageUrls.length > 0 && (
            <Button 
              onClick={handleDownload}
              disabled={isDownloading}
              size="sm"
            >
              {isDownloading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <DownloadCloud className="h-4 w-4 mr-2" />
                  Download All Images
                </>
              )}
            </Button>
          )}
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleDeleteClick}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Job
          </Button>
        </div>
      </div>
      
      <h1 className="text-3xl font-bold mb-2">{job.name}</h1>
      <div className="flex items-center mb-6">
        <Badge 
          variant="outline" 
          className="flex items-center gap-1 mr-3"
        >
          {getStatusIcon(job.status)}
          <span className="capitalize">{job.status}</span>
        </Badge>
        <span className="text-sm text-muted-foreground">
          Created {new Date(job.createdAt).toLocaleString()}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-4">Job Details</h2>
            <dl className="grid grid-cols-2 gap-2">
              <dt className="text-sm font-medium text-muted-foreground">Template:</dt>
              <dd>{job.templateName}</dd>
              
              <dt className="text-sm font-medium text-muted-foreground">Variants:</dt>
              <dd>{job.variants}</dd>
              
              <dt className="text-sm font-medium text-muted-foreground">Data Type:</dt>
              <dd className="capitalize">{job.dataType}</dd>
              
              <dt className="text-sm font-medium text-muted-foreground">Progress:</dt>
              <dd>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={job.progress} 
                    className={`h-2 w-24 ${job.progress > 0 ? getStatusColor(job.status) : ''}`}
                  />
                  <span>{job.progress}%</span>
                </div>
              </dd>
            </dl>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-medium mb-4">Generation Status</h2>
            {job.status === "processing" && (
              <div className="flex items-center justify-center h-20 border rounded-md bg-muted/50">
                <div className="flex flex-col items-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm">Processing your carousel...</p>
                  <p className="text-xs text-muted-foreground">{job.message || ""}</p>
                </div>
              </div>
            )}
            
            {job.status === "queued" && (
              <div className="flex items-center justify-center h-20 border rounded-md bg-muted/50">
                <div className="flex flex-col items-center">
                  <Clock className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="text-sm">Waiting in queue...</p>
                </div>
              </div>
            )}
            
            {job.status === "failed" && (
              <div className="flex items-center justify-center h-20 border rounded-md bg-red-50">
                <div className="flex flex-col items-center">
                  <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                  <p className="text-sm">Generation failed</p>
                  <p className="text-xs text-red-500">{job.message || "Unknown error"}</p>
                </div>
              </div>
            )}
            
            {job.status === "completed" && (
              <div className="flex items-center justify-center h-20 border rounded-md bg-green-50">
                <div className="flex flex-col items-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm">Generated {job.imageUrls?.length || 0} images</p>
                  <p className="text-xs text-muted-foreground">Completed {new Date(job.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Process Steps Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-medium mb-4">Generation Process</h2>
        <div className="space-y-4">
          {/* Step 1: Prompt Generation */}
          <div className="relative pl-8 pb-8 border-l border-muted">
            <div className="absolute left-0 top-0 -translate-x-1/2 rounded-full bg-primary p-1">
              <div className="h-4 w-4 rounded-full bg-primary" />
            </div>
            <div className="font-medium mb-1">Step 1: Prompt Generation</div>
            <p className="text-sm text-muted-foreground mb-2">
              GPT-4o generates detailed prompts for each image variant
            </p>
            
            {job.prompts && job.prompts.length > 0 && (
              <Collapsible
                open={openPromptsSection}
                onOpenChange={setOpenPromptsSection}
                className="border rounded-md"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex w-full justify-between p-4">
                    <div className="flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
                      <span>{job.prompts.length} Generated Prompts</span>
                    </div>
                    {openPromptsSection ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {job.prompts.map((prompt, index) => (
                      <div 
                        key={prompt.id}
                        className={`p-3 text-sm border rounded-md cursor-pointer transition-colors ${
                          selectedPromptIndex === index 
                            ? 'bg-primary/10 border-primary/50' 
                            : 'hover:bg-muted'
                        }`}
                        onClick={() => setSelectedPromptIndex(index === selectedPromptIndex ? null : index)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">Prompt {index + 1}</span>
                          {getImageForPrompt(prompt.id) && (
                            <Badge variant="outline" className="text-xs">
                              Has Image
                            </Badge>
                          )}
                        </div>
                        <p className="line-clamp-2">
                          {typeof prompt.prompt === 'string' 
                            ? prompt.prompt 
                            : "No prompt content available"}
                        </p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
          
          {/* Step 2: Image Generation */}
          <div className="relative pl-8 pb-8 border-l border-muted">
            <div className={`absolute left-0 top-0 -translate-x-1/2 rounded-full p-1 ${
              job.progress >= 50 ? 'bg-primary' : 'bg-muted'
            }`}>
              <div className={`h-4 w-4 rounded-full ${
                job.progress >= 50 ? 'bg-primary' : 'bg-muted'
              }`} />
            </div>
            <div className="font-medium mb-1">Step 2: Image Generation</div>
            <p className="text-sm text-muted-foreground mb-2">
              GPT-image-1 creates images based on the generated prompts
            </p>
            
            {job.status === 'processing' && job.progress >= 50 && (
              <div className="border rounded-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Generating images...</span>
                  <span className="text-xs text-muted-foreground">
                    {job.imageUrls?.length || 0} of {job.variants} complete
                  </span>
                </div>
                <Progress 
                  value={job.progress > 50 ? (job.progress - 50) * 2 : 0} 
                  className="h-2"
                />
              </div>
            )}
          </div>
          
          {/* Step 3: Completion */}
          <div className="relative pl-8">
            <div className={`absolute left-0 top-0 -translate-x-1/2 rounded-full p-1 ${
              job.status === 'completed' ? 'bg-primary' : 'bg-muted'
            }`}>
              <div className={`h-4 w-4 rounded-full ${
                job.status === 'completed' ? 'bg-primary' : 'bg-muted'
              }`} />
            </div>
            <div className="font-medium mb-1">Step 3: Finalization</div>
            <p className="text-sm text-muted-foreground">
              Images are stored and made available for download
            </p>
          </div>
        </div>
      </div>
      
      {/* Selected Prompt Detail */}
      {selectedPromptIndex !== null && job.prompts && job.prompts[selectedPromptIndex] && (
        <div className="mb-8">
          <h2 className="text-xl font-medium mb-4">Prompt Detail</h2>
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Prompt {selectedPromptIndex + 1}</h3>
                  <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                    {typeof job.prompts[selectedPromptIndex].prompt === 'string'
                      ? job.prompts[selectedPromptIndex].prompt
                      : "No prompt content available"}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">Generated Image</h3>
                  <div className="aspect-square bg-muted rounded-md overflow-hidden">
                    {getImageForPrompt(job.prompts[selectedPromptIndex].id) ? (
                      <img 
                        src={getImageForPrompt(job.prompts[selectedPromptIndex].id)} 
                        alt={`Generated from prompt ${selectedPromptIndex + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => {
                          const imageUrl = getImageForPrompt(job.prompts[selectedPromptIndex].id);
                          if (imageUrl) handleImagePreview(imageUrl);
                        }}
                        onError={(e) => {
                          const url = getImageForPrompt(job.prompts[selectedPromptIndex].id);
                          if (url) handleImageError(url, e.currentTarget);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No image available</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Generated Images Gallery */}
      {job.imageUrls && job.imageUrls.length > 0 && (
        <div>
          {/* Add preloader for all images */}
          <ImagePreloader urls={job.imageUrls} />
          
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">Generated Images</h2>
            <Button variant="outline" onClick={() => navigate('/library')}>
              <Images className="mr-2 h-4 w-4" />
              View in Library
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {job.imageUrls.map((url, index) => (
              <div key={index} className="group relative aspect-square border rounded-md overflow-hidden bg-muted">
                <SafeImage 
                  src={url}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-full object-cover cursor-pointer"
                  onImageClick={(url) => handleImagePreview(url)}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-white/20 backdrop-blur-sm"
                      title="View Image"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleImagePreview(url);
                      }}
                    >
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-white/20 backdrop-blur-sm"
                      title="Download Image"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSingleImageDownload(url, index);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {(!job.imageUrls || job.imageUrls.length === 0) && job.status !== 'processing' && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No images yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Images will appear here once the job is completed
          </p>
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={isImagePreviewOpen} onOpenChange={setIsImagePreviewOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <DialogClose className="absolute right-2 top-2 z-10">
              <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/40 backdrop-blur-sm">
                <X className="h-4 w-4 text-white" />
              </Button>
            </DialogClose>
            <div className="max-h-[80vh] flex items-center justify-center p-1 bg-black">
              <SafeImage 
                src={selectedImageUrl}
                alt="Preview"
                className="max-w-full max-h-[80vh] object-contain"
                fallback={
                  <div className="flex items-center justify-center p-12 text-white">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Image could not be loaded</p>
                      {selectedImageUrl && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-4"
                          onClick={() => window.open(selectedImageUrl, '_blank')}
                        >
                          Open URL in new tab
                        </Button>
                      )}
                    </div>
                  </div>
                }
              />
            </div>
            <div className="p-4 bg-background flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => setIsImagePreviewOpen(false)}
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  if (selectedImageUrl) {
                    const index = job.imageUrls?.indexOf(selectedImageUrl) ?? 0;
                    handleSingleImageDownload(selectedImageUrl, index);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{job?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 
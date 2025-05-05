import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Search, Filter, Image, Clock, X } from "lucide-react";
import { getAllJobs, JobData } from "@/integrations/jobs/jobService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { useNavigate, useLocation } from "react-router-dom";

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

export default function LibraryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [imageFilter, setImageFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState<LibraryImage | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(true);
  const [images, setImages] = useState<LibraryImage[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  
  useEffect(() => {
    // Parse query parameters
    const params = new URLSearchParams(location.search);
    const templateIdParam = params.get('templateId');
    setTemplateId(templateIdParam);
    
    // Load all jobs and extract images
    loadImages(templateIdParam);
    
    // Listen for job updates
    window.addEventListener('job-updated', handleJobUpdate);
    
    return () => {
      window.removeEventListener('job-updated', handleJobUpdate);
    };
  }, [location.search]);
  
  const handleJobUpdate = () => {
    loadImages(templateId);
  };
  
  const loadImages = (filterTemplateId: string | null = null) => {
    const jobs = getAllJobs();
    
    // Filter jobs by template ID if specified
    const filteredJobs = filterTemplateId 
      ? jobs.filter(job => job.templateId === filterTemplateId) 
      : jobs;
    
    const extractedImages: LibraryImage[] = [];
    
    filteredJobs.forEach(job => {
      // Skip jobs that aren't completed if filter is on
      if (showOnlyCompleted && job.status !== 'completed') return;
      
      // Extract images from each job
      if (job.imageUrls && job.imageUrls.length > 0) {
        job.imageUrls.forEach((url, index) => {
          const promptId = job.prompts && job.prompts[index] ? job.prompts[index].id : undefined;
          const prompt = job.prompts && job.prompts[index] ? job.prompts[index].prompt : undefined;
          
          extractedImages.push({
            id: `${job.id}-${index}`,
            url,
            jobId: job.id,
            jobName: job.name,
            template: job.templateName,
            templateId: job.templateId,
            createdAt: job.updatedAt,
            promptId,
            prompt
          });
        });
      }
    });
    
    // Sort by creation date (newest first)
    extractedImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    setImages(extractedImages);
  };
  
  const handleImageClick = (image: LibraryImage) => {
    setSelectedImage(image);
    setIsDialogOpen(true);
  };
  
  const handleFilterChange = (value: string) => {
    setImageFilter(value);
  };
  
  const handleToggleCompletedOnly = (checked: boolean) => {
    setShowOnlyCompleted(checked);
    loadImages();
  };
  
  // Filter images based on search and dropdown filter
  const filteredImages = images.filter(image => {
    // Text search
    const searchMatch = 
      image.jobName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      image.template.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (image.prompt && image.prompt.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Type filter
    let typeMatch = true;
    if (imageFilter !== 'all') {
      typeMatch = image.template.toLowerCase().includes(imageFilter.toLowerCase());
    }
    
    return searchMatch && typeMatch;
  });
  
  // Group images by job
  const imagesByJob: Record<string, { job: { id: string, name: string, template: string }, images: LibraryImage[] }> = {};
  
  filteredImages.forEach(image => {
    if (!imagesByJob[image.jobId]) {
      imagesByJob[image.jobId] = {
        job: {
          id: image.jobId,
          name: image.jobName,
          template: image.template
        },
        images: []
      };
    }
    
    imagesByJob[image.jobId].images.push(image);
  });
  
  // Get unique template names for filter
  const templateOptions = Array.from(new Set(images.map(img => img.template)));
  
  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Image Library</h1>
          {templateId && (
            <p className="text-muted-foreground flex items-center">
              Filtered by template
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm ml-2"
                onClick={() => navigate('/library')}
              >
                Clear filter
              </Button>
            </p>
          )}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search images by job name, template or prompt..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-row gap-4">
          <Select 
            value={imageFilter} 
            onValueChange={handleFilterChange}
            disabled={!!templateId} // Disable when filtering by templateId
          >
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Templates</SelectItem>
              {templateOptions.map(template => (
                <SelectItem key={template} value={template.toLowerCase()}>
                  {template}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="showCompleted" 
              checked={showOnlyCompleted}
              onCheckedChange={handleToggleCompletedOnly}
            />
            <Label htmlFor="showCompleted" className="text-sm">
              Completed jobs only
            </Label>
          </div>
        </div>
      </div>
      
      {Object.keys(imagesByJob).length > 0 ? (
        <div className="space-y-8">
          {Object.values(imagesByJob).map(({ job, images }) => (
            <div key={job.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-medium">{job.name}</h2>
                <Badge variant="outline">{job.template}</Badge>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {images.map(image => (
                  <div 
                    key={image.id} 
                    className="aspect-square rounded-md overflow-hidden border cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => handleImageClick(image)}
                  >
                    <img 
                      src={image.url} 
                      alt={`Image from ${image.jobName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <Image className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No images found</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center">
            {searchTerm || imageFilter !== 'all' 
              ? "Try changing your search or filter criteria" 
              : "Generate some images with the carousel generator"}
          </p>
          {!searchTerm && imageFilter === 'all' && (
            <Button onClick={() => window.location.href = "/generate"}>
              Create Your First Job
            </Button>
          )}
        </div>
      )}
      
      {/* Image Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl">
          {selectedImage && (
            <>
              <DialogHeader>
                <DialogTitle>Image from {selectedImage.jobName}</DialogTitle>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
                <div className="aspect-square rounded-md overflow-hidden border">
                  <img 
                    src={selectedImage.url} 
                    alt={`Image from ${selectedImage.jobName}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Template</h3>
                    <p>{selectedImage.template}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Created</h3>
                    <p className="flex items-center">
                      <Clock className="mr-1 h-4 w-4" />
                      {new Date(selectedImage.createdAt).toLocaleString()}
                    </p>
                  </div>
                  
                  {selectedImage.prompt && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Generated from Prompt</h3>
                      <Card>
                        <CardContent className="p-4 text-sm">
                          {selectedImage.prompt}
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Close</Button>
                </DialogClose>
                <Button
                  onClick={() => window.open(selectedImage.url, '_blank')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 
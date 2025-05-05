import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Download,
  RefreshCw,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Play,
  Image,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SafeImage, ImagePreloader } from "@/components/ui/safe-image";
import { downloadZip } from "@/lib/downloadZip";
import { useToast } from "@/hooks/use-toast";
import { getAllJobs, JobData, deleteJob } from "@/integrations/jobs/jobService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function JobListPage() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [templateId, setTemplateId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
    
    // Parse query parameters
    const params = new URLSearchParams(location.search);
    const templateIdParam = params.get('templateId');
    setTemplateId(templateIdParam);
    
    // Set up event listener for job updates
    window.addEventListener('job-updated', handleJobUpdate);
    
    return () => {
      window.removeEventListener('job-updated', handleJobUpdate);
    };
  }, [location.search]);
  
  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const storedJobs = await getAllJobs();
      setJobs(storedJobs);
    } catch (error) {
      console.error("Error loading jobs:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleJobUpdate = () => {
    loadJobs();
  };

  const handleDownload = (jobId: string, jobName: string) => {
    toast({
      title: "Download started",
      description: "Your carousel is being prepared for download.",
    });
    
    // Mock download process
    setTimeout(() => {
      downloadZip('', `${jobName.toLowerCase().replace(/\s+/g, '-')}.zip`)
        .catch(error => {
          console.error('Download failed:', error);
          toast({
            title: "Download failed",
            description: "There was a problem downloading your carousel.",
            variant: "destructive",
          });
        });
    }, 1000);
  };
  
  const handlePreviewClick = (job: JobData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    setSelectedJob(job);
    setIsPreviewOpen(true);
  };

  const handleDeleteClick = (job: JobData, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click event
    setJobToDelete(job.id);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!jobToDelete) return;
    
    setIsDeleting(true);
    try {
      const success = await deleteJob(jobToDelete);
      if (success) {
        toast({
          title: "Job deleted",
          description: `${jobs.find(j => j.id === jobToDelete)?.name} has been deleted successfully.`,
        });
        loadJobs(); // Refresh the job list
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
      setJobToDelete(null);
    }
  };

  const getStatusIcon = (status: JobData['status']) => {
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
  
  const getStatusColor = (status: JobData['status']) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "processing": return "bg-blue-500";
      case "failed": return "bg-red-500";
      case "queued": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  const filteredJobs = jobs.filter(job => {
    // First apply the template filter if it exists
    if (templateId && job.templateId !== templateId) {
      return false;
    }
    
    // Then apply the search term
    return job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.templateName.toLowerCase().includes(searchTerm.toLowerCase());
  });

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
            <button class="px-2 py-1 text-xs bg-muted text-muted-foreground rounded hover:bg-muted/90">View URL</button>
          </div>
        `;
        
        // View URL button
        errorDiv.querySelector("button")?.addEventListener("click", () => {
          window.open(url, '_blank');
        });
        
        parent.appendChild(errorDiv);
      }
    }
  };

  // Preload images when job is selected
  useEffect(() => {
    if (selectedJob?.imageUrls && selectedJob.imageUrls.length > 0) {
      console.log(`Preloading ${selectedJob.imageUrls.length} images for preview`);
    }
  }, [selectedJob]);

  const handlePreviewClose = () => {
    setIsPreviewOpen(false);
  };

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          {templateId && (
            <p className="text-muted-foreground">
              Filtered by template
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm ml-2"
                onClick={() => navigate('/jobs')}
              >
                Clear filter
              </Button>
            </p>
          )}
        </div>
        <Button onClick={() => navigate("/generate")}>New Job</Button>
      </div>
      
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search jobs..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredJobs.length > 0 ? (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow 
                  key={job.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <TableCell className="font-medium">
                    {job.name}
                  </TableCell>
                  <TableCell>{job.templateName}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className="flex w-fit items-center gap-1"
                    >
                      {getStatusIcon(job.status)}
                      <span className="capitalize">{job.status}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={job.progress} 
                        className={`h-2 ${job.progress > 0 ? getStatusColor(job.status) : ''}`}
                      />
                      <span className="text-xs text-muted-foreground w-10">
                        {job.progress}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(job.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {job.status === 'completed' && job.imageUrls && job.imageUrls.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handlePreviewClick(job, e)}
                          title="Preview Images"
                        >
                          <Image className="h-4 w-4" />
                          <span className="sr-only">Preview</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click
                          handleDownload(job.id, job.name);
                        }}
                        disabled={job.status !== "completed"}
                        title="Download Carousels"
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDeleteClick(job, e)}
                        title="Delete Job"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-medium">No jobs found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm ? "Try a different search term" : "You haven't created any jobs yet"}
          </p>
          {!searchTerm && (
            <Button onClick={() => navigate("/generate")}>
              Create Your First Job
            </Button>
          )}
        </div>
      )}
      
      {/* Image Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedJob?.name} - Generated Images</DialogTitle>
            <DialogDescription>
              {selectedJob?.imageUrls?.length} images generated from the {selectedJob?.templateName} template
            </DialogDescription>
          </DialogHeader>
          
          {selectedJob?.imageUrls && <ImagePreloader urls={selectedJob.imageUrls} />}
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-4">
            {selectedJob?.imageUrls?.map((url, index) => (
              <div key={index} className="relative aspect-square border rounded-md overflow-hidden">
                <SafeImage 
                  src={url}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          
          <div className="flex justify-between mt-4">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button 
              onClick={() => selectedJob && handleDownload(selectedJob.id, selectedJob.name)}
              disabled={!selectedJob}
            >
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{jobs.find(j => j.id === jobToDelete)?.name}"? This action cannot be undone.
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
              onClick={handleConfirmDelete}
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

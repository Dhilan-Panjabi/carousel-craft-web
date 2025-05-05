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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { downloadZip } from "@/lib/downloadZip";
import { useToast } from "@/hooks/use-toast";
import { getAllJobs, JobData } from "@/integrations/jobs/jobService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Link, useNavigate } from "react-router-dom";

export default function JobListPage() {
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Load jobs from localStorage
    loadJobs();
    
    // Add event listener for job updates
    window.addEventListener('job-updated', handleJobUpdate);
    
    return () => {
      window.removeEventListener('job-updated', handleJobUpdate);
    };
  }, []);
  
  const loadJobs = () => {
    const storedJobs = getAllJobs();
    setJobs(storedJobs);
  };
  
  const handleJobUpdate = (event: Event) => {
    const customEvent = event as CustomEvent;
    if (customEvent.detail?.jobId) {
      // Reload all jobs to get the latest updates
      loadJobs();
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadJobs();
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Jobs refreshed",
        description: "The job list has been updated.",
      });
    }, 800);
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
  
  const handlePreviewImages = (job: JobData) => {
    setSelectedJob(job);
    setIsPreviewOpen(true);
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

  const filteredJobs = jobs.filter(job => 
    job.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.templateName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Jobs</h1>
        
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw 
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} 
          />
          <span className="sr-only">Refresh</span>
        </Button>
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
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click
                            handlePreviewImages(job);
                          }}
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
            <Button onClick={() => window.location.href = "/generate"}>
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
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-4">
            {selectedJob?.imageUrls?.map((url, index) => (
              <div key={index} className="relative aspect-square border rounded-md overflow-hidden">
                <img 
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
    </div>
  );
}

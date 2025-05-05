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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { downloadZip } from "@/lib/downloadZip";
import { useToast } from "@/hooks/use-toast";
import { useRealtime } from "@/hooks/useRealtime";

type JobStatus = "completed" | "processing" | "failed" | "queued";

interface Job {
  id: string;
  name: string;
  template: string;
  status: JobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// Mock realtime data - in a real app this would come from useRealtime hook
const mockJobs: Job[] = [
  {
    id: "job-123",
    name: "April Campaign",
    template: "Product Showcase",
    status: "completed",
    progress: 100,
    createdAt: "2023-04-15T10:30:00Z",
    updatedAt: "2023-04-15T10:35:00Z"
  },
  {
    id: "job-124",
    name: "Team Updates",
    template: "Testimonial Cards",
    status: "processing",
    progress: 65,
    createdAt: "2023-04-18T14:20:00Z",
    updatedAt: "2023-04-18T14:22:00Z"
  },
  {
    id: "job-125",
    name: "Summer Sale",
    template: "Promotion Template",
    status: "queued",
    progress: 0,
    createdAt: "2023-04-18T15:00:00Z",
    updatedAt: "2023-04-18T15:00:00Z"
  }
];

export default function JobListPage() {
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [searchTerm, setSearchTerm] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // In a real app, you would use the useRealtime hook
  // const { data: jobs, loading } = useRealtime<Job>('jobs');
  
  // Mock the realtime updates
  useEffect(() => {
    const interval = setInterval(() => {
      setJobs(prev => 
        prev.map(job => {
          if (job.status === 'processing' && job.progress < 100) {
            const newProgress = Math.min(job.progress + 5, 100);
            const newStatus = newProgress === 100 ? 'completed' : 'processing';
            return { 
              ...job, 
              progress: newProgress,
              status: newStatus as JobStatus,
              updatedAt: new Date().toISOString()
            };
          }
          return job;
        })
      );
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
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

  const getStatusIcon = (status: JobStatus) => {
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
  
  const getStatusColor = (status: JobStatus) => {
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
    job.template.toLowerCase().includes(searchTerm.toLowerCase())
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
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.name}</TableCell>
                  <TableCell>{job.template}</TableCell>
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
                        className={`h-2 ${getStatusColor(job.status)}`}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(job.id, job.name)}
                      disabled={job.status !== "completed"}
                    >
                      <Download className="h-4 w-4" />
                      <span className="sr-only">Download</span>
                    </Button>
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
    </div>
  );
}

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowRight, 
  Users, 
  BarChart3, 
  DollarSign, 
  PlusCircle, 
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Play
} from "lucide-react";
import { 
  getAllTemplates, 
  Template,
  saveTemplate,
  uploadTemplateImage
} from "@/integrations/supabase/templateService";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAllJobs, JobData } from "@/integrations/jobs/jobService";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeJobs: 0,
    imagesGenerated: 0
  });
  const [quickSearch, setQuickSearch] = useState("");
  
  // New template dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadJobs();
    
    // Set up event listener for job updates
    window.addEventListener('job-updated', handleJobUpdate);
    
    return () => {
      window.removeEventListener('job-updated', handleJobUpdate);
    };
  }, []);
  
  const handleJobUpdate = () => {
    loadJobs();
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const templateData = await getAllTemplates();
      setTemplates(templateData);
      setStats(prev => ({
        ...prev,
        totalTemplates: templateData.length
      }));
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates");
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadJobs = async () => {
    try {
      const jobsData = await getAllJobs();
      setJobs(jobsData);
      
      // Calculate active jobs (queued + processing)
      const activeJobs = jobsData.filter(
        job => job.status === 'queued' || job.status === 'processing'
      ).length;
      
      // Count total generated images
      const totalImages = jobsData.reduce((sum, job) => {
        return sum + (job.imageUrls?.length || 0);
      }, 0);
      
      setStats(prev => ({
        ...prev,
        activeJobs,
        imagesGenerated: totalImages
      }));
    } catch (error) {
      console.error("Error loading jobs:", error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    
    setNewTemplateFile(files[0]);
  };
  
  const handleSaveTemplate = async () => {
    if (!newTemplateName || !newTemplateFile) {
      toast.error("Missing required fields", {
        description: "Please provide a name and upload a template image"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload image to Supabase storage
      const imageUrl = await uploadTemplateImage(
        newTemplateFile, 
        newTemplateFile.name
      );
      
      // Save template to database
      await saveTemplate({
        name: newTemplateName,
        description: newTemplateDescription,
        thumbnailUrl: imageUrl,
        slides: []
      });
      
      // Reset form
      setNewTemplateName("");
      setNewTemplateDescription("");
      setNewTemplateFile(null);
      setIsDialogOpen(false);
      
      // Refresh template list
      await loadTemplates();
      
      toast.success("Template saved", {
        description: "Your template has been saved successfully"
      });
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template", {
        description: "Please try again"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
    template.description.toLowerCase().includes(quickSearch.toLowerCase())
  );
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Unknown date";
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
  
  // Get last month's template count (simulated)
  const lastMonthTemplateCount = Math.max(0, stats.totalTemplates - Math.floor(Math.random() * 6));
  
  // Get last month's job count (simulated)
  const lastMonthJobCount = stats.activeJobs + 1;
  
  // Get last month's image count (simulated)
  const lastMonthImageCount = Math.max(0, stats.imagesGenerated - 105);
  
  // Sort jobs by updatedAt date for recent activity
  const recentJobs = [...jobs].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);
  
  // Get ongoing processes (jobs that are queued or processing)
  const ongoingProcesses = jobs.filter(
    job => job.status === 'queued' || job.status === 'processing'
  ).slice(0, 3);

  return (
    <div className="container py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to <span className="brand-gradient">Carousel Gen</span>
        </h1>
        <Button 
          onClick={() => navigate("/generate")}
          className="group"
        >
          Create New Carousel
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Templates</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">{stats.totalTemplates}</CardTitle>
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-600">+{Math.max(0, stats.totalTemplates - lastMonthTemplateCount)} since last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Jobs</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">{stats.activeJobs}</CardTitle>
              <BarChart3 className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-red-600">-{Math.max(0, lastMonthJobCount - stats.activeJobs)} since last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Images Generated</CardDescription>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">{stats.imagesGenerated}</CardTitle>
              <DollarSign className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-green-600">+{Math.max(0, stats.imagesGenerated - lastMonthImageCount)} since last month</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your recent carousel generation activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.length > 0 ? (
                recentJobs.map(job => (
                  <div 
                    key={job.id} 
                    className="flex justify-between items-center border-b pb-2 cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div className="flex items-center gap-2">
                      {getStatusIcon(job.status)}
                      <div>
                        <p className="font-medium">{job.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {job.imageUrls?.length || 0} images • {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(job.updatedAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Quick Links</CardTitle>
            <CardDescription>
              Access frequently used features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={() => navigate("/templates")} className="justify-start">
                Browse Templates
              </Button>
              <Button variant="outline" onClick={() => navigate("/jobs")} className="justify-start">
                View Jobs
              </Button>
              <Button variant="outline" onClick={() => navigate("/generate")} className="justify-start">
                Start Generating
              </Button>
              <Button variant="outline" onClick={() => navigate("/account")} className="justify-start">
                Account Settings
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Ongoing Processes</CardTitle>
            <CardDescription>
              Currently running jobs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ongoingProcesses.length > 0 ? (
                ongoingProcesses.map(job => (
                  <div 
                    key={job.id} 
                    className="cursor-pointer"
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <p className="font-medium text-sm">{job.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{job.progress}%</p>
                    </div>
                    <Progress value={job.progress} className="h-2 w-full mb-3" />
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No active processes</p>
              )}
              
              {ongoingProcesses.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full mt-2 text-sm"
                  onClick={() => navigate("/jobs")}
                >
                  View All Jobs
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your Templates</CardTitle>
              <CardDescription>Quick access to your templates</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Template</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      placeholder="Template name" 
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Describe this template"
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="thumbnail">Thumbnail Image</Label>
                    <Input 
                      id="thumbnail" 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="secondary"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={isUploading}
                  >
                    {isUploading ? "Saving..." : "Save Template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                className="pl-10"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
              />
            </div>
            
            <ScrollArea className="h-[220px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {isLoading ? (
                  <p className="text-muted-foreground text-sm">Loading templates...</p>
                ) : filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template) => (
                    <Card key={template.id} className="overflow-hidden">
                      <div 
                        className="aspect-video bg-cover bg-center" 
                        style={{ 
                          backgroundImage: `url(${template.thumbnailUrl})`,
                          height: '100px'
                        }}
                      />
                      <CardContent className="p-3">
                        <h3 className="font-medium text-sm line-clamp-1">{template.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1">{template.description}</p>
                      </CardContent>
                      <CardFooter className="p-3 pt-0 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-7 px-2 flex-1"
                          onClick={() => navigate(`/templates?id=${template.id}`)}
                        >
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="text-xs h-7 px-2 flex-1"
                          onClick={() => navigate(`/generate?templateId=${template.id}`)}
                        >
                          Use
                        </Button>
                      </CardFooter>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No templates found</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

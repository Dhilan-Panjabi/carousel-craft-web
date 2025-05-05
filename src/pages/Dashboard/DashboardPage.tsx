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
import { ArrowRight, Users, BarChart3, DollarSign, PlusCircle, Search } from "lucide-react";
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

export default function DashboardPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTemplates: 0,
    activeJobs: 12,
    imagesGenerated: 845
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
  }, []);

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
            <p className="text-xs text-green-600">+{Math.max(0, stats.totalTemplates - 6)} since last month</p>
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
            <p className="text-xs text-red-600">-1 since last month</p>
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
            <p className="text-xs text-green-600">+105 since last month</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your recent carousel generation activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Product Showcase</p>
                  <p className="text-sm text-muted-foreground">24 images • Completed</p>
                </div>
                <p className="text-sm text-muted-foreground">2 hours ago</p>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Summer Sale</p>
                  <p className="text-sm text-muted-foreground">12 images • Processing</p>
                </div>
                <p className="text-sm text-muted-foreground">5 hours ago</p>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">Brand Assets</p>
                  <p className="text-sm text-muted-foreground">36 images • Completed</p>
                </div>
                <p className="text-sm text-muted-foreground">Yesterday</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="lg:row-span-2">
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

        <Card className="md:col-span-2">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

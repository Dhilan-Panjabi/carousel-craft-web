
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, ImageIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Template {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  createdAt: string;
}

const mockTemplates: Template[] = [
  {
    id: "1",
    name: "Product Showcase",
    description: "A template for showcasing products with details",
    thumbnail: "/placeholder.svg",
    createdAt: "2023-04-15T10:30:00Z",
  },
  {
    id: "2",
    name: "Testimonial Cards",
    description: "Customer testimonials with profile pictures",
    thumbnail: "/placeholder.svg",
    createdAt: "2023-04-18T14:20:00Z",
  },
];

export default function TemplateManagerPage() {
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    // Mock upload process
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      toast({
        title: "Template Uploaded",
        description: `Successfully uploaded ${files[0].name}`,
      });
    }, 1500);
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Templates</h1>
        
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> 
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create new template</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Template Name</Label>
                  <Input id="name" placeholder="Enter template name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe your template" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Template Image</Label>
                  <div className="flex items-center justify-center border-2 border-dashed rounded-md p-6 cursor-pointer">
                    <div className="space-y-1 text-center">
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        Upload PNG or SVG template
                      </div>
                      <Input 
                        id="image" 
                        type="file" 
                        className="hidden" 
                        accept=".png,.svg"
                        onChange={handleFileUpload}
                      />
                      <Button variant="secondary" onClick={() => document.getElementById('image')?.click()}>
                        Choose File
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="yaml">YAML Configuration</Label>
                  <Textarea 
                    id="yaml" 
                    placeholder="Enter YAML configuration"
                    className="font-mono text-sm h-32"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">Save Template</Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Import
            <Input 
              id="file-upload" 
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="recent">Recently Used</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {templates.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={template.thumbnail}
                      alt={template.name}
                      className="object-cover w-full h-full"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
              <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No templates yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload your first template to get started
              </p>
              <Button onClick={() => document.getElementById('file-upload')?.click()}>
                Upload Template
              </Button>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="recent">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium">No recent templates</h3>
            <p className="text-sm text-muted-foreground">
              Templates you recently used will appear here
            </p>
          </div>
        </TabsContent>
        
        <TabsContent value="favorites">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium">No favorite templates</h3>
            <p className="text-sm text-muted-foreground">
              Mark templates as favorites and they'll appear here
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

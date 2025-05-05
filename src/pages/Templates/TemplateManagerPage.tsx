import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, ImageIcon, Cloud, Search, Folder, ChevronRight, ArrowLeft, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  getAllTemplates, 
  saveTemplate, 
  uploadTemplateImage,
  Template
} from "@/integrations/supabase/templateService";
import driveService from "@/integrations/google/driveService";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetFooter
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  parents?: string[];
  size?: string;
}

interface FolderPathItem {
  id: string;
  name: string;
}

export default function TemplateManagerPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTab, setActiveTab] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleDriveOpen, setIsGoogleDriveOpen] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState("root");
  const [folderPath, setFolderPath] = useState<FolderPathItem[]>([{ id: "root", name: "My Drive" }]);
  const [driveSearchQuery, setDriveSearchQuery] = useState("");
  const [selectedDriveFiles, setSelectedDriveFiles] = useState<GoogleDriveFile[]>([]);
  const searchTimeoutRef = useRef<number | null>(null);
  
  // Form state for new template
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateDescription, setNewTemplateDescription] = useState("");
  const [newTemplateFile, setNewTemplateFile] = useState<File | null>(null);
  const [newTemplateYaml, setNewTemplateYaml] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);
  
  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const templateData = await getAllTemplates();
      setTemplates(templateData);
    } catch (error) {
      console.error("Error loading templates:", error);
      toast.error("Failed to load templates", {
        description: "Please check your connection and try again"
      });
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
        yamlConfig: newTemplateYaml || undefined,
        slides: []
      });
      
      // Reset form
      setNewTemplateName("");
      setNewTemplateDescription("");
      setNewTemplateFile(null);
      setNewTemplateYaml("");
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
  
  const handleConnectGoogleDrive = async () => {
    try {
      // Check if already authenticated
      if (!driveService.isAuthenticated()) {
        // If not, start OAuth flow
        driveService.initiateOAuth();
        return;
      }
      
      // If authenticated, open the Drive sheet and list files
      setIsGoogleDriveOpen(true);
      loadDriveFiles("root");
    } catch (error) {
      console.error("Error connecting to Google Drive:", error);
      toast.error("Failed to connect to Google Drive", {
        description: "Please try again"
      });
    }
  };
  
  const loadDriveFiles = async (folderId: string = currentFolderId, search?: string) => {
    setIsDriveLoading(true);
    try {
      // Reset selection when changing folders or search
      setSelectedDriveFiles([]);
      
      // Update folder path when changing folders (but not during search)
      if (folderId !== currentFolderId && !search) {
        setCurrentFolderId(folderId);
        const path = await driveService.getFolderPath(folderId);
        setFolderPath(path);
      }
      
      // Use search query from parameter or state
      const query = search !== undefined ? search : driveSearchQuery;
      
      const files = await driveService.listFiles(folderId, query);
      setDriveFiles(files);
    } catch (error) {
      console.error("Error loading Drive files:", error);
      toast.error("Failed to load Google Drive files", {
        description: "Please try again"
      });
    } finally {
      setIsDriveLoading(false);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setDriveSearchQuery(query);
    
    // Debounce search
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      loadDriveFiles(currentFolderId, query);
    }, 500);
  };
  
  const handleFolderClick = (folder: GoogleDriveFile) => {
    loadDriveFiles(folder.id);
  };
  
  const handleFolderBreadcrumbClick = (folderId: string) => {
    loadDriveFiles(folderId);
  };
  
  const toggleFileSelection = (file: GoogleDriveFile) => {
    if (!driveService.isImage(file)) return;
    
    setSelectedDriveFiles(prev => {
      const isSelected = prev.some(f => f.id === file.id);
      if (isSelected) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };
  
  const isFileSelected = (fileId: string) => {
    return selectedDriveFiles.some(file => file.id === fileId);
  };
  
  const handleDriveFileImport = async () => {
    if (selectedDriveFiles.length === 0) {
      toast.error("No files selected", {
        description: "Please select at least one image file"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Process each selected file
      const results = await Promise.allSettled(
        selectedDriveFiles.map(async (file) => {
          try {
            console.log(`Starting import of file ${file.name} (${file.id})`);
            
            // Download file from Drive
            const downloadResult = await driveService.downloadFile(file.id);
            console.log("Download successful:", downloadResult.fileName, downloadResult.blob.type);
            
            // Upload to Supabase storage
            const imageUrl = await uploadTemplateImage(
              downloadResult.blob, 
              downloadResult.fileName
            );
            console.log("Supabase upload successful:", imageUrl);
            
            // Create template
            const template = await saveTemplate({
              name: downloadResult.fileName.split('.')[0],
              description: `Imported from Google Drive: ${downloadResult.fileName}`,
              thumbnailUrl: imageUrl,
              slides: []
            });
            
            console.log("Template created:", template.id);
            return template;
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            throw error;
          }
        })
      );
      
      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;
      
      // Log failures for debugging
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Failed to import ${selectedDriveFiles[index].name}:`, result.reason);
        }
      });
      
      // Refresh templates
      await loadTemplates();
      
      // Close Drive sheet
      setIsGoogleDriveOpen(false);
      
      // Reset selection
      setSelectedDriveFiles([]);
      
      if (failures === 0) {
        toast.success(`${successes} template${successes !== 1 ? 's' : ''} imported`, {
          description: "Templates have been imported from Google Drive"
        });
      } else {
        toast.warning(`Imported ${successes} of ${successes + failures} files`, {
          description: `${failures} file${failures !== 1 ? 's' : ''} failed to import`
        });
      }
    } catch (error) {
      console.error("Error importing from Drive:", error);
      toast.error("Failed to import from Google Drive", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Templates</h1>
        
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                  <Input 
                    id="name" 
                    placeholder="Enter template name" 
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe your template" 
                    value={newTemplateDescription}
                    onChange={(e) => setNewTemplateDescription(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image">Template Image</Label>
                  <div 
                    className="flex items-center justify-center border-2 border-dashed rounded-md p-6 cursor-pointer"
                    onClick={() => document.getElementById('image')?.click()}
                  >
                    <div className="space-y-1 text-center">
                      {newTemplateFile ? (
                        <>
                          <p className="text-sm font-medium">{newTemplateFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(newTemplateFile.size / 1024).toFixed(2)} KB
                          </p>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                          <div className="text-sm text-muted-foreground">
                            Upload PNG or SVG template
                          </div>
                        </>
                      )}
                      <Input 
                        id="image" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                      <Button 
                        variant="secondary" 
                        onClick={(e) => {
                          e.stopPropagation();
                          document.getElementById('image')?.click();
                        }}
                      >
                        Choose File
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="yaml">YAML Configuration (Optional)</Label>
                  <Textarea 
                    id="yaml" 
                    placeholder="Enter YAML configuration"
                    className="font-mono text-sm h-32"
                    value={newTemplateYaml}
                    onChange={(e) => setNewTemplateYaml(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  onClick={handleSaveTemplate} 
                  disabled={isUploading}
                >
                  {isUploading ? "Saving..." : "Save Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Sheet open={isGoogleDriveOpen} onOpenChange={setIsGoogleDriveOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" onClick={handleConnectGoogleDrive}>
                <Cloud className="mr-2 h-4 w-4" />
                Google Drive
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md w-[90vw]">
              <SheetHeader>
                <SheetTitle>Google Drive</SheetTitle>
                <SheetDescription>
                  Select files from your Google Drive to import as templates
                </SheetDescription>
              </SheetHeader>
              
              <div className="my-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search files..."
                    className="pl-8 pr-4"
                    value={driveSearchQuery}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
              
              {/* Folder breadcrumb navigation */}
              <div className="flex items-center flex-wrap gap-1 my-2 text-sm">
                {folderPath.map((folder, index) => (
                  <div key={folder.id} className="flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handleFolderBreadcrumbClick(folder.id)}
                    >
                      {index === 0 && <Folder className="h-3 w-3 mr-1" />}
                      {folder.name}
                    </Button>
                    {index < folderPath.length - 1 && (
                      <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
              
              <ScrollArea className="flex-1 mt-3 h-[65vh] pr-3">
                {isDriveLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="text-center py-8">
                    <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No files found</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {/* Show folders first */}
                    {driveFiles
                      .filter(file => driveService.isFolder(file))
                      .map((folder) => (
                        <div 
                          key={folder.id}
                          className="flex items-center p-2 border rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => handleFolderClick(folder)}
                        >
                          <Folder className="w-12 h-12 p-3 text-blue-500 mr-3" />
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium truncate">{folder.name}</p>
                            <p className="text-xs text-muted-foreground">Folder</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground ml-2" />
                        </div>
                      ))}
                    
                    {/* Show non-folder files */}
                    <Separator className="my-2" />
                    
                    {driveFiles
                      .filter(file => !driveService.isFolder(file))
                      .map((file) => (
                        <div 
                          key={file.id}
                          className={`flex items-center p-2 border rounded-md hover:bg-muted cursor-pointer ${driveService.isImage(file) ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} ${isFileSelected(file.id) ? 'border-primary' : ''}`}
                          onClick={() => driveService.isImage(file) && toggleFileSelection(file)}
                        >
                          <div className="relative">
                            {file.thumbnailLink ? (
                              <img 
                                src={file.thumbnailLink} 
                                alt={file.name}
                                className="w-12 h-12 object-cover rounded-md mr-3"
                              />
                            ) : (
                              <ImageIcon className="w-12 h-12 p-2 text-muted-foreground mr-3" />
                            )}
                            
                            {isFileSelected(file.id) && (
                              <div className="absolute top-0 right-0 bg-primary text-primary-foreground rounded-full p-0.5 transform translate-x-1/2 -translate-y-1/2">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium truncate">{file.name}</p>
                            <div className="flex text-xs text-muted-foreground">
                              <span className="truncate">{file.mimeType.split('/')[1]}</span>
                              {file.size && (
                                <span className="ml-2">{driveService.formatFileSize(file.size)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
              
              <SheetFooter className="mt-4 flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center">
                  {selectedDriveFiles.length > 0 && (
                    <Badge variant="outline" className="mr-2">
                      {selectedDriveFiles.length} selected
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (currentFolderId !== "root" && folderPath.length > 1) {
                        // Go up one folder
                        const parentFolder = folderPath[folderPath.length - 2];
                        loadDriveFiles(parentFolder.id);
                      }
                    }}
                    disabled={currentFolderId === "root" || folderPath.length <= 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleDriveFileImport} 
                    disabled={isUploading || selectedDriveFiles.length === 0}
                  >
                    {isUploading ? "Importing..." : "Import Selected"}
                  </Button>
                </div>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          
          <Button 
            variant="outline" 
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
            <Input 
              id="file-upload" 
              type="file"
              className="hidden"
              accept="image/*"
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
          {isLoading ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={template.thumbnailUrl}
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
              <Button onClick={() => setIsDialogOpen(true)}>
                Create Template
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

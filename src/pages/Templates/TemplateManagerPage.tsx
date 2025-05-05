import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Plus, ImageIcon, Cloud, Search, Folder, ChevronRight, ArrowLeft, Check, PlusCircle, Trash2, X, ChevronLeft, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  getAllTemplates, 
  saveTemplate, 
  uploadTemplateImage,
  updateTemplate,
  deleteTemplate,
  toggleFavorite,
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
import "./TemplateManagerPage.css";

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

  // Template edit state
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [existingAdditionalImages, setExistingAdditionalImages] = useState<string[]>([]);

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEditTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description || "");
    setExistingAdditionalImages(template.additionalImages || []);
    setIsEditDialogOpen(true);
  };

  const handleAdditionalImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    
    // Convert FileList to array and add to state
    const newFiles = Array.from(files);
    setAdditionalImages(prev => [...prev, ...newFiles]);
  };

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEditedTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsUploading(true);
    
    try {
      let updatedImageUrl = selectedTemplate.thumbnailUrl;
      let allAdditionalImages = [...existingAdditionalImages];
      
      // If a new main image was selected, upload it
      if (editFile) {
        updatedImageUrl = await uploadTemplateImage(
          editFile, 
          editFile.name
        );
      }
      
      // Upload any new additional images
      if (additionalImages.length > 0) {
        const uploadPromises = additionalImages.map(file => 
          uploadTemplateImage(file, file.name)
        );
        
        const uploadedUrls = await Promise.all(uploadPromises);
        allAdditionalImages = [...allAdditionalImages, ...uploadedUrls];
      }
      
      // Update template in database
      await updateTemplate(selectedTemplate.id, {
        name: editName,
        description: editDescription,
        thumbnailUrl: updatedImageUrl,
        additionalImages: allAdditionalImages
      });
      
      // Reset form and close dialog
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      setEditFile(null);
      setAdditionalImages([]);
      setExistingAdditionalImages([]);
      
      // Refresh templates list
      await loadTemplates();
      
      toast.success("Template updated", {
        description: "Your changes have been saved"
      });
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Failed to update template", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;
    
    setEditFile(files[0]);
  };

  const handleViewTemplate = (template: Template) => {
    console.log("Template to preview:", template);
    console.log("Image URL:", template.thumbnailUrl);
    console.log("Additional images:", template.additionalImages);
    
    setPreviewTemplate(template);
    setPreviewImageIndex(0);
    setIsPreviewOpen(true);
  };

  const getTemplateAllImages = (template: Template): string[] => {
    const allImages: string[] = [];
    
    // Add the main thumbnail if it exists and is a valid URL
    if (template.thumbnailUrl && isValidImageUrl(template.thumbnailUrl)) {
      allImages.push(template.thumbnailUrl);
    }
    
    // Add additional images if they exist
    try {
      if (template.additionalImages && Array.isArray(template.additionalImages)) {
        // Filter out any non-string or empty values and ensure they're valid URLs
        const validAdditionalImages = template.additionalImages
          .filter(url => typeof url === 'string' && url.trim() !== '' && isValidImageUrl(url));
        
        allImages.push(...validAdditionalImages);
      }
    } catch (error) {
      console.error('Error parsing additional images:', error);
    }
    
    return allImages;
  };

  const isValidImageUrl = (url: string): boolean => {
    // Basic check - does it start with http/https and end with common image extensions
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleNextImage = () => {
    if (!previewTemplate) return;
    
    const allImages = getTemplateAllImages(previewTemplate);
    setPreviewImageIndex(prev => (prev + 1) % allImages.length);
  };

  const handlePrevImage = () => {
    if (previewTemplate) {
      setPreviewImageIndex((prev) => 
        prev === 0 ? getTemplateAllImages(previewTemplate).length - 1 : prev - 1
      );
    }
  };

  const handleDeleteTemplate = (template: Template, event: React.MouseEvent) => {
    // Prevent the event from bubbling up to the parent (which would open the preview)
    event.stopPropagation();
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteTemplate(templateToDelete.id);
      
      // Close dialog and reset state
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
      
      // Refresh templates
      await loadTemplates();
      
      toast.success("Template deleted", {
        description: "The template has been permanently deleted"
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Failed to delete template", {
        description: error instanceof Error ? error.message : "Please try again"
      });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleToggleFavorite = async (template: Template, event: React.MouseEvent) => {
    // Prevent the event from bubbling up to the parent (which would open the preview)
    event.stopPropagation();
    
    try {
      // Toggle favorite status
      const updatedTemplate = await toggleFavorite(template.id, !template.favorite);
      
      // Update the local templates array
      setTemplates(prev => 
        prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
      );
      
      toast.success(
        updatedTemplate.favorite ? "Added to favorites" : "Removed from favorites",
        {
          description: updatedTemplate.favorite 
            ? `${updatedTemplate.name} has been added to your favorites`
            : `${updatedTemplate.name} has been removed from your favorites`
        }
      );
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorite status", {
        description: "Please try again"
      });
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
                  <div 
                    className="aspect-video bg-muted relative cursor-pointer"
                    onClick={() => handleViewTemplate(template)}
                  >
                    {template.thumbnailUrl ? (
                      <>
                        <img
                          src={template.thumbnailUrl}
                          alt={template.name}
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            console.error(`Image failed to load: ${template.thumbnailUrl}`);
                            // Set a data URI fallback instead of an external URL
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22400%22%20height%3D%22225%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22112.5%22%20font-family%3D%22Arial%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23999%22%3EPreview%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
                            // Keep the alt text for accessibility
                            (e.target as HTMLImageElement).alt = 'Image not available';
                            // Add a class to show we're in error state
                            e.currentTarget.parentElement?.classList.add('image-error');
                          }}
                          loading="lazy"
                        />
                        <div className="image-error-label">Image not available</div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-16 w-16 text-muted-foreground opacity-50" />
                      </div>
                    )}
                    
                    {/* Favorite button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`absolute top-2 left-2 h-8 w-8 rounded-full ${template.favorite ? 'text-yellow-500 bg-white bg-opacity-70 hover:bg-white hover:bg-opacity-100' : 'text-muted-foreground bg-black bg-opacity-20 hover:bg-black hover:bg-opacity-30'}`}
                      onClick={(e) => handleToggleFavorite(template, e)}
                    >
                      <Star className={`h-4 w-4 ${template.favorite ? 'fill-yellow-500' : ''}`} />
                    </Button>
                    
                    {/* Use nullish coalescing for safer access */}
                    {(template.additionalImages ?? []).length > 0 && (
                      <div className="absolute bottom-2 right-2 bg-background rounded-full p-1 shadow">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {(template.additionalImages ?? []).length + 1}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDeleteTemplate(template, e)}
                      >
                        <Trash2 className="h-4 w-4" />
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
          {templates.filter(t => t.favorite).length > 0 ? (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {templates.filter(t => t.favorite).map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div 
                    className="aspect-video bg-muted relative cursor-pointer"
                    onClick={() => handleViewTemplate(template)}
                  >
                    {template.thumbnailUrl ? (
                      <>
                        <img
                          src={template.thumbnailUrl}
                          alt={template.name}
                          className="object-contain w-full h-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22400%22%20height%3D%22225%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22112.5%22%20font-family%3D%22Arial%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23999%22%3EPreview%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
                            e.currentTarget.parentElement?.classList.add('image-error');
                          }}
                          loading="lazy"
                        />
                        <div className="image-error-label">Image not available</div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-16 w-16 text-muted-foreground opacity-50" />
                      </div>
                    )}
                    
                    {/* Favorite button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 left-2 h-8 w-8 rounded-full text-yellow-500 bg-white bg-opacity-70 hover:bg-white hover:bg-opacity-100"
                      onClick={(e) => handleToggleFavorite(template, e)}
                    >
                      <Star className="h-4 w-4 fill-yellow-500" />
                    </Button>
                    
                    {(template.additionalImages ?? []).length > 0 && (
                      <div className="absolute bottom-2 right-2 bg-background rounded-full p-1 shadow">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          {(template.additionalImages ?? []).length + 1}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-medium text-lg">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description || "No description"}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end mt-4 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditTemplate(template)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => handleDeleteTemplate(template, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium">No favorite templates</h3>
              <p className="text-sm text-muted-foreground">
                Mark templates as favorites and they'll appear here
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Template Name</Label>
              <Input 
                id="edit-name" 
                placeholder="Enter template name" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                placeholder="Describe your template" 
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Primary Image</Label>
              {selectedTemplate && (
                <div className="mb-4 border rounded-md overflow-hidden">
                  <img 
                    src={editFile ? URL.createObjectURL(editFile) : selectedTemplate.thumbnailUrl} 
                    alt={selectedTemplate.name}
                    className="w-full h-48 object-contain bg-muted"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22400%22%20height%3D%22225%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22400%22%20height%3D%22225%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%22112.5%22%20font-family%3D%22Arial%22%20font-size%3D%2216%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23999%22%3EPreview%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
                    }}
                  />
                </div>
              )}
              <div 
                className="flex items-center justify-center border-2 border-dashed rounded-md p-6 cursor-pointer"
                onClick={() => document.getElementById('edit-image')?.click()}
              >
                <div className="space-y-1 text-center">
                  {editFile ? (
                    <>
                      <p className="text-sm font-medium">{editFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(editFile.size / 1024).toFixed(2)} KB
                      </p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                      <div className="text-sm text-muted-foreground">
                        Upload new primary image (optional)
                      </div>
                    </>
                  )}
                  <Input 
                    id="edit-image" 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleEditFileUpload}
                  />
                  <Button 
                    variant="secondary" 
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('edit-image')?.click();
                    }}
                  >
                    Choose File
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Additional Images Section */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Additional Images</Label>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex items-center gap-1 text-xs"
                  onClick={() => document.getElementById('additional-images')?.click()}
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Image
                  <Input 
                    id="additional-images" 
                    type="file" 
                    multiple
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAdditionalImageUpload}
                  />
                </Button>
              </div>
              
              {/* Display existing additional images */}
              {existingAdditionalImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {existingAdditionalImages.map((url, index) => (
                    <div key={`existing-${index}`} className="relative border rounded-md overflow-hidden">
                      <img 
                        src={url} 
                        alt={`Additional ${index + 1}`}
                        className="w-full h-24 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22200%22%20height%3D%22100%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22200%22%20height%3D%22100%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%22100%22%20y%3D%2250%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23999%22%3EImage%20Not%20Found%3C%2Ftext%3E%3C%2Fsvg%3E';
                        }}
                      />
                      <Button 
                        variant="destructive" 
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeExistingImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Display newly added additional images */}
              {additionalImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {additionalImages.map((file, index) => (
                    <div key={`new-${index}`} className="relative border rounded-md overflow-hidden">
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name}
                        className="w-full h-24 object-cover"
                      />
                      <Button 
                        variant="destructive" 
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeAdditionalImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute bottom-0 left-0 right-0 bg-background/80 p-1">
                        <p className="text-xs truncate">{file.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {existingAdditionalImages.length === 0 && additionalImages.length === 0 && (
                <div className="text-center py-6 border-2 border-dashed rounded-md">
                  <p className="text-sm text-muted-foreground">No additional images</p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="mt-2"
                    onClick={() => document.getElementById('additional-images')?.click()}
                  >
                    Add Images
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
                setEditFile(null);
                setAdditionalImages([]);
                setExistingAdditionalImages([]);
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleSaveEditedTemplate} 
              disabled={isUploading}
            >
              {isUploading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewTemplate?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            {previewTemplate && getTemplateAllImages(previewTemplate).length > 0 && (
              <>
                <div className="aspect-video bg-muted overflow-hidden relative">
                  {/* Show loading state */}
                  <div className="absolute inset-0 flex items-center justify-center z-0">
                    <div className="animate-pulse flex space-x-4">
                      <div className="rounded-full bg-muted-foreground/20 h-10 w-10"></div>
                    </div>
                  </div>
                  
                  <img
                    key={`preview-${previewImageIndex}-${getTemplateAllImages(previewTemplate)[previewImageIndex]}`}
                    src={getTemplateAllImages(previewTemplate)[previewImageIndex]}
                    alt={`Image ${previewImageIndex + 1} of ${getTemplateAllImages(previewTemplate).length}`}
                    className="w-full h-full object-contain relative z-10"
                    onError={(e) => {
                      console.error(`Failed to load preview image: ${getTemplateAllImages(previewTemplate)[previewImageIndex]}`);
                      // Use data URI for fallback
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%22800%22%20height%3D%22450%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%22800%22%20height%3D%22450%22%20fill%3D%22%23eee%22%2F%3E%3Ctext%20x%3D%22400%22%20y%3D%22225%22%20font-family%3D%22Arial%22%20font-size%3D%2218%22%20text-anchor%3D%22middle%22%20alignment-baseline%3D%22middle%22%20fill%3D%22%23999%22%3EImage%20Not%20Available%3C%2Ftext%3E%3C%2Fsvg%3E';
                      // Keep the alt text for accessibility
                      (e.target as HTMLImageElement).alt = 'Image not available';
                      // Show error state
                      e.currentTarget.parentElement?.classList.add('preview-error');
                    }}
                  />
                  
                  {/* Preview error label */}
                  <div className="preview-error-label">Image not available</div>
                  
                  {/* Image info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/70 px-2 py-1 text-xs z-20">
                    Image {previewImageIndex + 1} of {getTemplateAllImages(previewTemplate).length}
                    {previewImageIndex === 0 ? ' (Primary)' : ' (Additional)'}
                  </div>
                </div>
                
                {/* Navigation buttons */}
                {getTemplateAllImages(previewTemplate).length > 1 && (
                  <>
                    <div className="absolute top-1/2 left-2 transform -translate-y-1/2 z-30">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full shadow-sm opacity-80 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevImage();
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="absolute top-1/2 right-2 transform -translate-y-1/2 z-30">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="rounded-full shadow-sm opacity-80 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextImage();
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
                
                {/* Indicator dots */}
                {getTemplateAllImages(previewTemplate).length > 1 && (
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1 z-30">
                    {getTemplateAllImages(previewTemplate).map((_, index) => (
                      <Button
                        key={`indicator-${index}`}
                        variant="secondary"
                        size="icon"
                        className={`w-2 h-2 p-0 rounded-full ${index === previewImageIndex ? 'bg-primary' : 'bg-muted'}`}
                        onClick={() => setPreviewImageIndex(index)}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
            {previewTemplate && getTemplateAllImages(previewTemplate).length === 0 && (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No images available for this template</p>
              </div>
            )}
          </div>
          <div className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">
                {previewTemplate?.description || "No description"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setIsPreviewOpen(false);
                  if (previewTemplate) {
                    handleEditTemplate(previewTemplate);
                  }
                }}
              >
                Edit Template
              </Button>
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setIsPreviewOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
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

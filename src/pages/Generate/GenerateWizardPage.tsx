import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileUp, AlertCircle, ArrowRight, ArrowLeft, Loader2, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseCSV, CSVRow } from "@/lib/csvParse";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  getAllTemplates, 
  Template
} from "@/integrations/supabase/templateService";
import { toast as sonnerToast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function GenerateWizardPage() {
  const [step, setStep] = useState(1);
  const [jobName, setJobName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [numVariants, setNumVariants] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[] | null>(null);
  const [scriptContent, setScriptContent] = useState("");
  const [isDataSource, setIsDataSource] = useState<"csv" | "script">("csv");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add state for templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Parse query parameters to check for templateId
    const queryParams = new URLSearchParams(location.search);
    const templateId = queryParams.get('templateId');
    
    loadTemplates(templateId);
  }, [location]);

  const loadTemplates = async (preselectedTemplateId?: string | null) => {
    setIsLoadingTemplates(true);
    try {
      const templateData = await getAllTemplates();
      setTemplates(templateData);
      
      // If a template ID was provided in the URL, select it
      if (preselectedTemplateId) {
        const templateExists = templateData.some(t => t.id === preselectedTemplateId);
        if (templateExists) {
          setSelectedTemplate(preselectedTemplateId);
        } else {
          sonnerToast.error("Template not found", {
            description: "The requested template could not be found"
          });
        }
      }
    } catch (error) {
      console.error("Error loading templates:", error);
      sonnerToast.error("Failed to load templates", {
        description: "Please try again later"
      });
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    
    // Read and parse the CSV
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        try {
          const parsedData = parseCSV(event.target.result as string);
          setCsvData(parsedData);
          toast({
            title: "CSV uploaded successfully",
            description: `${parsedData.length} rows loaded`,
          });
        } catch (error) {
          toast({
            title: "Error parsing CSV",
            description: "Please check your CSV format",
            variant: "destructive",
          });
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!jobName || !selectedTemplate || numVariants < 1 || 
        (!csvFile && !scriptContent)) {
      toast({
        title: "Incomplete form",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // In a real app, this would call a Supabase Edge Function
      // const { data, error } = await supabase.functions.invoke('jobs', {
      //   body: {
      //     name: jobName,
      //     templateId: selectedTemplate,
      //     variants: numVariants,
      //     dataType: isDataSource,
      //     data: isDataSource === 'csv' ? csvData : scriptContent
      //   }
      // });
      
      // Mock Edge Function call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Job created successfully",
        description: "Your carousel generation job has started",
      });
      
      navigate("/jobs");
    } catch (error) {
      console.error("Error creating job:", error);
      toast({
        title: "Failed to create job",
        description: "An error occurred while submitting the job",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the currently selected template object
  const selectedTemplateObject = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="container py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">Generate Carousels</h1>
      
      <div className="mb-8">
        <ul className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className={`flex items-center ${
                step >= i ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                  step >= i
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {i}
              </div>
              <span className="hidden sm:inline">
                {i === 1 ? "Job Setup" : i === 2 ? "Data Source" : "Review & Generate"}
              </span>
              {i < 3 && (
                <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />
              )}
            </li>
          ))}
        </ul>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Job Setup</CardTitle>
            <CardDescription>
              Configure your carousel generation job
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="jobName">Job Name</Label>
              <Input
                id="jobName"
                placeholder="Enter a name for this job"
                value={jobName}
                onChange={(e) => setJobName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={selectedTemplate}
                onValueChange={setSelectedTemplate}
                disabled={isLoadingTemplates}
              >
                <SelectTrigger id="template">
                  {isLoadingTemplates ? (
                    <div className="flex items-center">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Loading templates...</span>
                    </div>
                  ) : (
                    <SelectValue placeholder="Select a template" />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Template Preview Section */}
            {selectedTemplateObject && (
              <div className="rounded-lg border overflow-hidden mt-6">
                <div className="bg-muted p-4">
                  <h3 className="font-medium mb-1">Template Preview</h3>
                </div>
                <div className="p-0">
                  <div className="aspect-video w-full overflow-hidden relative bg-secondary">
                    {selectedTemplateObject.thumbnailUrl ? (
                      <img 
                        src={selectedTemplateObject.thumbnailUrl} 
                        alt={selectedTemplateObject.name}
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-medium">{selectedTemplateObject.name}</h3>
                      <Badge variant="outline">
                        {selectedTemplateObject.slides?.length || 0} slide{selectedTemplateObject.slides?.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    {selectedTemplateObject.description && (
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplateObject.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="variants">Number of Variants</Label>
              <Input
                id="variants"
                type="number"
                min="1"
                max="100"
                placeholder="How many variants to generate"
                value={numVariants}
                onChange={(e) => setNumVariants(parseInt(e.target.value) || 1)}
              />
            </div>
            
            <div className="pt-4 space-x-2 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!selectedTemplate}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Data Source</CardTitle>
            <CardDescription>
              Provide data for your carousel variants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-4">
              <Button
                variant={isDataSource === "csv" ? "default" : "outline"}
                onClick={() => setIsDataSource("csv")}
                className="flex-1"
              >
                CSV Upload
              </Button>
              <Button
                variant={isDataSource === "script" ? "default" : "outline"}
                onClick={() => setIsDataSource("script")}
                className="flex-1"
              >
                Custom Script
              </Button>
            </div>

            {isDataSource === "csv" ? (
              <div className="space-y-4">
                <div
                  className={`dropzone ${csvFile ? "active" : ""}`}
                  onClick={() => document.getElementById("csv-upload")?.click()}
                >
                  <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    {csvFile ? csvFile.name : "Drop your CSV file here"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CSV file with headers for data variables
                  </p>
                  <Input
                    id="csv-upload"
                    type="file"
                    className="hidden"
                    accept=".csv"
                    onChange={handleCsvUpload}
                  />
                </div>
                
                {csvData && csvData.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      CSV loaded with {csvData.length} rows and {Object.keys(csvData[0]).length} columns
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="script">Custom Script</Label>
                <Textarea
                  id="script"
                  placeholder="Enter JavaScript code to generate data"
                  className="font-mono h-60"
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Write JavaScript that returns an array of objects for your variants
                </p>
              </div>
            )}

            <div className="pt-4 space-x-2 flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Review & Generate</CardTitle>
            <CardDescription>
              Verify your settings and start generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {selectedTemplateObject && (
                <div className="rounded-lg border overflow-hidden">
                  <div className="aspect-video w-full max-h-48 overflow-hidden relative bg-secondary">
                    {selectedTemplateObject.thumbnailUrl ? (
                      <img 
                        src={selectedTemplateObject.thumbnailUrl} 
                        alt={selectedTemplateObject.name}
                        className="w-full h-full object-contain" 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-12 w-12 text-muted-foreground opacity-50" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            
              <div className="grid grid-cols-2 gap-2">
                <div className="text-sm font-medium">Job Name:</div>
                <div>{jobName}</div>
                
                <div className="text-sm font-medium">Template:</div>
                <div>{templates.find(t => t.id === selectedTemplate)?.name || "Unknown Template"}</div>
                
                <div className="text-sm font-medium">Variants:</div>
                <div>{numVariants}</div>
                
                <div className="text-sm font-medium">Data Source:</div>
                <div className="capitalize">{isDataSource}</div>
                
                {isDataSource === "csv" && csvFile && (
                  <>
                    <div className="text-sm font-medium">File:</div>
                    <div>{csvFile.name}</div>
                  </>
                )}
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will create a new generation job that will process in the background.
                  You can monitor progress on the Jobs page.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="pt-4 space-x-2 flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating Job..." : "Generate Carousels"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

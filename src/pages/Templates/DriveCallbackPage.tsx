import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import driveService from "@/integrations/google/driveService";
import { toast } from "sonner";

export default function DriveCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  
  useEffect(() => {
    const processAuth = async () => {
      try {
        // Get the hash fragment from URL
        const hash = window.location.hash;
        console.log("Callback URL:", window.location.href);
        console.log("Hash fragment:", hash);
        console.log("Current origin:", window.location.origin);
        
        if (!hash) {
          throw new Error("No authentication data received");
        }
        
        // Process OAuth callback
        const success = driveService.handleOAuthCallback(hash);
        console.log("OAuth callback processed:", success);
        
        if (!success) {
          throw new Error("Authentication failed");
        }
        
        setStatus("success");
        
        // Check if there's a pending carousel export
        const pendingExportJson = localStorage.getItem('carousel_pending_export');
        console.log("Pending export found:", !!pendingExportJson);
        
        if (pendingExportJson) {
          try {
            const pendingExport = JSON.parse(pendingExportJson);
            
            // Remove pending export data
            localStorage.removeItem('carousel_pending_export');
            
            // Prepare images for export
            const exportImages = pendingExport.images.map((img, index) => ({
              url: img.url,
              name: img.jobName || `carousel_image_${index}`,
              index
            }));
            
            // Export to Drive
            await driveService.exportCarouselToDrive(pendingExport.name, exportImages);
            
            toast.success("Carousel exported to Google Drive successfully");
          } catch (exportError) {
            console.error("Error processing pending export:", exportError);
            toast.error("Failed to export carousel", {
              description: "There was a problem exporting your carousel after authentication"
            });
          }
        }
        
        // Get redirect URL or default to templates page
        const redirectUrl = localStorage.getItem('google_drive_auth_redirect') || '/library';
        console.log("Original redirect URL:", redirectUrl);
        
        // If the redirect URL contains "/library", make sure we go back to the library page
        const finalRedirect = redirectUrl.includes('/library') ? '/library' : redirectUrl;
        
        // If URL contains localhost but we're on a different domain, fix the redirect
        if (finalRedirect.includes('localhost') && !window.location.origin.includes('localhost')) {
          const fixedRedirect = finalRedirect.replace(/https?:\/\/localhost:[0-9]+/g, window.location.origin);
          console.log("Fixed localhost redirect:", fixedRedirect);
          navigate(fixedRedirect.replace(window.location.origin, ''));
          return;
        }
        
        console.log("Final redirect URL:", finalRedirect);
        
        localStorage.removeItem('google_drive_auth_redirect');
        
        // Check if we need to show export success message
        if (pendingExportJson) {
          toast.success("You'll be redirected back to continue your work", {
            description: "Your Google Drive is now connected"
          });
        }
        
        // Redirect after short delay
        setTimeout(() => {
          navigate(finalRedirect);
        }, 1500);
        
      } catch (error) {
        console.error("Authentication error:", error);
        setStatus("error");
        
        toast.error("Google Drive Connection Failed", {
          description: "Please try again or check your Google Cloud console settings"
        });
        
        // Redirect after error
        setTimeout(() => {
          navigate('/templates');
        }, 3000);
      }
    };
    
    processAuth();
  }, [navigate]);
  
  return (
    <div className="container py-10 flex items-center justify-center min-h-[80vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle>Google Drive Connection</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === "processing" && "Processing your Google Drive authentication..."}
          {status === "success" && "Successfully connected to Google Drive!"}
          {status === "error" && "There was a problem connecting to Google Drive."}
          
          {status === "processing" && (
            <div className="flex justify-center mt-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
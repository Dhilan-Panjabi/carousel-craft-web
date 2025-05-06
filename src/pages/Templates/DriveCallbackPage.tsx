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
    // This function handles the OAuth callback
    const processAuth = async () => {
      try {
        console.log("DriveCallbackPage: Starting auth processing");
        
        // Get the hash fragment from URL
        const hash = window.location.hash;
        
        if (!hash) {
          console.error("DriveCallbackPage: No hash fragment found in URL");
          throw new Error("No authentication data received");
        }
        
        console.log("DriveCallbackPage: Received hash fragment");
        
        // Process OAuth callback - this handles parsing the hash and saving the token
        const success = driveService.handleOAuthCallback(hash);
        
        if (!success) {
          console.error("DriveCallbackPage: Failed to handle OAuth callback");
          throw new Error("Failed to process authentication data");
        }
        
        // Double-check that we're now authenticated
        const isAuthenticated = driveService.isAuthenticated();
        if (!isAuthenticated) {
          console.error("DriveCallbackPage: Not authenticated after handling callback");
          throw new Error("Authentication verification failed");
        }
        
        console.log("DriveCallbackPage: Successfully authenticated with Google Drive");
        setStatus("success");
        
        // Process any pending exports if needed
        await handlePendingExports();
        
        // Set stronger flags to prevent redirect loops
        const now = Date.now();
        localStorage.setItem('drive_auth_completed', 'true');
        localStorage.setItem('drive_auth_completed_time', now.toString());
        localStorage.setItem('google_drive_auth_successful', 'true');
        
        // Clear any pending redirects
        const originalRedirect = localStorage.getItem('google_drive_auth_redirect');
        localStorage.removeItem('google_drive_auth_redirect');
        
        // Show success message
        toast.success("Google Drive Connected", {
          description: "Your Google Drive account has been successfully connected"
        });
        
        // Redirect back to templates page
        console.log("DriveCallbackPage: Redirecting to /templates with proper state");
        
        // Navigate immediately without timeout to ensure quick transition
        navigate("/templates", { 
          replace: true,
          state: { 
            fromDriveAuth: true, 
            timestamp: now,
            driveAuthSuccessful: true,
            originalRedirect
          }
        });
      } catch (error) {
        console.error("DriveCallbackPage: Authentication error:", error);
        setStatus("error");
        
        // Clear any invalid auth data
        localStorage.removeItem('google_drive_token');
        localStorage.removeItem('google_drive_token_expiry');
        localStorage.removeItem('drive_auth_completed');
        localStorage.removeItem('drive_auth_completed_time');
        
        toast.error("Google Drive Connection Failed", {
          description: "Please try again"
        });
        
        // Redirect after error
        setTimeout(() => {
          navigate("/templates", { replace: true });
        }, 2000);
      }
    };
    
    // Handle any pending carousel exports
    const handlePendingExports = async () => {
      const pendingExportJson = localStorage.getItem('carousel_pending_export');
      if (!pendingExportJson) return;
      
      try {
        console.log("DriveCallbackPage: Processing pending export");
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
        console.error("DriveCallbackPage: Error processing pending export:", exportError);
        toast.error("Failed to export carousel", {
          description: "There was a problem exporting your carousel after authentication"
        });
      }
    };
    
    // Start the auth process
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
          {status === "success" && "Successfully connected to Google Drive! Redirecting..."}
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
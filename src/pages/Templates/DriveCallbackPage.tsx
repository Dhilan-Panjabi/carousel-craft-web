import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import driveService from "@/integrations/google/driveService";

export default function DriveCallbackPage() {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const navigate = useNavigate();

  useEffect(() => {
    const processOAuthCallback = () => {
      // Get the hash fragment from URL (#access_token=...&token_type=...)
      const hash = window.location.hash;
      
      try {
        const success = driveService.handleOAuthCallback(hash);
        
        if (success) {
          setStatus("success");
          // Get the stored redirect URL or default to templates page
          const redirectUrl = localStorage.getItem('google_drive_auth_redirect') || '/templates';
          localStorage.removeItem('google_drive_auth_redirect');
          
          // Redirect after a brief delay to show success
          setTimeout(() => {
            navigate(redirectUrl);
          }, 1500);
        } else {
          setStatus("error");
          setTimeout(() => {
            navigate('/templates');
          }, 3000);
        }
      } catch (error) {
        console.error("Error handling OAuth callback:", error);
        setStatus("error");
        setTimeout(() => {
          navigate('/templates');
        }, 3000);
      }
    };

    processOAuthCallback();
  }, [navigate]);

  return (
    <div className="container flex items-center justify-center" style={{ height: "calc(100vh - 200px)" }}>
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Google Drive Connection</CardTitle>
          <CardDescription>
            {status === "processing" && "Processing your Google Drive authentication..."}
            {status === "success" && "Successfully connected to Google Drive!"}
            {status === "error" && "There was a problem connecting to Google Drive."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          {status === "processing" && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
          {status === "success" && (
            <div className="text-center">
              <div className="rounded-full bg-green-100 p-3 inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting you back...</p>
            </div>
          )}
          {status === "error" && (
            <div className="text-center">
              <div className="rounded-full bg-red-100 p-3 inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Please try again. Redirecting you back...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 
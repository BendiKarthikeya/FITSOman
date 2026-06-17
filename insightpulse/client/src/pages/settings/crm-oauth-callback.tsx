import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CRMOAuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    
    
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");
    const state = urlParams.get("state");

    

    if (error) {
      
      // Send error to parent window
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "oauth_error",
            error,
            errorDescription,
          },
          window.location.origin
        );
      }
      setTimeout(() => {
        
        window.close();
      }, 3000);
      return;
    }

    if (code) {
      
      // Send success to parent window
      if (window.opener) {
        
        window.opener.postMessage(
          {
            type: "oauth_success",
            code,
          },
          window.location.origin
        );
      } else {
        
      }
      
      // Wait a bit then close
      setTimeout(() => {
        
        window.close();
      }, 2000);
    } else {
      // No code received, something went wrong
      
      
      
      
      
      
      if (window.opener) {
        window.opener.postMessage(
          {
            type: "oauth_error",
            error: "no_code",
            errorDescription: "No authorization code received from CRM. Check your redirect URI configuration.",
          },
          window.location.origin
        );
      }
      setTimeout(() => {
        window.close();
      }, 5000);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Connecting your CRM...</h2>
        <p className="text-muted-foreground">
          Please wait while we complete the authorization process.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          This window will close automatically.
        </p>
      </div>
    </div>
  );
}

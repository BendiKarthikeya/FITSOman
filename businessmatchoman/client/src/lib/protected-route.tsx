import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  adminOnly = false,
}: {
  path: string;
  component: React.ComponentType<any>;
  adminOnly?: boolean;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  if (adminOnly && user.role !== "admin") {
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  // Skip verification checks for verification pages themselves
  const isVerificationPage = path.startsWith("/verification/");
  
  if (!isVerificationPage) {
    // Redirect to appropriate verification step if not fully verified
    if (!user.isEmailVerified) {
      return (
        <Route path={path}>
          <Redirect to="/verification/email" />
        </Route>
      );
    }
    
    if (!user.isPhoneVerified) {
      return (
        <Route path={path}>
          <Redirect to="/verification/phone" />
        </Route>
      );
    }
    
    if (user.kycStatus === "rejected" || user.kycStatus === "none") {
      return (
        <Route path={path}>
          <Redirect to="/verification/kyc-docs" />
        </Route>
      );
    }
    
    if (user.kycStatus === "pending") {
      return (
        <Route path={path}>
          <Redirect to="/verification/waiting" />
        </Route>
      );
    }
  }

  return <Route path={path} component={Component} />;
}

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { AppError } from "@/utils/error-handler";

interface ErrorDisplayProps {
  error: AppError | Error;
  onRetry?: () => void;
  size?: "small" | "medium" | "large";
  showDetails?: boolean;
}

export function ErrorDisplay({
  error,
  onRetry,
  size = "medium",
  showDetails = false,
}: ErrorDisplayProps) {
  const isAppError = error instanceof AppError;
  const isNetworkError = isAppError && error.code === "NETWORK_ERROR";

  const getIcon = () => {
    if (isNetworkError) {
      return navigator.onLine ? (
        <Wifi className="w-6 h-6 text-warning" />
      ) : (
        <WifiOff className="w-6 h-6 text-error" />
      );
    }
    return <AlertTriangle className="w-6 h-6 text-error" />;
  };

  const getTitle = () => {
    if (isNetworkError) {
      return "Connection Problem";
    }
    if (isAppError && error.status === 404) {
      return "Not Found";
    }
    if (isAppError && error.status === 401) {
      return "Authentication Required";
    }
    if (isAppError && error.status === 403) {
      return "Access Denied";
    }
    return "Error";
  };

  const getMessage = () => {
    if (isNetworkError) {
      return "Please check your internet connection and try again.";
    }
    return error.message || "Something went wrong. Please try again.";
  };

  if (size === "small") {
    return (
      <div className="flex items-center gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-error truncate">
            {getTitle()}
          </p>
          <p className="text-xs text-error/80 truncate">{getMessage()}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`${size === "large" ? "max-w-lg" : "max-w-md"} w-full`}>
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-error/10 rounded-full flex items-center justify-center mb-3">
          {getIcon()}
        </div>
        <CardTitle className="font-heading text-brand-charcoal">
          {getTitle()}
        </CardTitle>
        <CardDescription className="font-sans">{getMessage()}</CardDescription>
      </CardHeader>

      {(onRetry || showDetails) && (
        <CardContent className="space-y-4">
          {showDetails && process.env.NODE_ENV === "development" && (
            <details className="bg-neutral-100 p-3 rounded-lg">
              <summary className="cursor-pointer text-sm font-medium text-neutral-700">
                Technical Details
              </summary>
              <pre className="mt-2 text-xs text-neutral-600 overflow-auto">
                {error.stack || error.message}
              </pre>
            </details>
          )}

          {onRetry && (
            <Button
              onClick={onRetry}
              className="w-full flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default ErrorDisplay;

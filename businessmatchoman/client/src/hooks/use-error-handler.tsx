import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  parseApiError,
  formatErrorMessage,
  logError,
  AppError,
} from "@/utils/error-handler";

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: any, context?: Record<string, any>) => {
      const parsedError = parseApiError(error);
      logError(parsedError, context);

      // Show user-friendly toast message
      toast({
        variant: "destructive",
        title: "Error",
        description: formatErrorMessage(parsedError),
      });

      return parsedError;
    },
    [toast],
  );

  const handleAsyncError = useCallback(
    async (
      asyncFn: () => Promise<any>,
      context?: Record<string, any>,
    ): Promise<any> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, context);
        return null;
      }
    },
    [handleError],
  );

  const createErrorHandler = useCallback(
    (context?: Record<string, any>) => {
      return (error: any) => handleError(error, context);
    },
    [handleError],
  );

  return {
    handleError,
    handleAsyncError,
    createErrorHandler,
  };
}

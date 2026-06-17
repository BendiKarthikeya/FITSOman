/**
 * Centralized error handling utilities
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  context?: Record<string, any>;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly context: Record<string, any>;

  constructor(
    message: string,
    code = "UNKNOWN_ERROR",
    status = 500,
    context = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.context = context;
  }
}

export class NetworkError extends AppError {
  constructor(message = "Network connection failed", context = {}) {
    super(message, "NETWORK_ERROR", 0, context);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", context = {}) {
    super(message, "VALIDATION_ERROR", 400, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", context = {}) {
    super(message, "AUTH_ERROR", 401, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions", context = {}) {
    super(message, "AUTH_ERROR", 403, context);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", context = {}) {
    super(message, "NOT_FOUND", 404, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests", context = {}) {
    super(message, "RATE_LIMIT", 429, context);
  }
}

/**
 * Safe async function wrapper that catches errors
 */
export function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T | undefined> {
  return fn().catch((error) => {
    console.error("Async operation failed:", error);
    return fallback;
  });
}

/**
 * Safe sync function wrapper that catches errors
 */
export function safeSync<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (error) {
    console.error("Sync operation failed:", error);
    return fallback;
  }
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }

  // Network errors
  if (!navigator.onLine) {
    return new NetworkError("No internet connection");
  }

  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return new NetworkError("Failed to connect to server");
  }

  // HTTP errors
  if (error.status) {
    switch (error.status) {
      case 400:
        return new ValidationError(error.message || "Invalid request");
      case 401:
        return new AuthenticationError(error.message || "Please log in");
      case 403:
        return new AuthorizationError(error.message || "Access denied");
      case 404:
        return new NotFoundError(error.message || "Resource not found");
      case 429:
        return new RateLimitError(error.message || "Too many requests");
      case 500:
        return new AppError(
          error.message || "Server error",
          "SERVER_ERROR",
          500,
        );
      default:
        return new AppError(
          error.message || "An unexpected error occurred",
          "HTTP_ERROR",
          error.status,
        );
    }
  }

  // Generic errors
  return new AppError(
    error.message || "An unexpected error occurred",
    "UNKNOWN_ERROR",
  );
}

/**
 * Log error for monitoring
 */
export function logError(error: Error, context?: Record<string, any>) {
  const errorLog = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
    context,
  };

  console.error("Application Error:", errorLog);

  // In production, send to monitoring service
  if (process.env.NODE_ENV === "production") {
    // Add your error reporting service here
    // e.g., Sentry.captureException(error, { extra: context });
  }
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delay = 1000,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError!;
}

/**
 * Debounced error handler to prevent spam
 */
export function createDebouncedErrorHandler(delay = 1000) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastError: Error | null = null;

  return (error: Error, context?: Record<string, any>) => {
    lastError = error;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (lastError) {
        logError(lastError, context);
        lastError = null;
      }
    }, delay);
  };
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: AppError): string {
  switch (error.code) {
    case "NETWORK_ERROR":
      return "Connection problem. Please check your internet and try again.";
    case "AUTH_ERROR":
      return "Please log in to continue.";
    case "VALIDATION_ERROR":
      return "Please check your input and try again.";
    case "NOT_FOUND":
      return "The requested item could not be found.";
    case "RATE_LIMIT":
      return "Too many requests. Please wait a moment and try again.";
    case "SERVER_ERROR":
      return "Server temporarily unavailable. Please try again later.";
    default:
      return error.message || "Something went wrong. Please try again.";
  }
}

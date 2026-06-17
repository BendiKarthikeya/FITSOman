import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { fromZodError } from 'zod-validation-error';

// Error types for better categorization
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  BUSINESS_LOGIC = 'BUSINESS_LOGIC_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER = 'INTERNAL_SERVER_ERROR',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  FILE_UPLOAD = 'FILE_UPLOAD_ERROR',
}

// Custom error class for better error handling
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL_SERVER,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ) {
    super(message);

    this.name = this.constructor.name;
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error creators for common scenarios
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.VALIDATION, 400, true, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, ErrorType.AUTHENTICATION, 401, true, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, ErrorType.AUTHORIZATION, 403, true, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: Record<string, any>) {
    super(`${resource} not found`, ErrorType.NOT_FOUND, 404, true, context);
  }
}

export class BusinessLogicError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.BUSINESS_LOGIC, 400, true, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', context?: Record<string, any>) {
    super(message, ErrorType.DATABASE, 500, true, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, context?: Record<string, any>) {
    super(`${service} service error: ${message}`, ErrorType.EXTERNAL_SERVICE, 502, true, context);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, ErrorType.RATE_LIMIT, 429, true, context);
  }
}

export class FileUploadError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorType.FILE_UPLOAD, 400, true, context);
  }
}

// Enhanced logging system
class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLogEntry(level: string, message: string, metadata?: Record<string, any>): string {
    const entry = {
      timestamp: this.getTimestamp(),
      level: level.toUpperCase(),
      message,
      ...metadata,
    };

    return JSON.stringify(entry, null, process.env.NODE_ENV === 'development' ? 2 : 0);
  }

  info(message: string, metadata?: Record<string, any>): void {
    console.log(this.formatLogEntry('info', message, metadata));
  }

  warn(message: string, metadata?: Record<string, any>): void {
    console.warn(this.formatLogEntry('warn', message, metadata));
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorMetadata = {
      ...metadata,
      ...(error && {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
        ...(error instanceof AppError && {
          errorType: error.type,
          statusCode: error.statusCode,
          context: error.context,
          timestamp: error.timestamp,
        }),
      }),
    };

    console.error(this.formatLogEntry('error', message, errorMetadata));
  }

  debug(message: string, metadata?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatLogEntry('debug', message, metadata));
    }
  }
}

export const logger = new Logger();

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl, ip } = req;
  
  // Log request
  logger.info('Request started', {
    method,
    url: originalUrl,
    ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
  });

  // Override res.json to capture response
  const originalJson = res.json.bind(res);
  let responseBody: any;

  res.json = function(body: any) {
    responseBody = body;
    return originalJson(body);
  };

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    
    const logLevel = statusCode >= 400 ? 'warn' : 'info';
    const logMethod = statusCode >= 400 ? logger.warn.bind(logger) : logger.info.bind(logger);
    
    logMethod('Request completed', {
      method,
      url: originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip,
      responseSize: res.get('Content-Length'),
      ...(statusCode >= 400 && responseBody && { responseBody }),
    });
  });

  next();
}

// Main error handling middleware
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  // Don't handle if response already sent
  if (res.headersSent) {
    return next(error);
  }

  let appError: AppError;

  // Convert known errors to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError) {
    const message = fromZodError(error).message;
    appError = new ValidationError(message, { zodError: error.issues });
  } else if (error.name === 'MulterError') {
    const multerError = error as any;
    let message = 'File upload error';
    
    switch (multerError.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = multerError.message || message;
    }
    
    appError = new FileUploadError(message, { multerCode: multerError.code });
  } else if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
    appError = new BusinessLogicError('Resource already exists', { originalError: error.message });
  } else if (error.message.includes('foreign key constraint')) {
    appError = new BusinessLogicError('Referenced resource not found', { originalError: error.message });
  } else if (error.message.includes('connection') || error.message.includes('timeout')) {
    appError = new DatabaseError('Database connection error', { originalError: error.message });
  } else {
    // Unknown error - log it and create generic error
    logger.error('Unhandled error occurred', error, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    
    appError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error'
        : error.message,
      ErrorType.INTERNAL_SERVER,
      500,
      false
    );
  }

  // Log operational errors
  if (appError.isOperational) {
    logger.warn('Operational error occurred', {
      type: appError.type,
      message: appError.message,
      statusCode: appError.statusCode,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      context: appError.context,
    });
  } else {
    logger.error('Critical error occurred', appError, {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  }

  // Prepare error response
  const errorResponse: any = {
    error: true,
    type: appError.type,
    message: appError.message,
    timestamp: appError.timestamp,
  };

  // Add context in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.context = appError.context;
    errorResponse.stack = appError.stack;
  }

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
}

// 404 handler for routes not found
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError('Route', {
    method: req.method,
    url: req.originalUrl,
  });
  
  next(error);
}

// Async error wrapper for route handlers
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Database operation wrapper with proper error handling
export async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    logger.error(`Database operation failed: ${operationName}`, error as Error);
    
    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        throw new DatabaseError('Database connection failed');
      } else if (error.message.includes('timeout')) {
        throw new DatabaseError('Database operation timed out');
      } else if (error.message.includes('duplicate key')) {
        throw new BusinessLogicError('Resource already exists');
      } else if (error.message.includes('foreign key')) {
        throw new BusinessLogicError('Referenced resource not found');
      }
    }
    
    throw new DatabaseError(`Failed to ${operationName}`);
  }
}

// Health check error handling
export function createHealthCheck() {
  return asyncHandler(async (req: Request, res: Response) => {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
    };

    logger.info('Health check performed', healthData);
    res.json(healthData);
  });
}

// Graceful shutdown handler
export function setupGracefulShutdown(server: any): void {
  const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, starting graceful shutdown`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Rejection', new Error(reason));
    process.exit(1);
  });
}
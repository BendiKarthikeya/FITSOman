import rateLimit from "express-rate-limit";
import helmet from "helmet";
import csrf from "csurf";
import { NextFunction, Request as ExpressRequest, Response } from "express";
import { storage } from "./storage";

// Extended Request type to handle file uploads
interface Request extends ExpressRequest {
  files?: {
    [fieldname: string]: any;
  };
  file?: Express.Multer.File;
}

// Simple in-memory store for tracking security violations
// In production, this should be replaced with Redis or similar
const securityViolations: Record<
  string,
  { count: number; lastViolation: number }
> = {};

// Reset all security violations on server start to clear any existing blocks
console.log("[INFO] Resetting all security violations on server start");
Object.keys(securityViolations).forEach((key) => {
  delete securityViolations[key];
});

/**
 * Sanitize filename to prevent directory traversal attacks and other security issues
 * @param filename Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components (prevents directory traversal)
  let sanitized = filename.replace(/^.*[\\\/]/, "");

  // Remove special characters that could be problematic
  sanitized = sanitized.replace(/[^\w\s.-]/g, "");

  // Add a random suffix for uniqueness and to prevent overwriting
  const randomSuffix = Date.now() + "-" + Math.round(Math.random() * 1000);

  // Construct final filename with original name (sanitized) and random suffix
  const parts = sanitized.split(".");
  const ext = parts.pop() || ""; // Get file extension
  const name = parts.join("."); // Get file name without extension

  return `${name}-${randomSuffix}.${ext}`;
}

// 1. Rate Limiting configuration
export const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: "Too many login attempts. Please try again after 1 minute.",
  },
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 requests per minute per IP - increased for better user experience
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: "Too many registration attempts. Please try again after 1 minute.",
  },
});

export const kycDocUploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // 2 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message:
      "Too many document upload attempts. Please try again after 1 minute.",
  },
});

export const createListingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per IP - increased for legitimate usage
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message:
      "Listing creation rate limit reached. Please try again after 1 hour.",
  },
});

// File upload rate limiter
export const fileUploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 uploads per 5 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: "Too many file uploads. Please try again after 5 minutes.",
  },
});

// General API rate limiter
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000, // 1000 requests in dev, 300 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: "Rate limit exceeded. Please try again after 15 minutes.",
  },
});

// Admin API rate limiter (more restrictive)
export const adminApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: process.env.NODE_ENV === 'production' ? 30 : 200, // 200 requests in dev, 30 in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: true,
    message: "Admin API rate limit exceeded. Please try again after 5 minutes.",
  },
});

// 2. CSRF Protection
// Note: This should only be used if the app uses cookies for session management
export const csrfProtection = csrf({ cookie: true });

// CSRF error handler middleware
export function csrfErrorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err.code !== "EBADCSRFTOKEN") return next(err);

  // Handle CSRF token errors
  return res.status(403).json({
    error: true,
    message:
      "Invalid or missing CSRF token. Please refresh the page and try again.",
  });
}

// 3. Helmet middleware for security headers
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for development
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://libretranslate.de", "*"], // Allow all API calls for now, can be restricted later
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // May need adjustments based on your app
});

/**
 * Middleware to track and handle security violations
 * This can be applied to routes that should be monitored for security issues
 */
export function securityViolationTracker(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const ip = req.ip || "unknown";
  const method = req.method;
  const path = req.path;

  console.log(
    `[DEBUG] securityViolationTracker checking ${method} request to ${path} from ${ip}`,
  );

  // Skip security checks for image uploads
  if (path.includes("/upload") && method === "POST") {
    console.log(
      "[DEBUG] Skipping security violation check for image upload request",
    );
    return next();
  }

  // Initialize if first time seeing this IP
  if (!securityViolations[ip]) {
    securityViolations[ip] = {
      count: 0,
      lastViolation: Date.now(),
    };
    console.log(
      `[DEBUG] First request from IP: ${ip}, initializing security tracking`,
    );
  }

  // Check for repeat violations
  const violation = securityViolations[ip];
  const hoursSinceLastViolation =
    (Date.now() - violation.lastViolation) / (1000 * 60 * 60);

  // Reset counter if it's been more than 24 hours since last violation
  if (hoursSinceLastViolation > 24) {
    console.log(
      `[DEBUG] Resetting violation count for IP: ${ip} (${hoursSinceLastViolation.toFixed(2)} hours since last violation)`,
    );
    violation.count = 0;
  }

  // For debugging, don't increment violation count
  // violation.count++;
  violation.lastViolation = Date.now();

  console.log(
    `[DEBUG] Current violation count for IP ${ip}: ${violation.count}`,
  );

  // Block if too many violations - increased threshold to 20
  if (violation.count >= 20) {
    // Log for admin review
    console.warn(
      `Security violation threshold reached for IP: ${ip}. Blocking.`,
    );

    // Could implement IP blocking in production
    return res.status(403).json({
      error: true,
      message: "Access denied due to security policy violations.",
    });
  }

  next();
}

/**
 * Middleware to validate file upload security
 * This checks file types and sizes before allowing uploads
 * Works with both Multer and express-fileupload
 */
export function secureFileUploadValidator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log("[DEBUG] Running secureFileUploadValidator middleware");

  // Permitted file types for uploads
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/svg+xml",
    "image/x-icon",
    "image/vnd.microsoft.icon",
    "image/gif",
    "image/webp",
  ];

  // Max file size (5MB in bytes)
  const maxSize = 10 * 1024 * 1024; // Increased to 10MB for larger images

  // Check files based on the middleware used (Multer or express-fileupload)
  if (req.file) {
    console.log(
      `[DEBUG] Validating uploaded file: ${req.file.originalname}, mimetype: ${req.file.mimetype}, size: ${req.file.size}`,
    );

    // Multer (single file)
    // Check file type
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      console.warn(`[WARN] File type not allowed: ${req.file.mimetype}`);
      return res.status(400).json({
        error: true,
        message:
          "File type not allowed. Please upload images in JPEG, PNG, SVG, ICO, GIF, WebP or PDF format only.",
      });
    }

    // Check file size (10MB limit)
    if (req.file.size > maxSize) {
      console.warn(
        `[WARN] File size exceeds limit: ${req.file.size} > ${maxSize}`,
      );
      return res.status(400).json({
        error: true,
        message: "File size exceeds the 10MB limit.",
      });
    }

    // Sanitize filename for logging purposes only
    const sanitizedFilename = sanitizeFilename(req.file.originalname);
    console.log(`[DEBUG] Sanitized filename: ${sanitizedFilename}`);

    // Only replace the originalname, preserve the generated filename from multer
    req.file.originalname = sanitizedFilename;
    // DO NOT replace the multer-generated filename
    // req.file.filename = sanitizedFilename;
  } else if (req.files) {
    // express-fileupload
    // Check if files object exists and contains the file property
    if (!req.files || !("file" in req.files)) {
      return next();
    }

    // Type guard to ensure we can safely access req.files.file
    const fileField = req.files.file as any;

    const fileArray = Array.isArray(fileField) ? fileField : [fileField];

    // Validate each file
    for (const file of fileArray) {
      // Check file type
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: true,
          message:
            "File type not allowed. Please upload images in JPEG, PNG, SVG, ICO, GIF, WebP or PDF format only.",
        });
      }

      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          error: true,
          message: "File size exceeds the 5MB limit.",
        });
      }

      // Sanitize filename
      file.name = sanitizeFilename(file.name);
    }
  }

  next();
}

/**
 * Function to set up all security middleware on the Express app
 */
export function setupSecurity(app: any) {
  // Apply Helmet middleware globally
  app.use(securityHeaders);

  // Apply enhanced security headers for all responses
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Prevent browsers from detecting the MIME type
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Prevent clickjacking
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // Enable the XSS filter in browsers
    res.setHeader("X-XSS-Protection", "1; mode=block");

    // Allow same-origin frames
    res.setHeader("Content-Security-Policy", "frame-ancestors 'self'");

    // Set referrer policy
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

    next();
  });

  // Apply general API rate limiter to all API routes
  app.use("/api", generalApiLimiter);

  // Apply specific rate limiters to routes that need tighter control
  app.use("/api/login", loginLimiter);
  app.use("/api/register", registerLimiter);
  app.use("/api/kyc/upload", kycDocUploadLimiter);

  // Apply listing rate limiter only to POST requests for creating listings
  app.use(
    "/api/listings",
    (req: Request, res: Response, next: NextFunction) => {
      if (req.method === "POST") {
        return createListingLimiter(req, res, next);
      }
      next();
    },
  );

  app.use("/api/admin", adminApiLimiter);

  // Apply file upload rate limiter to upload endpoints
  app.use("/api/admin/upload", fileUploadLimiter);
  app.use("/api/admin/settings/upload", fileUploadLimiter);

  // Apply to auth routes as well
  app.use("/auth/login", loginLimiter);
  app.use("/auth/register", registerLimiter);

  // Apply security violation tracker to sensitive endpoints - but exclude admin settings routes
  app.use(["/auth/admin", "/api/kyc"], securityViolationTracker);

  // Apply security violations to admin routes except settings routes & uploads
  app.use("/api/admin", (req: Request, res: Response, next: NextFunction) => {
    // Log the route being accessed
    console.log(`[DEBUG] Admin route accessed: ${req.method} ${req.path}`);

    // Skip security violation tracker for admin settings routes and uploads
    if (req.path.includes("/settings") || req.path.includes("/upload")) {
      console.log(
        `[DEBUG] Skipping security violation checks for admin ${req.path}`,
      );
      return next();
    }

    return securityViolationTracker(req, res, next);
  });

  // CSRF protection for cookie-based sessions if needed
  // Uncomment these if your app uses cookies for session management
  // app.use(csrfProtection);
  // app.use(csrfErrorHandler);
}

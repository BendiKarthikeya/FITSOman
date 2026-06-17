import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./vite-static";
import { checkDbConnection, runMigrations, closePool } from "./db";
import { setupSecurity } from "./security";
import { setupAuth } from "./auth";
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger, 
  createHealthCheck, 
  setupGracefulShutdown,
  logger 
} from "./error-handler";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";

const app = express();
// Set trust proxy to fix the rate limiter issue with X-Forwarded-For header
app.set("trust proxy", 1);
// Set reasonable limits for JSON payload to prevent resource exhaustion (2MB)
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "2mb" }));

// Add request logging middleware
app.use(requestLogger);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Set up application security middleware first (faster)
  log("Setting up security middleware...");
  setupSecurity(app);

  // Set up authentication routes (also fast)
  log("Setting up authentication routes...");
  setupAuth(app);

  // Set up static file serving for uploads
  const uploadsDir = path.resolve("./public/uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    log("Created uploads directory");
  }
  log("Serving static files from: " + uploadsDir);

  // Initialize database connection if DATABASE_URL is set (can be slower)
  if (process.env.DATABASE_URL) {
    try {
      log("Checking database connection...");

      // Use a very short timeout to prevent hanging on database connection
      const dbConnectionPromise = checkDbConnection();
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(
          () => reject(new Error("Database connection timeout")),
          3000, // Reduced to 3 seconds for faster startup
        );
      });

      const connected = await Promise.race([
        dbConnectionPromise,
        timeoutPromise,
      ]);

      if (connected) {
        log("Database connected successfully");
        try {
          log("Running database migrations...");

          // Also timeout migrations with shorter timeout
          const migrationPromise = runMigrations();
          const migrationTimeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error("Migration timeout")), 10000); // Reduced from 15000 to 10000
          });

          await Promise.race([migrationPromise, migrationTimeoutPromise]);
          log("Migrations completed successfully");
        } catch (error) {
          console.error(
            "Failed to run migrations, continuing without database:",
            error instanceof Error ? error.message : String(error),
          );
          // Don't exit - continue with in-memory storage
        }
      } else {
        console.error(
          "Database connection failed, falling back to in-memory storage",
        );
      }
    } catch (error) {
      console.error(
        "Database initialization error, continuing without database:",
        error instanceof Error ? error.message : String(error),
      );
      // Don't exit - continue with in-memory storage
    }
  } else {
    log("No DATABASE_URL found, using in-memory storage");
  }

  // Provide both synchronous and asynchronous image saving methods
  app.locals.saveImage = (base64Data: string, fileName: string): string => {
    console.log(`[DEBUG] saveImage called with fileName: ${fileName}`);

    // Simple utility to ensure the uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log(`[DEBUG] Created uploads directory: ${uploadsDir}`);
    }

    // Remove the base64 header
    const base64Regex = /^data:image\/\w+;base64,/;
    const cleanBase64 = base64Data.replace(base64Regex, "");
    const filePath = path.join(uploadsDir, fileName);

    // Convert base64 to buffer
    const buffer = Buffer.from(cleanBase64, "base64");

    try {
      // Direct file write
      fs.writeFileSync(filePath, buffer);
      console.log(
        `[DEBUG] Successfully wrote file: ${filePath} (${buffer.length} bytes)`,
      );

      // Verify the file
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(
          `[DEBUG] Verified file exists with size: ${stats.size} bytes`,
        );

        // Return the public URL
        const fileUrl = `/uploads/${fileName}`;
        return fileUrl;
      } else {
        throw new Error("File could not be verified after writing");
      }
    } catch (error) {
      console.error(
        `[ERROR] Failed to save image: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  };

  // Also provide an async version for use with Promises
  app.locals.saveImageAsync = async (
    base64Data: string,
    fileName: string,
  ): Promise<string> => {
    console.log(`[DEBUG] saveImageAsync called with fileName: ${fileName}`);

    try {
      // Make sure the directory exists
      await fsPromises.mkdir(uploadsDir, { recursive: true });

      // Remove the base64 header
      const base64Regex = /^data:image\/\w+;base64,/;
      const cleanBase64 = base64Data.replace(base64Regex, "");
      const filePath = path.join(uploadsDir, fileName);

      // Write the file
      const buffer = Buffer.from(cleanBase64, "base64");
      await fsPromises.writeFile(filePath, buffer);

      console.log(
        `[DEBUG] Successfully wrote file asynchronously: ${filePath} (${buffer.length} bytes)`,
      );

      // Generate the public URL
      const fileUrl = `/uploads/${fileName}`;
      return fileUrl;
    } catch (error) {
      console.error(
        `[ERROR] Async save failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  };

  app.use(
    "/uploads",
    (req, res, next) => {
      // Enhanced debug logging to trace image requests
      console.log(`[DEBUG] Static file request for: ${req.path}`);

      // Clean up the path to ensure no directory traversal
      const cleanPath = req.path.replace(/^\/+/, "").replace(/\.\.+/g, "");
      const filePath = path.join(uploadsDir, cleanPath);

      // Add detailed file checking
      if (!fs.existsSync(filePath)) {
        console.error(`[ERROR] File not found: ${filePath}`);

        // Log directory contents to help debug
        try {
          const uploadsFiles = fs.readdirSync(uploadsDir);
          console.log(
            `[DEBUG] Files in uploads directory (${uploadsFiles.length}):`,
            uploadsFiles,
          );
        } catch (err) {
          console.error(`[ERROR] Could not read uploads directory:`, err);
        }

        return res.status(404).send("File not found");
      }

      // Get file stats for debugging
      try {
        const stats = fs.statSync(filePath);
        console.log(
          `[DEBUG] Serving file: ${filePath} (${stats.size} bytes, modified ${stats.mtime})`,
        );
      } catch (err) {
        console.error(`[ERROR] Error getting file stats:`, err);
      }

      // Set headers directly for this specific request
      res.setHeader(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, proxy-revalidate",
      );
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");

      // Add a unique header to help debug caching
      res.setHeader("X-Image-Timestamp", Date.now().toString());

      next();
    },
    express.static(uploadsDir, {
      maxAge: 0,
      etag: false,
      lastModified: true,
      setHeaders: (res) => {
        // Prevent caching of uploaded files (especially images)
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
        // Add a cross-origin header to prevent CORS issues
        res.setHeader("Access-Control-Allow-Origin", "*");
      },
    }),
  );
  log("Serving static files with NO-CACHE from: " + uploadsDir);

  // Register API routes
  const server = await registerRoutes(app);

  // Add health check endpoints
  app.get("/health", createHealthCheck());
  app.get("/api/health", createHealthCheck());

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Use NODE_ENV to decide dev vs prod so bundlers can tree-shake
  if ((process.env.NODE_ENV || "development") !== "production") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Add 404 handler for undefined routes (AFTER all other routes including Vite)
  app.use(notFoundHandler);

  // Enhanced global error handler (must be last)
  app.use(errorHandler);

  // Serve the app on the PORT provided by the environment (Cloud Run sets PORT)
  // Fallback to 5000 for local/dev usage
  const port = parseInt(process.env.PORT || "5000", 10);

  // Start the server immediately to bind to the port
  const listenOptions: { port: number; host: string; reusePort?: boolean } = {
    port,
    host: process.env.NODE_ENV === 'production' ? "0.0.0.0" : "localhost",
  };

  if (process.platform !== "win32" && process.platform !== "darwin") {
    listenOptions.reusePort = true;
  }

  const serverInstance = server.listen(
    listenOptions,
    () => {
      logger.info("Server started successfully", {
        port,
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
      });
      log(`serving on port ${port}`);
    },
  );

  // Setup enhanced graceful shutdown
  setupGracefulShutdown(serverInstance);

  // Add comprehensive error handlers for server startup
  serverInstance.on("error", (err) => {
    console.error("[ERROR] Server startup error:", err);
    process.exit(1);
  });

  serverInstance.on("close", () => {
    console.log("[INFO] Server closed");
  });

  // Handle uncaught exceptions to prevent crashes
  process.on("uncaughtException", (err) => {
    console.error("[FATAL] Uncaught Exception:", {
      message: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
    });

    // Gracefully close server and database pool
    serverInstance.close(async () => {
      try {
        await closePool();
        console.log(
          "[INFO] Server and database pool closed due to uncaught exception",
        );
      } catch (error) {
        console.error("[ERROR] Error closing database pool:", error);
      }
      process.exit(1);
    });

    // Force exit if server doesn't close within 5 seconds
    setTimeout(() => {
      console.error("[FATAL] Force exit due to timeout");
      process.exit(1);
    }, 5000);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason, promise) => {
    console.error("[ERROR] Unhandled Promise Rejection:", {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      promise: promise,
      timestamp: new Date().toISOString(),
    });

    // Don't exit on unhandled rejections, just log them
    // This prevents crashes from async operations
  });

  // Handle graceful shutdown signals
  process.on("SIGTERM", () => {
    console.log("[INFO] SIGTERM received, shutting down gracefully");
    serverInstance.close(async () => {
      try {
        await closePool();
        console.log("[INFO] Server and database pool closed gracefully");
      } catch (error) {
        console.error("[ERROR] Error closing database pool:", error);
      }
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    console.log("[INFO] SIGINT received, shutting down gracefully");
    serverInstance.close(async () => {
      try {
        await closePool();
        console.log("[INFO] Server and database pool closed gracefully");
      } catch (error) {
        console.error("[ERROR] Error closing database pool:", error);
      }
      process.exit(0);
    });
  });
})();


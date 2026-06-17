import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import sharp from "sharp";
import { randomUUID } from "crypto";
import multer from "multer";
import { storage } from "./storage";
import { upload, handleMulterError } from "./multer-upload";
import {
  User,
  listingStatusTypes,
  kycStatusTypes,
  successStoryStatusTypes,
  type Listing,
  type Kyc,
  type KycDoc,
  type SuccessStory,
  type Translation,
} from "@shared/schema";

// Define file type for directory listings
interface FileInfo {
  name: string;
  stats: fs.Stats;
  isDirectory?: boolean;
}

// Extend Request type to include user property with proper User type
interface AuthenticatedRequest extends Request {
  // JWT auth puts the user directly on the request object, no isAuthenticated() needed
  user?: User; // Use the User type from schema
}

// Create Express router
const adminRouter = Router();

// Admin-only middleware
adminRouter.use((req: AuthenticatedRequest, res: Response, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden: Admin access required" });
  }
  next();
});

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(
    `[INFO] Created uploads directory in admin routes: ${uploadsDir}`,
  );
}

// Set proper directory permissions
try {
  fs.chmodSync(uploadsDir, 0o755);
  console.log(`[INFO] Set uploads directory permissions to 755`);
} catch (error) {
  console.error(`[ERROR] Failed to set uploads directory permissions:`, error);
}

/**
 * Get all listings for admin with optional status filter
 */
adminRouter.get(
  "/listings",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as
        | (typeof listingStatusTypes)[number]
        | undefined;

      // Get all listings or filter by status if provided
      const allListings = await storage.getListings(status ? { status } : {});

      res.json(allListings);
    } catch (error: any) {
      console.error("Error fetching admin listings:", error);
      res.status(500).json({ error: "Failed to fetch listings" });
    }
  },
);

/**
 * Get a single listing by ID
 */
adminRouter.get(
  "/listings/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const listingId = parseInt(req.params.id);

      if (isNaN(listingId)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }

      const listing = await storage.getListing(listingId);

      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      res.json(listing);
    } catch (error: any) {
      console.error("Error fetching listing details:", error);
      res.status(500).json({ error: "Failed to fetch listing details" });
    }
  },
);

/**
 * Approve a listing
 */
adminRouter.patch(
  "/listings/:id/approve",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const listingId = parseInt(req.params.id);

      if (isNaN(listingId)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }

      // Get the existing listing
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Update the listing status to approved
      const updatedListing = await storage.updateListing(listingId, {
        status: "approved",
        updatedAt: new Date(),
      });

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "listing",
        entityId: listingId,
        action: "approve",
        reason: "Listing approved by administrator",
      });

      res.json(updatedListing);
    } catch (error: any) {
      console.error("Error approving listing:", error);
      res.status(500).json({ error: "Failed to approve listing" });
    }
  },
);

/**
 * Reject a listing
 */
adminRouter.patch(
  "/listings/:id/reject",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const listingId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(listingId)) {
        return res.status(400).json({ error: "Invalid listing ID" });
      }

      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      // Get the existing listing
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ error: "Listing not found" });
      }

      // Update the listing status to rejected
      const updatedListing = await storage.updateListing(listingId, {
        status: "rejected",
        updatedAt: new Date(),
      });

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "listing",
        entityId: listingId,
        action: "reject",
        reason: reason,
      });

      res.json(updatedListing);
    } catch (error: any) {
      console.error("Error rejecting listing:", error);
      res.status(500).json({ error: "Failed to reject listing" });
    }
  },
);

/**
 * Check directories for image debug
 */
adminRouter.get(
  "/check-directories",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const readdir = promisify(fs.readdir);
      const stat = promisify(fs.stat);
      const access = promisify(fs.access);

      // Check uploads directory
      const uploadsPath = path.join(process.cwd(), "public", "uploads");
      const publicPath = path.join(process.cwd(), "public");

      let uploadsExists = false;
      let uploadsWritable = false;
      let uploadsFiles: FileInfo[] = [];

      try {
        await access(uploadsPath, fs.constants.F_OK);
        uploadsExists = true;

        try {
          await access(uploadsPath, fs.constants.W_OK);
          uploadsWritable = true;
        } catch (err) {
          uploadsWritable = false;
        }

        if (uploadsExists) {
          const files = await readdir(uploadsPath);
          // Get file stats for the most recent 10 files
          const fileStats = await Promise.all(
            files.slice(-10).map(async (file) => {
              const filePath = path.join(uploadsPath, file);
              const stats = await stat(filePath);
              return { name: file, stats };
            }),
          );

          // Sort by modification time, newest first
          uploadsFiles = fileStats.sort(
            (a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime(),
          );
        }
      } catch (err) {
        console.error("Error checking uploads directory:", err);
        uploadsExists = false;
      }

      // Check public directory
      let publicExists = false;
      let publicWritable = false;
      let publicDirs: FileInfo[] = [];

      try {
        await access(publicPath, fs.constants.F_OK);
        publicExists = true;

        try {
          await access(publicPath, fs.constants.W_OK);
          publicWritable = true;
        } catch (err) {
          publicWritable = false;
        }

        if (publicExists) {
          const files = await readdir(publicPath);
          const dirStats = await Promise.all(
            files.map(async (file) => {
              const filePath = path.join(publicPath, file);
              const stats = await stat(filePath);
              return { name: file, stats, isDirectory: stats.isDirectory() };
            }),
          );

          // Only return directories
          publicDirs = dirStats
            .filter((item) => item.isDirectory)
            .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
        }
      } catch (err) {
        console.error("Error checking public directory:", err);
        publicExists = false;
      }

      res.json({
        directories: {
          uploadsDir: {
            path: uploadsPath,
            exists: uploadsExists,
            writable: uploadsWritable,
            files: uploadsFiles,
          },
          publicDir: {
            path: publicPath,
            exists: publicExists,
            writable: publicWritable,
            files: publicDirs,
          },
        },
      });
    } catch (error) {
      console.error("Error in directory check:", error);
      res.status(500).json({ error: "Server error checking directories" });
    }
  },
);

/**
 * Create a test image for debugging
 */
adminRouter.post(
  "/create-test-image",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user || req.user.role !== "admin") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const uploadsPath = path.join(process.cwd(), "public", "uploads");

      // Ensure the uploads directory exists
      if (!fs.existsSync(uploadsPath)) {
        fs.mkdirSync(uploadsPath, { recursive: true });
      }

      // Generate a random ID for the image
      const imageId = randomUUID();
      const fileName = `test-image-${imageId}.png`;
      const outputPath = path.join(uploadsPath, fileName);

      // Create a simple test image with sharp (500x300 with text)
      await sharp({
        create: {
          width: 500,
          height: 300,
          channels: 4,
          background: { r: 50, g: 100, b: 200, alpha: 1 },
        },
      })
        .composite([
          {
            input: Buffer.from(`
        <svg width="500" height="300">
          <rect x="0" y="0" width="500" height="300" fill="none"/>
          <text x="250" y="130" font-family="Arial" font-size="24" fill="white" text-anchor="middle">Test Image</text>
          <text x="250" y="170" font-family="Arial" font-size="18" fill="white" text-anchor="middle">${new Date().toISOString()}</text>
          <text x="250" y="200" font-family="Arial" font-size="14" fill="white" text-anchor="middle">ID: ${imageId}</text>
        </svg>
      `),
            gravity: "center",
          },
        ])
        .png()
        .toFile(outputPath);

      // Create a setting for this test image
      const settingKey = `test_image_${Date.now()}`;
      await storage.createSetting({
        key: settingKey,
        value: `/uploads/${fileName}`,
        type: "image",
      });

      res.json({
        success: true,
        url: `/uploads/${fileName}`,
        settingKey,
      });
    } catch (error) {
      console.error("Error creating test image:", error);
      res.status(500).json({ error: "Server error creating test image" });
    }
  },
);

/**
 * Debug endpoint for directly updating settings
 */
adminRouter.post(
  "/debug-update-setting",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Just check if user exists on the request and is an admin
      // This is redundant with verifyAuthAndAdmin middleware but kept for safety
      if (!req.user || req.user.role !== "admin") {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { key, value, type } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({
          message: "Key and value are required",
        });
      }

      console.log(
        `[DEBUG] Debug update for setting: key=${key}, value=${value}, type=${type || "not specified"}`,
      );

      // First, get current setting
      const currentSetting = await storage.getSetting(key);
      console.log("[DEBUG] Current setting value:", currentSetting);

      // Update the setting
      const updatedSetting = await storage.updateSetting(
        key,
        value,
        type || (currentSetting ? currentSetting.type : "text"),
      );

      if (!updatedSetting) {
        return res.status(500).json({
          message: "Failed to update setting",
          success: false,
          previousValue: currentSetting,
        });
      }

      console.log("[DEBUG] Setting updated successfully:", updatedSetting);

      res.status(200).json({
        message: "Setting updated successfully",
        success: true,
        previousValue: currentSetting,
        newValue: updatedSetting,
      });
    } catch (error) {
      console.error("[ERROR] Error in debug update setting:", error);
      res.status(500).json({
        error: "Server error updating setting",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * List files in a directory for the file explorer
 */
adminRouter.get(
  "/list-files",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Only admins can use this endpoint
      if (!req.user || req.user.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Forbidden: Admin access required" });
      }

      let dirPath = (req.query.path as string) || "/uploads";

      // Sanitize and normalize the path to prevent directory traversal
      // Ensure it starts with /uploads to limit browsing to uploads directory
      if (!dirPath.startsWith("/uploads")) {
        dirPath = "/uploads";
      }

      // Remove any "../" attempts
      dirPath = dirPath.replace(/\.\.\//g, "").replace(/\.\./g, "");

      // Convert the relative path to an absolute one
      const absolutePath = path.resolve(`./public${dirPath}`);

      // Security check: ensure we're still within the uploads directory
      const uploadsDir = path.resolve("./public/uploads");
      if (
        !absolutePath.startsWith(uploadsDir) &&
        absolutePath !== path.resolve("./public/uploads")
      ) {
        return res.status(403).json({
          error: "Access denied: Cannot navigate outside uploads directory",
          path: dirPath,
          absolutePath,
          uploadsDir,
        });
      }

      // Check if directory exists
      if (
        !fs.existsSync(absolutePath) ||
        !fs.statSync(absolutePath).isDirectory()
      ) {
        return res.status(404).json({
          error: "Directory not found",
          path: dirPath,
        });
      }

      // Read directory contents
      const fileNames = fs.readdirSync(absolutePath);

      // Get file details
      const files = fileNames.map((name) => {
        const filePath = path.join(absolutePath, name);
        const stats = fs.statSync(filePath);

        return {
          name,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          path: path.join(dirPath, name),
          created: stats.birthtime,
          modified: stats.mtime,
        };
      });

      // Sort directories first, then files
      files.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      // Return the file list
      return res.json({
        path: dirPath,
        files,
        parentPath: dirPath === "/uploads" ? null : path.dirname(dirPath),
        dirExists: true,
        absolutePath,
      });
    } catch (error: any) {
      console.error("[ERROR] Error listing files:", error);
      return res.status(500).json({
        error:
          error.message || "An error occurred listing the directory contents",
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  },
);

/**
 * Get all KYC documents with optional status filter
 */
adminRouter.get(
  "/kyc/docs",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as string | undefined;

      // Get all KYC documents with optional status filter
      const kycDocs = await storage.getAllKycDocs();

      // Filter by status if provided
      const filteredDocs = status
        ? kycDocs.filter((doc) => doc.status === status)
        : kycDocs;

      // Get user information for each document
      const enrichedDocs = await Promise.all(
        filteredDocs.map(async (doc) => {
          const user = await storage.getUser(doc.userId);
          return {
            ...doc,
            user: user
              ? {
                  id: user.id,
                  username: user.username,
                  email: user.email,
                  fullName: user.fullName,
                }
              : undefined,
          };
        }),
      );

      res.json(enrichedDocs);
    } catch (error: any) {
      console.error("Error fetching KYC documents:", error);
      res.status(500).json({ error: "Failed to fetch KYC documents" });
    }
  },
);

/**
 * Get all KYC applications with optional status filter
 */
adminRouter.get("/kyc", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as
      | (typeof kycStatusTypes)[number]
      | undefined;

    let kycApplications;
    if (status) {
      // If specific status was requested
      kycApplications = await storage.getAllKyc(status);
    } else {
      // Get all KYC applications
      kycApplications = await storage.getAllKyc();
    }

    // Get additional user information for each KYC application
    const enrichedKycData = await Promise.all(
      kycApplications.map(async (kyc) => {
        const user = await storage.getUser(kyc.userId);
        return {
          ...kyc,
          user: user
            ? {
                id: user.id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
              }
            : undefined,
        };
      }),
    );

    res.json(enrichedKycData);
  } catch (error: any) {
    console.error("Error fetching KYC applications:", error);
    res.status(500).json({ error: "Failed to fetch KYC applications" });
  }
});

/**
 * Get a single KYC application by ID
 */
adminRouter.get(
  "/kyc/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kycId = parseInt(req.params.id);

      if (isNaN(kycId)) {
        return res.status(400).json({ error: "Invalid KYC ID" });
      }

      const kyc = await storage.getKyc(kycId);

      if (!kyc) {
        return res.status(404).json({ error: "KYC application not found" });
      }

      // Get user information and KYC documents
      const user = await storage.getUser(kyc.userId);
      const kycDocs = await storage.getKycDocsByUserId(kyc.userId);

      res.json({
        ...kyc,
        user: user
          ? {
              id: user.id,
              username: user.username,
              email: user.email,
              fullName: user.fullName,
            }
          : undefined,
        documents: kycDocs,
      });
    } catch (error: any) {
      console.error("Error fetching KYC details:", error);
      res.status(500).json({ error: "Failed to fetch KYC details" });
    }
  },
);

/**
 * Approve a KYC application
 */
adminRouter.patch(
  "/kyc/:id/approve",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kycId = parseInt(req.params.id);

      if (isNaN(kycId)) {
        return res.status(400).json({ error: "Invalid KYC ID" });
      }

      // Get the existing KYC application
      const kyc = await storage.getKyc(kycId);
      if (!kyc) {
        return res.status(404).json({ error: "KYC application not found" });
      }

      // Update the KYC status to approved
      const updatedKyc = await storage.approveKyc(kycId, req.user!.id);

      // Update the user's verification status
      await storage.updateUser(kyc.userId, {
        verified: true,
        kycStatus: "approved"
      });

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "kyc",
        entityId: kycId,
        action: "approve",
        reason: "KYC application approved by administrator",
      });

      res.json(updatedKyc);
    } catch (error: any) {
      console.error("Error approving KYC application:", error);
      res.status(500).json({ error: "Failed to approve KYC application" });
    }
  },
);

/**
 * Reject a KYC application
 */
adminRouter.patch(
  "/kyc/:id/reject",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const kycId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(kycId)) {
        return res.status(400).json({ error: "Invalid KYC ID" });
      }

      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      // Get the existing KYC application
      const kyc = await storage.getKyc(kycId);
      if (!kyc) {
        return res.status(404).json({ error: "KYC application not found" });
      }

      // Update the KYC status to rejected with reason
      const updatedKyc = await storage.rejectKyc(kycId, reason, req.user!.id);

      // Update the user's verification status
      await storage.updateUser(kyc.userId, {
        verified: false,
        kycStatus: "rejected"
      });

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "kyc",
        entityId: kycId,
        action: "reject",
        reason: reason,
      });

      res.json(updatedKyc);
    } catch (error: any) {
      console.error("Error rejecting KYC application:", error);
      res.status(500).json({ error: "Failed to reject KYC application" });
    }
  },
);

/**
 * Get all users
 */
adminRouter.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get all users, excluding password field
    const users = await storage.getAllUsers();

    // Map users to remove sensitive information
    const safeUsers = users.map((user) => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    res.json(safeUsers);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/**
 * Get user by ID
 */
adminRouter.get(
  "/users/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Remove sensitive information
      const { password, ...safeUser } = user;

      // Get additional user data
      const kycApplication = await storage.getKycByUserId(userId);
      const kycDocuments = await storage.getKycDocsByUserId(userId);
      const listings = await storage.getUserActiveListings(userId);

      res.json({
        ...safeUser,
        kycApplication,
        kycDocuments,
        listings,
      });
    } catch (error: any) {
      console.error("Error fetching user details:", error);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  },
);

/**
 * Update user profile image
 */
adminRouter.post(
  "/users/:id/update-profile-image",
  upload.single("profileImage"),
  handleMulterError,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No profile image uploaded" });
      }

      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Build the file URL
      const fileUrl = `/uploads/${req.file.filename}`;
      console.log(
        `[INFO] Profile image uploaded: ${fileUrl} for user ID: ${userId}`,
      );

      // Update the user's profile image URL
      const updatedUser = await storage.updateUser(userId, {
        profileImageUrl: fileUrl,
      });

      // Remove sensitive information
      if (updatedUser) {
        const { password, ...safeUser } = updatedUser;
        return res.status(200).json(safeUser);
      } else {
        return res
          .status(500)
          .json({ error: "Failed to update user profile image" });
      }
    } catch (error: any) {
      console.error("Error updating user profile image:", error);
      res.status(500).json({ error: "Failed to update user profile image" });
    }
  },
);

/**
 * Success Stories Management Routes
 */

/**
 * Get all success stories with optional status filter
 */
adminRouter.get(
  "/success-stories",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = req.query.status as
        | (typeof successStoryStatusTypes)[number]
        | undefined;

      // Get all success stories with optional status filter
      const stories = await storage.getSuccessStories(status);

      // Get user information for each story
      const enrichedStories = await Promise.all(
        stories.map(async (story) => {
          const user = await storage.getUser(story.userId);
          return {
            ...story,
            user: user
              ? {
                  id: user.id,
                  username: user.username,
                  email: user.email,
                  fullName: user.fullName,
                }
              : undefined,
          };
        }),
      );

      res.json(enrichedStories);
    } catch (error: any) {
      console.error("Error fetching success stories:", error);
      res.status(500).json({ error: "Failed to fetch success stories" });
    }
  },
);

/**
 * Get a single success story by ID
 */
adminRouter.get(
  "/success-stories/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid success story ID" });
      }

      const story = await storage.getSuccessStory(storyId);

      if (!story) {
        return res.status(404).json({ error: "Success story not found" });
      }

      // Get user information
      const user = await storage.getUser(story.userId);

      res.json({
        ...story,
        user: user
          ? {
              id: user.id,
              username: user.username,
              email: user.email,
              fullName: user.fullName,
            }
          : undefined,
      });
    } catch (error: any) {
      console.error("Error fetching success story details:", error);
      res.status(500).json({ error: "Failed to fetch success story details" });
    }
  },
);

/**
 * Approve a success story
 */
adminRouter.patch(
  "/success-stories/:id/approve",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid success story ID" });
      }

      // Get the existing story
      const story = await storage.getSuccessStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Success story not found" });
      }

      // Approve the story
      const updatedStory = await storage.approveSuccessStory(
        storyId,
        req.user!.id,
      );

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "success_story",
        entityId: storyId,
        action: "approve",
        reason: "Success story approved by administrator",
      });

      res.json(updatedStory);
    } catch (error: any) {
      console.error("Error approving success story:", error);
      res.status(500).json({ error: "Failed to approve success story" });
    }
  },
);

/**
 * Reject a success story
 */
adminRouter.patch(
  "/success-stories/:id/reject",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const storyId = parseInt(req.params.id);
      const { reason } = req.body;

      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid success story ID" });
      }

      if (!reason) {
        return res.status(400).json({ error: "Rejection reason is required" });
      }

      // Get the existing story
      const story = await storage.getSuccessStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Success story not found" });
      }

      // Reject the story
      const updatedStory = await storage.rejectSuccessStory(
        storyId,
        reason,
        req.user!.id,
      );

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "success_story",
        entityId: storyId,
        action: "reject",
        reason: reason,
      });

      res.json(updatedStory);
    } catch (error: any) {
      console.error("Error rejecting success story:", error);
      res.status(500).json({ error: "Failed to reject success story" });
    }
  },
);

/**
 * Toggle featured status for a success story
 */
adminRouter.patch(
  "/success-stories/:id/toggle-featured",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const storyId = parseInt(req.params.id);
      const { featured } = req.body;

      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid success story ID" });
      }

      if (featured === undefined) {
        return res.status(400).json({ error: "Featured status is required" });
      }

      // Get the existing story
      const story = await storage.getSuccessStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Success story not found" });
      }

      // Toggle featured status
      const updatedStory = await storage.setSuccessStoryFeatured(
        storyId,
        featured,
      );

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "success_story",
        entityId: storyId,
        action: featured ? "feature" : "unfeature",
        reason: featured
          ? "Success story set as featured"
          : "Success story removed from featured",
      });

      res.json(updatedStory);
    } catch (error: any) {
      console.error("Error updating featured status:", error);
      res.status(500).json({ error: "Failed to update featured status" });
    }
  },
);

/**
 * Delete a success story
 */
adminRouter.delete(
  "/success-stories/:id",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ error: "Invalid success story ID" });
      }

      // Get the existing story
      const story = await storage.getSuccessStory(storyId);
      if (!story) {
        return res.status(404).json({ error: "Success story not found" });
      }

      // Delete the story
      const result = await storage.deleteSuccessStory(storyId);

      // Create moderation log entry
      await storage.createModerationLog({
        userId: req.user!.id,
        entityType: "success_story",
        entityId: storyId,
        action: "delete",
        reason: "Success story deleted by administrator",
      });

      res.json({ success: result });
    } catch (error: any) {
      console.error("Error deleting success story:", error);
      res.status(500).json({ error: "Failed to delete success story" });
    }
  },
);

/**
 * Create or update a translation
 */
adminRouter.post(
  "/translations",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { section, key, english, arabic, notes } = req.body;

      if (!section || !key) {
        return res.status(400).json({ 
          error: "Section and key are required" 
        });
      }

      // If only one language is provided, get the other from existing translation
      let finalEnglish = english;
      let finalArabic = arabic;

      // Get existing translation to preserve the other language
      const existing = await storage.getTranslation(section, key);

      if (english !== undefined && arabic === undefined) {
        // Only English provided - preserve existing Arabic (don't use English as fallback)
        finalArabic = existing?.arabic || "";
      } else if (arabic !== undefined && english === undefined) {
        // Only Arabic provided - preserve existing English (don't use Arabic as fallback)
        finalEnglish = existing?.english || "";
      } else if (english === undefined && arabic === undefined) {
        return res.status(400).json({ 
          error: "At least one language (english or arabic) is required" 
        });
      }
      // If both languages are provided, use them as-is without any fallback logic
      // This prevents empty strings from being treated as falsy and restored from DB

      const translation = await storage.createOrUpdateTranslation({
        section,
        key,
        english: finalEnglish || "",
        arabic: finalArabic || "",
        notes: notes || null,
        addedBy: req.user!.id,
      });

      res.json({ success: true, data: translation });
    } catch (error: any) {
      console.error("Error saving translation:", error);
      res.status(500).json({ error: "Failed to save translation" });
    }
  },
);

/**
 * Get all translations
 */
adminRouter.get(
  "/translations",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const allTranslations = await storage.getAllTranslations();
      res.json({ success: true, data: allTranslations });
    } catch (error: any) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  },
);

export default adminRouter;

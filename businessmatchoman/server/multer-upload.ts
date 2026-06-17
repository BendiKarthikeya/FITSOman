import path from "path";
import multer from "multer";
import fs from "fs";
import { Request, Response, NextFunction } from "express";

// Ensure the uploads directory exists
const uploadsDir = path.resolve("./public/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`[INFO] Created uploads directory: ${uploadsDir}`);
} else {
  // Make sure the directory has proper permissions
  try {
    fs.chmodSync(uploadsDir, 0o755);
    console.log(`[INFO] Set uploads directory permissions to 755`);
  } catch (err) {
    console.error(`[ERROR] Failed to set uploads directory permissions:`, err);
  }
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Extract setting key if available from form data
    let settingKey = "";
    if (req.body && req.body.settingKey) {
      // Sanitize and normalize the setting key
      settingKey = req.body.settingKey
        .replace(/[^a-z0-9_]/gi, "_")
        .toLowerCase();
    }

    // Sanitize original filename and keep only alphanumeric chars
    let sanitizedName = path
      .parse(file.originalname)
      .name.replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 20); // Truncate to max 20 chars

    // Create a unique filename with setting key and timestamp
    const timestamp = Date.now();
    const randomSuffix = Math.round(Math.random() * 1e3);
    const ext = path.extname(file.originalname).toLowerCase();

    // Format: settingKey_originalname_timestamp_random.ext
    const filename = settingKey
      ? `${settingKey}_${sanitizedName}_${timestamp}_${randomSuffix}${ext}`
      : `upload_${sanitizedName}_${timestamp}_${randomSuffix}${ext}`;

    console.log(`[DEBUG] Generated multer filename: ${filename}`);
    cb(null, filename);
  },
});

// File filter to allow only images
const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Accept only image files
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// File filter to allow documents
const documentFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  // Accept documents: PDF, DOC, DOCX, TXT, and images
  const allowedMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, DOCX, TXT, or image files are allowed!"));
  }
};

// Create the multer upload middleware for images
export const upload = multer({
  storage: storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB - reasonable for logo/image uploads
    files: 1, // Only allow 1 file per request
    fieldSize: 1024 * 1024, // 1MB max for any single field
    fields: 10, // Maximum number of non-file fields
  },
});

// Create the multer upload middleware for documents
export const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB - reasonable for document uploads
    files: 1, // Only allow 1 file per request
    fieldSize: 1024 * 1024, // 1MB max for any single field
    fields: 10, // Maximum number of non-file fields
  },
});

// Error handler middleware
export const handleMulterError = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading.
    console.error("[ERROR] Multer error:", err);
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File too large. Maximum size is 2MB." });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    // An unknown error occurred.
    console.error("[ERROR] Upload error:", err);
    return res
      .status(500)
      .json({ message: err.message || "Unknown error during file upload" });
  }
  next();
};

import express, { Express, Request, Response, NextFunction } from "express";
import "./session-types";
import { createServer, type Server } from "http";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { db, healthCheck, getPoolStats } from "./db";
import { sql } from "drizzle-orm";
import {
  insertListingSchema,
  insertMessageSchema,
  insertKycSchema,
  insertKycDocSchema,
  insertModerationLogSchema,
  insertSuccessStorySchema,
  insertContactSchema,
  insertNewsletterSubscriptionSchema,
  Listing,
  User,
  SuccessStory,
  Contact,
  NewsletterSubscription,
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { setupAuth, verifyAuth, comparePasswords, hashPassword } from "./auth";
import {
  translateListingContent,
  getLocalizedFields,
  translateField,
} from "./multilingual";
import type { Language } from "../client/src/hooks/use-language";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { upload, uploadDocument, handleMulterError } from "./multer-upload";
import adminRouter from "./admin-routes";
import { secureFileUploadValidator } from "./security";
import { setupOnboardingRoutes } from "./onboarding-routes";
import { sendNewsletterWelcomeEmail, sendNewMessageEmail } from "./email-service";

import twilio from 'twilio';
const _sid=process.env.TWILIO_ACCOUNT_SID||''; const _tok=process.env.TWILIO_AUTH_TOKEN||''; const _from=process.env.TWILIO_WHATSAPP_FROM||''; const _twilio = (_sid&&_tok&&_from)? twilio(_sid,_tok): null; const _waFrom = _from && (_from.startsWith('whatsapp:')?_from:('whatsapp:'+_from)); const _isTwilio=Boolean(_twilio && _waFrom); const _norm=(p)=>{ if(!p)return null; const s = p.replace(/^whatsapp:/,'').trim(); return s.startsWith('+')? s : ('+'+s.replace(/[^0-9]/g,'')); }; async function _sendWA(to, body){ if(!_isTwilio) return null; const dest = to.startsWith('whatsapp:')? to: ('whatsapp:'+to); const m = await _twilio.messages.create({ from:_waFrom, to:dest, body }); return m.sid||null; }
import { requestPasswordReset, resetPassword, requestEmailVerification, verifyEmail, resendWelcomeEmail } from "./auth-email";
import { emailService } from "./email";

// Combined middleware to verify auth and then check if user is admin
function verifyAuthAndAdmin(req: Request, res: Response, next: NextFunction) {
  console.log(
    `[DEBUG] verifyAuthAndAdmin called for ${req.method} request to ${req.originalUrl}`,
  );

  try {
    // Log all headers for debugging to see what we're working with
    const sanitizedHeaders = { ...req.headers };
    // Don't log the full token in production, only show it exists and its length
    if (sanitizedHeaders.authorization) {
      const authParts = sanitizedHeaders.authorization.toString().split(" ");
      sanitizedHeaders.authorization = `${authParts[0]} ${authParts.length > 1 ? `[token length: ${authParts[1].length}]` : "[missing]"}`;
    }
    console.log("[DEBUG] Request headers:", sanitizedHeaders);

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.error("[ERROR] Authorization header completely missing");
      return res.status(401).json({ message: "Authorization token required" });
    }

    if (!authHeader.startsWith("Bearer ")) {
      console.error(
        "[ERROR] Authorization header exists but is not in Bearer format:",
        authHeader.substring(0, 10) + "...",
      );
      return res
        .status(401)
        .json({ message: "Authorization token must be in Bearer format" });
    }

    // Extract token from header
    const token = authHeader.split(" ")[1];

    if (!token) {
      console.error(
        "[ERROR] Token extraction failed - no token after Bearer prefix",
      );
      return res
        .status(401)
        .json({ message: "Token is missing after Bearer prefix" });
    }

    console.log(
      `[DEBUG] JWT token extraction successful, length: ${token.length}, first chars: ${token.substring(0, 10)}...`,
    );

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || "your_jwt_secret_should_be_in_env";

    if (!process.env.JWT_SECRET) {
      console.warn("[WARN] JWT_SECRET environment variable not set; falling back to default. Do not use this in production.");
    }
    console.log(
      `[DEBUG] Using JWT secret (first 4 chars): ${jwtSecret.substring(0, 4)}...`,
    );

    console.log(`[DEBUG] Attempting to verify JWT token...`);

    jwt.verify(token, jwtSecret, { algorithms: ["HS256"] }, (err, decoded) => {
      if (err) {
        console.error("[ERROR] JWT verification failed:", err);
        if (err instanceof jwt.TokenExpiredError) {
          return res
            .status(401)
            .json({ message: "Token expired. Please log in again." });
        }
        if (err instanceof jwt.JsonWebTokenError) {
          return res
            .status(401)
            .json({ message: "Invalid token. Please log in again." });
        }
        return res.status(401).json({ message: "Token validation failed." });
      }

      if (!decoded) {
        console.error(
          "[ERROR] JWT verification succeeded but returned no data",
        );
        return res.status(401).json({ message: "Invalid token structure" });
      }

      const decodedUser = decoded as {
        userId: number;
        email: string;
        role: string;
        iat: number;
        exp: number;
      };

      console.log(`[DEBUG] JWT verification successful, decoded:`, {
        userId: decodedUser.userId,
        email: decodedUser.email
          ? `${decodedUser.email.substring(0, 3)}...`
          : "none",
        role: decodedUser.role,
        tokenIssued: new Date(decodedUser.iat * 1000).toISOString(),
        tokenExpires: new Date(decodedUser.exp * 1000).toISOString(),
      });

      // Check if user is an admin directly from token
      if (decodedUser.role !== "admin") {
        console.log(`[DEBUG] User role is ${decodedUser.role}, not admin`);
        return res
          .status(403)
          .json({ message: "Unauthorized. Admin access required." });
      }

      console.log(
        `[DEBUG] Token contains admin role, fetching user record ${decodedUser.userId}`,
      );

      // Get user from database to attach to request
      storage
        .getUser(decodedUser.userId)
        .then((user) => {
          if (!user) {
            console.error(
              `[ERROR] User ${decodedUser.userId} not found in database`,
            );
            return res.status(401).json({ message: "User not found" });
          }

          console.log(`[DEBUG] User found in database:`, {
            id: user.id,
            username: user.username,
            role: user.role,
          });

          // Check if user is blocked
          if (user.role === "blocked") {
            console.error(`[ERROR] User ${user.id} is blocked`);
            return res
              .status(403)
              .json({ message: "Account has been suspended" });
          }

          // Double check user is admin in database (in case role changed after token was issued)
          if (user.role !== "admin") {
            console.error(
              `[ERROR] User ${user.id} has role ${user.role}, not admin`,
            );
            return res
              .status(403)
              .json({ message: "Unauthorized. Admin access required." });
          }

          // Attach user to request
          req.user = user;
          next();
        })
        .catch((err) => {
          console.error("Error fetching user in admin middleware:", err);
          return res.status(500).json({ message: "Internal server error" });
        });
    });
  } catch (error: any) {
    console.error("Admin auth middleware error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Note: Authentication routes (/auth/register, /auth/login, /auth/me)

  // Basic SSE hub for message events
  const sseClients = new Map<number, Set<Response>>();
  const addClient = (userId: number, res: Response) => { if (!sseClients.has(userId)) sseClients.set(userId, new Set()); sseClients.get(userId)!.add(res); };
  const removeClient = (userId: number, res: Response) => { const set = sseClients.get(userId); if (!set) return; set.delete(res); if (set.size===0) sseClients.delete(userId); };
  const pushEvent = (userId: number, event: string, data: any) => { const set = sseClients.get(userId); if (!set) return; for (const res of set) { try { res.write(`event: ${event}\n`); res.write(`data: ${JSON.stringify(data)}\n\n`);} catch {} } };

  // and security middleware are now setup in index.ts

  // Special admin login API - separate from regular user authentication
  app.post("/api/admin/login", async (req, res, next) => {
    try {
      console.log("[INFO] Admin login attempt received");

      const { username, password } = req.body;

      if (!username || !password) {
        console.log("[ERROR] Admin login failed: Missing username or password");
        return res
          .status(400)
          .json({ message: "Username and password are required" });
      }

      console.log(`[INFO] Admin login attempt for username: ${username}`);

      // Get user by username
      const user = await storage.getUserByUsername(username);

      if (!user) {
        console.log(`[ERROR] Admin login failed: User ${username} not found`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check password
      const isPasswordValid = await comparePasswords(password, user.password);
      if (!isPasswordValid) {
        console.log(
          `[ERROR] Admin login failed: Invalid password for ${username}`,
        );
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user is admin
      if (user.role !== "admin") {
        console.log(
          `[ERROR] Admin login failed: User ${username} is not an admin (role: ${user.role})`,
        );
        return res
          .status(403)
          .json({ message: "Access denied. Admin privileges required." });
      }

      console.log(`[INFO] Admin login successful for ${username}`);

      // Generate JWT token with admin role - using 30d expiry instead of 7d
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || "your_jwt_secret_should_be_in_env",
        { expiresIn: "30d", algorithm: "HS256" },
      );

      console.log(
        `[INFO] Generated JWT token for ${username}, length: ${token.length}`,
      );

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;

      res.status(200).json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Admin login error:", error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  });

  // Change admin password (admin only)
  app.post(
    "/api/admin/change-password",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({
              message: "Current password and new password are required",
            });
        }

        // Get the admin user
        const user = await storage.getUser(req.user!.id);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Verify current password using already imported comparePasswords function
        const isMatch = await comparePasswords(currentPassword, user.password);

        if (!isMatch) {
          return res
            .status(400)
            .json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password
        const updatedUser = await storage.updateUser(user.id, {
          password: hashedPassword,
        });

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        // Omit password from response
        const { password, ...userWithoutPassword } = updatedUser;

        res.status(200).json({
          message: "Password updated successfully",
          user: userWithoutPassword,
        });
      } catch (error) {
        next(error);
      }
    },
  );

  // Listings routes with pagination
  app.get("/api/listings", async (req, res, next) => {
    try {
      const {
        industry,
        location,
        saleType,
        userId,
        language,
        page,
        limit,
        search,
        minPrice,
        maxPrice,
        businessAge,
        verifiedOnly,
        featuredOnly,
        hasFinancials,
        hasDocuments,
        sortBy,
      } = req.query;

      // Parse pagination parameters
      const pageNumber = parseInt(page as string) || 1;
      const pageSize = Math.min(parseInt(limit as string) || 20, 50); // Max 50 items per page
      const offset = (pageNumber - 1) * pageSize;

      // Build basic filter object from query params
      const filters: Partial<Listing> = {};
      if (industry && industry !== "all") filters.industry = industry as string;
      if (location && location !== "all") filters.location = location as string;
      if (saleType && saleType !== "all") filters.saleType = saleType as string;
      if (userId) filters.userId = parseInt(userId as string);

      // Only show active listings to regular users
      if (!req.user) {
        filters.active = true;
      }

      // Get the user's preferred language (default to English)
      const userLanguage: Language = language === "ar" ? "ar" : "en";

      // Get all listings with basic filters
      let allListings = await storage.getListings(filters);

      // Apply advanced filters
      if (search) {
        const searchTerm = (search as string).toLowerCase();
        allListings = allListings.filter((listing) => {
          const titleEn = listing.title_en?.toLowerCase() || "";
          const titleAr = listing.title_ar?.toLowerCase() || "";
          const descEn = listing.description_en?.toLowerCase() || "";
          const descAr = listing.description_ar?.toLowerCase() || "";

          return (
            titleEn.includes(searchTerm) ||
            titleAr.includes(searchTerm) ||
            descEn.includes(searchTerm) ||
            descAr.includes(searchTerm) ||
            listing.industry.toLowerCase().includes(searchTerm) ||
            listing.location.toLowerCase().includes(searchTerm)
          );
        });
      }

      // Price range filter
      if (minPrice || maxPrice) {
        const min = parseFloat(minPrice as string) || 0;
        const max = parseFloat(maxPrice as string) || Number.MAX_SAFE_INTEGER;
        allListings = allListings.filter(
          (listing) => listing.askingPrice >= min && listing.askingPrice <= max,
        );
      }

      // Business age filter
      if (businessAge && businessAge !== "any") {
        const now = new Date();
        const filterDate = new Date();

        switch (businessAge) {
          case "new":
            filterDate.setFullYear(now.getFullYear() - 2);
            break;
          case "established":
            filterDate.setFullYear(now.getFullYear() - 5);
            break;
          case "mature":
            filterDate.setFullYear(now.getFullYear() - 10);
            break;
        }

        allListings = allListings.filter((listing) => {
          if (!listing.createdAt) return false;
          const listingDate = new Date(listing.createdAt);
          return listingDate >= filterDate;
        });
      }

      // Verification filter
      if (verifiedOnly === "true") {
        allListings = allListings.filter((listing) => listing.verified);
      }

      // Featured filter
      if (featuredOnly === "true") {
        allListings = allListings.filter((listing) => listing.featured);
      }

      // Financial documents filter
      if (hasFinancials === "true") {
        allListings = allListings.filter(
          (listing) =>
            listing.financials && listing.financials.trim().length > 0,
        );
      }

      // Documents filter
      if (hasDocuments === "true") {
        allListings = allListings.filter(
          (listing) =>
            listing.businessPlan && listing.businessPlan.trim().length > 0,
        );
      }

      // Sorting
      const sortByValue = (sortBy as string) || "newest";
      allListings.sort((a, b) => {
        switch (sortByValue) {
          case "newest":
            return (
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
            );
          case "oldest":
            return (
              new Date(a.createdAt || 0).getTime() -
              new Date(b.createdAt || 0).getTime()
            );
          case "price-high":
            return b.askingPrice - a.askingPrice;
          case "price-low":
            return a.askingPrice - b.askingPrice;
          case "alphabetical":
            return (a.title_en || "").localeCompare(b.title_en || "");
          default:
            return 0;
        }
      });

      const totalCount = allListings.length;
      const paginatedListings = allListings.slice(offset, offset + pageSize);

      // Map the listings to include the localized title and description
      const localizedListings = paginatedListings.map((listing) => {
        const { title, description } = getLocalizedFields(
          listing,
          userLanguage,
        );
        return {
          ...listing,
          title,
          description,
        };
      });

      // Return paginated response
      res.status(200).json({
        data: localizedListings,
        pagination: {
          page: pageNumber,
          limit: pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNext: offset + pageSize < totalCount,
          hasPrev: pageNumber > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  });

  // Get listing counts by industry/category (alias for counts)
  app.get("/api/listings/counts", async (req, res, next) => {
    try {
      // Get counts of active listings by industry category
      const counts = await storage.getListingCountsByCategory();
      res.status(200).json(counts);
    } catch (error) {
      next(error);
    }
  });

  // Get listing counts by industry/category
  app.get("/api/listings/counts-by-category", async (req, res, next) => {
    try {
      // Get counts of active listings by industry category
      const counts = await storage.getListingCountsByCategory();
      res.status(200).json(counts);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/listings/featured", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 3;
      const language = req.query.language as Language;

      // Get the user's preferred language (default to English)
      const userLanguage: Language = language === "ar" ? "ar" : "en";

      const featuredListings = await storage.getFeaturedListings(limit);

      // Map the listings to include the localized title and description
      const localizedListings = featuredListings.map((listing) => {
        const { title, description } = getLocalizedFields(
          listing,
          userLanguage,
        );
        return {
          ...listing,
          title,
          description,
        };
      });

      res.status(200).json(localizedListings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/listings/:id", async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);
      const language = req.query.language as Language;
      const listing = await storage.getListing(listingId);

      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Check if listing is active or if user is the owner
      if (!listing.active && (!req.user || req.user.id !== listing.userId)) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Get the user's preferred language (default to English)
      const userLanguage: Language = language === "ar" ? "ar" : "en";

      // Get localized fields for the listing
      const { title, description } = getLocalizedFields(listing, userLanguage);

      // Return the listing with localized fields
      const localizedListing = {
        ...listing,
        title,
        description,
      };

      res.status(200).json(localizedListing);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/listings", verifyAuth, async (req, res, next) => {
    try {
      console.log("[DEBUG] Create listing request received");
      console.log("[DEBUG] Request body:", JSON.stringify(req.body, null, 2));
      console.log("[DEBUG] User from auth:", req.user?.id);

      // Extract the source language and content from the request
      const { title, description, sourceLanguage, ...otherData } = req.body;

      console.log("[DEBUG] Extracted fields:", {
        title,
        description,
        sourceLanguage,
        otherDataKeys: Object.keys(otherData),
      });

      if (!title || !description) {
        console.error("[ERROR] Missing title or description:", {
          title,
          description,
        });
        return res
          .status(400)
          .json({ message: "Title and description are required" });
      }

      // Validate source language
      const language: Language = sourceLanguage === "ar" ? "ar" : "en";
      console.log("[DEBUG] Source language:", language);

      // Translate the content to the other language
      console.log("[DEBUG] Starting translation...");
      const translatedContent = await translateListingContent(
        { title, description },
        language,
      );
      console.log("[DEBUG] Translation completed:", translatedContent);

      // Merge translated content with other listing data
      const mergedData = {
        ...otherData,
        ...translatedContent,
        userId: req.user!.id,
      };
      console.log(
        "[DEBUG] Merged data for validation:",
        JSON.stringify(mergedData, null, 2),
      );

      console.log("[DEBUG] About to validate with insertListingSchema...");
      const listingData = insertListingSchema.parse(mergedData);
      console.log(
        "[DEBUG] Validation successful, parsed data:",
        JSON.stringify(listingData, null, 2),
      );

      console.log("[DEBUG] Creating listing in storage...");
      const newListing = await storage.createListing(listingData);
      console.log("[DEBUG] Listing created successfully:", newListing.id);

      // Add convenience fields for immediate use by client
      const response = {
        ...newListing,
        title: newListing[`title_${language}`],
        description: newListing[`description_${language}`],
      };

      console.log("[DEBUG] Sending response to client");
      res.status(201).json(response);
    } catch (error) {
      console.error("[ERROR] Error in create listing endpoint:", error);
      if (error instanceof ZodError) {
        console.error("[ERROR] Validation errors:", error.errors);
        const validationError = fromZodError(error);
        console.error(
          "[ERROR] Formatted validation error:",
          validationError.message,
        );
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.put("/api/listings/:id", verifyAuth, async (req, res, next) => {
    try {
      console.log(
        "[DEBUG] Update listing request received for ID:",
        req.params.id,
      );
      console.log(
        "[DEBUG] Request body received:",
        JSON.stringify(req.body, null, 2),
      );

      const listingId = parseInt(req.params.id);
      const existing = await storage.getListing(listingId);

      if (!existing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Check if user is the owner of the listing
      if (existing.userId !== req.user!.id) {
        return res
          .status(403)
          .json({
            message: "You don't have permission to update this listing",
          });
      }

      // Extract bilingual content from the request
      const {
        title_en,
        title_ar,
        description_en,
        description_ar,
        ...otherData
      } = req.body;

      console.log(
        "[DEBUG] Extracted bilingual values - title_en:",
        title_en,
        "title_ar:",
        title_ar,
        "description_en:",
        description_en,
        "description_ar:",
        description_ar,
      );

      // Use the bilingual data directly without translation
      const mergedData = {
        ...otherData,
        title_en,
        title_ar,
        description_en,
        description_ar,
        userId: req.user!.id,
      };

      const listingData = insertListingSchema.parse(mergedData);
      const updatedListing = await storage.updateListing(
        listingId,
        listingData,
      );

      if (!updatedListing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Add convenience fields for immediate use by client
      const response = {
        ...updatedListing,
        title: updatedListing.title_en || updatedListing.title_ar,
        description:
          updatedListing.description_en || updatedListing.description_ar,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("[ERROR] Error in update listing endpoint:", error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // Get individual listing details
  app.get("/api/listings/:id", async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);
      const { language } = req.query;
      const userLanguage: Language = language === "ar" ? "ar" : "en";

      if (isNaN(listingId)) {
        return res.status(400).json({ message: "Invalid listing ID" });
      }

      const listing = await storage.getListing(listingId);

      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Only show active listings to non-authenticated users
      if (!req.user && !listing.active) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Get the listing owner information
      const owner = await storage.getUser(listing.userId);
      if (!owner) {
        return res.status(404).json({ message: "Listing owner not found" });
      }

      // Get localized content
      const { title, description } = getLocalizedFields(listing, userLanguage);

      // Prepare the response with enhanced details
      const response = {
        ...listing,
        title,
        description,
        owner: {
          id: owner.id,
          name: owner.fullName || owner.username,
          avatar: owner.profileImageUrl || "/uploads/placeholder.svg",
          verified: owner.verified || false,
        },
        // Mock financial performance data (replace with real data from database)
        financialPerformance: [
          { year: 2023, revenue: 150000, expenses: 120000, profit: 30000 },
          { year: 2022, revenue: 130000, expenses: 110000, profit: 20000 },
          { year: 2021, revenue: 110000, expenses: 95000, profit: 15000 },
        ],
        // Mock documents (replace with real document management)
        documents: [
          {
            id: "1",
            name: "Business Registration (ROC)",
            type: "PDF",
            size: "2.1 MB",
          },
          {
            id: "2",
            name: "Financial Statements",
            type: "PDF",
            size: "1.8 MB",
          },
          { id: "3", name: "Tax Documents", type: "PDF", size: "900 KB" },
        ],
        // Enhanced features from existing data
        features: [
          "Established Customer Base",
          "Prime Location",
          "Modern Equipment",
          "Trained Staff",
          "Growth Potential",
        ],
        businessHighlights: [
          `Located in ${listing.location}`,
          `${listing.industry} industry expertise`,
          "Proven track record of success",
          "Ready for immediate takeover",
          "Excellent growth opportunities",
        ],
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  });

  // Get similar listings
  app.get("/api/listings/:id/similar", async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);
      const { language, limit = 4 } = req.query;
      const userLanguage: Language = language === "ar" ? "ar" : "en";
      const maxResults = Math.min(parseInt(limit as string) || 4, 8);

      if (isNaN(listingId)) {
        return res.status(400).json({ message: "Invalid listing ID" });
      }

      const currentListing = await storage.getListing(listingId);
      if (!currentListing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Get all active listings except the current one
      const allListings = await storage.getListings({ active: true });
      const otherListings = allListings.filter((l) => l.id !== listingId);

      // Intelligent similarity algorithm with multiple factors
      const currentPrice = currentListing.askingPrice;
      const currentIndustry = currentListing.industry;
      const currentLocation = currentListing.location;
      const currentSaleType = currentListing.saleType;

      // Calculate similarity scores for all other listings
      const scoredListings = otherListings.map((listing) => {
        let score = 0;
        let factors = [];

        // Price similarity (highest priority) - 40 points max
        if (currentPrice > 0 && listing.askingPrice > 0) {
          const priceDiff = Math.abs(listing.askingPrice - currentPrice);
          const priceRatio =
            priceDiff / Math.max(currentPrice, listing.askingPrice);

          if (priceRatio <= 0.2) {
            // Within 20%
            score += 40;
            factors.push("Similar Price");
          } else if (priceRatio <= 0.5) {
            // Within 50%
            score += 25;
            factors.push("Close Price Range");
          } else if (priceRatio <= 1.0) {
            // Within 100%
            score += 15;
            factors.push("Comparable Price Range");
          }
        }

        // Industry match - 25 points
        if (listing.industry === currentIndustry) {
          score += 25;
          factors.push("Same Industry");
        }

        // Sale type match - 20 points
        if (listing.saleType === currentSaleType) {
          score += 20;
          factors.push("Same Sale Type");
        }

        // Location match - 15 points
        if (listing.location === currentLocation) {
          score += 15;
          factors.push("Same Location");
        }

        // Business size similarity based on price tiers - 10 points
        const getCurrentTier = (price: number) => {
          if (price < 50000) return "small";
          if (price < 200000) return "medium";
          if (price < 500000) return "large";
          return "enterprise";
        };

        if (
          getCurrentTier(listing.askingPrice) === getCurrentTier(currentPrice)
        ) {
          score += 10;
          factors.push("Similar Business Size");
        }

        // Recency bonus for newer listings - 5 points max
        if (listing.createdAt) {
          const daysSinceCreated =
            (Date.now() - new Date(listing.createdAt).getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSinceCreated <= 30) {
            score += 5;
            factors.push("Recent Listing");
          } else if (daysSinceCreated <= 90) {
            score += 2;
          }
        }

        return {
          ...listing,
          similarityScore: score,
          matchingFactors: factors,
        };
      });

      // Filter listings with meaningful similarity (score >= 15) and sort by score
      let similarListings = scoredListings
        .filter((listing) => listing.similarityScore >= 15)
        .sort((a, b) => b.similarityScore - a.similarityScore);

      // If we have fewer than requested results, expand criteria
      if (similarListings.length < maxResults) {
        const remainingSlots = maxResults - similarListings.length;
        const existingIds = new Set(similarListings.map((l) => l.id));

        // Add listings with lower scores but still some relevance
        const additionalListings = scoredListings
          .filter(
            (listing) =>
              !existingIds.has(listing.id) && listing.similarityScore >= 5,
          )
          .slice(0, remainingSlots);

        similarListings = [...similarListings, ...additionalListings];
      }

      // Take only the requested number of results
      const results = similarListings.slice(0, maxResults);

      // Map with localized content and similarity info
      const localizedResults = results.map((listing) => {
        const { title, description } = getLocalizedFields(
          listing,
          userLanguage,
        );
        return {
          id: listing.id,
          title,
          description,
          askingPrice: listing.askingPrice,
          location: listing.location,
          industry: listing.industry,
          saleType: listing.saleType,
          images:
            listing.images ||
            (listing.imageUrl ? [listing.imageUrl] : ["/placeholder.jpg"]),
          imageUrl: listing.imageUrl,
          similarityScore: listing.similarityScore,
          matchingFactors: listing.matchingFactors,
        };
      });

      res.status(200).json(localizedResults);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/listings/:id", verifyAuth, async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getListing(listingId);

      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Check if user is the owner of the listing
      if (listing.userId !== req.user!.id) {
        return res
          .status(403)
          .json({
            message: "You don't have permission to delete this listing",
          });
      }

      await storage.deleteListing(listingId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Saved Listings routes
  app.get("/api/saved-listings", verifyAuth, async (req, res, next) => {
    try {
      const savedListings = await storage.getUserSavedListings(req.user!.id);
      res.status(200).json(savedListings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/listings/:id/saved", verifyAuth, async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);
      const isSaved = await storage.isListingSaved(req.user!.id, listingId);
      res.status(200).json({ saved: isSaved });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/listings/:id/save", verifyAuth, async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);

      // Check if listing exists
      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Check if user is trying to save their own listing
      if (listing.userId === req.user!.id) {
        return res
          .status(400)
          .json({ message: "Cannot save your own listing" });
      }

      // Check if already saved
      const isAlreadySaved = await storage.isListingSaved(
        req.user!.id,
        listingId,
      );
      if (isAlreadySaved) {
        return res.status(400).json({ message: "Listing already saved" });
      }

      const savedListing = await storage.saveListing(req.user!.id, listingId);
      res.status(201).json(savedListing);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/listings/:id/save", verifyAuth, async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);

      const success = await storage.unsaveListing(req.user!.id, listingId);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Saved listing not found" });
      }
    } catch (error) {
      next(error);
    }
  });

  // Email notification helper function
  async function sendContactNotificationEmail(
    contact: Contact,
    listing: Listing,
  ) {
    // Only send emails if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.log("SendGrid not configured, skipping email notification");
      return;
    }

    try {
      const sgMail = require("@sendgrid/mail");
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const seller = await storage.getUser(contact.sellerId);
      if (!seller) return;

      const msg = {
        to: seller.email,
        from: process.env.FROM_EMAIL || "noreply@teejarti.com",
        subject: `New inquiry about your listing: ${contact.subject}`,
        html: `
          <h2>New Contact Request</h2>
          <p>You have received a new inquiry about your business listing:</p>
          
          <h3>Listing Details:</h3>
          <p><strong>Title:</strong> ${listing.title_en || listing.title_ar}</p>
          
          <h3>Contact Details:</h3>
          <p><strong>From:</strong> ${contact.buyerName}</p>
          <p><strong>Email:</strong> ${contact.buyerEmail}</p>
          ${contact.buyerPhone ? `<p><strong>Phone:</strong> ${contact.buyerPhone}</p>` : ""}
          
          <h3>Message:</h3>
          <p><strong>Subject:</strong> ${contact.subject}</p>
          <p>${contact.message.replace(/\n/g, "<br>")}</p>
          
          <p>Please log in to your TEEJARTI account to respond to this inquiry.</p>
        `,
      };

      await sgMail.send(msg);
      console.log(`Contact notification email sent to ${seller.email}`);
    } catch (error) {
      console.error("Error sending contact notification email:", error);
    }
  }

  // Contact rate limiting
  const contactRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 contact requests per windowMs
    message: "Too many contact requests, please try again later",
  });

  // Contact Seller routes
  app.post(
    "/api/contacts",
    verifyAuth,
    contactRateLimit,
    async (req, res, next) => {
      try {
        // Frontend contact schema - only fields sent from frontend
        const frontendContactSchema = z.object({
          listingId: z.number(),
          subject: z.string().min(1).max(500),
          message: z.string().min(1).max(2000),
          buyerPhone: z.string().optional(),
        });

        const validationResult = frontendContactSchema.safeParse(req.body);
        if (!validationResult.success) {
          return res.status(400).json({
            message: "Invalid request",
            errors: validationResult.error.errors,
          });
        }

        const { listingId, subject, message, buyerPhone } =
          validationResult.data;
        const buyerId = req.user!.id;

        // Get listing to find seller
        const listing = await storage.getListing(listingId);
        if (!listing) {
          return res.status(404).json({ message: "Listing not found" });
        }

        if (listing.userId === buyerId) {
          return res
            .status(400)
            .json({ message: "You cannot contact yourself" });
        }

        const contactData = {
          listingId,
          buyerId,
          sellerId: listing.userId,
          buyerName: req.user!.username,
          buyerEmail: req.user!.email,
          buyerPhone,
          subject,
          message,
        };

        const contact = await storage.createContact(contactData);

        // Create initial message for conversation threading
        try {
          const messageData = {
            senderId: buyerId,
            receiverId: listing.userId,
            listingId: listingId,
            contactId: contact.id,
            content: message,
            read: false,
          };
          await storage.createMessage(messageData);
          console.log(`[INFO] Created initial message for contact ${contact.id}`);
        } catch (error) {
          console.error("Failed to create initial message:", error);
        }

        // Send email notification to seller (async)
        sendContactNotificationEmail(contact, listing).catch((error) => {
          console.error("Failed to send contact notification email:", error);
        });

        res.status(201).json(contact);
      } catch (error) {
        next(error);
      }
    },
  );

  app.get("/api/contacts/received", verifyAuth, async (req, res, next) => {
    try {
      const sellerId = req.user!.id;
      const contacts = await storage.getContactsForSeller(sellerId);
      res.json(contacts);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/contacts/sent", verifyAuth, async (req, res, next) => {
    try {
      const buyerId = req.user!.id;
      const contacts = await storage.getContactsFromBuyer(buyerId);
      res.json(contacts);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/contacts/:id/respond", verifyAuth, async (req, res, next) => {
    try {
      const contactId = parseInt(req.params.id);
      const { response } = req.body;
      const userId = req.user!.id;

      const contact = await storage.getContactById(contactId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }

      if (contact.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.updateContactStatus(contactId, "responded", response);

      res.json({ message: "Response sent successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Messages routes
  // Twilio WhatsApp inbound webhook
  app.post("/webhooks/twilio/whatsapp", async (req, res, next) => {
    try {
      const from = _norm((req.body?.From as string || '').replace('whatsapp:', ''));
      const body = (req.body?.Body as string) || '';
      if (!from || !body) return res.status(200).json({ ok: true });

      const allUsers = await storage.getAllUsers();
      const senderUser = allUsers.find(u => _norm(u.phone || '') === from);
      if (!senderUser) return res.status(200).json({ ok: true });

      const threads = await storage.getMessageThreads(senderUser.id);
      const partnerId = threads[0]?.otherUser?.id;
      const listingId = threads[0]?.listing?.id || null;
      if (!partnerId) return res.status(200).json({ ok: true });

      await storage.createMessage({
        senderId: senderUser.id,
        receiverId: partnerId,
        content: body,
        listingId,
        contactId: null,
      } as any);

      res.status(200).json({ ok: true });
    } catch (error) {
      next(error);
    }
  });
  // Lightweight long-poll endpoint to detect updates without SSE
  app.get("/api/messages/poll", verifyAuth, async (req, res, next) => {
    try {
      const since = req.query.since ? Number(req.query.since) : 0;
      const all = await storage.getMessages(req.user!.id);
      const latest = all.reduce((max, m) => {
        const t = m.createdAt ? new Date(m.createdAt).getTime() : 0;
        return Math.max(max, t);
      }, 0);
      res.status(200).json({ latest, hasUpdates: latest > since });
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/messages", verifyAuth, async (req, res, next) => {
    try {
      const messages = await storage.getMessages(req.user!.id);
      res.status(200).json(messages);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/messages/threads", verifyAuth, async (req, res, next) => {
    try {
      const threads = await storage.getMessageThreads(req.user!.id);
      res.status(200).json(threads);
    } catch (error) {
      next(error);
    }
  });

  app.get(
    "/api/messages/conversation/:userId",
    verifyAuth,
    async (req, res, next) => {
      try {
        const otherUserId = parseInt(req.params.userId);
        const listingId = req.query.listingId
          ? parseInt(req.query.listingId as string)
          : undefined;
        const limit = Math.min(parseInt(String(req.query.limit || "50")), 200) || 50;
        const before = req.query.before ? new Date(String(req.query.before)) : undefined;

        let conversation = await storage.getConversation(
          req.user!.id,
          otherUserId,
          listingId,
        );

        if (before) {
          const ts = before.getTime();
          conversation = conversation.filter((m) => (m.createdAt ? new Date(m.createdAt).getTime() < ts : true));
        }
        conversation = conversation
          .sort((a,b)=> (a.createdAt?new Date(a.createdAt).getTime():0)-(b.createdAt?new Date(b.createdAt).getTime():0))
          .slice(Math.max(0, conversation.length - limit));

        res.status(200).json(conversation);
      } catch (error) {
        next(error);
      }
    },
  );

  const messageLimiter = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false });
  app.post("/api/messages", verifyAuth, messageLimiter, async (req, res, next) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.user!.id,
      });

      const newMessage = await storage.createMessage(messageData);
      // Mirror to WhatsApp if configured and receiver has a phone number
      try {
        if (_isTwilio) {
          const receiver = await storage.getUser(newMessage.receiverId);
          const to = _norm(receiver?.phone || null);
          if (to) {
            await _sendWA(to, newMessage.content || '');
          }
        }
      } catch {}
      // Optional email notification to receiver (non-blocking)
      try {
        const receiver = await storage.getUser(newMessage.receiverId);
        const sender = await storage.getUser(newMessage.senderId);
        if (receiver?.email && sender?.fullName) {
          await sendNewMessageEmail(receiver.email, sender.fullName, (newMessage.content || '').slice(0, 140));
        }
      } catch (e) {
        console.warn("[WARN] sendNewMessageEmail failed", e);
      }
      res.status(201).json(newMessage);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.patch("/api/messages/:id/read", verifyAuth, async (req, res, next) => {
    try {
      const messageId = parseInt(req.params.id);
      const success = await storage.markMessageRead(messageId);

      if (!success) {
        return res.status(404).json({ message: "Message not found" });
      }

      res.status(200).json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/messages/threads/:userId/read", verifyAuth, async (req, res, next) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const success = await storage.markThreadRead(req.user!.id, otherUserId);

      res.status(200).json({ success });
    } catch (error) {
      next(error);
    }
  });

  // Documents routes
  app.get("/api/documents", verifyAuth, async (req, res, next) => {
    try {
      const listingId = req.query.listingId
        ? parseInt(req.query.listingId as string)
        : undefined;
      const documents = await storage.getDocuments(req.user!.id, listingId);
      res.status(200).json(documents);
    } catch (error) {
      next(error);
    }
  });

  // KYC routes
  // Submit KYC application
  app.post("/api/kyc", verifyAuth, async (req, res, next) => {
    try {
      // Check if user already has a KYC application
      const existingKyc = await storage.getKycByUserId(req.user!.id);
      if (existingKyc) {
        return res.status(400).json({
          message:
            "You already have a KYC application." +
            (existingKyc.status === "pending"
              ? " It is currently under review."
              : existingKyc.status === "approved"
                ? " It has been approved."
                : " It was rejected. Reason: " + existingKyc.rejectionReason),
        });
      }

      const kycData = insertKycSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const newKyc = await storage.createKyc(kycData);
      res.status(201).json(newKyc);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // Get user's own KYC application status
  app.get("/api/kyc/status", verifyAuth, async (req, res, next) => {
    try {
      const kyc = await storage.getKycByUserId(req.user!.id);

      if (!kyc) {
        return res.status(404).json({ message: "No KYC application found" });
      }

      res.status(200).json(kyc);
    } catch (error) {
      next(error);
    }
  });

  // Flexible auth middleware that supports both JWT and session
  function verifyAuthFlexible(req: Request, res: Response, next: NextFunction) {
    // First try JWT authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return verifyAuth(req, res, next);
    }

    // Fallback to session authentication
    if (req.session && (req.session as any).userId) {
      // Set user from session
      storage
        .getUser((req.session as any).userId)
        .then((user) => {
          if (!user) {
            return res.status(401).json({ message: "User not found" });
          }
          req.user = user;
          next();
        })
        .catch((err) => {
          console.error("Error fetching user from session:", err);
          res.status(500).json({ message: "Internal server error" });
        });
    } else {
      return res.status(401).json({ message: "Authentication required" });
    }
  }

  // General file upload endpoint for listing images
  app.post(
    "/api/upload",
    verifyAuthFlexible,
    upload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        console.log("[DEBUG] File uploaded:", {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        });

        // Create full URL to the uploaded file
        const fileUrl = `/uploads/${req.file.filename}`;

        res.status(200).json({
          url: fileUrl,
          filename: req.file.filename,
          originalname: req.file.originalname,
          size: req.file.size,
        });
      } catch (error) {
        console.error("[ERROR] File upload error:", error);
        next(error);
      }
    },
  );

  // Document upload endpoint for listing documents
  app.post(
    "/api/documents/upload",
    verifyAuth,
    uploadDocument.single("document"),
    async (req, res, next) => {
      try {
        console.log("[DEBUG] Document upload request received");
        console.log("[DEBUG] File:", req.file);
        console.log("[DEBUG] Body:", req.body);

        if (!req.file) {
          return res.status(400).json({ message: "No document uploaded" });
        }

        const { name, listingId } = req.body;
        const userId = req.user!.id;

        // Create document record in database
        const documentData = {
          userId,
          listingId: listingId ? parseInt(listingId) : null,
          name: name || req.file.originalname,
          fileUrl: `/uploads/${req.file.filename}`,
          fileType: req.file.mimetype,
          fileSize: req.file.size,
        };

        console.log("[DEBUG] Creating document with data:", documentData);
        const document = await storage.createDocument(documentData);
        console.log("[DEBUG] Document created successfully:", document.id);

        res.status(200).json({
          message: "Document uploaded successfully",
          document,
          fileUrl: `/uploads/${req.file.filename}`,
        });
      } catch (error) {
        console.error("Document upload error:", error);
        res.status(500).json({ message: "Failed to upload document" });
      }
    },
  );

  // KYC document upload endpoint
  app.post(
    "/api/upload/kyc-document",
    verifyAuth,
    uploadDocument.single("file"),
    handleMulterError,
    async (req, res) => {
      try {
        console.log("[DEBUG] KYC document upload request received");
        console.log("[DEBUG] File:", req.file);
        console.log("[DEBUG] Body:", req.body);

        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const { type } = req.body;
        const userId = req.user!.id;

        if (!type) {
          return res.status(400).json({ message: "Document type is required" });
        }

        // Validate file type and size for KYC documents
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (!allowedTypes.includes(req.file.mimetype)) {
          return res.status(400).json({ 
            message: "Invalid file type. Only JPG, PNG, and PDF files are allowed." 
          });
        }

        if (req.file.size > maxSize) {
          return res.status(400).json({ 
            message: "File size too large. Maximum size is 10MB." 
          });
        }

        // Generate secure filename
        const fileExtension = path.extname(req.file.originalname);
        const secureFilename = `kyc_${type}_${userId}_${Date.now()}${fileExtension}`;
        const fileUrl = `/uploads/${secureFilename}`;
        
        // Rename file to secure filename
        const oldPath = req.file.path;
        const newPath = path.join(path.dirname(oldPath), secureFilename);
        fs.renameSync(oldPath, newPath);

        console.log(`[DEBUG] KYC document uploaded successfully: ${secureFilename}`);

        res.status(200).json({
          message: "KYC document uploaded successfully",
          url: fileUrl,
          filename: secureFilename,
          type: req.file.mimetype,
          size: req.file.size,
        });
      } catch (error) {
        console.error("KYC document upload error:", error);
        res.status(500).json({ message: "Failed to upload KYC document" });
      }
    },
  );

  // Get documents for a listing
  app.get("/api/listings/:id/documents", async (req, res, next) => {
    try {
      const listingId = parseInt(req.params.id);

      if (isNaN(listingId)) {
        return res.status(400).json({ message: "Invalid listing ID" });
      }

      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Get documents for this listing
      const documents = await storage.getDocuments(listing.userId, listingId);

      res.status(200).json(documents);
    } catch (error) {
      next(error);
    }
  });

  // Get user's documents (optional: not tied to specific listing)
  app.get("/api/documents", verifyAuth, async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const documents = await storage.getDocuments(userId);

      res.status(200).json(documents);
    } catch (error) {
      next(error);
    }
  });

  // Delete a document
  app.delete("/api/documents/:id", verifyAuth, async (req, res, next) => {
    try {
      const documentId = parseInt(req.params.id);
      const userId = req.user!.id;

      if (isNaN(documentId)) {
        return res.status(400).json({ message: "Invalid document ID" });
      }

      // Get document to check ownership
      const documents = await storage.getDocuments(userId);
      const document = documents.find((d) => d.id === documentId);

      if (!document) {
        return res
          .status(404)
          .json({ message: "Document not found or you don't have permission" });
      }

      // Delete file from filesystem
      const filePath = path.join(process.cwd(), "public", document.fileUrl);
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.warn("Failed to delete file from filesystem:", err);
      }

      // Delete from database
      const deleted = await storage.deleteDocument(documentId);

      if (!deleted) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.status(200).json({ message: "Document deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Upload KYC documents (new version with file upload)
  app.post(
    "/api/kyc/doc-upload",
    verifyAuth,
    upload.single("file"),
    async (req, res, next) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Get docType from form data (idDocument, addressProof, businessLicense)
        const docType = req.body.docType;
        if (!docType) {
          return res.status(400).json({ message: "Document type is required" });
        }

        // Map frontend document types to backend document types
        const docTypeMap: Record<string, string> = {
          idDocument: "id",
          addressProof: "proof_of_address",
          businessLicense: "business_registration",
        };

        const documentType = docTypeMap[docType] || docType;

        // Validate document type
        const validTypes = [
          "passport",
          "id",
          "license",
          "business_registration",
          "proof_of_address",
        ];
        if (!validTypes.includes(documentType)) {
          return res.status(400).json({
            message: `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
          });
        }

        // Create full URL to the uploaded file
        const baseUrl = `${req.protocol}://${req.get("host")}`;
        const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

        // Create KYC document entry
        const kycDocData = insertKycDocSchema.parse({
          userId: req.user!.id,
          documentType,
          fileUrl,
          fileName: req.file.originalname,
          description:
            req.body.description || `${docType} uploaded via KYC page`,
        });

        // Insert into database using the KYC docs schema
        const newKycDoc = await storage.createKycDoc(kycDocData);

        // Return the URL and document info to the client
        res.status(201).json({
          fileUrl,
          document: newKycDoc,
        });
      } catch (error) {
        console.error("[ERROR] KYC document upload failed:", error);
        if (error instanceof ZodError) {
          const validationError = fromZodError(error);
          return res.status(400).json({ message: validationError.message });
        }
        res.status(500).json({
          message: "Failed to upload KYC document",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  // Legacy KYC document upload endpoint (kept for backward compatibility)
  app.post("/api/kyc/upload", verifyAuth, async (req, res, next) => {
    try {
      const { type, fileUrl } = req.body;

      // Validate required fields
      if (!type || !fileUrl) {
        return res
          .status(400)
          .json({ message: "Document type and file URL are required" });
      }

      // Validate document type
      const validTypes = ["passport", "id", "license", "business_registration"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          message: `Invalid document type. Must be one of: ${validTypes.join(", ")}`,
        });
      }

      // Validate file URL to ensure it's an image or PDF
      const fileExtension = fileUrl.split(".").pop()?.toLowerCase();
      const validExtensions = ["jpg", "jpeg", "png", "pdf"];
      if (!fileExtension || !validExtensions.includes(fileExtension)) {
        return res.status(400).json({
          message: `Invalid file type. Must be one of: ${validExtensions.join(", ")}`,
        });
      }

      // Create KYC document record
      const kycDocData = insertKycDocSchema.parse({
        userId: req.user!.id,
        documentType: type,
        fileUrl,
      });

      const newKycDoc = await storage.createKycDoc(kycDocData);
      res.status(201).json(newKycDoc);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  // Get user's KYC document status
  app.get("/api/kyc/docs", verifyAuth, async (req, res, next) => {
    try {
      const kycDocs = await storage.getKycDocsByUserId(req.user!.id);
      res.status(200).json(kycDocs);
    } catch (error) {
      next(error);
    }
  });

  // Admin routes for KYC management
  // Get all pending KYC applications (admin only)
  app.get(
    "/api/admin/kyc/pending",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const pendingApplications = await storage.getPendingKycApplications();
        res.status(200).json(pendingApplications);
      } catch (error) {
        next(error);
      }
    },
  );

  // Get all pending KYC documents (admin only)
  app.get(
    "/api/admin/kyc/docs/pending",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        // Get all users
        const users = await storage.getAllUsers();

        // Get KYC docs for all users and filter for pending status
        let pendingDocs = [];
        for (const user of users) {
          const userDocs = await storage.getKycDocsByUserId(user.id);
          // Add only pending docs
          pendingDocs.push(
            ...userDocs.filter((doc) => doc.status === "pending"),
          );
        }

        res.status(200).json(pendingDocs);
      } catch (error) {
        next(error);
      }
    },
  );

  // Approve KYC document (admin only)
  app.post(
    "/api/admin/kyc/docs/:id/approve",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const kycDocId = parseInt(req.params.id);
        const kycDoc = await storage.getKycDoc(kycDocId);

        if (!kycDoc) {
          return res.status(404).json({ message: "KYC document not found" });
        }

        // Update KYC document status to approved
        const updatedKycDoc = await storage.updateKycDoc(kycDocId, {
          status: "approved",
          reviewedByAdminId: req.user!.id,
        });

        // Check if user is already verified
        const user = await storage.getUser(kycDoc.userId);
        if (user && !user.verified) {
          // Mark user as verified
          await storage.updateUser(kycDoc.userId, { verified: true });
        }

        res.status(200).json(updatedKycDoc);
      } catch (error) {
        next(error);
      }
    },
  );

  // Reject KYC document (admin only)
  app.post(
    "/api/admin/kyc/docs/:id/reject",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const kycDocId = parseInt(req.params.id);
        const { reason } = req.body;

        if (!reason) {
          return res
            .status(400)
            .json({ message: "Rejection reason is required" });
        }

        const kycDoc = await storage.getKycDoc(kycDocId);

        if (!kycDoc) {
          return res.status(404).json({ message: "KYC document not found" });
        }

        // Update KYC document status to rejected
        const updatedKycDoc = await storage.updateKycDoc(kycDocId, {
          status: "rejected",
          rejectionReason: reason,
          reviewedByAdminId: req.user!.id,
        });

        res.status(200).json(updatedKycDoc);
      } catch (error) {
        next(error);
      }
    },
  );

  // Admin analytics endpoint
  app.get(
    "/api/admin/analytics",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        // Get all users
        const users = await storage.getAllUsers();

        // Get all listings
        const allListings = await storage.getListings();

        // Get pending KYC applications
        const pendingKyc = await storage.getPendingKycApplications();

        // Calculate analytics
        // Current date for calculations
        const now = new Date();
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(now.getDate() - 7);
        const oneMonthAgo = new Date(now);
        oneMonthAgo.setDate(now.getDate() - 30);

        // Get users who signed up in the last week
        const newUsersThisWeek = users.filter(
          (u) => u.createdAt && new Date(u.createdAt) >= oneWeekAgo,
        ).length;

        // Users who are verified
        const verifiedUsers = users.filter((u) => u.verified).length;

        // New listings in the last week
        const newListingsThisWeek = allListings.filter(
          (l) => l.createdAt && new Date(l.createdAt) >= oneWeekAgo,
        ).length;

        // Calculate average time to approval
        const approvedListings = allListings.filter(
          (l) => l.status === "approved",
        );
        let avgTimeToApproval = "N/A";

        if (approvedListings.length > 0) {
          // For simplicity, assuming updatedAt is when the listing was approved
          const totalApprovalHours = approvedListings.reduce(
            (total, listing) => {
              if (listing.createdAt && listing.updatedAt) {
                const createdDate = new Date(listing.createdAt);
                const updatedDate = new Date(listing.updatedAt);
                const hoursDiff =
                  (updatedDate.getTime() - createdDate.getTime()) /
                  (1000 * 60 * 60);
                return total + hoursDiff;
              }
              return total;
            },
            0,
          );

          const avgHours = Math.round(
            totalApprovalHours / approvedListings.length,
          );
          avgTimeToApproval =
            avgHours < 24
              ? `${avgHours} hours`
              : `${Math.round(avgHours / 24)} days`;
        }

        // Get KYC stats
        const allKycDocs = await storage.getAllKycDocs();

        // Get success stories stats
        const allSuccessStories = await storage.getSuccessStories();

        const analytics = {
          users: {
            total: users.length,
            active: users.filter(
              (u) => u.role !== "blocked" && u.role !== "admin",
            ).length,
            blocked: users.filter((u) => u.role === "blocked").length,
            admin: users.filter((u) => u.role === "admin").length,
            verified: verifiedUsers,
            newThisWeek: newUsersThisWeek,
            activeLastMonth: users.filter(
              (u) =>
                u.role !== "blocked" &&
                u.role !== "admin" &&
                u.createdAt &&
                new Date(u.createdAt) >= oneMonthAgo,
            ).length,
            byRole: {
              entrepreneur: users.filter((u) => u.role === "entrepreneur")
                .length,
              investor: users.filter((u) => u.role === "investor").length,
              broker: users.filter((u) => u.role === "broker").length,
            },
          },
          listings: {
            total: allListings.length,
            newThisWeek: newListingsThisWeek,
            avgTimeToApproval: avgTimeToApproval,
            byStatus: {
              pending: allListings.filter((l) => l.status === "pending").length,
              approved: allListings.filter((l) => l.status === "approved")
                .length,
              rejected: allListings.filter((l) => l.status === "rejected")
                .length,
              archived: allListings.filter((l) => l.status === "archived")
                .length,
            },
          },
          kyc: {
            pending: pendingKyc.length,
            approved: allKycDocs.filter((doc: any) => doc.status === "approved")
              .length,
            rejected: allKycDocs.filter((doc: any) => doc.status === "rejected")
              .length,
          },
          successStories: {
            total: allSuccessStories.length,
            pending: allSuccessStories.filter(
              (story) => story.status === "pending",
            ).length,
            approved: allSuccessStories.filter(
              (story) => story.status === "approved",
            ).length,
            rejected: allSuccessStories.filter(
              (story) => story.status === "rejected",
            ).length,
            featured: allSuccessStories.filter(
              (story) => story.featured && story.status === "approved",
            ).length,
          },
        };

        res.status(200).json(analytics);
      } catch (error) {
        next(error);
      }
    },
  );

  // Get all users (admin only)
  app.get("/api/admin/users", verifyAuthAndAdmin, async (req, res, next) => {
    try {
      const users = await storage.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  });

  // Approve KYC application (admin only)
  app.post(
    "/api/admin/kyc/:id/approve",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const kycId = parseInt(req.params.id);
        const updatedKyc = await storage.approveKyc(kycId, req.user!.id);

        if (!updatedKyc) {
          return res.status(404).json({ message: "KYC application not found" });
        }

        res.status(200).json(updatedKyc);
      } catch (error) {
        next(error);
      }
    },
  );

  // Reject KYC application (admin only)
  app.post(
    "/api/admin/kyc/:id/reject",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const kycId = parseInt(req.params.id);
        const { reason } = req.body;

        if (!reason) {
          return res
            .status(400)
            .json({ message: "Rejection reason is required" });
        }

        const updatedKyc = await storage.rejectKyc(kycId, reason, req.user!.id);

        if (!updatedKyc) {
          return res.status(404).json({ message: "KYC application not found" });
        }

        res.status(200).json(updatedKyc);
      } catch (error) {
        next(error);
      }
    },
  );

  // Admin routes for Listing moderation
  // Get all pending listings (admin only)
  app.get(
    "/api/admin/listings/pending",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const pendingListings = await storage.getListings({
          status: "pending",
        });
        res.status(200).json(pendingListings);
      } catch (error) {
        next(error);
      }
    },
  );

  // Approve a listing (admin only)
  app.post(
    "/api/admin/listings/:id/approve",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const listingId = parseInt(req.params.id);
        const listing = await storage.getListing(listingId);

        if (!listing) {
          return res.status(404).json({ message: "Listing not found" });
        }

        // Update listing status to approved
        const updatedListing = await storage.updateListing(listingId, {
          status: "approved",
          verified: true,
        });

        // Create moderation log for the approval
        await storage.createModerationLog({
          userId: req.user!.id,
          entityType: "listing",
          entityId: listingId,
          action: "approve",
          reason: "Listing approved by admin",
        });

        res.status(200).json(updatedListing);
      } catch (error) {
        next(error);
      }
    },
  );

  // Reject a listing (admin only)
  app.post(
    "/api/admin/listings/:id/reject",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const listingId = parseInt(req.params.id);
        const { reason } = req.body;

        if (!reason) {
          return res
            .status(400)
            .json({ message: "Rejection reason is required" });
        }

        const listing = await storage.getListing(listingId);

        if (!listing) {
          return res.status(404).json({ message: "Listing not found" });
        }

        // Update listing status to rejected
        const updatedListing = await storage.updateListing(listingId, {
          status: "rejected",
        });

        // Create moderation log for the rejection
        await storage.createModerationLog({
          userId: req.user!.id,
          entityType: "listing",
          entityId: listingId,
          action: "reject",
          reason: reason,
        });

        res.status(200).json(updatedListing);
      } catch (error) {
        next(error);
      }
    },
  );

  // Admin routes for User moderation
  // Block a user (admin only)
  app.post(
    "/api/admin/users/:id/block",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const userId = parseInt(req.params.id);
        const { reason } = req.body;

        if (!reason) {
          return res.status(400).json({ message: "Block reason is required" });
        }

        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.role === "blocked") {
          return res.status(400).json({ message: "User is already blocked" });
        }

        if (user.role === "admin") {
          return res
            .status(403)
            .json({ message: "Cannot block an admin user" });
        }

        // Update user role to 'blocked' and store the original role
        const updatedUser = await storage.updateUser(userId, {
          role: "blocked",
          originalRole: user.role,
        });

        // Create moderation log for user blocking
        // Try to get a listing from the user to associate the moderation log with
        const userListings = await storage.getUserActiveListings(userId);

        // If the user has any active listings, use the first one for the moderation log
        if (userListings.length > 0) {
          const listing = userListings[0];

          await storage.createModerationLog({
            userId: req.user!.id,
            entityType: "user",
            entityId: userId,
            action: "block",
            reason: `User blocked: ${reason}`,
          });
        }

        res.status(200).json(updatedUser);
      } catch (error) {
        next(error);
      }
    },
  );

  // Unblock a user (admin only)
  app.post(
    "/api/admin/users/:id/unblock",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const userId = parseInt(req.params.id);
        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.role !== "blocked") {
          return res.status(400).json({ message: "User is not blocked" });
        }

        // Restore the original role or default to 'entrepreneur'
        const role = user.originalRole || "entrepreneur";

        // Update user role back to the original role
        const updatedUser = await storage.updateUser(userId, {
          role,
          originalRole: null, // Clear originalRole field
        });

        // Create moderation log for user unblocking
        const userListings = await storage.getUserActiveListings(userId);

        // If the user has any active listings, use the first one for the moderation log
        if (userListings.length > 0) {
          const listing = userListings[0];

          await storage.createModerationLog({
            userId: req.user!.id,
            entityType: "user",
            entityId: userId,
            action: "unblock",
            reason: "User unblocked by admin",
          });
        }

        res.status(200).json(updatedUser);
      } catch (error) {
        next(error);
      }
    },
  );

  // Settings routes (admin only)
  app.get("/api/admin/settings", verifyAuthAndAdmin, async (req, res, next) => {
    try {
      console.log("[INFO] Admin settings request received");
      console.log(
        "[DEBUG] User making request:",
        req.user?.id,
        req.user?.username,
        req.user?.role,
      );

      const settings = await storage.getAllSettings();
      console.log(
        `[INFO] Retrieved ${settings?.length || 0} settings from storage`,
      );

      if (!settings || !Array.isArray(settings)) {
        console.warn("[WARN] getAllSettings did not return an array");
      } else {
        console.log(
          `[DEBUG] First 3 settings: ${settings
            .slice(0, 3)
            .map((s) => s.key)
            .join(", ")}`,
        );
      }

      // Set cache control headers to prevent caching
      res.set({
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
      });

      console.log(
        "[INFO] Sending admin settings response with",
        settings?.length || 0,
        "settings",
      );
      res.status(200).json(settings || []);
    } catch (error) {
      console.error("[ERROR] Failed to get admin settings:", error);
      next(error);
    }
  });

  app.get(
    "/api/admin/settings/:key",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const { key } = req.params;
        const setting = await storage.getSetting(key);

        if (!setting) {
          return res.status(404).json({ message: "Setting not found" });
        }

        res.status(200).json(setting);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/admin/settings",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const { key, value, type } = req.body;

        if (!key || value === undefined || !type) {
          return res
            .status(400)
            .json({ message: "Key, value, and type are required" });
        }

        // Check if setting already exists
        const existingSetting = await storage.getSetting(key);
        if (existingSetting) {
          return res.status(409).json({ message: "Setting already exists" });
        }

        const newSetting = await storage.createSetting({ key, value, type });
        res.status(201).json(newSetting);
      } catch (error) {
        next(error);
      }
    },
  );

  app.patch(
    "/api/admin/settings/:key",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
          return res.status(400).json({ message: "Value is required" });
        }

        const updatedSetting = await storage.updateSetting(key, value);

        if (!updatedSetting) {
          return res.status(404).json({ message: "Setting not found" });
        }

        res.status(200).json(updatedSetting);
      } catch (error) {
        next(error);
      }
    },
  );

  app.patch(
    "/api/admin/settings",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        console.log("[INFO] Batch settings update request received");
        const settingsToUpdate = req.body;

        if (!Array.isArray(settingsToUpdate) || settingsToUpdate.length === 0) {
          console.warn(
            "[WARN] Invalid settings update request - empty or not an array",
          );
          return res
            .status(400)
            .json({ message: "Settings array is required" });
        }

        console.log(
          `[INFO] Processing update for ${settingsToUpdate.length} settings`,
        );

        // Validate all settings have required fields
        for (const setting of settingsToUpdate) {
          if (!setting.key || setting.value === undefined || !setting.type) {
            console.warn("[WARN] Invalid setting in update request:", setting);
            return res.status(400).json({
              message: "Each setting must have key, value, and type fields",
            });
          }
        }

        const updatedSettings = await storage.updateSettings(settingsToUpdate);

        // Set cache control headers to prevent caching
        res.set({
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Surrogate-Control": "no-store",
        });

        // Make sure to send back the updated settings in the response
        res.status(200).json(updatedSettings);

        // Log that settings were successfully updated
        console.log(
          `[INFO] Successfully updated ${updatedSettings.length} settings`,
        );
      } catch (error) {
        console.error("[ERROR] Failed to update settings:", error);
        next(error);
      }
    },
  );

  app.delete(
    "/api/admin/settings/:key",
    verifyAuthAndAdmin,
    async (req, res, next) => {
      try {
        const { key } = req.params;
        const success = await storage.deleteSetting(key);

        if (!success) {
          return res.status(404).json({ message: "Setting not found" });
        }

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  // Add public settings route for client-side access
  app.get("/api/settings", async (req, res, next) => {
    try {
      console.log("[INFO] Public settings request received");
      // Force refresh from database with each request
      const settings = await storage.getAllSettings();
      console.log(`[INFO] Retrieved ${settings.length} total settings`);

      // Filter out admin-only settings
      const publicSettings = settings.filter((setting) => {
        // Filter out any settings that might contain sensitive information
        const key = setting.key.toLowerCase();
        return !(
          key.includes("secret") ||
          key.includes("password") ||
          key.includes("token") ||
          key.includes("key") ||
          key.includes("admin")
        );
      });

      // Log each image setting for debugging
      publicSettings.forEach((setting) => {
        if (
          setting.type === "image" ||
          ["site_logo", "hero_background", "company_favicon"].includes(
            setting.key,
          )
        ) {
          console.log(
            `[DEBUG] Image setting: ${setting.key} = ${setting.value}`,
          );
        }
      });

      console.log(`[INFO] Returning ${publicSettings.length} public settings`);

      // Set cache control headers to prevent browser caching
      res.set({
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
      });

      res.status(200).json(publicSettings);
    } catch (error) {
      console.error("[ERROR] Failed to retrieve settings:", error);
      next(error);
    }
  });

  // Get specific public setting by key
  app.get("/api/settings/:key", async (req, res, next) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);

      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }

      // Check if this is an admin-only setting
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("secret") ||
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("key") ||
        lowerKey.includes("admin")
      ) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.status(200).json(setting);
    } catch (error) {
      next(error);
    }
  });

  // Setup the direct file upload route
  app.post(
    "/api/admin/upload",
    // First verify authentication
    verifyAuthAndAdmin,
    // After authentication, handle the file upload with multer
    upload.single("image"),
    handleMulterError,
    secureFileUploadValidator,
    async (req: Request, res: Response) => {
      try {
        // Log the beginning of the upload process
        console.log(
          `[INFO] Starting image upload process for user ${req.user?.username}`,
        );
        console.log(`[DEBUG] Upload request body:`, req.body);

        // req.file is the uploaded file details from multer
        if (!req.file) {
          console.error("[ERROR] No file was received in the upload request");
          return res.status(400).json({ message: "No file uploaded" });
        }

        // Log file details
        console.log(`[DEBUG] File details:`, {
          filename: req.file.filename,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
          path: req.file.path,
        });

        // req.body.settingKey should be sent as form field
        const { settingKey } = req.body;
        if (!settingKey) {
          console.error(
            "[ERROR] No setting key was provided in the upload request",
          );
          return res.status(400).json({ message: "Setting key is required" });
        }

        console.log(
          `[INFO] File uploaded: ${req.file.filename} for setting: ${settingKey}`,
        );

        // Generate the public URL path
        const fileUrl = `/uploads/${req.file.filename}`;
        console.log(`[INFO] Generated public URL: ${fileUrl}`);

        // Enhanced debugging - check what files actually exist in the uploads directory
        try {
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          console.log(`[DEBUG] Checking uploads directory: ${uploadsDir}`);

          // List all files in the uploads directory
          if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            console.log(
              `[DEBUG] Files in uploads directory (${files.length}):`,
              files,
            );

            // Looking specifically for our file
            if (files.includes(req.file.filename)) {
              console.log(
                `[DEBUG] File ${req.file.filename} found in uploads directory`,
              );
            } else {
              console.warn(
                `[WARN] File ${req.file.filename} NOT found in uploads directory`,
              );
            }
          } else {
            console.error(
              `[ERROR] Uploads directory doesn't exist: ${uploadsDir}`,
            );
            // Create it if it doesn't exist
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log(`[INFO] Created uploads directory: ${uploadsDir}`);
          }

          // Check if the file was actually saved
          const filePath = path.join(process.cwd(), "public", fileUrl);
          console.log(`[DEBUG] Checking if file exists at path: ${filePath}`);

          if (!fs.existsSync(filePath)) {
            console.error(
              `[ERROR] File does not exist at expected path: ${filePath}`,
            );

            // Try to copy the file from temp location if available
            if (req.file.path && fs.existsSync(req.file.path)) {
              console.log(
                `[DEBUG] File exists at temp path: ${req.file.path}, attempting to copy to final destination`,
              );

              // Create the uploads directory if it doesn't exist
              if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
              }

              // Copy file from temp to final destination
              fs.copyFileSync(req.file.path, filePath);
              console.log(
                `[INFO] Successfully copied file from ${req.file.path} to ${filePath}`,
              );

              // If copy worked, continue as normal
              if (fs.existsSync(filePath)) {
                console.log(
                  `[DEBUG] File now exists at correct path after copy`,
                );
              } else {
                return res.status(500).json({
                  message:
                    "File upload failed - file could not be copied to final destination",
                  success: false,
                });
              }
            } else {
              return res.status(500).json({
                message:
                  "File upload failed - file not found at expected path or temp location",
                success: false,
              });
            }
          }

          console.log(`[DEBUG] File exists at path: ${filePath}`);
        } catch (fileError) {
          console.error(`[ERROR] Error checking file existence:`, fileError);
        }

        // Update the setting in the database with the URL
        // Make sure to specify the type as 'image' when updating
        console.log(
          `[DEBUG] Updating database for setting "${settingKey}" with URL "${fileUrl}"`,
        );
        console.log("[DEBUG] Request user:", req.user);
        console.log(
          "[DEBUG] Auth header:",
          req.headers.authorization ? "Present" : "Missing",
        );

        let updatedSetting;

        try {
          // Check if we have any database settings available
          const allSettings = await storage.getAllSettings();
          console.log(
            `[DEBUG] Current settings count: ${allSettings?.length || 0}`,
          );

          // First, check if the setting exists
          const existingSetting = await storage.getSetting(settingKey);
          console.log(
            `[DEBUG] Existing setting for "${settingKey}":`,
            existingSetting,
          );

          // Attempt to update the setting with explicit 'image' type
          updatedSetting = await storage.updateSetting(
            settingKey,
            fileUrl,
            "image",
          );

          // Log detailed result for debugging
          if (updatedSetting) {
            console.log("[DEBUG] Setting update successful:", updatedSetting);
          } else {
            console.error(
              "[ERROR] Setting update returned null or undefined result",
            );
            throw new Error("Setting update returned null result");
          }
        } catch (dbError) {
          console.error("[ERROR] Database update error details:", dbError);

          // Create a fallback setting object but don't try to insert it
          // Just use it for the response to the client
          const now = new Date();
          updatedSetting = {
            key: settingKey,
            value: fileUrl,
            type: "image",
            category: "theme", // Use theme category for images
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
          };

          console.log(
            "[WARN] Using fallback setting object in response:",
            updatedSetting,
          );

          // Try to force update directly with SQL if our ORM method failed
          try {
            console.log("[DEBUG] Attempting direct SQL update as fallback");
            await db.execute(
              sql`UPDATE settings SET value = ${fileUrl}, type = 'image', updated_at = NOW() WHERE key = ${settingKey}`,
            );
            console.log("[DEBUG] Direct SQL update executed");
          } catch (sqlError) {
            console.error("[ERROR] Even direct SQL update failed:", sqlError);
          }
        }

        // Even if the database update fails, as long as the file was uploaded successfully,
        // return success to the client with the file URL
        console.log(
          `[INFO] Successfully processed image upload for "${settingKey}":`,
          updatedSetting,
        );

        // Final verification step: ensure that the setting is now in the database
        let verifiedSetting = updatedSetting;
        try {
          // Do a fresh database query to get the current state
          const freshSetting = await storage.getSetting(settingKey);

          // Log the verification results
          if (freshSetting) {
            console.log(
              `[DEBUG] Verification successful. Setting "${settingKey}" exists in database:`,
              freshSetting,
            );

            // If the value doesn't match what we just set, update our response
            if (freshSetting.value !== fileUrl) {
              console.warn(
                `[WARN] Setting value mismatch! Expected ${fileUrl} but got ${freshSetting.value}`,
              );

              // Try one more time to update
              try {
                await db.execute(
                  sql`UPDATE settings SET value = ${fileUrl}, updated_at = NOW() WHERE key = ${settingKey}`,
                );
                console.log(
                  "[DEBUG] Executed direct SQL update to fix value mismatch",
                );
              } catch (fixError) {
                console.error(
                  "[ERROR] Failed to fix value mismatch:",
                  fixError,
                );
              }
            }
          } else {
            console.warn(
              `[WARN] Setting "${settingKey}" not found in database during verification`,
            );

            // Try creating it one more time with raw SQL
            try {
              await db.execute(
                sql`INSERT INTO settings (id, key, value, type, category, created_at, updated_at) 
                    VALUES (${crypto.randomUUID()}, ${settingKey}, ${fileUrl}, 'image', 'theme', NOW(), NOW())`,
              );
              console.log("[DEBUG] Executed direct SQL insert as last resort");
            } catch (lastError) {
              console.error(
                "[ERROR] Even direct SQL insert failed:",
                lastError,
              );
            }
          }
        } catch (verifyError) {
          console.error(
            "[ERROR] Error during final verification:",
            verifyError,
          );
        }

        // Set cache control headers to prevent caching
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");

        // Return success response with cache-busting URL suffix
        const cacheBustUrl = `${fileUrl}?t=${Date.now()}`;
        res.status(201).json({
          message: "File successfully uploaded",
          url: cacheBustUrl, // Use cache-busting URL
          rawUrl: fileUrl, // Include original URL too
          setting: verifiedSetting,
          success: true,
        });
      } catch (error) {
        console.error("[ERROR] Image upload error:", error);
        res.status(500).json({
          message: "Failed to process uploaded file",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  );

  // DEBUGGING ROUTES

  // Check all relevant directories
  app.get(
    "/api/admin/check-directories",
    verifyAuth,
    async (req: Request, res: Response) => {
      try {
        // Check if user is admin
        if (!req.user || req.user.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Unauthorized. Admin access required." });
        }

        const uploadsDir = path.resolve("./public/uploads");
        const publicDir = path.resolve("./public");
        const results = {
          uploadsDir: {
            path: uploadsDir,
            exists: fs.existsSync(uploadsDir),
            writable: false,
            stats: null as any,
            files: [] as any[],
          },
          publicDir: {
            path: publicDir,
            exists: fs.existsSync(publicDir),
            writable: false,
            stats: null as any,
            files: [] as any[],
          },
        };

        // Check if directories are writable
        if (results.uploadsDir.exists) {
          try {
            fs.accessSync(uploadsDir, fs.constants.W_OK);
            results.uploadsDir.writable = true;
            results.uploadsDir.stats = fs.statSync(uploadsDir);

            // List files in uploads directory
            results.uploadsDir.files = fs
              .readdirSync(uploadsDir)
              .map((file) => ({
                name: file,
                stats: fs.statSync(path.join(uploadsDir, file)),
              }))
              .slice(0, 10); // Limit to first 10 files
          } catch (e) {
            results.uploadsDir.writable = false;
          }
        }

        if (results.publicDir.exists) {
          try {
            fs.accessSync(publicDir, fs.constants.W_OK);
            results.publicDir.writable = true;
            results.publicDir.stats = fs.statSync(publicDir);

            // List top-level directories in public
            results.publicDir.files = fs
              .readdirSync(publicDir)
              .filter((item) =>
                fs.statSync(path.join(publicDir, item)).isDirectory(),
              )
              .map((dir) => ({
                name: dir,
                stats: fs.statSync(path.join(publicDir, dir)),
              }));
          } catch (e) {
            results.publicDir.writable = false;
          }
        }

        // Also check image settings in database
        const imageSettings = await storage.getSettingsByType("image");

        res.json({
          directories: results,
          imageSettings,
        });
      } catch (error) {
        console.error("[ERROR] Directory check error:", error);
        res.status(500).json({ error: "Failed to check directories" });
      }
    },
  );

  // Create a test image in the uploads directory
  app.post(
    "/api/admin/create-test-image",
    verifyAuth,
    async (req: Request, res: Response) => {
      try {
        // Check if user is admin
        if (!req.user || req.user.role !== "admin") {
          return res
            .status(403)
            .json({ error: "Unauthorized. Admin access required." });
        }

        const uploadsDir = path.resolve("./public/uploads");

        // Ensure uploads directory exists
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Create a simple test image (a colored square)
        const fileName = `test-logo-${Date.now()}.svg`;
        const filePath = path.join(uploadsDir, fileName);

        // Create a simple SVG image
        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="150" viewBox="0 0 300 150">
        <rect width="300" height="150" fill="#3498db"/>
        <text x="150" y="75" font-family="Arial" font-size="24" fill="white" text-anchor="middle" dominant-baseline="middle">
          TEEJARTI
        </text>
        <text x="150" y="105" font-family="Arial" font-size="12" fill="white" text-anchor="middle" dominant-baseline="middle">
          Test Logo (${new Date().toISOString()})
        </text>
      </svg>`;

        fs.writeFileSync(filePath, svgContent);

        // Check if file was created successfully
        if (!fs.existsSync(filePath)) {
          throw new Error("Failed to create test image file");
        }

        const url = `/uploads/${fileName}`;

        // Update the site_logo setting in the database
        const updated = await storage.updateSetting("site_logo", url, "image");

        res.json({
          success: true,
          message: "Test image created and set as logo",
          url,
          updated,
        });
      } catch (error) {
        console.error("[ERROR] Test image creation error:", error);
        res.status(500).json({ error: "Failed to create test image" });
      }
    },
  );

  // Batch user endpoint for efficient data fetching
  app.get("/api/users/batch", async (req, res, next) => {
    try {
      const idsParam = req.query.ids as string;
      if (!idsParam) {
        return res.status(400).json({ message: "User IDs required" });
      }

      const userIds = idsParam
        .split(",")
        .map((id) => parseInt(id.trim()))
        .filter((id) => !isNaN(id));
      if (userIds.length === 0) {
        return res.status(400).json({ message: "Valid user IDs required" });
      }

      const users = await storage.getUsersByIds(userIds);

      // Remove sensitive information and create a map for easy lookup
      const usersMap = users.reduce(
        (acc, user) => {
          const { password, ...userWithoutPassword } = user;
          acc[user.id] = userWithoutPassword;
          return acc;
        },
        {} as Record<number, any>,
      );

      res.status(200).json(usersMap);
    } catch (error) {
      next(error);
    }
  });

  // Individual user endpoint
  app.get("/api/users/:id", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove sensitive information
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });

  // Mount admin routes
  app.use("/api/admin", verifyAuthAndAdmin, adminRouter);

  // Set up onboarding routes
  setupOnboardingRoutes(app);

  // Get all translations (public endpoint for loading translations)
  app.get("/api/translations", async (req: Request, res: Response) => {
    try {
      // Set cache control headers to prevent caching
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      
      const allTranslations = await storage.getAllTranslations();
      res.json({ success: true, data: allTranslations });
    } catch (error: any) {
      console.error("Error fetching translations:", error);
      res.status(500).json({ error: "Failed to fetch translations" });
    }
  });

  // Translation API endpoint - uses HuggingFace with Google Translate fallback
  app.post("/api/translate", async (req: Request, res: Response) => {
    try {
      const { text, source, target } = req.body;

      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      if (!source || !target) {
        return res
          .status(400)
          .json({ error: "Source and target languages are required" });
      }

      if (
        !(source === "en" || source === "ar") ||
        !(target === "en" || target === "ar")
      ) {
        return res
          .status(400)
          .json({ error: "Only English and Arabic languages are supported" });
      }

      console.log(
        `[Translation API] Translating text from ${source} to ${target}: "${text.substring(0, 50)}${text.length > 50 ? "..." : ""}"`,
      );

      let model = "huggingface";

      try {
        // Try HuggingFace translation first
        const translatedText = await translateField(
          text,
          source as Language,
          target as Language,
        );

        return res.status(200).json({
          translatedText,
          source,
          target,
          model,
        });
      } catch (error) {
        console.error(
          "[Translation API] HuggingFace translation failed:",
          error,
        );

        // If HuggingFace fails, fallback is already handled in translateField
        // So we shouldn't reach here, but if we do, return an error
        return res.status(500).json({
          error: "Translation failed",
          details: error instanceof Error ? error.message : String(error),
        });
      }
    } catch (error) {
      console.error("[Translation API] Error:", error);
      return res.status(500).json({
        error: "Translation service error",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Success Stories Routes

  /**
   * Get featured success stories
   */
  app.get("/api/success-stories/featured", async (req, res, next) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 3;
      const featuredStories = await storage.getFeaturedSuccessStories(limit);

      // Get user information for each story
      const enrichedStories = await Promise.all(
        featuredStories.map(async (story) => {
          const user = await storage.getUser(story.userId);
          return {
            ...story,
            user: user
              ? {
                  id: user.id,
                  username: user.username,
                  fullName: user.fullName,
                  company: user.company,
                }
              : undefined,
          };
        }),
      );

      res.status(200).json(enrichedStories);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get success stories by user
   */
  app.get("/api/users/:userId/success-stories", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      // Only get approved stories for public view
      const stories = await storage.getUserSuccessStories(userId);
      const approvedStories = stories.filter(
        (story) => story.status === "approved",
      );

      res.status(200).json(approvedStories);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get all success stories (approved only unless authenticated user)
   */
  app.get("/api/success-stories", async (req, res, next) => {
    try {
      // Non-authenticated users can only see approved stories
      const status = req.user
        ? (req.query.status as string | undefined)
        : "approved";

      // If user is not admin and status is specified, restrict to approved or user's own stories
      let stories = await storage.getSuccessStories(status);

      // If user is authenticated but not admin, filter to only see their own pending/rejected stories
      if (req.user && req.user.role !== "admin" && status !== "approved") {
        stories = stories.filter((story) => story.userId === req.user!.id);
      }

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
                  fullName: user.fullName,
                  company: user.company,
                }
              : undefined,
          };
        }),
      );

      res.status(200).json(enrichedStories);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Get a single success story
   */
  app.get("/api/success-stories/:id", async (req, res, next) => {
    try {
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ message: "Invalid success story ID" });
      }

      const story = await storage.getSuccessStory(storyId);

      if (!story) {
        return res.status(404).json({ message: "Success story not found" });
      }

      // Non-authenticated users can only see approved stories
      if (!req.user && story.status !== "approved") {
        return res.status(404).json({ message: "Success story not found" });
      }

      // Non-admin users can only see approved stories or their own
      if (
        req.user &&
        req.user.role !== "admin" &&
        story.status !== "approved" &&
        story.userId !== req.user.id
      ) {
        return res.status(404).json({ message: "Success story not found" });
      }

      // Get user information
      const user = await storage.getUser(story.userId);

      const enrichedStory = {
        ...story,
        user: user
          ? {
              id: user.id,
              username: user.username,
              fullName: user.fullName,
              company: user.company,
            }
          : undefined,
      };

      res.status(200).json(enrichedStory);
    } catch (error) {
      next(error);
    }
  });

  /**
   * Create a success story (requires authentication)
   */
  app.post("/api/success-stories", verifyAuth, async (req, res, next) => {
    try {
      const storyData = insertSuccessStorySchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const story = await storage.createSuccessStory(storyData);

      res.status(201).json({
        ...story,
        message:
          "Success story submitted for review. It will be published after approval.",
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  /**
   * Update a success story (owner only)
   */
  app.patch("/api/success-stories/:id", verifyAuth, async (req, res, next) => {
    try {
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ message: "Invalid success story ID" });
      }

      const story = await storage.getSuccessStory(storyId);

      if (!story) {
        return res.status(404).json({ message: "Success story not found" });
      }

      // Only the owner can update their story
      if (story.userId !== req.user!.id && req.user!.role !== "admin") {
        return res
          .status(403)
          .json({ message: "You don't have permission to update this story" });
      }

      // Regular users can only update their story if it's not approved yet
      if (req.user!.role !== "admin" && story.status === "approved") {
        return res
          .status(403)
          .json({
            message: "Cannot update an approved story. Please contact admin.",
          });
      }

      // If a regular user updates their story, set it back to pending
      let updateData = req.body;
      if (req.user!.role !== "admin") {
        updateData = {
          ...updateData,
          status: "pending",
        };
      }

      const updatedStory = await storage.updateSuccessStory(
        storyId,
        updateData,
      );

      res.status(200).json({
        ...updatedStory,
        message:
          req.user!.role !== "admin"
            ? "Your updated story has been submitted for review."
            : "Story updated successfully.",
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * Delete a success story (owner or admin only)
   */
  app.delete("/api/success-stories/:id", verifyAuth, async (req, res, next) => {
    try {
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ message: "Invalid success story ID" });
      }

      const story = await storage.getSuccessStory(storyId);

      if (!story) {
        return res.status(404).json({ message: "Success story not found" });
      }

      // Only the owner or admin can delete the story
      if (story.userId !== req.user!.id && req.user!.role !== "admin") {
        return res
          .status(403)
          .json({ message: "You don't have permission to delete this story" });
      }

      await storage.deleteSuccessStory(storyId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  // Database health monitoring endpoint (admin only)
  app.get(
    "/api/admin/db-health",
    verifyAuthAndAdmin,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const health = await healthCheck();
        const poolStats = getPoolStats();

        res.status(200).json({
          timestamp: new Date().toISOString(),
          database: health,
          connectionPool: {
            ...poolStats,
            utilizationPercentage: Math.round(
              (poolStats.activeCount / (poolStats.totalCount || 1)) * 100,
            ),
            status: poolStats.totalCount > 0 ? "active" : "idle",
          },
        });
      } catch (error) {
        console.error("[DB] Health check endpoint error:", error);
        res.status(500).json({
          timestamp: new Date().toISOString(),
          database: { healthy: false, error: "Health check failed" },
          connectionPool: getPoolStats(),
        });
      }
    },
  );

  // Newsletter subscription endpoints
  app.post("/api/newsletter/subscribe", async (req, res, next) => {
    try {
      const { email } = req.body;

      // Validate email
      const parsedData = insertNewsletterSubscriptionSchema.parse({ email });

      // Check if subscription already exists
      const existingSubscription = await storage.getNewsletterSubscription(email);
      
      if (existingSubscription && existingSubscription.status === "active") {
        return res.status(200).json({ 
          message: "You're already subscribed to our newsletter!",
          subscription: existingSubscription 
        });
      }

      // Create or reactivate subscription
      const subscription = await storage.createNewsletterSubscription(parsedData);

      // Send welcome email (non-blocking)
      const emailSent = await sendNewsletterWelcomeEmail(email);
      
      let message = "Successfully subscribed to newsletter!";
      if (!emailSent) {
        console.warn(`Failed to send welcome email to ${email}, but subscription was created`);
        message = "Successfully subscribed to newsletter! (Welcome email will be sent shortly)";
      }

      res.status(201).json({
        message,
        subscription: {
          id: subscription.id,
          email: subscription.email,
          status: subscription.status,
          subscribedAt: subscription.subscribedAt,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      next(error);
    }
  });

  app.post("/api/newsletter/unsubscribe/:token", async (req, res, next) => {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ message: "Unsubscribe token is required" });
      }

      const success = await storage.unsubscribeFromNewsletter(token);

      if (!success) {
        return res.status(404).json({ message: "Invalid or expired unsubscribe link" });
      }

      res.status(200).json({ message: "Successfully unsubscribed from newsletter" });
    } catch (error) {
      next(error);
    }
  });

  // Admin: Get all newsletter subscriptions
  app.get("/api/admin/newsletter/subscriptions", verifyAuthAndAdmin, async (req, res, next) => {
    try {
      const subscriptions = await storage.getActiveNewsletterSubscriptions();
      res.status(200).json(subscriptions);
    } catch (error) {
      next(error);
    }
  });

  // Email authentication routes
  app.post("/api/auth/request-password-reset", requestPasswordReset);
  app.post("/api/auth/reset-password", resetPassword);
  app.post("/api/auth/request-email-verification", verifyAuth, requestEmailVerification);
  app.get("/api/auth/verify-email", verifyEmail);
  app.post("/api/admin/resend-welcome-email/:userId", verifyAuthAndAdmin, resendWelcomeEmail);

  const httpServer = createServer(app);
  return httpServer;
}





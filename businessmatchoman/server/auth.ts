import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { User, insertUserSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginLimiter, registerLimiter } from "./security";
import { emailService } from "./email";

// Define JWT token interface
interface JwtPayload {
  userId: number;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const JWT_EXPIRY = "30d"; // Token expires in 30 days for better admin usability
const JWT_ALGORITHM = "HS256"; // Use HMAC SHA-256 algorithm

/**
 * Hash a password using bcrypt
 * @param password Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare a password with a hashed password
 * @param plainPassword Plain text password
 * @param hashedPassword Hashed password
 * @returns True if passwords match
 */
export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string,
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a JWT token for a user
 * @param user User object
 * @returns JWT token
 */
function generateToken(user: User): string {
  // Create minimal payload with no sensitive data
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  // Check if JWT_SECRET is available
  if (!process.env.JWT_SECRET) {
    console.warn(
      "WARNING: JWT_SECRET is not set. Using fallback secret. This is not secure for production!",
    );
  }

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || "your_jwt_secret_should_be_in_env",
    {
      expiresIn: JWT_EXPIRY,
      algorithm: JWT_ALGORITHM,
    },
  );
}

/**
 * Create a new user account
 * @param email User email
 * @param password User password (will be hashed)
 * @param userData Other user data
 * @returns User object without password and JWT token
 */
export async function registerUser(
  userData: any,
): Promise<{ user: Omit<User, "password">; token: string }> {
  try {
    // Validate user input with Zod schema
    const validatedUserData = insertUserSchema.parse(userData);

    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(validatedUserData.email);
    if (existingEmail) {
      throw new Error("Email is already registered");
    }

    // Check if username already exists
    const existingUsername = await storage.getUserByUsername(
      validatedUserData.username,
    );
    if (existingUsername) {
      throw new Error("Username is already taken");
    }

    // Hash the password
    const hashedPassword = await hashPassword(validatedUserData.password);

    // Create user with hashed password
    const user = await storage.createUser({
      ...validatedUserData,
      password: hashedPassword,
    });

    // Generate JWT token
    const token = generateToken(user);

    // Send welcome email (don't wait for it to complete registration)
    emailService.sendWelcomeEmail(
      user.email,
      user.fullName,
      'en' // Default to English, could be enhanced to detect user's preferred language
    ).catch(error => {
      console.error('Failed to send welcome email:', error);
      // Don't throw error - registration should still succeed
    });

    // Remove password from user object
    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(fromZodError(error).message);
    }
    throw error;
  }
}

/**
 * Verify user credentials and return user info (without token for 2FA flow)
 * @param emailOrUsername User email or username
 * @param password User password
 * @returns User object without password if credentials are valid
 */
export async function verifyUserCredentials(
  emailOrUsername: string,
  password: string,
): Promise<Omit<User, "password">> {
  // Determine if input is email or username
  const isEmail = emailOrUsername.includes("@");
  let user;

  // Get user by email or username
  if (isEmail) {
    user = await storage.getUserByEmail(emailOrUsername);
  } else {
    user = await storage.getUserByUsername(emailOrUsername);
  }

  // If user not found or password doesn't match
  if (!user || !(await comparePasswords(password, user.password))) {
    throw new Error("Invalid credentials");
  }

  // Remove password from user object
  const { password: _, ...userWithoutPassword } = user;

  return userWithoutPassword;
}

/**
 * Complete login with OTP verification
 * @param userId User ID
 * @param otpCode OTP code for verification
 * @returns User object without password and JWT token
 */
export async function loginWithOtp(
  userId: number,
  otpCode: string,
): Promise<{ user: Omit<User, "password">; token: string }> {
  const user = await storage.getUser(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Verify OTP code
  const { verifyOtpCode } = await import("./otp-service");
  const isValid = await verifyOtpCode(userId, otpCode, "login");

  if (!isValid) {
    throw new Error("Invalid or expired OTP code");
  }

  // Generate JWT token
  const token = generateToken(user);

  // Remove password from user object
  const { password: _, ...userWithoutPassword } = user;

  return { user: userWithoutPassword, token };
}

/**
 * Legacy login function (without 2FA) - for backward compatibility
 */
export async function loginUser(
  emailOrUsername: string,
  password: string,
): Promise<{ user: Omit<User, "password">; token: string }> {
  const user = await verifyUserCredentials(emailOrUsername, password);
  const token = generateToken({ ...user, password: "" } as User);

  return { user, token };
}

/**
 * Middleware to verify JWT token in Authorization header
 */
export function verifyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    // Extract token from header
    const token = authHeader.split(" ")[1];

    // Verify token with algorithm
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret_should_be_in_env",
      { algorithms: [JWT_ALGORITHM] },
    ) as JwtPayload;

    // Check for token expiry (even though jwt.verify already checks this)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < currentTimestamp) {
      return res.status(401).json({ message: "Token expired" });
    }

    // Get user from database
    storage
      .getUser(decoded.userId)
      .then((user) => {
        if (!user) {
          return res.status(401).json({ message: "User not found" });
        }

        // Check if user is blocked
        if (user.role === "blocked") {
          return res
            .status(403)
            .json({ message: "Account has been suspended" });
        }

        // Attach user to request
        req.user = user;
        next();
      })
      .catch((err) => {
        console.error("Error fetching user in auth middleware:", err);
        res.status(500).json({ message: "Internal server error" });
      });
  } catch (error) {
    // Don't log the full error in production, just return appropriate error messages
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }

    console.error(
      "Auth middleware error type:",
      error instanceof Error ? error.name : "Unknown error",
    );
    res.status(401).json({ message: "Authentication failed" });
  }
}

/**
 * Setup authentication routes
 */
export function setupAuth(app: Express) {
  // JWT-based authentication routes with rate limiting
  app.post("/auth/register", registerLimiter, async (req, res, next) => {
    try {
      const { user, token } = await registerUser(req.body);
      res.status(201).json({ user, token });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  });

  // Step 1: Verify credentials and send OTP
  app.post("/auth/verify-credentials", loginLimiter, async (req, res, next) => {
    try {
      const { email, username, password } = req.body;
      const loginIdentifier = email || username;

      if (!loginIdentifier || !password) {
        return res
          .status(400)
          .json({ message: "Email/username and password are required" });
      }

      const user = await verifyUserCredentials(loginIdentifier, password);

      // Send OTP codes
      const { sendLoginOtp } = await import("./otp-service");
      const { emailSent, phoneSent } = await sendLoginOtp(user.id);

      res.json({
        success: true,
        userId: user.id,
        user: {
          email: user.email,
          phone: user.phone,
          fullName: user.fullName,
        },
        otpSent: {
          email: emailSent,
          phone: phoneSent,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(401).json({ message: error.message });
      }
      next(error);
    }
  });

  // Step 2: Verify OTP and complete login
  app.post("/auth/verify-otp", loginLimiter, async (req, res, next) => {
    try {
      const { userId, otpCode } = req.body;

      if (!userId || !otpCode) {
        return res
          .status(400)
          .json({ message: "User ID and OTP code are required" });
      }

      const { user, token } = await loginWithOtp(userId, otpCode);
      res.status(200).json({ user, token });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(401).json({ message: error.message });
      }
      next(error);
    }
  });

  // Legacy login without 2FA (for backward compatibility)
  app.post("/auth/login", loginLimiter, async (req, res, next) => {
    try {
      const { email, username, password } = req.body;

      // Support both email and username fields for login
      const loginIdentifier = email || username;

      if (!loginIdentifier || !password) {
        return res
          .status(400)
          .json({ message: "Email/username and password are required" });
      }

      const { user, token } = await loginUser(loginIdentifier, password);
      res.status(200).json({ user, token });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(401).json({ message: error.message });
      }
      next(error);
    }
  });

  app.get("/auth/me", verifyAuth, (req, res) => {
    // Password is removed in the middleware
    const { password, ...userWithoutPassword } = req.user!;
    res.status(200).json(userWithoutPassword);
  });

  // Legacy authentication routes - keep these for backward compatibility
  // Apply rate limiters to these routes as well
  app.post("/api/register", registerLimiter, async (req, res, next) => {
    try {
      console.log("[INFO] Registration attempt received for email:", req.body.email);
      const { user, token } = await registerUser(req.body);
      console.log("[INFO] Registration successful for user:", user.email);
      res.status(201).json({ user, token });
    } catch (error) {
      if (error instanceof Error) {
        console.error("[ERROR] Registration failed:", error.message, "for email:", req.body.email);
        
        if (error.message === "Email is already registered") {
          return res.status(400).json({ 
            message: "This email is already registered. Please use a different email or try logging in." 
          });
        }
        
        if (error.message === "Username is already taken") {
          return res.status(400).json({ 
            message: "This username is already taken. Please choose a different username." 
          });
        }
        
        return res.status(400).json({ message: error.message });
      }
      next(error);
    }
  });

  app.post("/api/login", loginLimiter, async (req, res, next) => {
    try {
      const { email, username, emailOrUsername, password } = req.body;

      // Support multiple field names for login
      const loginIdentifier = emailOrUsername || email || username;

      if (!loginIdentifier || !password) {
        return res
          .status(400)
          .json({ message: "Email/username and password are required" });
      }

      const { user, token } = await loginUser(loginIdentifier, password);
      res.status(200).json({ user, token });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(401).json({ message: error.message });
      }
      next(error);
    }
  });

  app.post("/api/logout", (req, res) => {
    // With JWT, logout is handled on the client by removing the token
    res.status(200).json({ message: "Logged out successfully" });
  });

  // === VERIFICATION FLOW ENDPOINTS ===
  
  // Send email verification code
  app.post("/api/verification/send-email", verifyAuth, async (req, res, next) => {
    try {
      const user = req.user!;
      
      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Create OTP code
      const { createOtpCode } = await import("./otp-service");
      const otpCode = await createOtpCode(user.id, "email");
      
      // Send email
      const { sendEmailVerificationOtp } = await import("./email-service");
      const emailSent = await sendEmailVerificationOtp(user.email, user.fullName, otpCode);
      
      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send verification email" });
      }
      
      res.status(200).json({ message: "Verification code sent to your email" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  });

  // Verify email with code
  app.post("/api/verification/verify-email", verifyAuth, async (req, res, next) => {
    try {
      const user = req.user!;
      const { verificationCode } = req.body;
      
      if (!verificationCode) {
        return res.status(400).json({ message: "Verification code is required" });
      }
      
      if (user.isEmailVerified) {
        return res.status(400).json({ message: "Email is already verified" });
      }

      // Verify OTP code (allow 000000 for testing)
      let isValid = false;
      
      if (verificationCode === "000000") {
        // Accept test code for development
        isValid = true;
      } else {
        const { verifyOtpCode } = await import("./otp-service");
        isValid = await verifyOtpCode(user.id, verificationCode, "email");
      }
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Update user's email verification status
      await storage.updateUser(user.id, { isEmailVerified: true });
      
      res.status(200).json({ message: "Email verified successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  });

  // Send phone verification code
  app.post("/api/verification/send-phone", verifyAuth, async (req, res, next) => {
    try {
      const user = req.user!;
      const { phone } = req.body;
      
      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      
      if (user.isPhoneVerified) {
        return res.status(400).json({ message: "Phone is already verified" });
      }

      // Update user's phone number if provided
      if (phone !== user.phone) {
        await storage.updateUser(user.id, { phone });
      }

      // Create OTP code
      const { createOtpCode } = await import("./otp-service");
      const otpCode = await createOtpCode(user.id, "phone");
      
      // Send SMS (currently just logs)
      const { sendPhoneOtp } = await import("./otp-service");
      const smsSent = await sendPhoneOtp(phone, otpCode);
      
      if (!smsSent) {
        return res.status(500).json({ message: "Failed to send verification SMS" });
      }
      
      res.status(200).json({ message: "Verification code sent to your phone" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  });

  // Verify phone with code
  app.post("/api/verification/verify-phone", verifyAuth, async (req, res, next) => {
    try {
      const user = req.user!;
      const { verificationCode } = req.body;
      
      if (!verificationCode) {
        return res.status(400).json({ message: "Verification code is required" });
      }
      
      if (user.isPhoneVerified) {
        return res.status(400).json({ message: "Phone is already verified" });
      }

      // Verify OTP code (allow 000000 for testing)
      let isValid = false;
      
      if (verificationCode === "000000") {
        // Accept test code for development
        isValid = true;
      } else {
        const { verifyOtpCode } = await import("./otp-service");
        isValid = await verifyOtpCode(user.id, verificationCode, "phone");
      }
      
      if (!isValid) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Update user's phone verification status
      await storage.updateUser(user.id, { isPhoneVerified: true });
      
      res.status(200).json({ message: "Phone verified successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  });

  // Submit KYC documents
  app.post("/api/verification/submit-kyc", verifyAuth, async (req, res, next) => {
    try {
      const user = req.user!;
      const { idType, idNumber, country, dateOfBirth, documents, selectedDocuments } = req.body;
      
      if (!idType || !idNumber || !country || !dateOfBirth) {
        return res.status(400).json({ message: "All personal information fields are required" });
      }
      
      if (!documents || Object.keys(documents).length === 0) {
        return res.status(400).json({ message: "At least one document must be uploaded" });
      }
      
      if (user.kycStatus === "pending" || user.kycStatus === "approved") {
        return res.status(400).json({ message: "KYC already submitted or approved" });
      }

      // Map frontend document types to database field names
      // Store the first ID document as primary ID document URL
      let idDocumentUrl = null;
      const idDocTypes = ['national_id', 'passport', 'driving_license'];
      for (const docType of idDocTypes) {
        if (documents[docType]) {
          idDocumentUrl = documents[docType];
          break;
        }
      }

      // Get address proof URL from address documents OR use additional ID documents
      let addressProofUrl = null;
      const addressDocTypes = ['utility_bill', 'bank_statement'];
      for (const docType of addressDocTypes) {
        if (documents[docType]) {
          addressProofUrl = documents[docType];
          break;
        }
      }
      
      // If no address proof found, use a second ID document as address proof
      if (!addressProofUrl) {
        for (const docType of idDocTypes) {
          if (documents[docType] && documents[docType] !== idDocumentUrl) {
            addressProofUrl = documents[docType];
            break;
          }
        }
      }

      // Get business license URL OR use a third ID document as business license
      let businessLicenseUrl = documents['business_license'] || null;
      
      // If no business license found, use a third ID document as business license
      if (!businessLicenseUrl) {
        for (const docType of idDocTypes) {
          if (documents[docType] && 
              documents[docType] !== idDocumentUrl && 
              documents[docType] !== addressProofUrl) {
            businessLicenseUrl = documents[docType];
            break;
          }
        }
      }

      // Ensure we have at least an ID document
      if (!idDocumentUrl) {
        return res.status(400).json({ message: "ID document is required (passport, national ID, or driving license)" });
      }

      // Create KYC submission record with proper field mapping
      const kycData = {
        userId: user.id,
        idType,
        idNumber,
        idDocumentUrl,
        addressProofUrl,
        businessLicenseUrl,
      };

      // Save KYC application to storage
      await storage.createKyc(kycData);

      // Update user's KYC status
      await storage.updateUser(user.id, { kycStatus: "pending" });
      
      // Send notification email about KYC submission
      const { sendKycStatusEmail } = await import("./email-service");
      await sendKycStatusEmail(user.email, user.fullName, "pending");
      
      res.status(200).json({ message: "KYC documents submitted successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      next(error);
    }
  });

  app.get("/api/user", verifyAuth, (req, res) => {
    const { password, ...userWithoutPassword } = req.user!;
    res.status(200).json(userWithoutPassword);
  });
}

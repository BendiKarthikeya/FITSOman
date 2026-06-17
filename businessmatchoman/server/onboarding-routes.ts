import { Express, Request, Response } from "express";
import { verifyAuth } from "./auth";
import { storage } from "./storage";
import { sendEmailVerificationOtp, sendKycApprovalEmail, sendKycRejectionEmail } from "./email-service";
import { requestPasswordReset, resetPasswordWithToken, verifyResetToken } from "./password-reset";
import { registerLimiter, loginLimiter } from "./security";

/**
 * Generate a 6-digit OTP code
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Enhanced user registration with onboarding flow
 */
export function setupOnboardingRoutes(app: Express) {
  
  // Enhanced registration that creates onboarding record
  app.post("/api/auth/register-onboarding", registerLimiter, async (req, res) => {
    try {
      const { registerUser } = await import("./auth");
      const { user, token } = await registerUser(req.body);

      // Create onboarding record
      await storage.createUserOnboarding({
        userId: user.id,
        currentStep: "email_verification",
        termsAccepted: true, // User accepted during registration
      });

      // Generate and send email verification OTP
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await storage.createOtpCode(user.id, otpCode, "email_verification", expiresAt);
      await sendEmailVerificationOtp(user.email, user.fullName, otpCode);

      res.status(201).json({
        message: "Registration successful. Please check your email for verification code.",
        user: { id: user.id, email: user.email, fullName: user.fullName },
        token,
        nextStep: "email_verification"
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email verification
  app.post("/api/auth/verify-email", verifyAuth, async (req, res) => {
    try {
      const { otpCode } = req.body;
      const userId = req.user!.id;

      if (!otpCode) {
        return res.status(400).json({ message: "Verification code is required" });
      }

      // Verify OTP code
      const validOtp = await storage.getValidOtpCode(userId, otpCode, "email_verification");
      if (!validOtp) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Mark OTP as used
      await storage.markOtpCodeUsed(validOtp.id);

      // Update user verification status
      await storage.updateUser(userId, { verified: true });

      // Update onboarding progress  
      await storage.updateUserOnboarding(userId, {
        emailVerified: true,
        currentStep: "profile_completion"
      });

      res.json({
        message: "Email verified successfully",
        nextStep: "profile_completion"
      });
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Resend email verification OTP
  app.post("/api/auth/resend-verification", verifyAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;

      // Generate new OTP
      const otpCode = generateOtpCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await storage.createOtpCode(userId, otpCode, "email_verification", expiresAt);
      await sendEmailVerificationOtp(user.email, user.fullName, otpCode);

      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to resend verification code" });
    }
  });

  // Complete profile step
  app.post("/api/auth/complete-profile", verifyAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { company, position, location, phone, bio } = req.body;

      // Update user profile
      await storage.updateUser(userId, {
        company,
        position,
        location,
        phone,
        bio
      });

      // Update onboarding progress
      await storage.updateUserOnboarding(userId, {
        profileCompleted: true,
        currentStep: "kyc_submission"
      });

      res.json({
        message: "Profile completed successfully",
        nextStep: "kyc_submission"
      });
    } catch (error) {
      console.error("Complete profile error:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });

  // Submit KYC documents
  app.post("/api/auth/submit-kyc", verifyAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { idNumber, idType, idDocumentUrl, addressProofUrl, businessLicenseUrl } = req.body;

      if (!idNumber || !idType || !idDocumentUrl) {
        return res.status(400).json({ message: "ID number, type, and document are required" });
      }

      // Create KYC record
      await storage.createKyc({
        userId,
        idNumber,
        idType,
        idDocumentUrl,
        addressProofUrl: addressProofUrl || null,
        businessLicenseUrl: businessLicenseUrl || null,
      });

      // Update onboarding progress
      await storage.updateUserOnboarding(userId, {
        kycSubmitted: true,
        currentStep: "pending_approval"
      });

      res.json({
        message: "KYC documents submitted successfully. Your account is pending approval.",
        nextStep: "pending_approval"
      });
    } catch (error) {
      console.error("KYC submission error:", error);
      res.status(500).json({ message: "Failed to submit KYC documents" });
    }
  });

  // Get user onboarding status
  app.get("/api/auth/onboarding-status", verifyAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = req.user!;

      let onboarding = await storage.getUserOnboarding(userId);
      
      // Create onboarding record if it doesn't exist (for existing users)
      if (!onboarding) {
        onboarding = await storage.createUserOnboarding({
          userId,
          currentStep: user.verified ? "profile_completion" : "email_verification",
          emailVerified: user.verified || false,
          termsAccepted: true,
        });
      }

      // Check KYC status
      const kyc = await storage.getKycByUserId(userId);
      if (kyc && kyc.status === "approved" && !onboarding.kycApproved) {
        await storage.updateUserOnboarding(userId, {
          kycApproved: true,
          onboardingCompleted: true,
          currentStep: "completed"
        });
      }

      res.json({
        onboarding,
        kycStatus: kyc?.status || "not_submitted"
      });
    } catch (error) {
      console.error("Get onboarding status error:", error);
      res.status(500).json({ message: "Failed to get onboarding status" });
    }
  });

  // Password reset request
  app.post("/api/auth/forgot-password", loginLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const success = await requestPasswordReset(email);
      
      // Always return success for security (don't reveal if email exists)
      res.json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Verify password reset token
  app.post("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ message: "Reset token is required" });
      }

      const verification = await verifyResetToken(token);
      res.json({ valid: verification.valid });
    } catch (error) {
      console.error("Verify reset token error:", error);
      res.status(500).json({ message: "Failed to verify reset token" });
    }
  });

  // Reset password with token
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Reset token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      const success = await resetPasswordWithToken(token, newPassword);
      
      if (success) {
        res.json({ message: "Password reset successfully" });
      } else {
        res.status(400).json({ message: "Invalid or expired reset token" });
      }
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Admin: Approve KYC (this triggers onboarding completion)
  app.post("/api/admin/kyc/:id/approve", verifyAuth, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const kycId = parseInt(req.params.id);
      const kyc = await storage.approveKyc(kycId, user.id);
      
      if (!kyc) {
        return res.status(404).json({ message: "KYC application not found" });
      }

      // Update user onboarding to completed
      await storage.updateUserOnboarding(kyc.userId, {
        kycApproved: true,
        onboardingCompleted: true,
        currentStep: "completed"
      });

      // Send approval email
      const approvedUser = await storage.getUser(kyc.userId);
      if (approvedUser) {
        await sendKycApprovalEmail(approvedUser.email, approvedUser.fullName);
      }

      res.json({ message: "KYC approved successfully", kyc });
    } catch (error) {
      console.error("KYC approval error:", error);
      res.status(500).json({ message: "Failed to approve KYC" });
    }
  });

  // Admin: Reject KYC
  app.post("/api/admin/kyc/:id/reject", verifyAuth, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const kycId = parseInt(req.params.id);
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Rejection reason is required" });
      }

      const kyc = await storage.rejectKyc(kycId, reason, user.id);
      
      if (!kyc) {
        return res.status(404).json({ message: "KYC application not found" });
      }

      // Reset onboarding to KYC submission step
      await storage.updateUserOnboarding(kyc.userId, {
        kycSubmitted: false,
        kycApproved: false,
        currentStep: "kyc_submission"
      });

      // Send rejection email
      const rejectedUser = await storage.getUser(kyc.userId);
      if (rejectedUser) {
        await sendKycRejectionEmail(rejectedUser.email, rejectedUser.fullName, reason);
      }

      res.json({ message: "KYC rejected successfully", kyc });
    } catch (error) {
      console.error("KYC rejection error:", error);
      res.status(500).json({ message: "Failed to reject KYC" });
    }
  });
}
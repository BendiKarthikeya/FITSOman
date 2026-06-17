import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { storage } from './storage';
import { emailService } from './email';

/**
 * Password reset request handler
 * Generates a secure token and sends password reset email
 */
export const requestPasswordReset = [
  // Validation middleware
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  async (req: Request, res: Response) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: 'Invalid email address',
          details: errors.array(),
        });
      }

      const { email } = req.body;

      // Find user by email
      const user = await storage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration attacks
      // But only send email if user exists
      if (user) {
        // Generate secure random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Store the password reset token
        await storage.createPasswordResetToken({
          userId: user.id,
          token: resetToken,
          expiresAt,
        });

        // Send password reset email
        const emailSent = await emailService.sendPasswordReset(
          user.email,
          user.fullName,
          resetToken,
          req.headers['accept-language']?.includes('ar') ? 'ar' : 'en'
        );

        if (!emailSent) {
          console.error('Failed to send password reset email to:', user.email);
          // Don't reveal email sending failure to prevent information leakage
        }

        console.log(`Password reset requested for user: ${user.email}`);
      }

      // Always return success response
      res.json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link shortly.',
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        error: true,
        message: 'An error occurred processing your request. Please try again.',
      });
    }
  },
];

/**
 * Password reset confirmation handler
 * Validates token and updates user password
 */
export const resetPassword = [
  // Validation middleware
  body('token')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid reset token'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),

  async (req: Request, res: Response) => {
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: true,
          message: 'Invalid token or password requirements not met',
          details: errors.array(),
        });
      }

      const { token, password } = req.body;

      // Find valid, unused token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({
          error: true,
          message: 'Invalid or expired reset token',
        });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({
          error: true,
          message: 'Reset token has expired. Please request a new one.',
        });
      }

      // Check if token was already used
      if (resetToken.used) {
        return res.status(400).json({
          error: true,
          message: 'Reset token has already been used. Please request a new one.',
        });
      }

      // Get the user
      const user = await storage.getUser(resetToken.userId);
      if (!user) {
        return res.status(400).json({
          error: true,
          message: 'User not found',
        });
      }

      // Hash new password
      const saltRounds = 12; // Increased for better security
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user password
      await storage.updateUserPassword(user.id, hashedPassword);

      // Mark token as used
      await storage.markPasswordResetTokenUsed(resetToken.token);

      console.log(`Password successfully reset for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password has been successfully reset. You can now log in with your new password.',
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: true,
        message: 'An error occurred while resetting your password. Please try again.',
      });
    }
  },
];

/**
 * Email verification request handler
 * Generates verification token and sends email
 */
export const requestEmailVerification = async (req: Request, res: Response) => {
  try {
    // Get user from authenticated request
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        error: true,
        message: 'Authentication required',
      });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        error: true,
        message: 'Email is already verified',
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token as OTP
    await storage.createOtpCode(user.id, verificationToken, 'email_verification', expiresAt);

    // Send verification email
    const emailSent = await emailService.sendEmailVerification(
      user.email,
      user.fullName,
      verificationToken,
      req.headers['accept-language']?.includes('ar') ? 'ar' : 'en'
    );

    if (!emailSent) {
      console.error('Failed to send verification email to:', user.email);
      return res.status(500).json({
        error: true,
        message: 'Failed to send verification email. Please try again.',
      });
    }

    console.log(`Email verification sent to user: ${user.email}`);

    res.json({
      success: true,
      message: 'Verification email sent. Please check your email and click the verification link.',
    });

  } catch (error) {
    console.error('Email verification request error:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while sending verification email. Please try again.',
    });
  }
};

/**
 * Email verification confirmation handler
 * Validates token and marks email as verified
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        error: true,
        message: 'Invalid verification token',
      });
    }

    // Find the verification token
    const otpCode = await storage.getValidOtpCode(0, token, 'email_verification'); // userId not needed for verification
    
    if (!otpCode) {
      return res.status(400).json({
        error: true,
        message: 'Invalid or expired verification token',
      });
    }

    // Check if token is expired
    if (new Date() > otpCode.expiresAt) {
      return res.status(400).json({
        error: true,
        message: 'Verification token has expired. Please request a new one.',
      });
    }

    // Check if already verified
    if (otpCode.verified) {
      return res.status(400).json({
        error: true,
        message: 'Email has already been verified',
      });
    }

    // Get the user
    const user = await storage.getUser(otpCode.userId);
    if (!user) {
      return res.status(400).json({
        error: true,
        message: 'User not found',
      });
    }

    // Mark email as verified
    await storage.updateUserEmailVerification(user.id, true);
    
    // Mark OTP as used
    await storage.markOtpCodeUsed(otpCode.id);

    console.log(`Email verified for user: ${user.email}`);

    res.json({
      success: true,
      message: 'Email successfully verified! You can now access all platform features.',
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while verifying your email. Please try again.',
    });
  }
};

/**
 * Resend welcome email (for admin use)
 */
export const resendWelcomeEmail = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const language = req.body.language || 'en';

    const user = await storage.getUser(parseInt(userId));
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found',
      });
    }

    const emailSent = await emailService.sendWelcomeEmail(
      user.email,
      user.fullName,
      language
    );

    if (!emailSent) {
      return res.status(500).json({
        error: true,
        message: 'Failed to send welcome email',
      });
    }

    res.json({
      success: true,
      message: 'Welcome email sent successfully',
    });

  } catch (error) {
    console.error('Resend welcome email error:', error);
    res.status(500).json({
      error: true,
      message: 'An error occurred while sending welcome email',
    });
  }
};
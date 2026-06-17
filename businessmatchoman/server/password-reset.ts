import { storage } from "./storage";
import { randomBytes } from "crypto";
import { sendResetPasswordEmail } from "./email-service";

/**
 * Generate a secure random token for password reset
 */
function generateResetToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Request password reset - generates token and sends email
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
  try {
    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return true;
    }

    // Generate reset token
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    // Store token in database
    await storage.createPasswordResetToken({
      userId: user.id,
      token,
      expiresAt,
    });

    // Send reset email
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
    await sendResetPasswordEmail(user.email, user.fullName, resetLink);

    return true;
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return false;
  }
}

/**
 * Verify password reset token
 */
export async function verifyResetToken(token: string): Promise<{ valid: boolean; userId?: number }> {
  try {
    const resetToken = await storage.getPasswordResetToken(token);
    
    if (!resetToken || resetToken.used || new Date() > resetToken.expiresAt) {
      return { valid: false };
    }

    return { valid: true, userId: resetToken.userId };
  } catch (error) {
    console.error('Error verifying reset token:', error);
    return { valid: false };
  }
}

/**
 * Reset password using token
 */
export async function resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
  try {
    const verification = await verifyResetToken(token);
    if (!verification.valid || !verification.userId) {
      return false;
    }

    // Hash the new password
    const { hashPassword } = await import("./auth");
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await storage.updateUserPassword(verification.userId, hashedPassword);

    // Mark token as used
    await storage.markPasswordResetTokenUsed(token);

    return true;
  } catch (error) {
    console.error('Error resetting password:', error);
    return false;
  }
}
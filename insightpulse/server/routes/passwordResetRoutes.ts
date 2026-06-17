import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, passwordResetTokens } from '../../shared/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

/**
 * UM-022: Password Reset Implementation
 * 
 * Features:
 * - Secure token generation with expiration
 * - Email-based password reset workflow
 * - Token validation and one-time use
 * - Password update with security checks
 */

// Helper function to generate a secure reset token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to send password reset email (mock implementation)
async function sendPasswordResetEmail(email: string, token: string, username: string): Promise<void> {
  // In production, integrate with email service (SendGrid, AWS SES, etc.)
  const resetLink = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${token}`;
  
  
  
  // TODO: Replace with actual email service
  // await emailService.send({
  //   to: email,
  //   subject: 'Password Reset Request',
  //   template: 'password-reset',
  //   data: { username, resetLink }
  // });
}

/**
 * POST /api/auth/request-password-reset
 * Request a password reset token
 * 
 * Body:
 * - email: string (required)
 * 
 * Response:
 * - 200: Reset email sent (always returns success for security)
 */
router.post('/request-password-reset', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success for security (don't reveal if user exists)
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store token in database
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });

      // Send reset email
      await sendPasswordResetEmail(user.email, token, user.username);
    }

    // Always return success message
    res.json({ 
      message: 'If an account exists with that email, a password reset link has been sent.',
      success: true 
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

/**
 * POST /api/auth/validate-reset-token
 * Validate a password reset token
 * 
 * Body:
 * - token: string (required)
 * 
 * Response:
 * - 200: Token is valid with user info
 * - 400: Token is invalid or expired
 */
router.post('/validate-reset-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Find valid token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date()),
          eq(passwordResetTokens.usedAt, null as any)
        )
      )
      .limit(1);

    if (!resetToken) {
      return res.status(400).json({ 
        error: 'Invalid or expired reset token',
        valid: false 
      });
    }

    // Get user info
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, resetToken.userId))
      .limit(1);

    if (!user) {
      return res.status(400).json({ 
        error: 'User not found',
        valid: false 
      });
    }

    res.json({
      valid: true,
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to validate reset token' });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using a valid token
 * 
 * Body:
 * - token: string (required)
 * - newPassword: string (required, min 8 chars)
 * 
 * Response:
 * - 200: Password reset successful
 * - 400: Invalid token or weak password
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find valid token
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date()),
          eq(passwordResetTokens.usedAt, null as any)
        )
      )
      .limit(1);

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Get user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, resetToken.userId))
      .limit(1);

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, user.id));

    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    

    res.json({
      message: 'Password reset successful. You can now login with your new password.',
      success: true,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * POST /api/auth/cancel-reset-tokens
 * Cancel all pending reset tokens for a user (admin/security feature)
 * 
 * Body:
 * - userId: string (required)
 * 
 * Response:
 * - 200: Tokens cancelled
 */
router.post('/cancel-reset-tokens', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Mark all unused tokens as used (effectively cancelling them)
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          eq(passwordResetTokens.usedAt, null as any)
        )
      );

    res.json({
      message: 'All pending reset tokens have been cancelled',
      success: true,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to cancel reset tokens' });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for the currently authenticated user.
 * Body: { currentPassword: string, newPassword: string }
 */
router.post('/change-password', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const stored = user.password || '';
    const isHashed = stored.startsWith('$2');
    const matches = isHashed
      ? await bcrypt.compare(currentPassword, stored)
      : currentPassword === stored;
    if (!matches) return res.status(403).json({ error: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.update(users).set({ password: hashed }).where(eq(users.id, userId));

    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('[change-password] failed:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * GET /api/auth/my-sessions
 * Returns active sessions for the currently authenticated user.
 */
router.get('/my-sessions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const { sessions } = await import('../../shared/schema');
    const { desc } = await import('drizzle-orm');
    const rows = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.lastActivity));

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[my-sessions] failed:', error);
    res.status(500).json({ error: 'Failed to load sessions' });
  }
});

export default router;

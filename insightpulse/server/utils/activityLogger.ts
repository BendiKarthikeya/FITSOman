import { db } from '../db';
import { activityLogs, authenticationEvents, sessions } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { Request } from 'express';

/**
 * Log user activity to the activity_logs table
 */
export async function logActivity(
  userId: string | undefined,
  organizationId: string | undefined,
  action: string,
  actionType: 'create' | 'read' | 'update' | 'delete' | 'export',
  resourceType: string,
  resourceId?: string,
  resourceName?: string,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
  status: 'success' | 'failed' = 'success',
  errorMessage?: string
) {
  try {
    await db.insert(activityLogs).values({
      userId,
      organizationId,
      action,
      actionType,
      resourceType,
      resourceId,
      resourceName,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage,
    });
  } catch (error) {
    
  }
}

/**
 * Log authentication events
 */
export async function logAuthenticationEvent(
  userId: string | undefined,
  username: string,
  eventType: 'login' | 'logout' | 'login_failed' | 'password_reset' | 'mfa_challenge',
  status: 'success' | 'failed' | 'pending',
  authMethod: string = 'password',
  sessionId?: string,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string,
  organizationId?: string
) {
  try {
    await db.insert(authenticationEvents).values({
      userId: userId || null,
      username,
      eventType,
      status,
      authMethod,
      sessionId: sessionId || null,
      ipAddress: ipAddress || 'unknown',
      userAgent: userAgent || null,
      failureReason: failureReason || null,
    });

    // Mirror authentication events into the activity log so admins can audit logins/logouts
    const actionType = eventType === 'password_reset' ? 'update' : 'read';
    await logActivity(
      userId,
      organizationId,
      `auth.${eventType}`,
      actionType,
      'authentication',
      sessionId,
      username,
      { authMethod, status, failureReason },
      ipAddress,
      userAgent,
      status === 'failed' ? 'failed' : 'success',
      failureReason
    );
  } catch (error) {
    
  }
}

/**
 * Create a new session for a user
 */
export async function createSession(
  userId: string,
  organizationId: string | null | undefined,
  req: Request
) {
  try {
    const ipAddress = (req.ip || req.headers['x-forwarded-for'] || 'unknown') as string;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const device = parseDevice(userAgent);

    // If no organizationId, try to get from user or use a default
    const orgId = organizationId || null;

    const [session] = await db.insert(sessions).values({
      userId,
      organizationId: orgId as any,
      ipAddress: ipAddress.split(',')[0].trim(),
      userAgent,
      device,
      isActive: true,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    }).returning();

    return session;
  } catch (error) {
    
    return null;
  }
}

/**
 * Update last activity for a session
 */
export async function updateSessionActivity(sessionId: string) {
  try {
    await db.update(sessions).set({
      lastActivity: new Date(),
    }).where(eq(sessions.id, sessionId));
  } catch (error) {
    
  }
}

/**
 * Parse device from user agent
 */
function parseDevice(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
    return 'Mobile';
  } else if (/tablet|ipad|kindle|playbook|silk/i.test(userAgent)) {
    return 'Tablet';
  } else if (/windows|mac|linux|x11/i.test(userAgent)) {
    return 'Desktop';
  }
  
  return 'Unknown';
}

/**
 * Get helper to extract request info
 */
export function getRequestInfo(req: Request) {
  return {
    ipAddress: ((req.ip || req.headers['x-forwarded-for'] || 'unknown') as string).split(',')[0].trim(),
    userAgent: req.headers['user-agent'] || 'unknown',
  };
}

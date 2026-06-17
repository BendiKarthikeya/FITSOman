import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  users,
  organizations,
  userImportBatches,
  activityLogs,
  authenticationEvents,
} from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';
import * as bcrypt from 'bcrypt';

const router = Router();

// Middleware to ensure admin access
const requireAdmin = requirePermission('admin', 'audit.view');

// Mock email service (replace with actual email service like SendGrid, AWS SES, etc.)
const sendOnboardingEmail = async (email: string, username: string, temporaryPassword: string): Promise<boolean> => {
  try {
    
    
    // In production, integrate with email service
    // await emailService.sendOnboardingEmail({ email, username, temporaryPassword });
    return true;
  } catch (error) {
    
    return false;
  }
};

// UM-021: Bulk User Import
router.post('/import', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, csvData } = req.body;

    if (!organizationId || !csvData) {
      return res.status(400).json({ error: 'organizationId and csvData are required' });
    }

    // Verify organization exists
    const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Create import batch record
    const [batch] = await db.insert(userImportBatches).values({
      organizationId,
      importedBy: req.user?.id,
      totalRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      status: 'processing',
    }).returning();

    // Parse CSV data (simple implementation)
    let records: any[] = [];
    try {
      records = JSON.parse(csvData); // Assuming JSON-formatted CSV data for simplicity
    } catch {
      return res.status(400).json({ error: 'Invalid CSV data format' });
    }

    const errors: any[] = [];
    let successCount = 0;
    let failCount = 0;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      try {
        const { username, email, role = 'user', departmentId } = record;

        if (!username || !email) {
          errors.push({ row: i + 2, error: 'Missing username or email' });
          failCount++;
          continue;
        }

        // Check if user already exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email));
        if (existingUser) {
          errors.push({ row: i + 2, error: 'User already exists' });
          failCount++;
          continue;
        }

        // Generate temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create user
        const [newUser] = await db.insert(users).values({
          username,
          email,
          password: hashedPassword,
          role,
          organizationId,
          departmentId: departmentId || undefined,
          isActive: true,
        }).returning();

        successCount++;

        // UM-022: Send onboarding email
        await sendOnboardingEmail(email, username, tempPassword);

        // Log activity
        await db.insert(activityLogs).values({
          userId: req.user?.id,
          organizationId,
          action: 'user.imported',
          actionType: 'create',
          resourceType: 'user',
          resourceId: newUser.id,
          resourceName: username,
        }).catch(() => { });

      } catch (error) {
        failCount++;
        errors.push({ row: i + 2, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    // Update batch status
    await db.update(userImportBatches).set({
      totalRecords: records.length,
      successfulRecords: successCount,
      failedRecords: failCount,
      status: failCount === 0 ? 'completed' : 'completed',
      errorLog: errors,
      completedAt: new Date(),
    }).where(eq(userImportBatches.id, batch.id));

    res.json({
      batchId: batch.id,
      totalRecords: records.length,
      successfulRecords: successCount,
      failedRecords: failCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to import users' });
  }
});

// UM-021: Get import batch status
router.get('/import/:batchId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { batchId } = req.params;

    const [batch] = await db.select().from(userImportBatches).where(eq(userImportBatches.id, batchId));
    if (!batch) {
      return res.status(404).json({ error: 'Import batch not found' });
    }

    res.json(batch);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch import batch' });
  }
});

// UM-034: Get activity logs
router.get('/activity-logs', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const organizationId = req.query.organizationId as string;
    const userId = req.query.userId as string;

    let query = db.select().from(activityLogs);

    // Apply filters
    const filters: any[] = [];
    if (organizationId) filters.push(eq(activityLogs.organizationId, organizationId));
    if (userId) filters.push(eq(activityLogs.userId, userId));

    const logs = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
    res.json({ total: logs.length, items: logs });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Alias for frontend compatibility - maps to activity logs
router.get('/audit-logs', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);

    const logs = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        username: activityLogs.resourceName,
        eventType: activityLogs.action,
        description: activityLogs.action,
        ipAddress: activityLogs.ipAddress,
        userAgent: activityLogs.userAgent,
        createdAt: activityLogs.createdAt,
        metadata: activityLogs.details
      })
      .from(activityLogs)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    res.json(logs);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// UM-034: Search activity logs
router.get('/activity-logs/search', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { query, actionType, resourceType, startDate, endDate } = req.query;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);

    let logs = await db.select().from(activityLogs).limit(limit);

    // Filter in memory (in production, use database filters)
    if (query) {
      const queryStr = (query as string).toLowerCase();
      logs = logs.filter(log =>
        log.action?.toLowerCase().includes(queryStr) ||
        log.resourceName?.toLowerCase().includes(queryStr)
      );
    }

    if (actionType) {
      logs = logs.filter(log => log.actionType === actionType);
    }

    if (resourceType) {
      logs = logs.filter(log => log.resourceType === resourceType);
    }

    if (startDate) {
      const start = new Date(startDate as string);
      logs = logs.filter(log => log.createdAt && new Date(log.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      logs = logs.filter(log => log.createdAt && new Date(log.createdAt) <= end);
    }

    res.json({ total: logs.length, items: logs });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to search activity logs' });
  }
});

// UM-035: Get authentication events
router.get('/auth-events', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const userId = req.query.userId as string;
    const eventType = req.query.eventType as string;

    let events = await db.select().from(authenticationEvents).limit(limit);

    if (userId) {
      events = events.filter(e => e.userId === userId);
    }

    if (eventType) {
      events = events.filter(e => e.eventType === eventType);
    }

    res.json({ total: events.length, items: events });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch authentication events' });
  }
});

// UM-035: Log authentication event (called by auth middleware)
router.post('/auth-events', async (req: Request, res: Response) => {
  try {
    const { userId, username, eventType, status, failureReason, authMethod, sessionId, ipAddress, userAgent, location, mfaUsed, riskLevel } = req.body;

    if (!eventType || !ipAddress) {
      return res.status(400).json({ error: 'eventType and ipAddress are required' });
    }

    const [event] = await db.insert(authenticationEvents).values({
      userId: userId || undefined,
      username: username || undefined,
      eventType,
      status: status || 'success',
      failureReason: failureReason || undefined,
      authMethod: authMethod || 'password',
      sessionId: sessionId || undefined,
      ipAddress,
      userAgent: userAgent || undefined,
      location: location || undefined,
      mfaUsed: mfaUsed || false,
      riskLevel: riskLevel || 'low',
    }).returning();

    res.status(201).json(event);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to log authentication event' });
  }
});

// UM-035: Get user's login history
router.get('/auth-events/:userId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Users can only view their own history, admins can view anyone's
    if (req.user?.id !== userId && req.user?.role !== 'admin' && req.user?.role !== 'superuser' && req.user?.role !== 'culture_admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const events = await db.select().from(authenticationEvents)
      .where(eq(authenticationEvents.userId, userId))
      .limit(limit);

    res.json({ total: events.length, items: events });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch authentication events' });
  }
});

export default router;

import { Router, type Request, Response } from 'express';
import { db } from '../db';
import { organizations, users as usersTable, surveys, responses } from '@shared/schema';
import { eq, sql, and } from 'drizzle-orm';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';

const router = Router();

// Get all subscriptions with usage stats
router.get('/api/subscriptions', requireAuth, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const orgs = await db
      .select({
        id: organizations.id,
        organizationId: organizations.id,
        organizationName: organizations.name,
        plan: organizations.plan,
        isActive: organizations.isActive,
        startDate: organizations.createdAt,
      })
      .from(organizations);

    // Get current usage for each organization
    const subscriptionsWithUsage = await Promise.all(
      orgs.map(async (org) => {
        // Count users
        const [userCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(usersTable)
          .where(eq(usersTable.organizationId, org.organizationId));

        // Count surveys (if surveys table has organizationId)
        let surveyCount = 0;
        try {
          const [surveyResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(surveys)
            .where(eq((surveys as any).organizationId, org.organizationId));
          surveyCount = Number(surveyResult.count) || 0;
        } catch {
          // If surveys table doesn't have organizationId, skip
          surveyCount = 0;
        }

        // Count responses (if responses table has organizationId)
        let responseCount = 0;
        try {
          const [responseResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(responses)
            .where(eq((responses as any).organizationId, org.organizationId));
          responseCount = Number(responseResult.count) || 0;
        } catch {
          // If responses table doesn't have organizationId, skip
          responseCount = 0;
        }

        // Calculate end date (30 days from start for demo)
        const endDate = new Date(org.startDate || new Date());
        endDate.setDate(endDate.getDate() + 30);

        // Get plan limits
        const planLimits = {
          starter: { users: 10, surveys: 5, responses: 1000 },
          professional: { users: 50, surveys: 25, responses: 10000 },
          enterprise: { users: 999, surveys: 999, responses: 999999 },
        };
        const limits = planLimits[(org.plan as keyof typeof planLimits) || 'starter'];

        return {
          ...org,
          status: org.isActive ? 'active' : 'expired',
          usersLimit: limits.users,
          surveysLimit: limits.surveys,
          responsesLimit: limits.responses,
          currentUsers: Number(userCount.count) || 0,
          currentSurveys: surveyCount,
          currentResponses: responseCount,
          endDate: endDate.toISOString(),
        };
      })
    );

    res.json(subscriptionsWithUsage);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
});

// Update subscription plan
router.patch('/api/subscriptions/:orgId', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;
    const { plan } = req.body;

    if (!plan || !['starter', 'professional', 'enterprise'].includes(plan)) {
      return res.status(400).json({ message: 'Invalid plan type' });
    }

    // Get plan limits
    const planLimits = {
      starter: { users: 10, surveys: 5, responses: 1000 },
      professional: { users: 50, surveys: 25, responses: 10000 },
      enterprise: { users: 999, surveys: 999, responses: 999999 },
    };

    const limits = planLimits[plan as keyof typeof planLimits];

    const [updatedOrg] = await db
      .update(organizations)
      .set({
        plan,
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({ 
      message: 'Subscription updated successfully',
      subscription: updatedOrg 
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to update subscription' });
  }
});

// Cancel subscription
router.delete('/api/subscriptions/:orgId', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { orgId } = req.params;

    const [updatedOrg] = await db
      .update(organizations)
      .set({ isActive: false })
      .where(eq(organizations.id, orgId))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({ 
      message: 'Subscription cancelled successfully',
      subscription: updatedOrg 
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

export default router;

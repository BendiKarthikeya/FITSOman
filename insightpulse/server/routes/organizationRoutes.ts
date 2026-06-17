import { Router, type Request, Response } from 'express';
import { db } from '../db';
import { organizations, users as usersTable, surveys, responses } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';

const router = Router();

// Public list of active organizations (id + name only)
router.get('/api/public/organizations', async (_req: Request, res: Response) => {
  try {
    const orgs = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.isActive, true));
    res.json({ total: orgs.length, items: orgs });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

// Get all organizations with stats
router.get('/api/organizations', requireAuth, requireRole('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        plan: organizations.plan,
        isActive: organizations.isActive,
        createdAt: organizations.createdAt,
      })
      .from(organizations);

    // Get user counts for each organization
    const orgsWithStats = await Promise.all(
      orgs.map(async (org) => {
        const [userCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(usersTable)
          .where(eq(usersTable.organizationId, org.id));

        // Get survey count for this organization (surveys created by users in this org)
        const [surveyCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(surveys)
          .innerJoin(usersTable, eq(surveys.createdBy, usersTable.id))
          .where(eq(usersTable.organizationId, org.id));

        // Get response count for surveys created by users in this organization
        const [responseCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(responses)
          .innerJoin(surveys, eq(responses.surveyId, surveys.id))
          .innerJoin(usersTable, eq(surveys.createdBy, usersTable.id))
          .where(eq(usersTable.organizationId, org.id));

        return {
          ...org,
          userCount: Number(userCount.count) || 0,
          surveyCount: Number(surveyCount.count) || 0,
          responseCount: Number(responseCount.count) || 0,
        };
      })
    );

    res.json(orgsWithStats);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch organizations' });
  }
});

// Create new organization
router.post('/api/organizations', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, plan = 'starter' } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    // Get plan limits
    const planLimits = {
      starter: { users: 10, surveys: 5, responses: 1000 },
      professional: { users: 50, surveys: 25, responses: 10000 },
      enterprise: { users: 999, surveys: 999, responses: 999999 },
    };

    const limits = planLimits[plan as keyof typeof planLimits] || planLimits.starter;

    const [newOrg] = await db
      .insert(organizations)
      .values({
        name,
        plan,
      })
      .returning();

    res.json(newOrg);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to create organization' });
  }
});

// Update organization
router.patch('/api/organizations/:id', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, plan, status } = req.body;

    const updateData: any = {};

    if (name) updateData.name = name;
    if (status) updateData.status = status;

    if (plan) {
      updateData.plan = plan;
      const planLimits = {
        starter: { users: 10, surveys: 5, responses: 1000 },
        professional: { users: 50, surveys: 25, responses: 10000 },
        enterprise: { users: 999, surveys: 999, responses: 999999 },
      };
      const limits = planLimits[plan as keyof typeof planLimits] || planLimits.starter;
      updateData.usersLimit = limits.users;
      updateData.surveysLimit = limits.surveys;
      updateData.responsesLimit = limits.responses;
    }

    const [updatedOrg] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, id))
      .returning();

    if (!updatedOrg) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json(updatedOrg);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to update organization' });
  }
});

// Delete organization
router.delete('/api/organizations/:id', requireAuth, requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if organization has users
    const [userCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(eq(usersTable.organizationId, id));

    if (Number(userCount.count) > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete organization with existing users. Please remove all users first.' 
      });
    }

    await db.delete(organizations).where(eq(organizations.id, id));

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to delete organization' });
  }
});

export default router;

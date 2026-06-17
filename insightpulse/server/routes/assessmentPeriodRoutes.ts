import { Router, Request, Response } from 'express';
import { db } from '../db';
import { assessmentPeriods, organizations, users } from '../../shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware to ensure admin or culture_admin access via permissions
const requireAdminOrCultureAdmin = requirePermission('admin', 'assessment_periods.manage');

// Get all assessment periods
router.get('/', requireAuth, requireAdminOrCultureAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const orgId = req.query.organizationId as string;
        const query = orgId
            ? db.select().from(assessmentPeriods).where(eq(assessmentPeriods.organizationId, orgId))
            : db.select().from(assessmentPeriods);

        const items = await query.orderBy(desc(assessmentPeriods.createdAt));
        res.json({ total: items.length, items });
    } catch (error) {
        console.error('Error fetching assessment periods:', error);
        res.status(500).json({ error: 'Failed to fetch assessment periods' });
    }
});

// Create new assessment period
router.post('/', requireAuth, requireAdminOrCultureAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { organizationId, name, type, startDate, endDate, status, config } = req.body;

        if (!name || !type || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const [item] = await db.insert(assessmentPeriods).values({
            organizationId,
            name,
            type,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status: status || 'upcoming',
            config: config || {},
            createdBy: req.user?.id,
        }).returning();

        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating assessment period:', error);
        res.status(500).json({ error: 'Failed to create assessment period' });
    }
});

// Update assessment period
router.patch('/:id', requireAuth, requireAdminOrCultureAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { name, type, startDate, endDate, status, config } = req.body;

        const updates: any = {};
        if (name) updates.name = name;
        if (type) updates.type = type;
        if (startDate) updates.startDate = new Date(startDate);
        if (endDate) updates.endDate = new Date(endDate);
        if (status) updates.status = status;
        if (config) updates.config = config;
        updates.updatedAt = new Date();

        const [updated] = await db.update(assessmentPeriods)
            .set(updates)
            .where(eq(assessmentPeriods.id, id))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: 'Assessment period not found' });
        }

        res.json(updated);
    } catch (error) {
        console.error('Error updating assessment period:', error);
        res.status(500).json({ error: 'Failed to update assessment period' });
    }
});

// Delete assessment period
router.delete('/:id', requireAuth, requireAdminOrCultureAdmin, async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const [deleted] = await db.delete(assessmentPeriods)
            .where(eq(assessmentPeriods.id, id))
            .returning();

        if (!deleted) {
            return res.status(404).json({ error: 'Assessment period not found' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting assessment period:', error);
        res.status(500).json({ error: 'Failed to delete assessment period' });
    }
});

export default router;

import { Router } from 'express';
import { db } from '../db';
import { sessions, users as usersTable, ssoProviders } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';

const router = Router();

// Get all active sessions
router.get('/api/sessions', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const orgId = (req as any).user?.organizationId;
    
    const activeSessions = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        username: usersTable.username,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        device: sessions.device,
        lastActivity: sessions.lastActivity,
        isActive: sessions.isActive,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .leftJoin(usersTable, eq(sessions.userId, usersTable.id))
      .where(and(eq(sessions.organizationId, orgId), eq(sessions.isActive, true)));

    res.json(activeSessions);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch sessions' });
  }
});

// Revoke a session
router.delete('/api/sessions/:id', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId;

    await db
      .update(sessions)
      .set({ isActive: false })
      .where(and(eq(sessions.id, id), eq(sessions.organizationId, orgId)));

    res.json({ message: 'Session revoked successfully' });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to revoke session' });
  }
});

// Get SSO providers
router.get('/api/sso/providers', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const orgId = (req as any).user?.organizationId;

    const providers = await db
      .select()
      .from(ssoProviders)
      .where(eq(ssoProviders.organizationId, orgId));

    res.json(providers);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch SSO providers' });
  }
});

// Add SSO provider
router.post('/api/sso/providers', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { type, clientId, endpoint, name } = req.body;
    const orgId = (req as any).user?.organizationId;

    const [provider] = await db
      .insert(ssoProviders)
      .values({
        organizationId: orgId,
        name: name || clientId,
        type,
        clientId,
        endpoint,
        enabled: true,
      })
      .returning();

    res.json(provider);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to add SSO provider' });
  }
});

// Toggle SSO provider
router.patch('/api/sso/providers/:id', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const orgId = (req as any).user?.organizationId;

    const [provider] = await db
      .update(ssoProviders)
      .set({ enabled, updatedAt: new Date() })
      .where(and(eq(ssoProviders.id, id), eq(ssoProviders.organizationId, orgId)))
      .returning();

    res.json(provider);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to update SSO provider' });
  }
});

// Delete SSO provider
router.delete('/api/sso/providers/:id', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId;

    await db
      .delete(ssoProviders)
      .where(and(eq(ssoProviders.id, id), eq(ssoProviders.organizationId, orgId)));

    res.json({ message: 'SSO provider deleted successfully' });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to delete SSO provider' });
  }
});

export default router;

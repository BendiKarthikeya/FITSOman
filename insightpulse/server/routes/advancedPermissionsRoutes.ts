import { Router } from 'express';
import { db } from '../db';
import { permissionGroups, roleHierarchy } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireRole, type AuthRequest } from '../middleware/auth';

const router = Router();

// Get permission groups
router.get('/api/rbac/permission-groups', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const orgId = (req as any).user?.organizationId;

    const groups = await db
      .select()
      .from(permissionGroups)
      .where(eq(permissionGroups.organizationId, orgId));

    res.json(groups);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch permission groups' });
  }
});

// Create permission group
router.post('/api/rbac/permission-groups', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, description, permissions } = req.body;
    const orgId = (req as any).user?.organizationId;

    const result = await db
      .insert(permissionGroups)
      .values({
        organizationId: orgId,
        name,
        description,
        permissions: permissions || [],
      })
      .returning();

    const group = Array.isArray(result) ? result[0] : result;
    res.json(group);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to create permission group' });
  }
});

// Delete permission group
router.delete('/api/rbac/permission-groups/:id', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const orgId = (req as any).user?.organizationId;

    await db
      .delete(permissionGroups)
      .where(and(eq(permissionGroups.id, id), eq(permissionGroups.organizationId, orgId)));

    res.json({ message: 'Permission group deleted successfully' });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to delete permission group' });
  }
});

// Get role hierarchy
router.get('/api/rbac/role-hierarchy', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const orgId = (req as any).user?.organizationId;

    const roles = await db
      .select()
      .from(roleHierarchy)
      .where(eq(roleHierarchy.organizationId, orgId));

    res.json(roles);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch role hierarchy' });
  }
});

// Create role hierarchy
router.post('/api/rbac/role-hierarchy', requireAuth, requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { name, parentRoleId, delegatedRoles } = req.body;
    const orgId = (req as any).user?.organizationId;

    const result = await db
      .insert(roleHierarchy)
      .values({
        organizationId: orgId,
        name,
        parentRoleId: parentRoleId || undefined,
        level: parentRoleId ? 2 : 1,
        permissions: [],
        delegatedRoles: delegatedRoles || [],
      })
      .returning();

    const role = Array.isArray(result) ? result[0] : result;
    res.json(role);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to create role hierarchy' });
  }
});

export default router;
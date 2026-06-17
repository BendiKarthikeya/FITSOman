import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  departmentRoles,
  users,
  permissionViolations,
  elevatedPermissions,
  activityLogs
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware to ensure admin access (strict)
const requireAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to allow reading RBAC data (for permission-based sidebar construction)
// culture_admin can read but cannot write
const requireAdminOrReadOnly = (req: AuthRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser' && req.user?.role !== 'culture_admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// UM-023: Permission System Foundation - Get all permissions
// culture_admin can read permissions to determine what they have access to
router.get('/permissions', requireAuth, requireAdminOrReadOnly, async (_req: AuthRequest, res: Response) => {
  try {
    const allPermissions = await db.select().from(permissions);
    res.json({ total: allPermissions.length, items: allPermissions });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

// UM-023: Create new permission
router.post('/permissions', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { code, name, description, category } = req.body;
    if (!code || !name || !category) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [permission] = await db.insert(permissions).values({
      code,
      name,
      description,
      category,
    }).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      action: 'permission.created',
      actionType: 'create',
      resourceType: 'permission',
      resourceId: permission.id,
      resourceName: name,
    }).catch(() => { });

    res.status(201).json(permission);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to create permission' });
  }
});

// UM-023: Get all roles
router.get('/roles', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.query.organizationId as string;
    const rolesQuery = orgId
      ? await db.select().from(roles).where(eq(roles.organizationId, orgId))
      : await db.select().from(roles);

    res.json({ total: rolesQuery.length, items: rolesQuery });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// UM-024: Create custom role
router.post('/roles', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, name, description, permissionIds } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    const [role] = await db.insert(roles).values({
      organizationId,
      name,
      description,
      isBuiltIn: false,
    }).returning();

    // Assign permissions to role
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map(permId => ({
          roleId: role.id,
          permissionId: permId,
        }))
      ).catch(() => { });
    }

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId,
      action: 'role.created',
      actionType: 'create',
      resourceType: 'role',
      resourceId: role.id,
      resourceName: name,
    }).catch(() => { });

    res.status(201).json(role);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to create role' });
  }
});

// UM-024: Update role
router.patch('/roles/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, permissions: permissionIds } = req.body;

    const [existingRole] = await db.select().from(roles).where(eq(roles.id, id));
    if (!existingRole) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (description) updates.description = description;

    const [updatedRole] = await db.update(roles).set(updates).where(eq(roles.id, id)).returning();

    // Update permissions if provided
    if (permissionIds && Array.isArray(permissionIds)) {
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
      if (permissionIds.length > 0) {
        await db.insert(rolePermissions).values(
          permissionIds.map(permId => ({
            roleId: id,
            permissionId: permId,
          }))
        );
      }
    }

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      action: 'role.updated',
      actionType: 'update',
      resourceType: 'role',
      resourceId: id,
      resourceName: name || existingRole.name,
    }).catch(() => { });

    res.json(updatedRole);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to update role' });
  }
});

// UM-024: Delete role
router.delete('/roles/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    await db.delete(roles).where(eq(roles.id, id));

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      action: 'role.deleted',
      actionType: 'delete',
      resourceType: 'role',
      resourceId: id,
      resourceName: role.name,
    }).catch(() => { });

    res.status(204).send();
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to delete role' });
  }
});

// UM-023: Get role permissions
router.get('/roles/:id/permissions', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const rolePerms = await db
      .select({
        permission: permissions,
        rolePermission: rolePermissions,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, id));

    const permsList = rolePerms.map(rp => rp.permission);
    res.json({ total: permsList.length, items: permsList });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Get all role-permission mappings
// culture_admin can read this to determine which pages to show in the sidebar
router.get('/role-permissions', requireAuth, requireAdminOrReadOnly, async (req: AuthRequest, res: Response) => {
  try {
    const allRolePermissions = await db.select().from(rolePermissions);
    res.json({ total: allRolePermissions.length, items: allRolePermissions });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Get user roles
router.get('/users/:userId/roles', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const userRolesList = await db
      .select({
        userRole: userRoles,
        role: roles,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const rolesList = userRolesList.map(ur => ur.role);
    res.json({ total: rolesList.length, items: rolesList });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// UM-025: Assign role to user (Permission Validation)
router.post('/users/:userId/roles', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has this role
    const [existingRole] = await db.select().from(userRoles).where(
      and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId))
    );

    if (existingRole) {
      return res.status(400).json({ error: 'User already has this role' });
    }

    const [userRole] = await db.insert(userRoles).values({
      userId,
      roleId,
    }).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      action: 'user.role.assigned',
      actionType: 'update',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.username,
      details: { roleId },
    }).catch(() => { });

    res.status(201).json(userRole);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to assign role' });
  }
});

// UM-025: Remove role from user
router.delete('/users/:userId/roles/:roleId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, roleId } = req.params;

    await db.delete(userRoles).where(
      and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId))
    );

    // Log activity
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      action: 'user.role.removed',
      actionType: 'update',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user?.username,
      details: { roleId },
    }).catch(() => { });

    res.status(204).send();
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to remove role' });
  }
});

// UM-026: Get user permissions (hierarchical)
router.get('/users/:userId/permissions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    // Get direct user roles
    const userRolesList = await db.select({ roleId: userRoles.roleId }).from(userRoles).where(eq(userRoles.userId, userId));

    // Get department roles if user belongs to department
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const deptRolesList = user?.departmentId
      ? await db.select({ roleId: departmentRoles.roleId }).from(departmentRoles).where(eq(departmentRoles.departmentId, user.departmentId))
      : [];

    const roleIds = [
      ...userRolesList.map(ur => ur.roleId),
      ...deptRolesList.map(dr => dr.roleId),
    ];

    // Get all permissions for these roles
    const rolePerms = await db
      .select({
        permissionId: permissions.id,
        permissionCode: permissions.code,
        permissionName: permissions.name,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));

    // Filter in memory for role IDs
    const filtered = rolePerms.filter(rp => roleIds.length === 0 || roleIds.includes(rp.permissionId));

    res.json({ total: filtered.length, items: filtered });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

// UM-027: Get permission violations
router.get('/violations', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const violations = await db.select().from(permissionViolations);
    res.json({ total: violations.length, items: violations });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch violations' });
  }
});

// UM-028: Grant temporary elevated permissions
router.post('/elevate-permissions', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId, roleId, expiresAt, grantReason } = req.body;

    if (!userId || !roleId || !expiresAt) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [elevatedPerm] = await db.insert(elevatedPermissions).values({
      userId,
      roleId,
      grantedBy: req.user?.id,
      grantReason,
      expiresAt: new Date(expiresAt),
      isActive: true,
    }).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      action: 'permission.elevated',
      actionType: 'create',
      resourceType: 'elevated_permission',
      resourceId: elevatedPerm.id,
      details: { grantReason },
    }).catch(() => { });

    res.status(201).json(elevatedPerm);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to grant elevated permission' });
  }
});

// UM-028: Revoke elevated permissions
router.post('/elevate-permissions/:id/revoke', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [revoked] = await db.update(elevatedPermissions).set({
      isActive: false,
    }).where(eq(elevatedPermissions.id, id)).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      action: 'permission.revoked',
      actionType: 'delete',
      resourceType: 'elevated_permission',
      resourceId: id,
    }).catch(() => { });

    res.json(revoked);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to revoke elevated permission' });
  }
});

export default router;

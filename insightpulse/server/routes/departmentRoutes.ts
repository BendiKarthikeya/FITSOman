import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  departments,
  departmentRoles,
  users,
  roles,
  activityLogs,
  userRoles,
} from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requirePermission, AuthRequest } from '../middleware/auth';

const router = Router();

// Middleware to ensure admin access using granular permission
const requireAdmin = requirePermission('admin', 'departments.manage');

// UM-029: Get all departments
// Endpoint: GET /api/departments
// Query params: organizationId (optional) - filter departments by organization
// Response: { total: number, items: Department[] }
// Use: Admin dashboard to list all departments in the system or filter by specific organization
// This endpoint powers the department management page at http://localhost:5001/admin/departments
// where administrators can view, create, edit, and delete departments
router.get('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = req.query.organizationId as string;
    const deptsList = orgId
      ? await db.select().from(departments).where(eq(departments.organizationId, orgId))
      : await db.select().from(departments);

    res.json({ total: deptsList.length, items: deptsList });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// UM-029: Create new department
router.post('/', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId, name } = req.body;
    if (!organizationId || !name) {
      return res.status(400).json({ error: 'organizationId and name are required' });
    }

    const [dept] = await db.insert(departments).values({
      organizationId,
      name,
      isActive: true,
    }).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId,
      action: 'department.created',
      actionType: 'create',
      resourceType: 'department',
      resourceId: dept.id,
      resourceName: name,
    }).catch(() => { });

    res.status(201).json(dept);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to create department' });
  }
});

// UM-029: Update department
router.put('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;

    const [existingDept] = await db.select().from(departments).where(eq(departments.id, id));
    if (!existingDept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (isActive !== undefined) updates.isActive = isActive;

    const [updated] = await db.update(departments).set(updates).where(eq(departments.id, id)).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId: existingDept.organizationId,
      departmentId: id,
      action: 'department.updated',
      actionType: 'update',
      resourceType: 'department',
      resourceId: id,
      resourceName: name || existingDept.name,
      details: updates,
    }).catch(() => { });

    res.json(updated);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to update department' });
  }
});

// UM-029: Delete department
router.delete('/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [dept] = await db.select().from(departments).where(eq(departments.id, id));
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    await db.delete(departments).where(eq(departments.id, id));

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId: dept.organizationId,
      action: 'department.deleted',
      actionType: 'delete',
      resourceType: 'department',
      resourceId: id,
      resourceName: dept.name,
    }).catch(() => { });

    res.status(204).send();
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to delete department' });
  }
});

// UM-030: Assign user to department
router.post('/:id/users/:userId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id: deptId, userId } = req.params;

    const [dept] = await db.select().from(departments).where(eq(departments.id, deptId));
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user's department
    const [updated] = await db.update(users).set({
      departmentId: deptId,
    }).where(eq(users.id, userId)).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId: dept.organizationId,
      departmentId: deptId,
      action: 'user.department.assigned',
      actionType: 'update',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.username,
      details: { departmentId: deptId },
    }).catch(() => { });

    res.json(updated);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to assign user to department' });
  }
});

// UM-030: Remove user from department
router.delete('/:id/users/:userId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id: deptId, userId } = req.params;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || user.departmentId !== deptId) {
      return res.status(404).json({ error: 'User not found in this department' });
    }

    const [updated] = await db.update(users).set({
      departmentId: null,
    }).where(eq(users.id, userId)).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId: user.organizationId,
      departmentId: deptId,
      action: 'user.department.removed',
      actionType: 'update',
      resourceType: 'user',
      resourceId: userId,
      resourceName: user.username,
    }).catch(() => { });

    res.json(updated);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to remove user from department' });
  }
});

// UM-031: Get department users
router.get('/:id/users', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deptUsers = await db.select().from(users).where(eq(users.departmentId, id));
    res.json({ total: deptUsers.length, items: deptUsers });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch department users' });
  }
});

// UM-031: Assign role to department (dept-level permissions)
router.post('/:id/roles', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id: deptId } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    const [dept] = await db.select().from(departments).where(eq(departments.id, deptId));
    if (!dept) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if role already assigned
    const [existing] = await db.select().from(departmentRoles).where(
      and(eq(departmentRoles.departmentId, deptId), eq(departmentRoles.roleId, roleId))
    );

    if (existing) {
      return res.status(400).json({ error: 'Role already assigned to department' });
    }

    const [deptRole] = await db.insert(departmentRoles).values({
      departmentId: deptId,
      roleId,
    }).returning();

    // Log activity
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId: dept.organizationId,
      departmentId: deptId,
      action: 'department.role.assigned',
      actionType: 'create',
      resourceType: 'department',
      resourceId: deptId,
      resourceName: dept.name,
      details: { roleId },
    }).catch(() => { });

    res.status(201).json(deptRole);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to assign role to department' });
  }
});

// UM-031: Remove role from department
router.delete('/:id/roles/:roleId', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id: deptId, roleId } = req.params;

    await db.delete(departmentRoles).where(
      and(eq(departmentRoles.departmentId, deptId), eq(departmentRoles.roleId, roleId))
    );

    // Log activity
    const [dept] = await db.select().from(departments).where(eq(departments.id, deptId));
    await db.insert(activityLogs).values({
      userId: req.user?.id,
      organizationId: dept?.organizationId,
      departmentId: deptId,
      action: 'department.role.removed',
      actionType: 'delete',
      resourceType: 'department',
      resourceId: deptId,
      resourceName: dept?.name,
      details: { roleId },
    }).catch(() => { });

    res.status(204).send();
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to remove role from department' });
  }
});

// UM-031: Get department roles
router.get('/:id/roles', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deptRoles = await db
      .select({
        role: roles,
        deptRole: departmentRoles,
      })
      .from(departmentRoles)
      .innerJoin(roles, eq(departmentRoles.roleId, roles.id))
      .where(eq(departmentRoles.departmentId, id));

    const rolesList = deptRoles.map(dr => dr.role);
    res.json({ total: rolesList.length, items: rolesList });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch department roles' });
  }
});

export default router;

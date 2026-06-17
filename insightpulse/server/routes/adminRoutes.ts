import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, surveys, responses, analyticsSurveys, surveyResponses, departments, organizations, crmConfigs, crmSyncLogs, auditLogs, activityLogs } from '../../shared/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { requireAuth, AuthRequest, requirePermission } from '../middleware/auth';
import * as bcrypt from 'bcrypt';

const router = Router();

async function logAudit(actorId: string | undefined, action: string, targetType: string, targetId?: string, metadata?: any) {
  try {
    await db.insert(auditLogs).values({
      actorId: actorId || null,
      action,
      targetType,
      targetId: targetId || null,
      metadata: metadata || null,
    } as any);
  } catch { }
}

// Middleware to ensure organization admin access (strict)
const requireOrgAdmin = (req: AuthRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'superuser') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireDashboardView = requirePermission('admin', 'dashboard.view');
const requireUsersManage = requirePermission('admin', 'users.manage');
const requireAuditView = requirePermission('admin', 'audit.view');

// GET /api/admin/dashboard - UM-007, UM-008, UM-009, UM-010
// Organization admin dashboard with surveys, team, activity, and quota info
router.get('/dashboard', requireAuth, requireDashboardView, async (req: AuthRequest, res: Response) => {
  try {
    // For demo, get all surveys and users (in production, filter by organization)
    const allSurveys = await db.select().from(surveys);
    const allUsers = await db.select().from(users).where(eq(users.role, 'user'));
    const allResponses = await db.select().from(responses);

    // Create a Map for O(1) survey lookup
    const surveyMap = new Map(allSurveys.map(s => [s.id, s]));

    // Calculate survey performance metrics - UM-008
    const surveyPerformance = allSurveys.slice(0, 10).map(survey => {
      const surveyResp = allResponses.filter(r => r.surveyId === survey.id);
      const completedResp = surveyResp.filter(r => r.submittedAt !== null).length;

      const totalTime = surveyResp
        .filter(r => r.submittedAt && r.submittedAt)
        .reduce((sum, r) => {
          const startTime = new Date(survey.createdAt || new Date()).getTime();
          const endTime = new Date(r.submittedAt!).getTime();
          return sum + Math.max(0, endTime - startTime);
        }, 0);

      const avgResponseTimeMinutes = surveyResp.length > 0
        ? Math.round((totalTime / surveyResp.length) / 60000)
        : 0;

      return {
        surveyId: survey.id,
        surveyName: survey.title || `Survey ${survey.id}`,
        responseRate: allUsers.length > 0 ? (surveyResp.length / allUsers.length) * 100 : 0,
        completionRate: surveyResp.length > 0 ? (completedResp / surveyResp.length) * 100 : 0,
        totalResponses: surveyResp.length,
        avgResponseTime: avgResponseTimeMinutes,
      };
    });

    // Calculate team activity - UM-009
    const recentActivity = [
      ...allSurveys.slice(-5).map(s => ({
        id: `survey_${s.id}`,
        type: 'survey_created' as const,
        description: `Survey "${s.title}" created`,
        timestamp: (s.createdAt ? new Date(s.createdAt) : new Date()).toISOString(),
        actor: 'Admin',
      })),
      ...allResponses.slice(-5).map(r => ({
        id: `response_${r.id}`,
        type: 'response_received' as const,
        description: `Response received`,
        timestamp: r.submittedAt?.toISOString() || new Date().toISOString(),
        actor: 'Respondent',
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

    // Calculate quotas - UM-010
    const quotaUsage = {
      surveySlots: { used: allSurveys.length, limit: 50 },
      contacts: { used: allUsers.length, limit: 1000 },
      apiCalls: { used: Math.floor(allResponses.length * 1.5), limit: 100000 },
      storage: { used: allResponses.length * 2048, limit: 10 * 1024 * 1024 * 1024 },
    };

    const totalResponses = allResponses.length;
    const averageResponseRate = surveyPerformance.length > 0
      ? surveyPerformance.reduce((sum, s) => sum + s.responseRate, 0) / surveyPerformance.length
      : 0;

    res.json({
      surveyCount: allSurveys.length,
      activeUsers: allUsers.filter(u => !(u as any).deactivatedAt).length,
      totalResponses,
      averageResponseRate,
      surveyPerformance,
      recentActivity,
      quotaUsage,
      organization: {
        name: 'My Organization',
        plan: 'professional',
      },
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/admin/departments/performance - UM-011
router.get('/departments/performance', requireAuth, requireOrgAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    const depts = await db.select().from(departments);
    const allSurveys = await db.select().from(surveys);
    const allResponses = await db.select().from(responses);

    // Build map userId -> departmentId
    const userDept = new Map<string, string | null>(allUsers.map(u => [u.id, (u as any).departmentId || null]));

    // Build map departmentId -> surveys created by users in that department
    const deptSurveys = new Map<string, string[]>();
    for (const s of allSurveys) {
      const creatorDept = s.createdBy ? (userDept.get(s.createdBy) || null) : null;
      if (!creatorDept) continue;
      const list = deptSurveys.get(creatorDept) || [];
      list.push(s.id);
      deptSurveys.set(creatorDept, list);
    }

    const items = depts.map(d => {
      const sIds = deptSurveys.get(d.id) || [];
      const deptResponses = allResponses.filter(r => sIds.includes(r.surveyId || ''));
      const completed = deptResponses.filter(r => r.submittedAt).length;
      const avgEVI = deptResponses.length ? Math.round((deptResponses.reduce((a, r) => a + (r.eviScore || 0), 0) / deptResponses.length)) : 0;
      return {
        departmentId: d.id,
        departmentName: d.name,
        surveysOwned: sIds.length,
        totalResponses: deptResponses.length,
        completionRate: deptResponses.length ? (completed / deptResponses.length) * 100 : 0,
        averageEVI: avgEVI,
      }
    });

    res.json({ total: items.length, items });
  } catch (e) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to compute department performance' });
  }
});

// ----- Organizations CRUD (UM-013) -----
router.get('/organizations', requireAuth, requireOrgAdmin, async (_req: AuthRequest, res: Response) => {
  const orgs = await db.select().from(organizations);
  res.json({ total: orgs.length, items: orgs });
});

router.post('/organizations', requireAuth, requireOrgAdmin, requirePermission('organizations', 'create'), async (req: AuthRequest, res: Response) => {
  const { name, plan, isActive } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const [row] = await db.insert(organizations).values({ name: name, plan: plan || 'professional', isActive: isActive !== false } as any).returning();
  await logAudit(req.user?.id, 'create_organization', 'organization', row.id, { name, plan });
  res.status(201).json(row);
});

router.put('/organizations/:id', requireAuth, requireOrgAdmin, requirePermission('organizations', 'update'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { name, plan, isActive } = req.body || {};
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (plan !== undefined) updates.plan = plan;
  if (isActive !== undefined) updates.isActive = isActive;
  const [row] = await db.update(organizations).set(updates).where(eq(organizations.id, id)).returning();
  await logAudit(req.user?.id, 'update_organization', 'organization', id, req.body);
  res.json(row);
});

router.delete('/organizations/:id', requireAuth, requireOrgAdmin, requirePermission('organizations', 'delete'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  await db.delete(organizations).where(eq(organizations.id, id));
  await logAudit(req.user?.id, 'delete_organization', 'organization', id);
  res.status(204).send();
});

// ----- Departments CRUD (UM-014) -----
router.get('/departments', requireAuth, requireOrgAdmin, async (_req: AuthRequest, res: Response) => {
  const items = await db.select().from(departments);
  res.json({ total: items.length, items });
});

router.post('/departments', requireAuth, requireOrgAdmin, requirePermission('departments', 'create'), async (req: AuthRequest, res: Response) => {
  const { organizationId, name, isActive } = req.body || {};
  if (!organizationId || !name) return res.status(400).json({ error: 'organizationId and name required' });
  const [row] = await db.insert(departments).values({ organizationId: organizationId, name: name, isActive: isActive !== false } as any).returning();
  await logAudit(req.user?.id, 'create_department', 'department', row.id, { organizationId, name });
  res.status(201).json(row);
});

router.put('/departments/:id', requireAuth, requireOrgAdmin, requirePermission('departments', 'update'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { organizationId, name, isActive } = req.body || {};
  const updates: any = {};
  if (organizationId !== undefined) updates.organizationId = organizationId;
  if (name !== undefined) updates.name = name;
  if (isActive !== undefined) updates.isActive = isActive;
  const [row] = await db.update(departments).set(updates).where(eq(departments.id, id)).returning();
  await logAudit(req.user?.id, 'update_department', 'department', id, req.body);
  res.json(row);
});

router.delete('/departments/:id', requireAuth, requireOrgAdmin, requirePermission('departments', 'delete'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  await db.delete(departments).where(eq(departments.id, id));
  await logAudit(req.user?.id, 'delete_department', 'department', id);
  res.status(204).send();
});

// ----- Users admin actions (UM-015, UM-016) -----
router.patch('/users/:id/role', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { role } = req.body || {};
  if (!role) return res.status(400).json({ error: 'role required' });
  const [row] = await db.update(users).set({ role: role } as any).where(eq(users.id, id)).returning();
  await logAudit(req.user?.id, 'update_user_role', 'user', id, { role });
  res.json(row);
});

router.patch('/users/:id/status', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const { active } = req.body || {};
  const [row] = await db.update(users).set({ isActive: !!active } as any).where(eq(users.id, id)).returning();
  await logAudit(req.user?.id, active ? 'reactivate_user' : 'deactivate_user', 'user', id);
  res.json(row);
});

// ----- Invite + Reset password (UM-017, UM-018) -----
router.post('/users/invite', requireAuth, requireOrgAdmin, requirePermission('users', 'create'), async (req: AuthRequest, res: Response) => {
  const { email, role, organizationId, departmentId, expiresInHours = 72 } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email required' });
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);
  const { userInvites } = await import('../../shared/schema');
  const [row] = await db.insert(userInvites).values({ email: email, token: token, organizationId: organizationId || null, departmentId: departmentId || null, role: role || 'user', invitedBy: req.user?.id || null, expiresAt } as any).returning();
  await logAudit(req.user?.id, 'create_invite', 'invite', row.id, { email, role });
  res.status(201).json({ inviteId: row.id, token, expiresAt, inviteUrl: `/register?token=${token}` });
});

router.post('/users/:id/reset-password', requireAuth, requireOrgAdmin, requirePermission('users', 'update'), async (req: AuthRequest, res: Response) => {
  const id = req.params.id;
  const temp = req.body?.temporaryPassword || Math.random().toString(36).slice(2, 10);
  const hash = await bcrypt.hash(temp, 10);
  const [row] = await db.update(users).set({ password: hash } as any).where(eq(users.id, id)).returning();
  await logAudit(req.user?.id, 'reset_password', 'user', id);
  res.json({ userId: row.id, temporaryPassword: temp });
});

// ----- Admin search (UM-020) -----
router.get('/search', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string || '').toLowerCase();
  const [u, o, d] = await Promise.all([
    db.select().from(users),
    db.select().from(organizations),
    db.select().from(departments),
  ]);
  const usersRes = u.filter(x => [x.username, x.email].some(v => (v || '').toLowerCase().includes(q)));
  const orgsRes = o.filter(x => (x.name || '').toLowerCase().includes(q));
  const deptsRes = d.filter(x => (x.name || '').toLowerCase().includes(q));
  res.json({ users: usersRes, organizations: orgsRes, departments: deptsRes });
});


// GET /api/admin/integrations/status - UM-012
router.get('/integrations/status', requireAuth, requireOrgAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const configs = await db.select().from(crmConfigs);
    const latestSync = await db.select().from(crmSyncLogs);

    const crmStatus = {
      configured: configs.length > 0,
      activeConfigs: configs.filter(c => (c as any).isActive).length,
      lastTestedAt: configs.reduce<Date | null>((acc, c: any) => {
        const t = c.lastTestedAt ? new Date(c.lastTestedAt) : null;
        if (!acc || (t && t > acc)) return t;
        return acc;
      }, null),
      lastTestedStatus: configs.find((c: any) => c.lastTestedStatus)?.lastTestedStatus || null,
      lastSyncStatus: latestSync[0]?.status || null,
    };

    const voiceConfigured = !!process.env.VOICE_WEBHOOK_PATH || !!process.env.PERPLEXITY_API_KEY;
    const watiConfigured = !!process.env.WATI_API_KEY || !!process.env.WHATSAPP_TOKEN;

    res.json({
      crm: crmStatus,
      voice: { configured: voiceConfigured },
      whatsapp: { configured: watiConfigured },
    });
  } catch (e) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch integrations status' });
  }
});

// GET /api/admin/surveys - List surveys with performance data
router.get('/surveys', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const surveys_list = await db.select().from(surveys);
    const all_responses = await db.select().from(responses);

    const surveyData = surveys_list.map(survey => {
      const survey_responses = all_responses.filter(r => r.surveyId === survey.id);
      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        isActive: survey.isActive,
        responseCount: survey_responses.length,
        completionRate: survey_responses.length > 0
          ? (survey_responses.filter(r => r.submittedAt).length / survey_responses.length) * 100
          : 0,
        createdAt: survey.createdAt,
      };
    });

    res.json({ surveys: surveyData, total: surveys_list.length });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// GET /api/admin/team - List team members - UM-009
router.get('/team', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const teamMembers = await db.select().from(users);

    res.json({
      team: teamMembers.map(u => ({
        id: u.id,
        name: u.username,
        email: u.email,
        role: u.role,
        isActive: !(u as any).deactivatedAt,
        createdAt: u.createdAt,
      })),
      total: teamMembers.length,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// GET /api/admin/quota - Get quota usage details - UM-010
router.get('/quota', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const surveys_list = await db.select().from(surveys);
    const teamMembers = await db.select().from(users);
    const all_responses = await db.select().from(responses);

    const quotaUsage = {
      surveys: { used: surveys_list.length, limit: 50, percentage: (surveys_list.length / 50) * 100 },
      contacts: { used: teamMembers.length, limit: 1000, percentage: (teamMembers.length / 1000) * 100 },
      apiCalls: { used: Math.floor(all_responses.length * 1.5), limit: 100000, percentage: (all_responses.length * 1.5 / 100000) * 100 },
      storage: { used: all_responses.length * 2048, limit: 10 * 1024 * 1024 * 1024, percentage: (all_responses.length * 2048 / (10 * 1024 * 1024 * 1024)) * 100 },
    };

    res.json({
      plan: 'professional',
      quotaUsage,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch quota information' });
  }
});

// GET /api/admin/audit-logs - UM-019: Retrieve audit logs
router.get('/audit-logs', requireAuth, requireAuditView, async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
    const orgId = (req as any).user?.organizationId || null;

    const logs = await db
      .select({
        id: activityLogs.id,
        userId: activityLogs.userId,
        username: activityLogs.resourceName,
        eventType: activityLogs.action,
        description: activityLogs.action,
        status: activityLogs.status,
        ipAddress: activityLogs.ipAddress,
        userAgent: activityLogs.userAgent,
        createdAt: activityLogs.createdAt,
        metadata: activityLogs.details
      })
      .from(activityLogs)
      .where(orgId ? eq(activityLogs.organizationId, orgId) : undefined as any)
      .orderBy(desc(activityLogs.createdAt))
      .limit(limit);

    res.json(logs);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// UM-015: List organization team members with filtering and pagination
router.get('/team/members', requireAuth, requireUsersManage, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const searchTerm = (req.query.search as string || '').toLowerCase();
    const roleFilter = (req.query.role as string) || 'all';
    const statusFilter = (req.query.status as string) || 'all';

    let allUsers = await db.select().from(users);

    // Apply filters
    if (searchTerm) {
      allUsers = allUsers.filter((u: any) =>
        (u.username || '').toLowerCase().includes(searchTerm) ||
        (u.email || '').toLowerCase().includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      allUsers = allUsers.filter((u: any) => u.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      allUsers = allUsers.filter((u: any) => !(u as any).deactivatedAt === isActive);
    }

    const total = allUsers.length;
    const paginatedUsers = allUsers.slice(offset, offset + limit);

    res.json({
      users: paginatedUsers.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: !(u as any).deactivatedAt,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

// UM-016: Update team member role
router.patch('/team/members/:userId/role', requireAuth, requireUsersManage, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required (user or admin)' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ role: role as any })
      .where(eq(users.id, userId))
      .returning();

    await logAudit(req.user?.id, 'update_user_role', 'user', userId, { oldRole: user.role, newRole: role });

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: !(updatedUser as any).deactivatedAt,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to update user role' });
  }
});

// UM-016: Toggle team member status (activate/deactivate)
router.patch('/team/members/:userId/status', requireAuth, requireUsersManage, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active boolean field required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ isActive: active } as any)
      .where(eq(users.id, userId))
      .returning();

    await logAudit(req.user?.id, active ? 'reactivate_user' : 'deactivate_user', 'user', userId);

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      isActive: updatedUser.isActive,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to update user status' });
  }
});

// UM-017: Send team member invitation with organization assignment
router.post('/team/members/invite', requireAuth, requireUsersManage, async (req: AuthRequest, res: Response) => {
  try {
    const { email, role, organizationId, departmentId, expiresInHours = 72 } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required (user or admin)' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Validate organization if provided
    if (organizationId) {
      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      if (!org) {
        return res.status(400).json({ error: 'Invalid organization ID' });
      }
    }

    // Validate department if provided
    if (departmentId) {
      const [dept] = await db.select().from(departments).where(eq(departments.id, departmentId));
      if (!dept) {
        return res.status(400).json({ error: 'Invalid department ID' });
      }
    }

    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    const { userInvites } = await import('../../shared/schema');

    const [invite] = await db.insert(userInvites).values({
      email,
      token,
      role: role as any,
      organizationId: organizationId || req.user?.organizationId || null,
      departmentId: departmentId || null,
      invitedBy: req.user?.id || null,
      expiresAt,
    } as any).returning();

    // Log activity
    const { logActivity, getRequestInfo } = require('../utils/activityLogger');
    const { ipAddress, userAgent } = getRequestInfo(req);
    await logActivity(
      req.user?.id,
      organizationId || req.user?.organizationId,
      'user.invited',
      'create',
      'user_invite',
      invite.id,
      email,
      { role, organizationId, departmentId },
      ipAddress,
      userAgent
    );

    await logAudit(req.user?.id, 'create_invite', 'invite', invite.id, { email, role, organizationId, departmentId });

    res.status(201).json({
      id: invite.id,
      email,
      role,
      organizationId: organizationId || req.user?.organizationId,
      departmentId,
      token,
      expiresAt,
      inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${token}`,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to create invite' });
  }
});

// UM-018: Reset team member password
router.post('/team/members/:userId/reset-password', requireAuth, requireUsersManage, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { temporaryPassword } = req.body;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const tempPass = temporaryPassword || Math.random().toString(36).slice(2, 12);
    const hashedPassword = await bcrypt.hash(tempPass, 10);

    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();

    await logAudit(req.user?.id, 'reset_password', 'user', userId);

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      temporaryPassword: tempPass,
      message: 'Password reset successfully. User should change it on next login.',
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to reset password' });
  }
});

// UM-015: Remove team member
router.delete('/team/members/:userId', requireAuth, requireUsersManage, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting superuser or admin
    if (user.role === 'superuser') {
      return res.status(403).json({ error: 'Cannot delete superuser account' });
    }

    await db.delete(users).where(eq(users.id, userId));

    await logAudit(req.user?.id, 'delete_user', 'user', userId, { username: user.username, email: user.email });

    res.status(204).send();
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to delete user' });
  }
});

// UM-021: Get users with survey summary for admin dashboard
router.get('/users-surveys', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const allUsers = await db.select().from(users);
    const allSurveys = await db.select().from(surveys);
    const allResponses = await db.select().from(responses);

    console.log(`[UM-021] Fetched ${allUsers.length} users, ${allSurveys.length} surveys, and ${allResponses.length} responses`);

    const userSurveyData = allUsers.map(user => {
      // Get surveys CREATED by this user
      const userCreatedSurveys = allSurveys.filter(s => s.createdBy === user.id);

      // Get total responses for all their surveys
      const surveysIds = userCreatedSurveys.map(s => s.id);
      const responsesToTheirSurveys = allResponses.filter(r => surveysIds.includes(r.surveyId || ''));
      const completedResponses = responsesToTheirSurveys.filter(r => r.submittedAt !== null);

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        totalSurveysCreated: userCreatedSurveys.length,
        totalResponsesReceived: responsesToTheirSurveys.length,
        lastResponseDate: responsesToTheirSurveys.length > 0
          ? new Date(Math.max(...responsesToTheirSurveys.map(r => new Date(r.submittedAt || new Date()).getTime())))
          : null,
        status: user.isActive ? 'active' : 'inactive',
        surveyCompletionRate: userCreatedSurveys.length > 0 && responsesToTheirSurveys.length > 0
          ? Math.round((completedResponses.length / responsesToTheirSurveys.length) * 100)
          : 0,
      };
    });

    res.json({ total: userSurveyData.length, items: userSurveyData });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch users surveys' });
  }
});

// UM-022: Get specific user's surveys (that they created) with responses
router.get('/users/:userId/surveys', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, surveyId, sortBy = 'date' } = req.query;

    

    // Get user details
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      
      return res.status(404).json({ error: 'User not found' });
    }

    

    // Get surveys CREATED by this user
    let userSurveys = await db.select().from(surveys).where(eq(surveys.createdBy, userId));

    console.log(`[UM-022] Found ${userSurveys.length} surveys created by ${user.username}`);

    // Filter by survey ID if provided
    if (surveyId) {
      userSurveys = userSurveys.filter(s => s.id === surveyId);
    }

    // Filter by date range if provided
    if (startDate) {
      const start = new Date(startDate as string);
      userSurveys = userSurveys.filter(s => s.createdAt && new Date(s.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate as string);
      userSurveys = userSurveys.filter(s => s.createdAt && new Date(s.createdAt) <= end);
    }

    // Get all responses for these surveys
    const allResponses = await db.select().from(responses);

    const enrichedSurveys = userSurveys.map(survey => {
      const surveyResponses = allResponses.filter(r => r.surveyId === survey.id);
      const completedResponses = surveyResponses.filter(r => r.submittedAt !== null);

      // Calculate average scores
      const avgNPS = completedResponses.length > 0
        ? completedResponses.reduce((sum, r) => sum + (r.npsScore || 0), 0) / completedResponses.length
        : null;
      const avgEVI = completedResponses.length > 0
        ? completedResponses.reduce((sum, r) => sum + (r.eviScore || 0), 0) / completedResponses.length
        : null;
      const avgCSAT = completedResponses.length > 0
        ? completedResponses.reduce((sum, r) => sum + (r.csatScore || 0), 0) / completedResponses.length
        : null;

      return {
        id: survey.id,
        surveyId: survey.id,
        surveyTitle: survey.title,
        surveyDescription: survey.description,
        createdAt: survey.createdAt,
        isActive: survey.isActive,
        totalResponses: surveyResponses.length,
        completedResponses: completedResponses.length,
        completionRate: surveyResponses.length > 0
          ? Math.round((completedResponses.length / surveyResponses.length) * 100)
          : 0,
        avgNpsScore: avgNPS ? Math.round(avgNPS) : null,
        avgEviScore: avgEVI ? Math.round(avgEVI) : null,
        avgCsatScore: avgCSAT ? Math.round(avgCSAT) : null,
        npsScore: avgNPS ? Math.round(avgNPS) : null,
        eviScore: avgEVI ? Math.round(avgEVI) : null,
        csatScore: avgCSAT ? Math.round(avgCSAT) : null,
        questionCount: Array.isArray(survey.questions) ? survey.questions.length : 0,
        submittedAt: survey.createdAt, // For compatibility with frontend
        surveyCompleted: survey.isActive,
      };
    });

    // Sort surveys
    if (sortBy === 'date-asc') {
      enrichedSurveys.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    } else {
      enrichedSurveys.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    }

    const responseData = {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      total: enrichedSurveys.length,
      responses: enrichedSurveys, // Keep same key name for frontend compatibility
    };

    
    res.json(responseData);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch user surveys', details: String(error) });
  }
});

// UM-023: Get survey response details
router.get('/surveys/responses/:responseId', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { responseId } = req.params;

    const [response] = await db.select().from(responses).where(eq(responses.id, responseId));
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    if (!response.surveyId) {
      return res.json({
        response,
        survey: null,
        metadata: {
          questions: [],
          respondentEmail: response.respondentEmail,
          submittedAt: response.submittedAt,
          npsScore: response.npsScore,
          eviScore: response.eviScore,
          csatScore: response.csatScore,
        },
      });
    }

    const [survey] = await db.select().from(surveys).where(eq(surveys.id, response.surveyId));

    res.json({
      response,
      survey: survey || null,
      metadata: {
        questions: survey?.questions || [],
        respondentEmail: response.respondentEmail,
        submittedAt: response.submittedAt,
        npsScore: response.npsScore,
        eviScore: response.eviScore,
        csatScore: response.csatScore,
      },
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch response details' });
  }
});

// UM-024: Export user surveys to CSV
router.post('/surveys/export', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, format = 'csv', dateRange } = req.body;

    let responsesToExport = await db.select().from(responses);

    // Filter by users if specified
    if (userIds && userIds.length > 0) {
      const selectedUsers = await db.select().from(users).where(
        (u) => userIds.includes(u.id)
      );
      const emails = selectedUsers.map(u => u.email);
      responsesToExport = responsesToExport.filter(r => emails.includes(r.respondentEmail || ''));
    }

    // Filter by date range if specified
    if (dateRange?.startDate) {
      const start = new Date(dateRange.startDate);
      responsesToExport = responsesToExport.filter(r => r.submittedAt && new Date(r.submittedAt) >= start);
    }
    if (dateRange?.endDate) {
      const end = new Date(dateRange.endDate);
      responsesToExport = responsesToExport.filter(r => r.submittedAt && new Date(r.submittedAt) <= end);
    }

    // Get survey details
    const surveyMap = new Map();
    const allSurveys = await db.select().from(surveys);
    allSurveys.forEach(s => surveyMap.set(s.id, s));

    if (format === 'csv') {
      // Prepare CSV data
      const headers = ['Response ID', 'User Email', 'Survey Title', 'Submitted Date', 'NPS Score', 'EVI Score', 'CSAT Score', 'Status'];
      const rows = responsesToExport.map(r => [
        r.id,
        r.respondentEmail || 'N/A',
        surveyMap.get(r.surveyId)?.title || 'Unknown Survey',
        r.submittedAt ? new Date(r.submittedAt).toISOString() : 'N/A',
        r.npsScore ?? 'N/A',
        r.eviScore ?? 'N/A',
        r.csatScore ?? 'N/A',
        r.surveyCompleted ? 'Completed' : 'Incomplete',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=surveys-export.csv');
      res.send(csvContent);
    } else {
      // JSON format
      res.json({
        exportedAt: new Date().toISOString(),
        totalRecords: responsesToExport.length,
        data: responsesToExport.map(r => ({
          ...r,
          surveyTitle: surveyMap.get(r.surveyId)?.title,
        })),
      });
    }
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to export surveys' });
  }
});

// UM-025: Delete survey response
router.delete('/surveys/responses/:responseId', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { responseId } = req.params;

    const [response] = await db.select().from(responses).where(eq(responses.id, responseId));
    if (!response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    await db.delete(responses).where(eq(responses.id, responseId));

    await logAudit(req.user?.id, 'delete_survey_response', 'response', responseId, {
      respondentEmail: response.respondentEmail,
      surveyId: response.surveyId,
    });

    res.status(204).send();
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to delete response' });
  }
});

// Bulk delete survey responses
router.post('/surveys/responses/bulk-delete', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { responseIds, surveyId, dateRange, filters } = req.body;

    if (!responseIds && !surveyId && !dateRange) {
      return res.status(400).json({ error: 'Must provide responseIds, surveyId, or dateRange' });
    }

    let responsesToDelete: any[] = [];

    // Get responses based on criteria
    if (responseIds && responseIds.length > 0) {
      // Delete specific responses by ID
      responsesToDelete = await db.select().from(responses);
      responsesToDelete = responsesToDelete.filter(r => responseIds.includes(r.id));
    } else if (surveyId) {
      // Delete all responses for a survey
      responsesToDelete = await db.select().from(responses).where(eq(responses.surveyId, surveyId));

      // Apply date range filter if provided
      if (dateRange?.startDate) {
        const start = new Date(dateRange.startDate);
        responsesToDelete = responsesToDelete.filter(r => r.submittedAt && new Date(r.submittedAt) >= start);
      }
      if (dateRange?.endDate) {
        const end = new Date(dateRange.endDate);
        responsesToDelete = responsesToDelete.filter(r => r.submittedAt && new Date(r.submittedAt) <= end);
      }

      // Apply additional filters
      if (filters?.minScore !== undefined) {
        responsesToDelete = responsesToDelete.filter(r =>
          (r.npsScore || 0) >= filters.minScore ||
          (r.csatScore || 0) >= filters.minScore ||
          (r.eviScore || 0) >= filters.minScore
        );
      }
      if (filters?.maxScore !== undefined) {
        responsesToDelete = responsesToDelete.filter(r =>
          (r.npsScore || 0) <= filters.maxScore ||
          (r.csatScore || 0) <= filters.maxScore ||
          (r.eviScore || 0) <= filters.maxScore
        );
      }
      if (filters?.completed !== undefined) {
        responsesToDelete = responsesToDelete.filter(r => r.surveyCompleted === filters.completed);
      }
    }

    if (responsesToDelete.length === 0) {
      return res.json({
        success: true,
        message: 'No responses matched the criteria',
        deletedCount: 0
      });
    }

    // Delete responses
    for (const response of responsesToDelete) {
      await db.delete(responses).where(eq(responses.id, response.id));
    }

    // Log audit for bulk deletion
    await logAudit(req.user?.id, 'bulk_delete_responses', 'responses', undefined, {
      count: responsesToDelete.length,
      surveyId,
      dateRange,
      filters,
      responseIds: responsesToDelete.map(r => r.id).slice(0, 10), // Log first 10 IDs
    });

    res.json({
      success: true,
      message: `Successfully deleted ${responsesToDelete.length} response(s)`,
      deletedCount: responsesToDelete.length
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to bulk delete responses' });
  }
});

// Enhanced export with advanced filtering
router.post('/surveys/export-advanced', requireAuth, requireOrgAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      userIds,
      surveyIds,
      format = 'csv',
      dateRange,
      filters = {},
      includeMetadata = false,
      includeAnswers = false
    } = req.body;

    let responsesToExport = await db.select().from(responses);

    // Filter by surveys if specified
    if (surveyIds && surveyIds.length > 0) {
      responsesToExport = responsesToExport.filter(r => surveyIds.includes(r.surveyId));
    }

    // Filter by users if specified
    if (userIds && userIds.length > 0) {
      const selectedUsers = await db.select().from(users).where(
        (u) => userIds.includes(u.id)
      );
      const emails = selectedUsers.map(u => u.email);
      responsesToExport = responsesToExport.filter(r => emails.includes(r.respondentEmail || ''));
    }

    // Filter by date range
    if (dateRange?.startDate) {
      const start = new Date(dateRange.startDate);
      responsesToExport = responsesToExport.filter(r => r.submittedAt && new Date(r.submittedAt) >= start);
    }
    if (dateRange?.endDate) {
      const end = new Date(dateRange.endDate);
      responsesToExport = responsesToExport.filter(r => r.submittedAt && new Date(r.submittedAt) <= end);
    }

    // Apply score filters
    if (filters.minNPS !== undefined) {
      responsesToExport = responsesToExport.filter(r => (r.npsScore || 0) >= filters.minNPS);
    }
    if (filters.maxNPS !== undefined) {
      responsesToExport = responsesToExport.filter(r => (r.npsScore || 0) <= filters.maxNPS);
    }
    if (filters.minCSAT !== undefined) {
      responsesToExport = responsesToExport.filter(r => (r.csatScore || 0) >= filters.minCSAT);
    }
    if (filters.maxCSAT !== undefined) {
      responsesToExport = responsesToExport.filter(r => (r.csatScore || 0) <= filters.maxCSAT);
    }
    if (filters.minEVI !== undefined) {
      responsesToExport = responsesToExport.filter(r => (r.eviScore || 0) >= filters.minEVI);
    }
    if (filters.maxEVI !== undefined) {
      responsesToExport = responsesToExport.filter(r => (r.eviScore || 0) <= filters.maxEVI);
    }

    // Filter by completion status
    if (filters.completed !== undefined) {
      responsesToExport = responsesToExport.filter(r => r.surveyCompleted === filters.completed);
    }

    // Filter by sentiment
    if (filters.sentiment) {
      responsesToExport = responsesToExport.filter(r => r.overallSentiment === filters.sentiment);
    }

    // Get survey details
    const surveyMap = new Map();
    const allSurveys = await db.select().from(surveys);
    allSurveys.forEach(s => surveyMap.set(s.id, s));

    if (format === 'csv') {
      // Prepare CSV data with optional fields
      const baseHeaders = ['Response ID', 'User Email', 'Survey Title', 'Submitted Date', 'NPS Score', 'EVI Score', 'CSAT Score', 'Status'];

      if (includeMetadata) {
        baseHeaders.push('Sentiment', 'Questions Asked', 'Analysis Summary');
      }

      const rows = responsesToExport.map(r => {
        const baseRow = [
          r.id,
          r.respondentEmail || 'N/A',
          surveyMap.get(r.surveyId)?.title || 'Unknown Survey',
          r.submittedAt ? new Date(r.submittedAt).toISOString() : 'N/A',
          r.npsScore ?? 'N/A',
          r.eviScore ?? 'N/A',
          r.csatScore ?? 'N/A',
          r.surveyCompleted ? 'Completed' : 'Incomplete',
        ];

        if (includeMetadata) {
          baseRow.push(
            r.overallSentiment || 'N/A',
            r.totalQuestionsAsked?.toString() || 'N/A',
            (r.analysisSummary || 'N/A').replace(/[\n\r]/g, ' ')
          );
        }

        return baseRow;
      });

      const csvContent = [
        baseHeaders.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      const timestamp = new Date().toISOString().split('T')[0];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=surveys-export-${timestamp}.csv`);
      res.send(csvContent);
    } else {
      // JSON format with optional detailed data
      const exportData = responsesToExport.map(r => {
        const baseData: any = {
          id: r.id,
          respondentEmail: r.respondentEmail,
          surveyId: r.surveyId,
          surveyTitle: surveyMap.get(r.surveyId)?.title,
          submittedAt: r.submittedAt,
          npsScore: r.npsScore,
          eviScore: r.eviScore,
          csatScore: r.csatScore,
          completed: r.surveyCompleted,
        };

        if (includeMetadata) {
          baseData.sentiment = r.overallSentiment;
          baseData.questionsAsked = r.totalQuestionsAsked;
          baseData.analysisSummary = r.analysisSummary;
        }

        if (includeAnswers) {
          baseData.answers = r.answers;
          baseData.detailedResponses = r.detailedResponses;
        }

        return baseData;
      });

      res.json({
        exportedAt: new Date().toISOString(),
        totalRecords: responsesToExport.length,
        filters: { userIds, surveyIds, dateRange, filters },
        data: exportData,
      });
    }
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to export surveys' });
  }
});

export default router;

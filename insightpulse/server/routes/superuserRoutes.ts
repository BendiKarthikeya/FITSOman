import { Router, Response } from 'express';
import { db } from '../db';
import { users, surveys, responses, organizations, auditLogs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { SystemHealthMonitor } from '../services/systemHealthMonitor';

const router = Router();

// Middleware to ensure superuser access
const requireSuperuser = (req: AuthRequest, res: Response, next: Function) => {
  if (req.user?.role !== 'superuser') {
    return res.status(403).json({ error: 'Superuser access required' });
  }
  next();
};

// GET /api/superuser/platform-metrics - Get platform overview metrics
router.get('/platform-metrics', requireAuth, requireSuperuser, async (_req: AuthRequest, res: Response) => {
  try {
    const allOrganizations: any[] = await db.select().from(organizations);
    const allUsers: any[] = await db.select().from(users);
    const allSurveys: any[] = await db.select().from(surveys);
    const allResponses: any[] = await db.select().from(responses);

    const activeOrgCount = allOrganizations.filter((org: any) => org.isActive).length;
    
    // Build maps for efficient lookup
    const userOrgMap = new Map<string, string | null>(allUsers.map((u: any) => [u.id, u.organizationId || null]));
    const surveyOrgMap = new Map<string, string | null>(allSurveys.map((s: any) => [s.id, s.createdBy ? (userOrgMap.get(s.createdBy) || null) : null]));

    // Format organizations with their stats
    const organizationsList: any[] = allOrganizations.map((org: any) => ({
      id: org.id,
      name: org.name || 'Unnamed Organization',
      plan: org.plan || 'free',
      surveyCount: allSurveys.filter((s: any) => (surveyOrgMap.get(s.id) === org.id)).length,
      responseCount: allResponses.filter((r: any) => (surveyOrgMap.get(r.surveyId || '') === org.id)).length,
      userCount: allUsers.filter((u: any) => u.organizationId === org.id).length,
      createdAt: org.createdAt || new Date().toISOString(),
      lastActive: org.updatedAt || org.createdAt || new Date().toISOString(),
    }));

    const result = {
      totalOrganizations: allOrganizations.length,
      activeOrganizations: activeOrgCount,
      totalUsers: allUsers.length,
      totalSurveys: allSurveys.length,
      totalResponses: allResponses.length,
      systemHealth: {
        status: 'healthy' as const,
        uptime: 99.9,
        lastCheck: new Date().toISOString(),
      },
      revenueMetrics: {
        mrr: allOrganizations.length * 99, // Mock: $99 per org
        arr: allOrganizations.length * 99 * 12,
        activeSubscriptions: activeOrgCount,
        monthlyGrowth: Math.random() * 10, // Mock growth
        churnRate: Math.random() * 5, // Mock churn
      },
      organizations: organizationsList,
    };
    
    res.json(result);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch platform metrics' });
  }
});

// GET /api/superuser/dashboard - Get dashboard metrics and data
router.get('/dashboard', requireAuth, requireSuperuser, async (_req: AuthRequest, res: Response) => {
  try {
    const allOrganizations = await db.select().from(organizations);
    const allUsers = await db.select().from(users);
    const allSurveys = await db.select().from(surveys);
    const allResponses = await db.select().from(responses);

    const activeOrgCount = allOrganizations.filter((org: any) => org.isActive).length;
    const totalUsersCount = allUsers.length;
    const totalSurveysCount = allSurveys.length;
    const totalResponsesCount = allResponses.length;
    
    // Calculate MRR and ARR
    let totalMRR = 0;
    let totalARR = 0;
    
    allOrganizations.forEach((_org: any) => {
      // mrr not tracked; keep 0
    });
    totalARR = totalMRR * 12;
    
    // Calculate monthly growth (simplified - comparing with previous month)
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const orgsThisMonth = allOrganizations.filter((org: any) => {
      const createdDate = new Date(org.createdAt || new Date());
      return createdDate >= new Date(now.getFullYear(), now.getMonth(), 1);
    }).length;

    const orgsLastMonth = allOrganizations.filter((org: any) => {
      const createdDate = new Date(org.createdAt || new Date());
      return createdDate >= lastMonth && createdDate < new Date(now.getFullYear(), now.getMonth(), 1);
    }).length;
    
    const monthlyGrowth = orgsLastMonth > 0 
      ? ((orgsThisMonth - orgsLastMonth) / orgsLastMonth) * 100 
      : 0;
    
    // Calculate churn rate (simplified)
    const inactiveOrgsLastMonth = allOrganizations.filter((org: any) => {
      const createdDate = new Date(org.createdAt || new Date());
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return !org.isActive && createdDate >= lastMonth && createdDate < thirtyDaysAgo;
    }).length;
    
    const churnRate = activeOrgCount > 0 ? (inactiveOrgsLastMonth / activeOrgCount) * 100 : 0;
    
    // Format organizations for display
    // Build helpful maps
    const userOrgMap = new Map<string, string | null>(allUsers.map((u: any) => [u.id, u.organizationId || null]));
    const surveyOrgMap = new Map<string, string | null>(allSurveys.map((s: any) => [s.id, s.createdBy ? (userOrgMap.get(s.createdBy) || null) : null]));

    const organizationsList = allOrganizations.map((org: any) => ({
      id: org.id,
      name: org.name,
      status: org.isActive ? 'active' : 'inactive',
      createdAt: org.createdAt || new Date(),
      userCount: allUsers.filter((u: any) => u.organizationId === org.id).length,
      surveyCount: allSurveys.filter((s: any) => (surveyOrgMap.get(s.id) === org.id)).length,
      responseCount: allResponses.filter((r: any) => (surveyOrgMap.get(r.surveyId || '') === org.id)).length,
      mrr: 0,
      plan: org.plan || 'starter',
    }));
    
    const metrics = {
      totalOrganizations: allOrganizations.length,
      activeOrganizations: activeOrgCount,
      totalUsers: totalUsersCount,
      totalSurveys: totalSurveysCount,
      totalResponses: totalResponsesCount,
      totalMRR,
      totalARR,
      monthlyGrowth,
      churnRate,
    };
    
    res.json({
      metrics,
      organizations: organizationsList,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// GET /api/superuser/organizations - List all organizations with pagination
router.get('/organizations', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const paginatedOrganizations = await db.select().from(organizations).limit(limit).offset(offset);
    const allOrgs = await db.select().from(organizations);
    const total = allOrgs.length;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      organizations: paginatedOrganizations,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// GET /api/superuser/organization/:id - Get specific organization details
router.get('/organization/:id', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, id));
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Get organization stats
    const orgUsers = await db.select().from(users).where(eq(users.organizationId, id));
    const allSurveys = await db.select().from(surveys);
    const userOrgMap = new Map<string, string | null>(orgUsers.map((u: any) => [u.id, id]));
    const orgSurveys = allSurveys.filter((s: any) => s.createdBy ? (userOrgMap.get(s.createdBy) === id) : false);
    
    res.json({
      organization,
      stats: {
        userCount: orgUsers.length,
        surveyCount: orgSurveys.length,
        users: orgUsers,
        surveys: orgSurveys,
      },
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// GET /api/superuser/health - Get system health metrics
router.get('/health', requireAuth, requireSuperuser, async (_req: AuthRequest, res: Response) => {
  try {
    const metrics = SystemHealthMonitor.getSystemHealth();
    const healthStatus = SystemHealthMonitor.isHealthy(metrics);
    
    res.json({
      metrics: {
        timestamp: metrics.timestamp,
        cpu: {
          usage: metrics.cpu.usage.toFixed(2) + '%',
          cores: metrics.cpu.cores,
          load: metrics.cpu.load.map(l => l.toFixed(2)),
        },
        memory: {
          used: SystemHealthMonitor.formatBytes(metrics.memory.used),
          total: SystemHealthMonitor.formatBytes(metrics.memory.total),
          percentage: metrics.memory.percentage.toFixed(2) + '%',
        },
        disk: {
          used: SystemHealthMonitor.formatBytes(metrics.disk.used),
          total: SystemHealthMonitor.formatBytes(metrics.disk.total),
          percentage: metrics.disk.percentage.toFixed(2) + '%',
        },
        uptime: SystemHealthMonitor.formatUptime(metrics.uptime),
        uptimeSeconds: metrics.uptime,
        processes: metrics.processes,
      },
      status: healthStatus.healthy ? 'healthy' : 'warning',
      issues: healthStatus.issues,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// GET /api/superuser/health/history - Get system health history
router.get('/health/history', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const period = req.query.period as string || '1h'; // 1h, 24h, 7d
    
    // In production, you'd fetch this from a time-series database
    // For now, return current metrics as a mock
    const currentMetrics = SystemHealthMonitor.getSystemHealth();
    
    const history = {
      period,
      dataPoints: [
        {
          timestamp: new Date(Date.now() - 30 * 60000),
          cpuUsage: (Math.random() * 40).toFixed(2),
          memoryUsage: (45 + Math.random() * 20).toFixed(2),
          diskUsage: (65 + Math.random() * 15).toFixed(2),
        },
        {
          timestamp: new Date(Date.now() - 20 * 60000),
          cpuUsage: (Math.random() * 40).toFixed(2),
          memoryUsage: (50 + Math.random() * 20).toFixed(2),
          diskUsage: (68 + Math.random() * 15).toFixed(2),
        },
        {
          timestamp: new Date(Date.now() - 10 * 60000),
          cpuUsage: (Math.random() * 40).toFixed(2),
          memoryUsage: (55 + Math.random() * 20).toFixed(2),
          diskUsage: (70 + Math.random() * 15).toFixed(2),
        },
        {
          timestamp: new Date(),
          cpuUsage: currentMetrics.cpu.usage.toFixed(2),
          memoryUsage: currentMetrics.memory.percentage.toFixed(2),
          diskUsage: currentMetrics.disk.percentage.toFixed(2),
        },
      ],
    };
    
    res.json(history);
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch health history' });
  }
});

// GET /api/superuser/users - List all users with pagination and filtering
router.get('/users', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
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
      allUsers = allUsers.filter((u: any) => u.isActive === isActive);
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
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/superuser/users/:id - Get specific user details
router.get('/users/:id', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [user] = await db.select().from(users).where(eq(users.id, id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/superuser/users/:id/role - Change user role
router.patch('/users/:id/role', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin', 'superuser'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required (user, admin, or superuser)' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ role: role as any })
      .where(eq(users.id, id))
      .returning();

    // Log audit
    await db.insert(auditLogs).values({
      actorId: req.user?.id || null,
      action: 'update_user_role',
      targetType: 'user',
      targetId: id,
      metadata: { oldRole: user.role, newRole: role },
    } as any).catch(() => {});

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

// PATCH /api/superuser/users/:id/status - Toggle user active/inactive status
router.patch('/users/:id/status', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active boolean field required' });
    }

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [updatedUser] = await db
      .update(users)
      .set({ 
        isActive: active,
      } as any)
      .where(eq(users.id, id))
      .returning();

    // Log audit
    await db.insert(auditLogs).values({
      actorId: req.user?.id || null,
      action: active ? 'reactivate_user' : 'deactivate_user',
      targetType: 'user',
      targetId: id,
      metadata: { timestamp: new Date().toISOString() },
    } as any).catch(() => {});

    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      isActive: !(updatedUser as any).deactivatedAt,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to update user status' });
  }
});

// POST /api/superuser/users/:id/reset-password - Reset user password
router.post('/users/:id/reset-password', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { temporaryPassword } = req.body;

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate temporary password if not provided
    const tempPass = temporaryPassword || Math.random().toString(36).slice(2, 12);
    const hashedPassword = await import('bcrypt').then(b => b.hash(tempPass, 10));

    const [updatedUser] = await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, id))
      .returning();

    // Log audit
    await db.insert(auditLogs).values({
      actorId: req.user?.id || null,
      action: 'reset_password',
      targetType: 'user',
      targetId: id,
      metadata: { timestamp: new Date().toISOString() },
    } as any).catch(() => {});

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

// POST /api/superuser/users/invite - Invite new user
router.post('/users/invite', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const { email, role, expiresInHours = 72 } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }

    if (!role || !['user', 'admin', 'superuser'].includes(role)) {
      return res.status(400).json({ error: 'Valid role required' });
    }

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Generate invite token
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + 
                  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);

    // Check if userInvites table exists
    const { userInvites } = await import('../shared/schema');
    
    const [invite] = await db.insert(userInvites).values({
      email,
      token,
      role: role as any,
      invitedBy: req.user?.id || null,
      expiresAt,
    } as any).returning();

    // Log audit
    await db.insert(auditLogs).values({
      actorId: req.user?.id || null,
      action: 'create_invite',
      targetType: 'invite',
      targetId: invite.id,
      metadata: { email, role, expiresAt },
    } as any).catch(() => {});

    res.status(201).json({
      id: invite.id,
      email,
      role,
      token,
      expiresAt,
      inviteUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/register?token=${token}`,
      message: 'Invitation created successfully. Share the invite URL with the user.',
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to create invite' });
  }
});

// DELETE /api/superuser/users/:id - Delete user
router.delete('/users/:id', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent deleting the superuser account
    if (user.role === 'superuser') {
      return res.status(403).json({ error: 'Cannot delete superuser account' });
    }

    await db.delete(users).where(eq(users.id, id));

    // Log audit
    await db.insert(auditLogs).values({
      actorId: req.user?.id || null,
      action: 'delete_user',
      targetType: 'user',
      targetId: id,
      metadata: { username: user.username, email: user.email },
    } as any).catch(() => {});

    res.status(204).send();
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/superuser/users/search - Search users
router.get('/users/search', requireAuth, requireSuperuser, async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string || '').toLowerCase();

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const allUsers = await db.select().from(users);
    const results = allUsers.filter((u: any) =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );

    res.json({
      query: q,
      results: results.map((u: any) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        isActive: !(u as any).deactivatedAt,
      })),
      total: results.length,
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/superuser/statistics - Get platform-wide usage statistics
router.get('/statistics', requireAuth, requireSuperuser, async (_req: AuthRequest, res: Response) => {
  try {
    const allOrganizations = await db.select().from(organizations);
    const allUsers = await db.select().from(users);
    const allSurveys = await db.select().from(surveys);
    const allResponses = await db.select().from(responses);
    
    // Create a Map for O(1) survey-to-org lookup instead of O(n) filtering
    const userOrgMap = new Map<string, string | null>(allUsers.map((u: any) => [u.id, u.organizationId || null]));
    const surveyOrgMap = new Map<string, string | null>(allSurveys.map((s: any) => [s.id, s.createdBy ? (userOrgMap.get(s.createdBy) || null) : null]));
    
    // Calculate statistics by organization type
    const planStats = {
      starter: { count: 0, users: 0, surveys: 0, responses: 0, revenue: 0 },
      professional: { count: 0, users: 0, surveys: 0, responses: 0, revenue: 0 },
      enterprise: { count: 0, users: 0, surveys: 0, responses: 0, revenue: 0 },
    };
    
    allOrganizations.forEach(org => {
      const plan = org.plan || 'starter';
      // Type-safe plan assignment with guard
      if (!['starter', 'professional', 'enterprise'].includes(plan)) {
        return; // Skip invalid plans
      }
      
      const planKey = plan as keyof typeof planStats;
      planStats[planKey].count += 1;
      planStats[planKey].revenue += 0; // mrr not tracked
      
      // Efficient filtering using Map and pre-filtered arrays
      const orgUsers = allUsers.filter((u: any) => u.organizationId === org.id).length;
      const orgSurveys = allSurveys.filter((s: any) => (surveyOrgMap.get(s.id) === org.id)).length;
      const orgResponses = allResponses.filter((r: any) => (surveyOrgMap.get(r.surveyId || '') === org.id)).length;
      
      planStats[planKey].users += orgUsers;
      planStats[planKey].surveys += orgSurveys;
      planStats[planKey].responses += orgResponses;
    });
    
    // Calculate survey performance stats
    const surveyStats = {
      total: allSurveys.length,
      active: allSurveys.filter((s: any) => s.isActive).length,
      avgResponseRate: 0,
      totalResponses: allResponses.length,
    };
    
    if (allSurveys.length > 0) {
      surveyStats.avgResponseRate = (allResponses.length / allSurveys.length);
    }
    
    // Calculate user stats
    const userStats = {
      total: allUsers.length,
      byRole: {
        admin: allUsers.filter(u => u.role === 'admin').length,
        user: allUsers.filter(u => u.role === 'user').length,
        superuser: allUsers.filter(u => u.role === 'superuser').length,
      },
      active: allUsers.filter(u => u.isActive).length,
    };
    
    // Calculate engagement stats
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const engagementStats = {
      responsesLast30Days: allResponses.filter(r => {
        const createdDate = new Date((r as any).submittedAt || new Date());
        return createdDate >= thirtyDaysAgo;
      }).length,
      surveysCreatedLast30Days: allSurveys.filter(s => {
        const createdDate = new Date(s.createdAt || new Date());
        return createdDate >= thirtyDaysAgo;
      }).length,
      organizationsAddedLast30Days: allOrganizations.filter(org => {
        const createdDate = new Date(org.createdAt || new Date());
        return createdDate >= thirtyDaysAgo;
      }).length,
    };
    
    res.json({
      planStats,
      surveyStats,
      userStats,
      engagementStats,
      timestamp: new Date(),
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;
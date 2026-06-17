import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.ts";
import { registerVoiceRoutes } from "./routes/voiceRoutes";
import whatsappRoutes from "./routes/whatsappRoutes";
import crmIntegrationRoutes from "./routes/crmIntegrationRoutes";
import emailSurveyRoutes from "./routes/emailSurveyRoutes";
import anonymousFeedbackRoutes from "./routes/anonymousFeedbackRoutes";
import superuserRoutes from "./routes/superuserRoutes";
import adminRoutes from "./routes/adminRoutes";
import rbacRoutes from "./routes/rbacRoutes";
import departmentRoutes from "./routes/departmentRoutes";
import auditAndImportRoutes from "./routes/auditAndImportRoutes";
import passwordResetRoutes from "./routes/passwordResetRoutes";
import organizationRoutes from "./routes/organizationRoutes";
import subscriptionRoutes from "./routes/subscriptionRoutes";
import sessionRoutes from "./routes/sessionRoutes";
import advancedPermissionsRoutes from "./routes/advancedPermissionsRoutes";
import dataTransferRoutes from "./routes/dataTransferRoutes";
import onboardingRoutes from "./routes/onboardingRoutes";
import analyticsDataRoutes from "./routes/analyticsDataRoutes";
import surveyAnalyticsRoutes from "./routes/surveyAnalyticsRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import assessmentPeriodRoutes from "./routes/assessmentPeriodRoutes";
import teamInsightsRoutes from "./routes/teamInsightsRoutes";
import eviRoutes from "./routes/eviRoutes";
import { getStorageInfo } from "./storageFactory";
import { serveStatic } from "./static";
import { db } from "./db";
import { users, organizations, roles, permissions, rolePermissions, userRoles } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { seedAnalyticsData, seedSampleAnalytics } from "./services/analyticsSeeder";
import { surveyScheduler } from "./services/surveySchedulerService";

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Ensure demo users and surveys exist
async function ensureDemoData() {
  try {
    // Check if superuser exists
    const [existingSuperuser] = await db.select().from(users).where(eq(users.username, 'superuser'));
    if (!existingSuperuser) {
      await db.insert(users).values({
        username: 'superuser',
        password: 'super123',
        email: 'superuser@feedbackpro.com',
        role: 'superuser'
      });
      log('Created superuser account');
    }

    // Check if admin user exists
    const [existingAdmin] = await db.select().from(users).where(eq(users.username, 'admin'));
    let adminUser = existingAdmin;

    if (!existingAdmin) {
      const [newAdmin] = await db.insert(users).values({
        username: 'admin',
        password: 'admin123',
        email: 'admin@feedbackpro.com',
        role: 'admin'
      }).returning();
      adminUser = newAdmin;
      log('Created admin user');
    }

    // Check if demo user exists
    const [existingDemo] = await db.select().from(users).where(eq(users.username, 'demo'));
    if (!existingDemo) {
      await db.insert(users).values({
        username: 'demo',
        password: 'demo123',
        email: 'demo@feedbackpro.com',
        role: 'user'
      });
      log('Created demo user');
    }

    // Check if culture admin demo user exists
    const [existingCultureAdmin] = await db.select().from(users).where(eq(users.username, 'culture_admin'));
    let cultureAdminUser = existingCultureAdmin;
    if (!existingCultureAdmin) {
      // Get the demo organization
      const [demoOrg] = await db.select().from(organizations).where(eq(organizations.name, 'Demo Organization')).limit(1);

      const [newUser] = await db.insert(users).values({
        username: 'culture_admin',
        password: 'culture123',
        email: 'culture@feedbackpro.com',
        role: 'culture_admin',
        organizationId: demoOrg?.id || null
      }).returning();
      cultureAdminUser = newUser;
      log('Created culture_admin demo user');
    }

    // Check if Culture Admin role exists in roles table
    const [existingCultureRole] = await db.select().from(roles).where(eq(roles.name, 'Culture Admin'));
    let cultureRole = existingCultureRole;
    if (!existingCultureRole) {
      const [newRole] = await db.insert(roles).values({
        name: 'Culture Admin',
        description: 'Administrative access for cultural assessments and analytics',
        isBuiltIn: false,
      }).returning();
      cultureRole = newRole;
      log('Created Culture Admin built-in role');
    }

    // Link culture_admin user to Culture Admin role if not linked
    if (cultureAdminUser && cultureRole) {
      const [existingUserRole] = await db.select().from(userRoles).where(
        and(
          eq(userRoles.userId, cultureAdminUser.id),
          eq(userRoles.roleId, cultureRole.id)
        )
      );
      if (!existingUserRole) {
        await db.insert(userRoles).values({
          userId: cultureAdminUser.id,
          roleId: cultureRole.id
        });
        log('Linked culture_admin user to Culture Admin role');
      }
    }

    const [existingAdminRole] = await db.select().from(roles).where(eq(roles.name, 'Admin'));
    if (!existingAdminRole) {
      await db.insert(roles).values({
        name: 'Admin',
        description: 'Full administrative access',
        isBuiltIn: true,
      });
      log('Created Admin built-in role');
    }

    const [existingSuperRole] = await db.select().from(roles).where(eq(roles.name, 'Superuser'));
    if (!existingSuperRole) {
      await db.insert(roles).values({
        name: 'Superuser',
        description: 'System-wide administrative access',
        isBuiltIn: true,
      });
      log('Created Superuser built-in role');
    }

    // Seed administrative permissions
    const adminPermissions = [
      { code: 'admin.dashboard.view', name: 'View Admin Dashboard', category: 'admin', description: 'Access to the main admin dashboard' },
      { code: 'admin.users.manage', name: 'Manage Users', category: 'admin', description: 'Create, edit, and delete users' },
      { code: 'admin.departments.manage', name: 'Manage Departments', category: 'admin', description: 'Manage organization departments' },
      { code: 'admin.rbac.manage', name: 'Manage RBAC', category: 'admin', description: 'Manage roles and permissions' },
      { code: 'admin.audit.view', name: 'View Audit Logs', category: 'admin', description: 'View system audit and activity logs' },
      { code: 'admin.assessment_periods.manage', name: 'Manage Assessment Periods', category: 'admin', description: 'Setup and manage assessment periods' },
      { code: 'admin.data_transfer.manage', name: 'Manage Data Transfers', category: 'admin', description: 'Import and export system data' }
    ];

    for (const permData of adminPermissions) {
      const [existingPerm] = await db.select().from(permissions).where(eq(permissions.code, permData.code));
      if (!existingPerm) {
        await db.insert(permissions).values(permData);
        log(`Created permission: ${permData.code}`);
      }
    }

    // Link Culture Admin role to relevant permissions
    if (existingCultureRole || !existingCultureRole) {
      const [targetRole] = await db.select().from(roles).where(eq(roles.name, 'Culture Admin'));
      if (targetRole) {
        const allPerms = await db.select().from(permissions).where(sql`${permissions.code} LIKE 'admin.%'`);
        for (const perm of allPerms) {
          const [existingLink] = await db.select().from(rolePermissions).where(
            and(
              eq(rolePermissions.roleId, targetRole.id),
              eq(rolePermissions.permissionId, perm.id)
            )
          );
          if (!existingLink) {
            await db.insert(rolePermissions).values({
              roleId: targetRole.id,
              permissionId: perm.id
            });
          }
        }
        log('Linked administrative permissions to Culture Admin role');
      }
    }

    // Ensure at least one survey exists for quick feedback
    const { surveys } = await import("@shared/schema");
    const [existingSurvey] = await db.select().from(surveys).limit(1);

    if (!existingSurvey && adminUser) {
      await db.insert(surveys).values({
        title: 'Quick Feedback Survey',
        description: 'Share your thoughts and help us improve',
        questions: [
          {
            id: 'evi',
            type: 'evi-slider',
            title: 'How did our website make you feel?',
            required: true,
            minValue: 0,
            maxValue: 100
          },
          {
            id: 'nps',
            type: 'nps',
            title: 'How likely are you to recommend us to a friend?',
            required: true,
            minValue: 0,
            maxValue: 10
          },
          {
            id: 'feedback',
            type: 'text',
            title: 'Any additional comments?',
            required: false
          }
        ],
        isActive: true,
        createdBy: adminUser.id
      });
      log('Created default survey for quick feedback');
    }
  } catch (error) {
    console.error('[ensureDemoData] failed:', error);
  }
}

(async () => {
  // Ensure demo users and surveys exist before starting server
  if ((process.env.CASPIO_ENABLED || "false").toLowerCase() !== "true") {
    await ensureDemoData();

    // Seed analytics data if not already seeded
    try {
      await seedAnalyticsData();
      await seedSampleAnalytics();
    } catch (error) {
      console.error('[seedAnalytics] failed:', error);
    }
  }

  // Create HTTP server first so Vite can attach for HMR/catch-all
  const httpServer = createServer(app);

  // Register API routes FIRST before Vite middleware
  const server = await registerRoutes(app, httpServer);
  
  // Setup Vite/static AFTER API routes so API requests are handled before catch-all
  if (app.get("env") === "development") {
    const devEntry = "./viteDev.js"; // keep dynamic to avoid bundling in prod
    const { setupVite } = await import(devEntry);
    await setupVite(app, httpServer);
  } else {
    serveStatic(app);
  }

  // Register VAPI voice survey routes
  registerVoiceRoutes(app);
  log('Registered VAPI voice survey routes');

  // Register Meta WhatsApp Cloud API routes
  app.use(whatsappRoutes);
  log('Registered Meta WhatsApp routes');

  // Register Email Survey routes
  app.use(emailSurveyRoutes);
  log('Registered Email Survey routes');

  // Register Anonymous Feedback routes (send-by-tag + zero-identity submission)
  app.use(anonymousFeedbackRoutes);
  log('Registered Anonymous Feedback routes');

  // Register CRM Integration routes
  app.use("/api", crmIntegrationRoutes);
  log('Registered CRM Integration routes');

  // Register Superuser routes
  app.use("/api/superuser", superuserRoutes);
  log('Registered Superuser routes');

  // Register Admin routes
  app.use("/api/admin", adminRoutes);
  log('Registered Admin routes');

  // Register RBAC routes (UM-019 to UM-024)
  app.use("/api/rbac", rbacRoutes);
  log('Registered RBAC routes');

  // Register Department routes (UM-025 to UM-029)
  app.use("/api/departments", departmentRoutes);
  log('Registered Department routes');

  // Register Audit and Import routes (UM-030 to UM-034)
  app.use("/api/admin", auditAndImportRoutes);
  log('Registered Audit and Import routes');

  // Register Password Reset routes (UM-022)
  app.use("/api/auth", passwordResetRoutes);
  log('Registered Password Reset routes');

  // Register Organization routes
  app.use(organizationRoutes);
  log('Registered Organization routes');

  // Register Session Management routes (UM-035 to UM-038)
  app.use(sessionRoutes);
  log('Registered Session Management routes');

  // Register Advanced Permissions routes (UM-039 to UM-043)
  app.use(advancedPermissionsRoutes);
  log('Registered Advanced Permissions routes');

  // Register Data Transfer routes (UM-048 to UM-050)
  app.use(dataTransferRoutes);
  log('Registered Data Transfer routes');

  // Register Onboarding routes (UM-051 to UM-053)
  app.use(onboardingRoutes);
  log('Registered Onboarding routes');

  // Register Subscription routes
  app.use(subscriptionRoutes);
  log('Registered Subscription routes');

  // Register Analytics Data routes (AN-033 to AN-043)
  app.use("/api/analytics", analyticsDataRoutes);
  app.use("/api/analytics", surveyAnalyticsRoutes);
  log('Registered Analytics Data routes');

  // Register Dashboard Analysis routes (AI-powered insights)
  app.use("/api/dashboard", dashboardRoutes);
  log('Registered Dashboard Analysis routes');

  // Register Assessment Periods routes
  app.use("/api/admin/assessment-periods", assessmentPeriodRoutes);
  log('Registered Assessment Periods routes');

  // Register Team Insights routes
  app.use("/api/team-insights", teamInsightsRoutes);
  log('Registered Team Insights routes');

  // Register EVI Assessment routes
  app.use("/api/evi", eviRoutes);
  log('Registered EVI Assessment routes');

  // Start the survey scheduler service
  surveyScheduler.start();

  try {
    const info = getStorageInfo();
    if (info.mode === 'caspio') {
      log(`storage: caspio baseUrl=${info.caspio?.baseUrl} tables=${JSON.stringify(info.caspio?.tables)}`);
    } else {
      log(`storage: local database`);
    }
  } catch { }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5001 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5001', 10);
  // On Windows, reusePort is not supported and throws ENOTSUP
  const listenOptions: any = {
    port,
    host: "0.0.0.0",
  };
  // Only enable reusePort on Linux where it is commonly supported. macOS and some
  // Node builds can throw ENOTSUP when setting SO_REUSEPORT, so avoid it there.
  if (process.platform === 'linux') {
    listenOptions.reusePort = true;
  }

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();

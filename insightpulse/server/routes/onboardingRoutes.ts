import { Router, type Request, Response } from 'express';
import { db } from '../db';
import { onboardingProgress, users as usersTable } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

// Get onboarding checklist for user
router.get('/api/onboarding/checklist', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.organizationId;

    const progress = await db
      .select()
      .from(onboardingProgress)
      .where(and(eq(onboardingProgress.userId, userId), eq(onboardingProgress.organizationId, orgId)));

    // Define all onboarding steps
    const allSteps = [
      // Welcome
      { id: 'step-1', title: 'Welcome to InsightPulse', description: 'Get started with our platform overview', category: 'welcome', duration: 2, type: 'video' },
      { id: 'step-2', title: 'Account Setup', description: 'Complete your account profile', category: 'welcome', duration: 3, type: 'guide' },
      // Setup
      { id: 'step-3', title: 'Create Your First Survey', description: 'Follow our guided wizard to create a survey', category: 'setup', duration: 5, type: 'interactive' },
      { id: 'step-4', title: 'Invite Team Members', description: 'Add users to your organization', category: 'setup', duration: 3, type: 'guide' },
      { id: 'step-5', title: 'Configure Settings', description: 'Set up your organization preferences', category: 'setup', duration: 4, type: 'guide' },
      // Features
      { id: 'step-6', title: 'Survey Distribution', description: 'Learn how to share and distribute surveys', category: 'features', duration: 4, type: 'video' },
      { id: 'step-7', title: 'Analytics Dashboard', description: 'Understand your survey analytics', category: 'features', duration: 3, type: 'video' },
      { id: 'step-8', title: 'Reporting Tools', description: 'Generate and customize reports', category: 'features', duration: 4, type: 'interactive' },
      // Learning
      { id: 'step-9', title: 'Best Practices', description: 'Learn survey design best practices', category: 'learning', duration: 5, type: 'guide' },
      { id: 'step-10', title: 'API Integration', description: 'Integrate InsightPulse with your tools', category: 'learning', duration: 6, type: 'guide' },
      { id: 'step-11', title: 'Advanced Features', description: 'Explore advanced survey options', category: 'learning', duration: 5, type: 'video' },
      { id: 'step-12', title: 'Support & Resources', description: 'Find additional resources and support', category: 'learning', duration: 2, type: 'guide' },
    ];

    // Merge with progress data
    const stepsWithProgress = allSteps.map(step => {
      const progressRecord = progress.find(p => p.stepId === step.id);
      return {
        ...step,
        isCompleted: progressRecord?.isCompleted || false,
        isSkipped: progressRecord?.isSkipped || false,
      };
    });

    const completedCount = stepsWithProgress.filter(s => s.isCompleted).length;

    res.json({
      userId,
      totalSteps: stepsWithProgress.length,
      completedSteps: completedCount,
      steps: stepsWithProgress,
      startedAt: progress[0]?.createdAt || new Date().toISOString(),
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to fetch checklist' });
  }
});

// Mark step as complete
router.post('/api/onboarding/steps/:stepId/complete', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { stepId } = req.params;
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.organizationId;

    const records = await db
      .insert(onboardingProgress)
      .values({
        userId,
        organizationId: orgId,
        stepId,
        isCompleted: true,
        completedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [onboardingProgress.userId, onboardingProgress.stepId],
        set: {
          isCompleted: true,
          completedAt: new Date(),
        }
      })
      .returning();

    res.json({ 
      message: 'Step marked as complete',
      stepId,
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to complete step' });
  }
});

// Skip step
router.post('/api/onboarding/steps/:stepId/skip', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { stepId } = req.params;
    const userId = (req as any).user?.id;
    const orgId = (req as any).user?.organizationId;

    const [record] = await db
      .insert(onboardingProgress)
      .values({
        userId,
        organizationId: orgId,
        stepId,
        isSkipped: true,
        skippedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [onboardingProgress.userId, onboardingProgress.stepId],
        set: {
          isSkipped: true,
          skippedAt: new Date(),
          updatedAt: new Date(),
        }
      })
      .returning();

    res.json({ 
      message: 'Step skipped',
      stepId,
      skippedAt: new Date().toISOString()
    });
  } catch (error) {
    
    console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to skip step' });
  }
});

export default router;

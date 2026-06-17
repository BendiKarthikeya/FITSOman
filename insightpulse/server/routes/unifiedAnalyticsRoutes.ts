import { Router } from "express";
import { unifiedAnalyticsService } from "../services/unifiedAnalyticsService";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/unified-analytics/metrics
 * Returns aggregated metrics from all surveys with deduplication
 * Filtered to only show metrics for surveys created by authenticated user
 * 
 * Query params:
 *   - dateRange: '7d' (default: '30d'), '90d', '1y'
 */
router.get("/metrics", async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const dateRange = (req.query.dateRange as string) || '30d';
    const surveyId = req.query.surveyId as string | undefined;
    const startDateStr = req.query.startDate as string | undefined;
    const endDateStr = req.query.endDate as string | undefined;
    const metrics = await unifiedAnalyticsService.getUnifiedMetrics(userId, dateRange, surveyId, startDateStr, endDateStr);
    res.json(metrics);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({
      error: "Failed to fetch unified analytics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;

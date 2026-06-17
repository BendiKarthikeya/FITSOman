import { Router, Request, Response } from "express";
import { AdvancedAnalyticsService } from "../services/advancedAnalyticsService";
import { ExecutiveSummaryService } from "../services/executiveSummaryService";
import { ActionPlanningService } from "../services/actionPlanningService";
import { LeadershipEnablementService } from "../services/leadershipEnablementService";
import { MonitoringService } from "../services/monitoringService";
import { sql } from "drizzle-orm";

const router = Router();

// ==========================================
// TREND ANALYSIS & SENTIMENT
// ==========================================

/**
 * POST /api/advanced-analytics/trends
 * Detect trends for a metric over time
 */
router.post("/trends", async (req: Request, res: Response) => {
  try {
    const { surveyId, metricType, periodType, periodStart, periodEnd, segmentType, segmentValue } = req.body;

    const trends = await AdvancedAnalyticsService.detectTrends({
      surveyId,
      metricType,
      periodType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      segmentType,
      segmentValue
    });

    res.json({ success: true, trends });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/trends/history
 * Get trend history for multiple periods
 */
router.post("/trends/history", async (req: Request, res: Response) => {
  try {
    const { surveyId, metricType, periodsBack, periodType, segmentType, segmentValue } = req.body;

    const history = await AdvancedAnalyticsService.getTrendHistory({
      surveyId,
      metricType,
      periodsBack,
      periodType,
      segmentType,
      segmentValue
    });

    res.json({ success: true, history });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/sentiment/analyze
 * Analyze sentiment shifts over time
 */
router.post("/sentiment/analyze", async (req: Request, res: Response) => {
  try {
    const { surveyId, periodStart, periodEnd, segmentType, segmentValue } = req.body;

    const analysis = await AdvancedAnalyticsService.analyzeSentimentShifts({
      surveyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      segmentType,
      segmentValue
    });

    res.json({ success: true, analysis });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/engagement-drivers
 * Identify key engagement drivers
 */
router.post("/engagement-drivers", async (req: Request, res: Response) => {
  try {
    const { surveyId, periodStart, periodEnd, segmentType, segmentValue } = req.body;

    const drivers = await AdvancedAnalyticsService.identifyEngagementDrivers({
      surveyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      segmentType,
      segmentValue
    });

    res.json({ success: true, drivers });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/segmented
 * Get segmented analytics data
 */
router.post("/segmented", async (req: Request, res: Response) => {
  try {
    const { surveyId, periodStart, periodEnd, segmentBy } = req.body;

    const data = await AdvancedAnalyticsService.getSegmentedAnalytics({
      surveyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      segmentBy
    });

    res.json({ success: true, data });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// EXECUTIVE SUMMARIES
// ==========================================

/**
 * POST /api/advanced-analytics/executive-summary
 * Generate executive summary
 */
router.post("/executive-summary", async (req: Request, res: Response) => {
  try {
    const { surveyId, periodStart, periodEnd, generatedFor, segmentValue } = req.body;
    const userId = (req as any).user?.id;

    const summary = await ExecutiveSummaryService.generateExecutiveSummary({
      surveyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      generatedFor,
      segmentValue
    });

    res.json({ success: true, summary });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/executive-summary/:id
 * Get existing executive summary
 */
router.get("/executive-summary/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const summary = await ExecutiveSummaryService.getExecutiveSummary(id);

    if (!summary) {
      return res.status(404).json({ success: false, error: "Summary not found" });
    }

    res.json({ success: true, summary });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// ACTION PLANNING
// ==========================================

/**
 * POST /api/advanced-analytics/action-plan
 * Generate action plan
 */
router.post("/action-plan", async (req: Request, res: Response) => {
  try {
    const { surveyId, executiveSummaryId, improvementArea, targetSegment } = req.body;
    const userId = (req as any).user?.id;

    const actionPlan = await ActionPlanningService.generateActionPlan({
      surveyId,
      executiveSummaryId,
      improvementArea,
      targetSegment,
      createdBy: userId
    });

    res.json({ success: true, actionPlan });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/action-plans/:surveyId
 * Get all action plans for a survey
 */
router.get("/action-plans/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const plans = await ActionPlanningService.getActionPlans(surveyId);

    res.json({ success: true, plans });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/advanced-analytics/action-plan/:id
 * Update action plan progress
 */
router.patch("/action-plan/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await ActionPlanningService.updateActionPlanProgress(id, updates);

    res.json({ success: true });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// LEADERSHIP INSIGHTS
// ==========================================

/**
 * POST /api/advanced-analytics/leadership-insights
 * Generate leadership insights
 */
router.post("/leadership-insights", async (req: Request, res: Response) => {
  try {
    const { leaderId, surveyId, periodStart, periodEnd, teamType } = req.body;

    const insights = await LeadershipEnablementService.generateLeadershipInsights({
      leaderId,
      surveyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      teamType
    });

    res.json({ success: true, insights });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/enablement-resources
 * Get enablement resources
 */
router.get("/enablement-resources", async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const resources = await LeadershipEnablementService.getEnablementResources(type as string);

    res.json({ success: true, resources });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/enablement-resources
 * Create enablement resource
 */
router.post("/enablement-resources", async (req: Request, res: Response) => {
  try {
    const resource = req.body;
    const created = await LeadershipEnablementService.createEnablementResource(resource);

    res.json({ success: true, resource: created });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// MONITORING & ALERTS
// ==========================================

/**
 * POST /api/advanced-analytics/monitor
 * Monitor and detect early warnings
 */
router.post("/monitor", async (req: Request, res: Response) => {
  try {
    const { surveyId, periodStart, periodEnd, segmentType, segmentValue } = req.body;

    const alerts = await MonitoringService.monitorEarlyWarnings({
      surveyId,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      segmentType,
      segmentValue
    });

    res.json({ success: true, alerts });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/alerts
 * Get active alerts
 */
router.get("/alerts", async (req: Request, res: Response) => {
  try {
    const { surveyId, severity, alertType } = req.query;

    const alerts = await MonitoringService.getActiveAlerts({
      surveyId: surveyId as string,
      severity: severity as string,
      alertType: alertType as string
    });

    res.json({ success: true, alerts });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.post("/alerts/:id/acknowledge", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    await MonitoringService.acknowledgeAlert(id, userId);

    res.json({ success: true });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/alerts/:id/resolve
 * Resolve an alert
 */
router.post("/alerts/:id/resolve", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { actionTaken } = req.body;

    await MonitoringService.resolveAlert(id, actionTaken);

    res.json({ success: true });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/advanced-analytics/reports/generate
 * Generate periodic report
 */
router.post("/reports/generate", async (req: Request, res: Response) => {
  try {
    const { reportName, reportType, periodStart, periodEnd, includedSurveys, recipients } = req.body;
    const userId = (req as any).user?.id;

    const report = await MonitoringService.generatePeriodicReport({
      reportName,
      reportType,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      includedSurveys,
      recipients,
      createdBy: userId
    });

    res.json({ success: true, report });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// GET ENDPOINTS FOR DUMMY DATA
// ==========================================

/**
 * GET /api/advanced-analytics/trends/:surveyId
 * Fetch existing trend data from database
 */
router.get("/trends/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { db } = await import("./db");
    
    const result = await db.execute(sql`
      SELECT * FROM analytics_trends 
      WHERE survey_id = ${surveyId}
      ORDER BY period_end DESC 
      LIMIT 100
    `);
    
    res.json({ success: true, trends: result.rows || [] });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/sentiment/:surveyId
 * Fetch existing sentiment analysis data
 */
router.get("/sentiment/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { db } = await import("./db");
    
    const result = await db.execute(sql`
      SELECT * FROM sentiment_analysis 
      WHERE survey_id = ${surveyId}
      ORDER BY analysis_date DESC 
      LIMIT 100
    `);
    
    res.json({ success: true, analysis: result.rows || [] });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/monitoring-alerts/:surveyId
 * Fetch existing monitoring alerts
 */
router.get("/monitoring-alerts/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { db } = await import("./db");
    
    const result = await db.execute(sql`
      SELECT * FROM monitoring_alerts 
      WHERE survey_id = ${surveyId}
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    res.json({ success: true, alerts: result.rows || [] });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/executive-summaries/:surveyId
 * Fetch existing executive summaries
 */
router.get("/executive-summaries/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { db } = await import("./db");
    
    const result = await db.execute(sql`
      SELECT * FROM executive_summaries 
      WHERE survey_id = ${surveyId}
      ORDER BY period_end DESC 
      LIMIT 100
    `);
    
    res.json({ success: true, summaries: result.rows || [] });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/leadership-insights/:surveyId
 * Fetch existing leadership insights
 */
router.get("/leadership-insights/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { db } = await import("./db");
    
    const result = await db.execute(sql`
      SELECT * FROM leadership_insights 
      WHERE survey_id = ${surveyId}
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    res.json({ success: true, insights: result.rows || [] });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/advanced-analytics/enablement-resources/:surveyId
 * Fetch existing enablement resources by survey
 */
router.get("/enablement-resources/:surveyId", async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    const { db } = await import("./db");
    
    const result = await db.execute(sql`
      SELECT * FROM team_enablement_resources 
      WHERE survey_id = ${surveyId}
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    
    res.json({ success: true, resources: result.rows || [] });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

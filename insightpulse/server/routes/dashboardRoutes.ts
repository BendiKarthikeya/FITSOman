/**
 * Dashboard Analysis Routes
 * Endpoints to fetch analyzed data for all 6 dashboard tabs
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import {
  trendsAnalysis,
  executiveSummary,
  actionPlans,
  leadershipInsights,
  monitoringMetrics,
  segmentationAnalysis,
  surveys,
} from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/dashboard/trends/:surveyId
 * Get trends analysis data
 */
router.get('/trends/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    

    const data = await db.execute(sql`
      SELECT * 
      FROM trends_analysis 
      WHERE survey_id = ${surveyId}
    `);

    

    if (data.rows.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
      });
    }

    res.json({
      success: true,
      data: data.rows,
      count: data.rows.length,
    });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/dashboard/executive-summary/:surveyId
 * Get executive summary data
 */
router.get('/executive-summary/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    

    const data = await db.execute(sql`
      SELECT * 
      FROM executive_summary 
      WHERE survey_id = ${surveyId}
    `);

    

    if (data.rows.length === 0) {
      return res.json({
        success: true,
        data: null,
        count: 0,
      });
    }

    res.json({
      success: true,
      data: data.rows[0],
      count: 1,
    });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/dashboard/action-plans/:surveyId
 * Get action plans data
 */
router.get('/action-plans/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;

    // Use raw SQL since Drizzle schema doesn't match actual DB schema
    const data = await db.execute(sql`
      SELECT * FROM action_plans 
      WHERE survey_id = ${surveyId}
        AND (category IS NULL OR category <> 'system')
      ORDER BY created_at DESC
    `);

    if (data.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No action plans available.',
        data: []
      });
    }

    res.json({
      success: true,
      data: data.rows,
      count: data.rows.length,
    });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/dashboard/leadership-insights/:surveyId
 * Get leadership insights data
 */
router.get('/leadership-insights/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    

    // Use raw SQL since Drizzle schema doesn't match actual DB schema
    const data = await db.execute(sql`
      SELECT * FROM leadership_insights 
      WHERE survey_id = ${surveyId}
        AND insight <> '__processed__'
      ORDER BY created_at DESC
    `);

    

    res.json({
      success: true,
      data: data.rows,
      count: data.rows.length,
    });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/dashboard/monitoring-metrics/:surveyId
 * Get monitoring metrics data
 */
router.get('/monitoring-metrics/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    

    const data = await db.execute(sql`
      SELECT * 
      FROM monitoring_metrics 
      WHERE survey_id = ${surveyId}
      ORDER BY created_at DESC
    `);

    

    res.json({
      success: true,
      data: data.rows,
      count: data.rows.length,
    });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/dashboard/segmentation/:surveyId
 * Get segmentation analysis data
 */
router.get('/segmentation/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;
    

    const data = await db.execute(sql`
      SELECT * 
      FROM segmentation_analysis 
      WHERE survey_id = ${surveyId}
      ORDER BY created_at DESC
    `);

    

    res.json({
      success: true,
      data: data.rows,
      count: data.rows.length,
    });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/dashboard/all/:surveyId
 * Get all dashboard data at once
 */
router.get('/all/:surveyId', async (req: Request, res: Response) => {
  try {
    const { surveyId } = req.params;

    // Fetch all data in parallel
    const [survey, trends, summary, plans, insights, metrics, segments] = await Promise.all([
      db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1),
      db.select().from(trendsAnalysis).where(eq(trendsAnalysis.surveyId, surveyId)),
      db.select().from(executiveSummary).where(eq(executiveSummary.surveyId, surveyId)).limit(1),
      db.select().from(actionPlans).where(eq(actionPlans.surveyId, surveyId)),
      db.select().from(leadershipInsights).where(eq(leadershipInsights.surveyId, surveyId)),
      db.select().from(monitoringMetrics).where(eq(monitoringMetrics.surveyId, surveyId)),
      db.select().from(segmentationAnalysis).where(eq(segmentationAnalysis.surveyId, surveyId)),
    ]);

    const hasData =
      trends.length > 0 ||
      summary.length > 0 ||
      plans.length > 0 ||
      insights.length > 0 ||
      metrics.length > 0 ||
      segments.length > 0;

    if (!hasData) {
      return res.status(404).json({
        success: false,
        message: 'No dashboard data available. Run a survey call first.',
        survey: survey[0],
      });
    }

    res.json({
      success: true,
      survey: survey[0],
      data: {
        trends: trends,
        executiveSummary: summary[0],
        actionPlans: plans,
        leadershipInsights: insights,
        monitoringMetrics: metrics,
        segmentation: segments,
      },
      lastUpdated: new Date(),
    });
  } catch (error: any) {
    
    console.error('Server error:', res.status); res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

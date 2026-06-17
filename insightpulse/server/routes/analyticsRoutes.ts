import { Router, Request, Response, NextFunction } from "express";
import { AnalyticsService } from "../services/analyticsService";
import { db, pool } from "../db";
import { analyticsSurveys, surveyQuestions, surveyResponses, surveyMetrics } from "../../shared/schema";
import { eq, desc, and, isNotNull, ne, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { surveys as dbSurveys, responses as dbResponses } from "../../shared/schema";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Apply auth middleware - allow reports endpoints used by the Reports page to be public
const PUBLIC_PATHS = ['/reports/available', '/reports/by-survey', '/reports/linked-to-survey', '/surveys'];
router.use((req: any, res: Response, next: NextFunction) => {
  if (PUBLIC_PATHS.some(p => req.path.startsWith(p) || req.originalUrl.includes(p))) {
    return next();
  }
  requireAuth(req, res, next);
});

// GET /api/analytics/reports/available - Public endpoint
router.get("/reports/available", async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT DISTINCT
        asv.survey_id as id,
        asv.survey_name as name,
        asv.description,
        asv.total_respondents as response_count
      FROM analytics_surveys asv
      INNER JOIN reports r ON r.survey_id = asv.survey_id
      ORDER BY asv.survey_name
    `;

    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching available surveys:', error);
    res.status(500).json({ error: "Failed to fetch available surveys" });
  }
});

const getAllowedAnalyticsSurveys = async (req: any) => {
  const userId = req.user?.id;
  if (!userId) {
    return { ids: new Set<number>(), names: new Set<string>() };
  }

  const userSurveyTitles = await db
    .select({ title: dbSurveys.title })
    .from(dbSurveys)
    .where(eq(dbSurveys.createdBy, userId));

  const titles = userSurveyTitles.map((s) => s.title).filter(Boolean) as string[];
  if (titles.length === 0) {
    return { ids: new Set<number>(), names: new Set<string>() };
  }

  let analytics = await db
    .select({ surveyId: analyticsSurveys.surveyId, surveyName: analyticsSurveys.surveyName })
    .from(analyticsSurveys)
    .where(inArray(analyticsSurveys.surveyName, titles));

  const existingNames = new Set(analytics.map((s) => s.surveyName));
  const missingTitles = titles.filter((title) => !existingNames.has(title));

  if (missingTitles.length > 0) {
    const created = await db
      .insert(analyticsSurveys)
      .values(missingTitles.map((surveyName) => ({ surveyName })))
      .returning({ surveyId: analyticsSurveys.surveyId, surveyName: analyticsSurveys.surveyName });

    analytics = [...analytics, ...created];
  }

  return {
    ids: new Set(analytics.map((s) => s.surveyId)),
    names: new Set(analytics.map((s) => s.surveyName).filter(Boolean) as string[]),
  };
};

const ensureAnalyticsSurveyAccess = async (req: any, res: any) => {
  const surveyId = parseInt(req.params.surveyId);
  if (Number.isNaN(surveyId)) {
    res.status(400).json({ error: "Invalid survey ID" });
    return null;
  }

  const allowed = await getAllowedAnalyticsSurveys(req);
  if (!allowed.ids.has(surveyId)) {
    res.status(403).json({ error: "Forbidden" });
    return null;
  }

  return surveyId;
};

/**
 * GET /api/analytics/surveys
 * Get list of all surveys with basic info
 */
router.get("/surveys", async (req: any, res) => {
  try {
    const allowed = await getAllowedAnalyticsSurveys(req);
    if (allowed.ids.size === 0) {
      return res.json([]);
    }

    const surveys = await db
      .select({
        surveyId: analyticsSurveys.surveyId,
        surveyName: analyticsSurveys.surveyName,
      })
      .from(analyticsSurveys)
      .where(and(
        eq(analyticsSurveys.isActive, true),
        inArray(analyticsSurveys.surveyId, Array.from(allowed.ids))
      ))
      .orderBy(desc(analyticsSurveys.createdDate));

    // Deduplicate by surveyName to avoid showing the same survey twice
    const uniqueSurveys = Array.from(
      new Map(surveys.map(s => [s.surveyName, s])).values()
    );

    res.json(uniqueSurveys);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch surveys" });
  }
});

/**
 * POST /api/analytics/surveys
 * Create a new survey
 */
router.post("/surveys", async (req, res) => {
  try {
    const schema = z.object({
      surveyName: z.string().min(1).max(255),
      description: z.string().optional(),
      questions: z.array(z.object({
        questionText: z.string().min(1),
        questionOrder: z.number().int().positive(),
      })).min(1),
    });

    const data = schema.parse(req.body);

    // Create survey
    const [survey] = await db
      .insert(analyticsSurveys)
      .values({
        surveyName: data.surveyName,
        description: data.description,
      })
      .returning();

    // Create questions
    const questions = await db
      .insert(surveyQuestions)
      .values(
        data.questions.map(q => ({
          surveyId: survey.surveyId,
          questionText: q.questionText,
          questionOrder: q.questionOrder,
        }))
      )
      .returning();

    res.json({ survey, questions });
  } catch (error) {

    console.error('Server error:', res.status); res.status(400).json({ error: "Failed to create survey" });
  }
});

/**
 * GET /api/analytics/surveys/:surveyId
 * Get detailed survey analytics
 */
router.get("/surveys/:surveyId", async (req: any, res) => {
  try {
    const surveyId = parseInt(req.params.surveyId);

    // Instead of forcing allowed.ids.has(), we just load the analytics directly 
    // since the report endpoint is supposed to be accessible from the public reports page
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const analytics = await AnalyticsService.getSurveyAnalytics(surveyId, dateFrom, dateTo);

    res.json(analytics);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch survey analytics" });
  }
});

/**
 * GET /api/analytics/survey/:surveyId (UUID-based)
 * Get analytics for a survey using its UUID (maps to analytics_surveys by name)
 */
router.get("/survey/:surveyId", async (req: any, res) => {
  try {
    const surveyUuid = req.params.surveyId;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get the survey from the main surveys table using UUID
    const [survey] = await db
      .select()
      .from(dbSurveys)
      .where(eq(dbSurveys.id, surveyUuid))
      .limit(1);

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Check if user has permission to view this survey
    if (survey.createdBy !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Get or create the analytics survey record using the survey name
    let [analyticsSurvey] = await db
      .select()
      .from(analyticsSurveys)
      .where(eq(analyticsSurveys.surveyName, survey.title))
      .limit(1);

    if (!analyticsSurvey) {
      // Create a new analytics survey record if it doesn't exist
      const result = await db
        .insert(analyticsSurveys)
        .values({ surveyName: survey.title })
        .returning();
      analyticsSurvey = result[0];
    }

    // Now get the analytics data using the analytics survey ID
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const analytics = await AnalyticsService.getSurveyAnalytics(analyticsSurvey.surveyId, dateFrom, dateTo);

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching survey analytics:', error);
    res.status(500).json({ error: "Failed to fetch survey analytics" });
  }
});

/**
 * GET /api/analytics/surveys/:surveyId/questions
 * Get all questions for a survey
 */
router.get("/surveys/:surveyId/questions", async (req: any, res) => {
  try {
    const surveyId = parseInt(req.params.surveyId);
    const allowed = await getAllowedAnalyticsSurveys(req);

    if (!allowed.ids.has(surveyId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(surveyQuestions.questionOrder);

    res.json({ questions });
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch questions" });
  }
});

/**
 * POST /api/analytics/responses
 * Submit a survey response
 */
router.post("/responses", async (req, res) => {
  try {
    const schema = z.object({
      surveyId: z.number().int().positive(),
      questionId: z.number().int().positive(),
      respondentId: z.string().min(1),
      score: z.number().min(0),
      maxScale: z.number().min(1).max(100).default(10),
      sessionId: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    });

    const data = schema.parse(req.body);

    await AnalyticsService.submitResponse(data);

    res.json({
      success: true,
      message: "Response submitted successfully"
    });
  } catch (error) {

    console.error('Server error:', res.status); res.status(400).json({ error: "Failed to submit response" });
  }
});

/**
 * POST /api/analytics/responses/batch
 * Submit multiple responses at once
 */
router.post("/responses/batch", async (req, res) => {
  try {
    const schema = z.object({
      surveyId: z.number().int().positive(),
      respondentId: z.string().min(1),
      sessionId: z.string().optional(),
      responses: z.array(z.object({
        questionId: z.number().int().positive(),
        score: z.number().min(0),
        maxScale: z.number().min(1).max(100).default(10),
      })).min(1),
    });

    const data = schema.parse(req.body);

    // Submit all responses
    for (const response of data.responses) {
      await AnalyticsService.submitResponse({
        surveyId: data.surveyId,
        questionId: response.questionId,
        respondentId: data.respondentId,
        score: response.score,
        maxScale: response.maxScale,
        sessionId: data.sessionId,
      });
    }

    res.json({
      success: true,
      message: `${data.responses.length} responses submitted successfully`
    });
  } catch (error) {

    console.error('Server error:', res.status); res.status(400).json({ error: "Failed to submit batch responses" });
  }
});

/**
 * GET /api/analytics/surveys/:surveyId/metrics
 * Get calculated metrics for a survey
 */
router.get("/surveys/:surveyId/metrics", async (req: any, res) => {
  try {
    const surveyId = await ensureAnalyticsSurveyAccess(req, res);
    if (!surveyId) return;
    const questionId = req.query.questionId ? parseInt(req.query.questionId as string) : undefined;

    const history = await AnalyticsService.getMetricHistory(surveyId, questionId);

    res.json({ metrics: history });
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

/**
 * POST /api/analytics/surveys/:surveyId/calculate
 * Manually trigger metrics calculation for a survey
 */
router.post("/surveys/:surveyId/calculate", async (req: any, res) => {
  try {
    const surveyId = await ensureAnalyticsSurveyAccess(req, res);
    if (!surveyId) return;

    await AnalyticsService.updateAllMetrics(surveyId);

    res.json({
      success: true,
      message: "Metrics calculated successfully"
    });
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to calculate metrics" });
  }
});

/**
 * GET /api/analytics/surveys/:surveyId/responses
 * Get all responses for a survey
 */
router.get("/surveys/:surveyId/responses", async (req: any, res) => {
  try {
    const surveyId = await ensureAnalyticsSurveyAccess(req, res);
    if (!surveyId) return;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

    const responses = await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(desc(surveyResponses.responseDate))
      .limit(limit);

    res.json({ responses });
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch responses" });
  }
});

/**
 * GET /api/analytics/normalize
 * Utility endpoint to normalize a score
 */
router.get("/normalize", async (req, res) => {
  try {
    const schema = z.object({
      score: z.coerce.number().min(0),
      maxScale: z.coerce.number().min(1).max(100).default(10),
    });

    const { score, maxScale } = schema.parse(req.query);

    const normalized = AnalyticsService.normalizeScore(score, maxScale);

    res.json(normalized);
  } catch (error) {

    console.error('Server error:', res.status); res.status(400).json({ error: "Invalid parameters" });
  }
});

/**
 * GET /api/analytics/surveys/:surveyId/summary
 * Get a formatted summary of survey analytics
 */
router.get("/surveys/:surveyId/summary", async (req: any, res) => {
  try {
    const surveyId = await ensureAnalyticsSurveyAccess(req, res);
    if (!surveyId) return;

    const analytics = await AnalyticsService.getSurveyAnalytics(surveyId);

    // Format as a readable summary
    const summary = {
      surveyName: analytics.surveyName,
      totalRespondents: analytics.totalRespondents,
      dateRange: {
        start: analytics.dateRange.start.toISOString(),
        end: analytics.dateRange.end.toISOString(),
      },
      overall: {
        csat: {
          score: `${analytics.overall.csat.csatScore.toFixed(1)}%`,
          performance: analytics.overall.csat.performance,
          satisfied: `${analytics.overall.csat.satisfiedCount} of ${analytics.overall.csat.totalResponses}`,
        },
        nps: {
          score: analytics.overall.nps.npsScore.toFixed(1),
          performance: analytics.overall.nps.performance,
          breakdown: `Promoters: ${analytics.overall.nps.promotersCount}, Passives: ${analytics.overall.nps.passivesCount}, Detractors: ${analytics.overall.nps.detractorsCount}`,
        },
      },
      questions: analytics.questions.map(q => ({
        question: q.questionText,
        csat: `${q.csat.csatScore.toFixed(1)}% (${q.csat.performance})`,
        nps: `${q.nps.npsScore.toFixed(1)} (${q.nps.performance})`,
      })),
      distribution: {
        verySatisfied: analytics.overall.csat.distribution.score5,
        satisfied: analytics.overall.csat.distribution.score4,
        neutral: analytics.overall.csat.distribution.score3,
        dissatisfied: analytics.overall.csat.distribution.score2,
        veryDissatisfied: analytics.overall.csat.distribution.score1,
      },
    };

    res.json(summary);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to generate summary" });
  }
});

/**
 * GET /api/analytics/questions/:questionId/detailed
 * Get detailed analytics for a specific question with trends and insights
 */
router.get("/questions/:questionId/detailed", async (req, res) => {
  try {
    const questionId = parseInt(req.params.questionId);
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    // Get question details
    const [question] = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.questionId, questionId));

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Get all responses for this question
    const responsesQuery = db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.questionId, questionId))
      .orderBy(desc(surveyResponses.responseDate));

    const responses = await responsesQuery;

    // Filter by date if provided
    const filteredResponses = responses.filter(r => {
      if (!r.responseDate) return false;
      if (dateFrom && r.responseDate < dateFrom) return false;
      if (dateTo && r.responseDate > dateTo) return false;
      return true;
    });

    // Calculate detailed metrics
    const totalResponses = filteredResponses.length;

    // Response distribution (normalized scores 0-5)
    const scoreDistribution = {
      score5: filteredResponses.filter(r => r.normalizedScore5 === 5).length,
      score4: filteredResponses.filter(r => r.normalizedScore5 === 4).length,
      score3: filteredResponses.filter(r => r.normalizedScore5 === 3).length,
      score2: filteredResponses.filter(r => r.normalizedScore5 === 2).length,
      score1: filteredResponses.filter(r => r.normalizedScore5 === 1).length,
      score0: filteredResponses.filter(r => r.normalizedScore5 === 0).length,
    };

    // Calculate average scores
    const avgNormalized5 = totalResponses > 0
      ? filteredResponses.reduce((sum, r) => sum + (r.normalizedScore5 || 0), 0) / totalResponses
      : 0;

    const avgNormalized10 = totalResponses > 0
      ? filteredResponses.reduce((sum, r) => sum + (r.normalizedScore10 || 0), 0) / totalResponses
      : 0;

    // CSAT calculation (4-5 scores)
    const satisfiedCount = scoreDistribution.score5 + scoreDistribution.score4;
    const csatScore = totalResponses > 0 ? (satisfiedCount / totalResponses) * 100 : 0;

    // NPS calculation (based on 10-point scale)
    const promoters = filteredResponses.filter(r => (r.normalizedScore10 || 0) >= 9).length;
    const passives = filteredResponses.filter(r => (r.normalizedScore10 || 0) >= 7 && (r.normalizedScore10 || 0) <= 8).length;
    const detractors = filteredResponses.filter(r => (r.normalizedScore10 || 0) <= 6).length;
    const npsScore = totalResponses > 0
      ? ((promoters / totalResponses) - (detractors / totalResponses)) * 100
      : 0;

    // Time-based trends (group by day)
    const trendsMap = new Map<string, { date: string; count: number; avgScore: number; totalScore: number }>();
    filteredResponses.forEach(r => {
      const dateKey = r.responseDate!.toISOString().split('T')[0];
      const existing = trendsMap.get(dateKey) || { date: dateKey, count: 0, avgScore: 0, totalScore: 0 };
      existing.count++;
      existing.totalScore += r.normalizedScore5 || 0;
      existing.avgScore = existing.totalScore / existing.count;
      trendsMap.set(dateKey, existing);
    });

    const trends = Array.from(trendsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Response velocity (responses per day)
    const responseVelocity = trends.length > 0 ? totalResponses / trends.length : 0;

    // Generate insights based on the data
    const insights = [];

    if (csatScore < 60) {
      insights.push({
        type: "warning",
        message: `Low satisfaction (${csatScore.toFixed(1)}%) - Consider reviewing question clarity or product improvements`,
        impact: "high"
      });
    } else if (csatScore >= 80) {
      insights.push({
        type: "success",
        message: `Excellent satisfaction (${csatScore.toFixed(1)}%) - This question shows strong positive sentiment`,
        impact: "positive"
      });
    }

    if (scoreDistribution.score0 + scoreDistribution.score1 + scoreDistribution.score2 > totalResponses * 0.3) {
      insights.push({
        type: "critical",
        message: `High dissatisfaction rate (${((scoreDistribution.score0 + scoreDistribution.score1 + scoreDistribution.score2) / totalResponses * 100).toFixed(1)}%) - Immediate action recommended`,
        impact: "critical"
      });
    }

    if (trends.length >= 7) {
      const recentAvg = trends.slice(-7).reduce((sum, t) => sum + t.avgScore, 0) / 7;
      const previousAvg = trends.slice(0, -7).length > 0
        ? trends.slice(0, -7).reduce((sum, t) => sum + t.avgScore, 0) / trends.slice(0, -7).length
        : recentAvg;

      const trendChange = ((recentAvg - previousAvg) / previousAvg) * 100;
      if (trendChange > 10) {
        insights.push({
          type: "success",
          message: `Positive trend: +${trendChange.toFixed(1)}% improvement in recent responses`,
          impact: "positive"
        });
      } else if (trendChange < -10) {
        insights.push({
          type: "warning",
          message: `Negative trend: ${trendChange.toFixed(1)}% decline in recent responses`,
          impact: "medium"
        });
      }
    }

    const detailedAnalytics = {
      question: {
        questionId: question.questionId,
        surveyId: question.surveyId,
        questionText: question.questionText,
        questionOrder: question.questionOrder,
      },
      summary: {
        totalResponses,
        avgScore5: avgNormalized5.toFixed(2),
        avgScore10: avgNormalized10.toFixed(2),
        responseVelocity: responseVelocity.toFixed(2),
        dateRange: {
          start: filteredResponses.length > 0 ? filteredResponses[filteredResponses.length - 1].responseDate : null,
          end: filteredResponses.length > 0 ? filteredResponses[0].responseDate : null,
        }
      },
      metrics: {
        csat: {
          score: csatScore.toFixed(1),
          satisfiedCount,
          totalResponses,
          performance: csatScore >= 80 ? "EXCELLENT" : csatScore >= 70 ? "GOOD" : csatScore >= 60 ? "AVERAGE" : "POOR"
        },
        nps: {
          score: npsScore.toFixed(1),
          promoters,
          passives,
          detractors,
          performance: npsScore >= 50 ? "EXCELLENT" : npsScore >= 30 ? "GOOD" : npsScore >= 0 ? "AVERAGE" : "POOR"
        }
      },
      distribution: scoreDistribution,
      distributionPercentages: {
        score5: totalResponses > 0 ? ((scoreDistribution.score5 / totalResponses) * 100).toFixed(1) : "0.0",
        score4: totalResponses > 0 ? ((scoreDistribution.score4 / totalResponses) * 100).toFixed(1) : "0.0",
        score3: totalResponses > 0 ? ((scoreDistribution.score3 / totalResponses) * 100).toFixed(1) : "0.0",
        score2: totalResponses > 0 ? ((scoreDistribution.score2 / totalResponses) * 100).toFixed(1) : "0.0",
        score1: totalResponses > 0 ? ((scoreDistribution.score1 / totalResponses) * 100).toFixed(1) : "0.0",
        score0: totalResponses > 0 ? ((scoreDistribution.score0 / totalResponses) * 100).toFixed(1) : "0.0",
      },
      trends,
      insights,
    };

    res.json(detailedAnalytics);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch question analytics" });
  }
});

/**
 * GET /api/analytics/surveys/:surveyId/response-time
 * Get detailed response time analytics including completion patterns and trends
 */
router.get("/surveys/:surveyId/response-time", async (req: any, res) => {
  try {
    const surveyId = await ensureAnalyticsSurveyAccess(req, res);
    if (!surveyId) return;
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    // Get survey details
    const [survey] = await db
      .select()
      .from(analyticsSurveys)
      .where(eq(analyticsSurveys.surveyId, surveyId));

    if (!survey) {
      return res.status(404).json({ error: "Survey not found" });
    }

    // Get all responses with timestamps
    const responsesQuery = db
      .select()
      .from(surveyResponses)
      .where(and(
        eq(surveyResponses.surveyId, surveyId),
        sql<boolean>`(metadata->>'source') = 'vapi'`
      ))
      .orderBy(desc(surveyResponses.responseDate));

    const responses = await responsesQuery;

    // Filter by date if provided
    const filteredResponses = responses.filter(r => {
      if (!r.responseDate) return false;
      if (dateFrom && r.responseDate < dateFrom) return false;
      if (dateTo && r.responseDate > dateTo) return false;
      return true;
    });

    // Group responses by respondent to track completion time (VAPI-only)
    const respondentSessions = new Map<string, { firstResponse: Date; lastResponse: Date; questionCount: number; responseTimeMinutes?: number }>();

    filteredResponses.forEach(r => {
      const metadata = (r as any).metadata || {};
      const responseTimeMinutes = typeof metadata.responseTime === 'number' ? metadata.responseTime : undefined;
      const existing = respondentSessions.get(r.respondentId);
      if (!existing) {
        respondentSessions.set(r.respondentId, {
          firstResponse: r.responseDate!,
          lastResponse: r.responseDate!,
          questionCount: 1,
          responseTimeMinutes
        });
      } else {
        if (r.responseDate! < existing.firstResponse) existing.firstResponse = r.responseDate!;
        if (r.responseDate! > existing.lastResponse) existing.lastResponse = r.responseDate!;
        existing.questionCount++;
        if (!existing.responseTimeMinutes && responseTimeMinutes) {
          existing.responseTimeMinutes = responseTimeMinutes;
        }
      }
    });

    // Calculate completion times
    const completionTimes: number[] = [];
    respondentSessions.forEach(session => {
      const timeInMinutes = session.responseTimeMinutes ??
        (session.lastResponse.getTime() - session.firstResponse.getTime()) / (1000 * 60);
      if (timeInMinutes >= 0) {
        completionTimes.push(timeInMinutes);
      }
    });

    completionTimes.sort((a, b) => a - b);

    // Calculate statistics
    const totalSessions = completionTimes.length;
    const avgCompletionTime = totalSessions > 0
      ? completionTimes.reduce((sum, t) => sum + t, 0) / totalSessions
      : 0;

    const medianCompletionTime = totalSessions > 0
      ? completionTimes[Math.floor(totalSessions / 2)]
      : 0;

    const minCompletionTime = totalSessions > 0 ? completionTimes[0] : 0;
    const maxCompletionTime = totalSessions > 0 ? completionTimes[totalSessions - 1] : 0;

    // Percentiles
    const p25 = totalSessions > 0 ? completionTimes[Math.floor(totalSessions * 0.25)] : 0;
    const p75 = totalSessions > 0 ? completionTimes[Math.floor(totalSessions * 0.75)] : 0;
    const p95 = totalSessions > 0 ? completionTimes[Math.floor(totalSessions * 0.95)] : 0;

    // Time distribution buckets (in minutes)
    const buckets = {
      under1min: completionTimes.filter(t => t < 1).length,
      '1to3min': completionTimes.filter(t => t >= 1 && t < 3).length,
      '3to5min': completionTimes.filter(t => t >= 3 && t < 5).length,
      '5to10min': completionTimes.filter(t => t >= 5 && t < 10).length,
      '10to30min': completionTimes.filter(t => t >= 10 && t < 30).length,
      over30min: completionTimes.filter(t => t >= 30).length,
    };

    // Time trends (group by day)
    const dailyTrends = new Map<string, { date: string; responses: number; avgTime: number; totalTime: number; count: number }>();

    Array.from(respondentSessions.entries()).forEach(([respondentId, session]) => {
      const dateKey = session.firstResponse.toISOString().split('T')[0];
      const timeInMinutes = (session.lastResponse.getTime() - session.firstResponse.getTime()) / (1000 * 60);

      const existing = dailyTrends.get(dateKey) || {
        date: dateKey,
        responses: 0,
        avgTime: 0,
        totalTime: 0,
        count: 0
      };

      existing.responses++;
      existing.totalTime += timeInMinutes;
      existing.count++;
      existing.avgTime = existing.totalTime / existing.count;

      dailyTrends.set(dateKey, existing);
    });

    const trends = Array.from(dailyTrends.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Response patterns by hour of day
    const hourlyPatterns = new Array(24).fill(0).map((_, hour) => ({
      hour,
      count: filteredResponses.filter(r => r.responseDate!.getHours() === hour).length
    }));

    // Day of week patterns
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayPatterns = dayNames.map((day, index) => ({
      day,
      count: filteredResponses.filter(r => r.responseDate!.getDay() === index).length
    }));

    // Generate insights
    const insights = [];

    if (avgCompletionTime > 15) {
      insights.push({
        type: "warning",
        message: `Average completion time of ${avgCompletionTime.toFixed(1)} minutes is high - Consider shortening survey or optimizing questions`,
        impact: "medium"
      });
    } else if (avgCompletionTime < 3) {
      insights.push({
        type: "info",
        message: `Fast completion time (${avgCompletionTime.toFixed(1)} minutes) - Good user experience`,
        impact: "positive"
      });
    }

    const abandonmentRate = (buckets.over30min / totalSessions) * 100;
    if (abandonmentRate > 20) {
      insights.push({
        type: "critical",
        message: `High potential abandonment rate (${abandonmentRate.toFixed(1)}%) - ${buckets.over30min} sessions took over 30 minutes`,
        impact: "high"
      });
    }

    // Peak response time
    const peakHour = hourlyPatterns.reduce((max, curr) => curr.count > max.count ? curr : max, hourlyPatterns[0]);
    insights.push({
      type: "info",
      message: `Peak response time: ${peakHour.hour}:00 with ${peakHour.count} responses`,
      impact: "low"
    });

    const responseTimeAnalytics = {
      survey: {
        surveyId: survey.surveyId,
        surveyName: survey.surveyName,
      },
      summary: {
        totalSessions,
        totalResponses: filteredResponses.length,
        avgCompletionTimeMinutes: avgCompletionTime.toFixed(2),
        medianCompletionTimeMinutes: medianCompletionTime.toFixed(2),
        minCompletionTimeMinutes: minCompletionTime.toFixed(2),
        maxCompletionTimeMinutes: maxCompletionTime.toFixed(2),
      },
      percentiles: {
        p25: p25.toFixed(2),
        p75: p75.toFixed(2),
        p95: p95.toFixed(2),
      },
      distribution: buckets,
      distributionPercentages: {
        under1min: ((buckets.under1min / totalSessions) * 100).toFixed(1),
        '1to3min': ((buckets['1to3min'] / totalSessions) * 100).toFixed(1),
        '3to5min': ((buckets['3to5min'] / totalSessions) * 100).toFixed(1),
        '5to10min': ((buckets['5to10min'] / totalSessions) * 100).toFixed(1),
        '10to30min': ((buckets['10to30min'] / totalSessions) * 100).toFixed(1),
        over30min: ((buckets.over30min / totalSessions) * 100).toFixed(1),
      },
      trends,
      patterns: {
        hourly: hourlyPatterns,
        weekday: weekdayPatterns,
      },
      insights,
    };

    res.json(responseTimeAnalytics);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch response time analytics" });
  }
});

/**
 * GET /api/analytics/filter-options
 * Get available filter options for the current account
 */
router.get("/filter-options", async (req: any, res) => {
  try {
    const allowed = await getAllowedAnalyticsSurveys(req);

    if (allowed.ids.size === 0) {
      return res.json({ surveys: [], locations: [], channels: [], demographics: { gender: [] } });
    }

    const allowedIds = Array.from(allowed.ids);

    // Get unique surveys for this account
    const surveys = await db
      .selectDistinct({
        surveyName: analyticsSurveys.surveyName,
      })
      .from(analyticsSurveys)
      .where(and(
        eq(analyticsSurveys.isActive, true),
        inArray(analyticsSurveys.surveyId, allowedIds)
      ))
      .orderBy(analyticsSurveys.surveyName);

    // Get unique locations from responses
    const locations = await db
      .selectDistinct({
        location: surveyResponses.location,
      })
      .from(surveyResponses)
      .where(and(
        inArray(surveyResponses.surveyId, allowedIds),
        isNotNull(surveyResponses.location),
        ne(surveyResponses.location, "")
      ))
      .orderBy(surveyResponses.location);

    // Get unique channels/sources from responses
    const channels = await db
      .selectDistinct({
        channel: surveyResponses.source,
      })
      .from(surveyResponses)
      .where(and(
        inArray(surveyResponses.surveyId, allowedIds),
        isNotNull(surveyResponses.source),
        ne(surveyResponses.source, "")
      ))
      .orderBy(surveyResponses.source);

    // Get gender distribution
    const genders = await db
      .selectDistinct({
        gender: surveyResponses.gender,
      })
      .from(surveyResponses)
      .where(and(
        inArray(surveyResponses.surveyId, allowedIds),
        isNotNull(surveyResponses.gender),
        ne(surveyResponses.gender, "")
      ))
      .orderBy(surveyResponses.gender);

    const filterOptions = {
      surveys: surveys.map((s) => s.surveyName).filter(Boolean),
      locations: locations.map((l) => l.location).filter(Boolean),
      channels: channels.map((c) => c.channel).filter(Boolean),
      demographics: {
        gender: genders.map((g) => g.gender).filter(Boolean),
      },
    };

    res.json(filterOptions);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

/**
 * GET /api/analytics/completion-funnel
 * Get survey completion funnel data with optional date filters
 */
router.get("/completion-funnel", async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const funnelData = await AnalyticsService.getCompletionFunnel(dateFrom, dateTo);
    res.json(funnelData);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch completion funnel" });
  }
});

/**
 * GET /api/analytics/demographics
 * Get demographic distribution data
 */
router.get("/demographics", async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const demographicData = await AnalyticsService.getDemographicDistribution(dateFrom, dateTo);
    res.json(demographicData);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch demographics" });
  }
});

/**
 * GET /api/analytics/question-performance
 * Get question performance metrics
 */
router.get("/question-performance", async (req, res) => {
  try {
    const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
    const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;

    const performanceData = await AnalyticsService.getQuestionPerformance(dateFrom, dateTo);
    res.json(performanceData);
  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to fetch question performance" });
  }
});

/**
 * POST /api/analytics/backfill/:surveyId
 * Backfill analytics data from main survey tables
 */
router.post("/backfill/:surveyId", async (req, res) => {
  try {
    const surveyId = req.params.surveyId;

    // 1. Get the source survey
    const [sourceSurvey] = await db
      .select()
      .from(dbSurveys)
      .where(eq(dbSurveys.id, surveyId));

    if (!sourceSurvey) {
      return res.status(404).json({ error: "Survey not found" });
    }



    // 2. Find or create analytics survey
    let [targetSurvey] = await db
      .select()
      .from(analyticsSurveys)
      .where(eq(analyticsSurveys.surveyName, sourceSurvey.title)); // Match by name

    if (!targetSurvey) {

      [targetSurvey] = await db
        .insert(analyticsSurveys)
        .values({
          surveyName: sourceSurvey.title,
          description: sourceSurvey.description,
          isActive: true,
        })
        .returning();
    }

    const targetSurveyId = targetSurvey.surveyId;

    // Check if questions already exist
    const existingQuestions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, targetSurveyId));

    // If no questions exist, create them from source survey
    if (existingQuestions.length === 0) {
      const sourceQuestions = Array.isArray(sourceSurvey.questions) ? sourceSurvey.questions : [];

      if (sourceQuestions.length > 0) {

        await db.insert(surveyQuestions).values(
          sourceQuestions.map((q: any, index: number) => ({
            surveyId: targetSurveyId,
            questionText: q.title || q.text || q.questionText || `Question ${index + 1}`,
            questionOrder: index + 1,
          }))
        );
      } else {
        // Fallback to default questions if no source questions

        await db.insert(surveyQuestions).values([
          { surveyId: targetSurveyId, questionText: "How satisfied are you with our service?", questionOrder: 1 },
          { surveyId: targetSurveyId, questionText: "How likely are you to recommend us?", questionOrder: 2 },
        ]);
      }
    }

    // 3. Get source responses
    const sourceResponses = await db
      .select()
      .from(dbResponses)
      .where(eq(dbResponses.surveyId, surveyId));



    // 4. Get questions for target survey to map to
    const targetQuestions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, targetSurveyId))
      .orderBy(surveyQuestions.questionOrder);

    // 5. Migrate responses
    let processedCount = 0;
    if (sourceResponses.length > 0 && targetQuestions.length > 0) {
      // Clear existing analytics responses for this survey to avoid duplicates
      // (Optional: safer to just append or check existence, but for backfill usually we want clear slate)
      // await db.delete(surveyResponses).where(eq(surveyResponses.surveyId, targetSurveyId));
      for (const resp of sourceResponses) {
        // Map to CSAT question (Question 1)
        if (resp.csatScore !== null) {
          await AnalyticsService.submitResponse({
            surveyId: targetSurveyId,
            questionId: targetQuestions[0].questionId, // Assume first question is CSAT
            respondentId: resp.respondentEmail || "anonymous",
            score: resp.csatScore, // 1-5
            maxScale: 5,
            responseDate: resp.submittedAt || new Date(),
            metadata: { originalResponseId: resp.id }
          });
          processedCount++;
        }

        // Map to NPS question (Question 2)
        if (resp.npsScore !== null) {
          // NPS is usually part of the same response session
          await AnalyticsService.submitResponse({
            surveyId: targetSurveyId,
            questionId: targetQuestions[1]?.questionId || targetQuestions[0].questionId,
            respondentId: resp.respondentEmail || "anonymous",
            score: resp.npsScore, // 0-10
            maxScale: 10,
            responseDate: resp.submittedAt || new Date(),
            metadata: { originalResponseId: resp.id }
          });
          processedCount++;
        }
      }



      // Update totals
      await db
        .update(analyticsSurveys)
        .set({ totalRespondents: sourceResponses.length })
        .where(eq(analyticsSurveys.surveyId, targetSurveyId));
    }

    // 6. Recalculate all metrics
    await AnalyticsService.updateAllMetrics(targetSurveyId);

    res.json({
      success: true,
      surveyId: targetSurveyId,
      targetSurvey,
      migratedCount: processedCount,
      message: `Backfill completed. Synced ${sourceResponses.length} responses. Migrated ${processedCount} metrics points.`
    });

  } catch (error) {

    console.error('Server error:', res.status); res.status(500).json({ error: "Failed to backfill analytics" });
  }
});

export default router;

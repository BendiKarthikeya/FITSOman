import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, getStorageInfo } from "./storageFactory";
import { db } from "./db";
import { VapiClient } from "./integrations/vapiClient";
import { insertUserSchema, insertSurveySchema, insertResponseSchema, insertSurveyTemplateSchema } from "@shared/schemas";
import { authenticationEvents, organizations, users, departments, employees, leadershipInsights, surveys, responses, actionItems, interventions, riskDetectionResults, actionPlannings, departmentNps } from "@shared/schema";
import { z } from "zod";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { eq, desc, and, sql, or, isNull } from "drizzle-orm"; // Line 12

import analyticsRoutes from "./routes/analyticsRoutes";
import analyticsHeatmapRoutes from "./routes/analyticsHeatmapRoutes";
import unifiedAnalyticsRoutes from "./routes/unifiedAnalyticsRoutes";
import advancedAnalyticsRoutes from "./routes/advancedAnalyticsRoutes";
import turnoverRiskRoutes from "./routes/turnoverRiskRoutes";
import turnoverRateAnalyticsRoutes from "./routes/turnoverRateAnalyticsRoutes";
import surveyScheduleRoutes from "./routes/surveyScheduleRoutes";
import actionPlanningRoutes from "./routes/actionPlanningRoutes";
import { registerSurveyResponseRoutes } from "./routes/surveyResponseRoutes";
import { generateInitialAnalytics, processSurveyResponse } from "./services/dashboardAnalysisService";
import { logActivity, logAuthenticationEvent, getRequestInfo, createSession } from "./utils/activityLogger";
import { processSurveyForLeadershipInsights } from "./services/leadershipInsightsProcessor";
import { generateSurveyQuestions } from "./services/surveyGenerationService";
import { exec } from "child_process";

// Simple RAG system for similar feedback
interface FeedbackCache {
  feedback: string;
  analysis: any;
  timestamp: number;
}

const feedbackCache: FeedbackCache[] = [];
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_SIZE = 100;

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || (() => {
  const secret = crypto.randomBytes(32).toString('base64');
  process.env.JWT_SECRET = secret;
  return secret;
})();
const JWT_EXPIRES_IN = '7d';

// JWT Middleware
interface AuthRequest extends Request {
  user?: any;
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Optional auth middleware (doesn't fail if no token)
const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// Simple similarity check using keyword overlap
function calculateSimilarity(feedback1: string, feedback2: string): number {
  const words1 = feedback1.toLowerCase().split(/\s+/).filter(word => word.length > 3);
  const words2 = feedback2.toLowerCase().split(/\s+/).filter(word => word.length > 3);

  const commonWords = words1.filter(word => words2.includes(word));
  const totalWords = new Set([...words1, ...words2]).size;

  return commonWords.length / Math.max(totalWords, 1);
}

function findSimilarFeedback(feedback: string): FeedbackCache | null {
  const now = Date.now();

  // Clean expired cache entries
  const validEntries = feedbackCache.filter(entry => now - entry.timestamp < CACHE_EXPIRY);
  feedbackCache.length = 0;
  feedbackCache.push(...validEntries);

  // Find most similar feedback with threshold of 0.4
  let bestMatch: FeedbackCache | null = null;
  let bestSimilarity = 0;

  for (const entry of feedbackCache) {
    const similarity = calculateSimilarity(feedback, entry.feedback);
    if (similarity > 0.4 && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = entry;
    }
  }

  return bestMatch;
}

function cacheFeedbackAnalysis(feedback: string, analysis: any): void {
  // Remove oldest entries if cache is full
  if (feedbackCache.length >= MAX_CACHE_SIZE) {
    feedbackCache.shift();
  }

  feedbackCache.push({
    feedback,
    analysis,
    timestamp: Date.now()
  });
}

// Helper functions for feedback analysis
function determineSentiment(feedback: string): 'positive' | 'neutral' | 'negative' {
  const lowerFeedback = feedback.toLowerCase();

  const positiveWords = ['great', 'excellent', 'amazing', 'love', 'fantastic', 'wonderful', 'good', 'happy', 'satisfied', 'perfect', 'awesome', 'brilliant', 'outstanding', 'superb', 'pleased', 'impressed', 'recommend', 'enjoy'];
  const negativeWords = ['terrible', 'awful', 'hate', 'worst', 'bad', 'poor', 'disappointing', 'frustrated', 'angry', 'horrible', 'disgusting', 'useless', 'broken', 'failed', 'disappointed', 'confusing', 'problem', 'issue', 'wrong', 'annoying', 'ridiculous', 'waste', 'pathetic', 'unacceptable'];

  // Strong negative phrases that should immediately flag as negative
  const strongNegativePhrases = [
    'will not use',
    'won\'t use',
    'never again',
    'very disappointed',
    'extremely disappointed',
    'completely disappointed',
    'totally disappointed',
    'can\'t find',
    'cannot find',
    'doesn\'t work',
    'does not work',
    'not working',
    'not recommended',
    'don\'t recommend',
    'waste of time',
    'waste of money'
  ];

  let positiveScore = 0;
  let negativeScore = 0;

  // Check for strong negative phrases first
  for (const phrase of strongNegativePhrases) {
    if (lowerFeedback.includes(phrase)) {
      negativeScore += 3; // Heavy weight for strong negative phrases
    }
  }

  positiveWords.forEach(word => {
    if (lowerFeedback.includes(word)) positiveScore++;
  });

  negativeWords.forEach(word => {
    if (lowerFeedback.includes(word)) negativeScore++;
  });

  // Additional context-based scoring
  if (lowerFeedback.includes('not') || lowerFeedback.includes('no')) {
    negativeScore += 1;
  }

  // Force negative for clearly negative cases if no strong signals detected
  if (negativeScore === 0 && positiveScore === 0) {
    // Check for inherently negative words that might be missed
    const additionalNegativeWords = ['disappointing', 'confusion', 'cant', 'couldnt', 'shouldnt', 'wouldnt'];
    for (const word of additionalNegativeWords) {
      if (lowerFeedback.includes(word)) {
        negativeScore += 1;
      }
    }
  }

  if (positiveScore > negativeScore) return 'positive';
  if (negativeScore > positiveScore) return 'negative';
  return 'neutral';
}

function calculateEVIScore(feedback: string, sentiment: 'positive' | 'neutral' | 'negative'): number {
  let baseScore = 50;
  const lowerFeedback = feedback.toLowerCase();

  // Adjust based on sentiment
  if (sentiment === 'positive') baseScore += 25;
  if (sentiment === 'negative') baseScore -= 35;

  // Adjust based on emotional intensity
  const intensityWords = ['extremely', 'very', 'really', 'absolutely', 'completely', 'totally'];
  const intensityCount = intensityWords.reduce((count, word) => {
    return count + (lowerFeedback.split(word).length - 1);
  }, 0);

  // Apply intensity - more impact for negative sentiment
  if (sentiment === 'negative') {
    baseScore -= intensityCount * 8;
  } else if (sentiment === 'positive') {
    baseScore += intensityCount * 6;
  } else {
    baseScore += intensityCount * 3;
  }

  // Additional penalties for strong negative indicators
  if (lowerFeedback.includes('will not use') || lowerFeedback.includes('won\'t use')) {
    baseScore -= 15;
  }

  if (lowerFeedback.includes('can\'t find') || lowerFeedback.includes('cannot find')) {
    baseScore -= 10;
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, baseScore));
}

function analyzeEmotions(feedback: string) {
  const lowerFeedback = feedback.toLowerCase();

  const emotionKeywords = {
    joy: ['happy', 'excited', 'love', 'great', 'amazing', 'wonderful', 'fantastic', 'pleased', 'delighted', 'thrilled', 'satisfied', 'excellent'],
    anger: ['angry', 'furious', 'hate', 'annoyed', 'frustrated', 'mad', 'irritated', 'outraged', 'annoying', 'ridiculous', 'pathetic'],
    sadness: ['sad', 'disappointed', 'upset', 'depressed', 'unhappy', 'disappointing', 'let down', 'devastated', 'heartbroken'],
    fear: ['worried', 'scared', 'anxious', 'concerned', 'afraid', 'nervous', 'uncertain', 'insecure', 'hesitant'],
    surprise: ['surprised', 'shocked', 'unexpected', 'amazed', 'astonished', 'stunned', 'bewildered'],
    trust: ['reliable', 'trustworthy', 'confident', 'secure', 'comfortable', 'dependable', 'professional', 'consistent']
  };

  const emotions: any = {
    joy: 0,
    anger: 0,
    sadness: 0,
    fear: 0,
    surprise: 0,
    trust: 0
  };

  // Calculate emotion scores based on keyword matches
  Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
    let score = 0;
    keywords.forEach(keyword => {
      if (lowerFeedback.includes(keyword)) {
        score += 25; // Higher base score for actual matches
      }
    });
    emotions[emotion] = score;
  });

  // Context-based emotion adjustments
  if (lowerFeedback.includes('confusing') || lowerFeedback.includes('cant find') || lowerFeedback.includes('cannot find')) {
    emotions.anger += 20;
    emotions.sadness += 15;
  }

  if (lowerFeedback.includes('will not use') || lowerFeedback.includes('wont use') || lowerFeedback.includes('never again')) {
    emotions.anger += 30;
    emotions.sadness += 25;
  }

  if (lowerFeedback.includes('very') || lowerFeedback.includes('extremely') || lowerFeedback.includes('totally')) {
    // Amplify existing emotions
    Object.keys(emotions).forEach(emotion => {
      if (emotions[emotion] > 0) {
        emotions[emotion] += 15;
      }
    });
  }

  // Ensure meaningful distribution instead of normalization
  const totalScore = Object.values(emotions).reduce((sum, score) => (sum as number) + (score as number), 0) as number;

  if (totalScore > 0) {
    // Convert raw scores to percentages but keep meaningful values
    Object.keys(emotions).forEach(emotion => {
      emotions[emotion] = Math.min(100, Math.round((emotions[emotion] / totalScore) * 100));
    });
  } else {
    // Generate meaningful emotional distribution based on sentiment if no keywords found
    const sentiment = determineSentiment(feedback);
    if (sentiment === 'negative') {
      emotions.sadness = 45;
      emotions.anger = 25;
      emotions.fear = 20;
      emotions.surprise = 10;
    } else if (sentiment === 'positive') {
      emotions.joy = 50;
      emotions.trust = 30;
      emotions.surprise = 20;
    } else {
      emotions.trust = 35;
      emotions.surprise = 25;
      emotions.joy = 25;
      emotions.sadness = 15;
    }
  }

  return emotions;
}

function categorizeFeedback(feedback: string): string {
  const lowerFeedback = feedback.toLowerCase();

  const categories = {
    'Product Quality': ['product', 'quality', 'feature', 'functionality', 'performance'],
    'Customer Service': ['service', 'staff', 'support', 'help', 'representative', 'agent'],
    'Pricing': ['price', 'cost', 'expensive', 'cheap', 'value', 'money'],
    'Delivery/Shipping': ['delivery', 'shipping', 'arrived', 'package', 'fast', 'slow'],
    'User Experience': ['website', 'app', 'interface', 'easy', 'difficult', 'navigation'],
    'General': []
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerFeedback.includes(keyword))) {
      return category;
    }
  }

  return 'General';
}

function determineUrgency(feedback: string, sentiment: 'positive' | 'neutral' | 'negative'): 'low' | 'medium' | 'high' {
  const lowerFeedback = feedback.toLowerCase();

  const urgentWords = ['urgent', 'immediately', 'asap', 'emergency', 'critical', 'serious'];
  const hasUrgentWords = urgentWords.some(word => lowerFeedback.includes(word));

  // High urgency indicators
  const highUrgencyPhrases = [
    'will not use',
    'won\'t use',
    'never again',
    'very disappointed',
    'extremely disappointed',
    'completely disappointed',
    'totally disappointed'
  ];

  const hasHighUrgencyPhrase = highUrgencyPhrases.some(phrase => lowerFeedback.includes(phrase));

  if (hasUrgentWords || hasHighUrgencyPhrase) return 'high';
  if (sentiment === 'negative') return 'high';
  if (sentiment === 'neutral') return 'medium';
  return 'low';
}

function generateInsights(feedback: string, sentiment: string, emotions: any): string[] {
  const insights = [];
  const lowerFeedback = feedback.toLowerCase();

  // Priority insights based on sentiment and emotions
  if (sentiment === 'negative') {
    insights.push('Customer dissatisfaction requires immediate attention');
    if (emotions.anger > 30) insights.push('Significant anger levels detected');
    if (lowerFeedback.includes('will not use') || lowerFeedback.includes('wont use')) {
      insights.push('Critical churn risk identified');
    }
  } else if (sentiment === 'positive') {
    insights.push('Customer expresses satisfaction with the experience');
    if (emotions.joy > 40) insights.push('High levels of joy and happiness detected');
  }

  const topEmotion = Object.entries(emotions).reduce((a: any, b: any) => emotions[a[0]] > emotions[b[0]] ? a : b);
  insights.push(`Primary emotion: ${topEmotion[0]} (${topEmotion[1]}%)`);

  // Context-specific insights
  if (lowerFeedback.includes('confusing') || lowerFeedback.includes('cant find')) {
    insights.push('Usability issues affecting customer experience');
  }

  if (feedback.length > 200 && insights.length < 5) {
    insights.push('Detailed feedback indicates high engagement');
  }

  return insights.slice(0, 5); // Limit to 5 insights
}

function generateRecommendations(feedback: string, sentiment: string, urgency: string): string[] {
  const actionPlans = [];
  const lowerFeedback = feedback.toLowerCase();

  // Priority 1: Critical negative feedback
  if (sentiment === 'negative') {
    if (lowerFeedback.includes('will not use') || lowerFeedback.includes('wont use')) {
      actionPlans.push('URGENT: Contact customer within 2 hours to prevent churn');
      actionPlans.push('Escalate to retention team with decision-making authority');
    } else {
      actionPlans.push('Assign to senior support agent within 4 hours');
    }
  }

  // Priority 2: Usability issues
  if (lowerFeedback.includes('confusing') || lowerFeedback.includes('interface') || lowerFeedback.includes('cant find')) {
    if (actionPlans.length < 5) actionPlans.push('Schedule UX review session within 48 hours');
    if (actionPlans.length < 5) actionPlans.push('Create personalized tutorial for customer');
  }

  // Priority 3: Change management
  if (lowerFeedback.includes('changes') || lowerFeedback.includes('new') || lowerFeedback.includes('different')) {
    if (actionPlans.length < 5) actionPlans.push('Provide detailed change documentation');
  }

  // Priority 4: High urgency follow-up
  if (urgency === 'high' && actionPlans.length < 5) {
    actionPlans.push('Schedule follow-up call within 72 hours');
  }

  // Priority 5: Positive feedback actions
  if (sentiment === 'positive' && actionPlans.length < 5) {
    actionPlans.push('Request permission to use as testimonial');
  }

  // Fallback actions if needed
  if (actionPlans.length < 3) {
    if (sentiment === 'negative') actionPlans.push('Implement service recovery process');
    if (actionPlans.length < 5) actionPlans.push('Document feedback for team analysis');
  }

  return actionPlans.slice(0, 5); // Limit to 5 actions
}

// AI Analysis formatting functions
function formatAIAnalysis(rawAnalysis: string): string {
  if (!rawAnalysis) return "AI analysis unavailable";

  // Clean up the analysis text
  let cleaned = rawAnalysis
    .replace(/\*\*/g, '') // Remove markdown bold
    .replace(/\*/g, '') // Remove markdown italic
    .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
    .replace(/\[\d+\]/g, '') // Remove citation numbers like [1], [2]
    .replace(/\(\d+\)/g, '') // Remove citation numbers like (1), (2)
    .replace(/\[citation:\s*\d+\]/gi, '') // Remove [citation: 1] format
    .replace(/\[.*?\]/g, '') // Remove any remaining bracketed content
    .replace(/\s{2,}/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Ensure it's a complete sentence
  if (cleaned && !cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) {
    return cleaned + '.';
  }

  return cleaned || "AI analysis unavailable";
}





// NPS and CSAT calculation functions
function calculateNPSFromEVI(eviScore: number): number {
  // Convert EVI (0-100) to NPS (-100 to +100)
  // EVI 0-30 = Detractors (-100 to -34)
  // EVI 31-70 = Passives (-33 to +33)  
  // EVI 71-100 = Promoters (+34 to +100)

  if (eviScore <= 30) {
    // Detractors: Map 0-30 to -100 to -34
    return Math.round(-100 + (eviScore / 30) * 66);
  } else if (eviScore <= 70) {
    // Passives: Map 31-70 to -33 to +33
    return Math.round(-33 + ((eviScore - 30) / 40) * 66);
  } else {
    // Promoters: Map 71-100 to +34 to +100
    return Math.round(34 + ((eviScore - 70) / 30) * 66);
  }
}

function calculateCSATFromEVI(eviScore: number): number {
  // Convert EVI (0-100) to CSAT (1-5 scale)
  // EVI 0-20 = CSAT 1
  // EVI 21-40 = CSAT 2
  // EVI 41-60 = CSAT 3
  // EVI 61-80 = CSAT 4
  // EVI 81-100 = CSAT 5

  if (eviScore <= 20) return 1;
  if (eviScore <= 40) return 2;
  if (eviScore <= 60) return 3;
  if (eviScore <= 80) return 4;
  return 5;
}

export async function registerRoutes(app: Express, server?: Server): Promise<Server> {
  // Auth routes MUST be registered first (before surveyScheduleRoutes which has global auth middleware)
  // These routes are defined later in this file and need to be accessible without auth

  // Register analytics routes
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/analytics", analyticsHeatmapRoutes);
  app.use("/api/unified-analytics", unifiedAnalyticsRoutes);
  app.use("/api/advanced-analytics", advancedAnalyticsRoutes);
  app.use("/api/turnover-risks", turnoverRiskRoutes);
  app.use("/api/turnover-analytics", turnoverRateAnalyticsRoutes);

  // Register survey response analysis routes
  registerSurveyResponseRoutes(app);

  // DO NOT register surveyScheduleRoutes here yet - it has global auth middleware
  // It will be registered AFTER auth routes are defined

  // Process survey for leadership insights
  app.post("/api/leadership-insights/process/:surveyId", async (req, res) => {
    try {
      const { surveyId } = req.params;

      console.log(`[Routes] Processing survey for leadership insights: ${surveyId}`);

      const insights = await processSurveyForLeadershipInsights(surveyId);

      res.json({
        success: true,
        surveyId,
        totalResponses: insights.totalResponses,
        message: 'Survey processed successfully for leadership insights',
        insights
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to process survey',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  // Trigger retention analysis (Seeding script wrapper)
  app.post("/api/trigger-retention-analysis", authenticateToken, async (req, res) => {
    try {
      console.log("[Routes] Triggering Retention Analysis Script...");

      // Execute the seeding script
      exec("npx tsx server/scripts/seed_exit_survey_analytics.ts", (error, stdout, stderr) => {
        if (error) {
          console.error(`[Routes] Script error: ${error.message}`);
          return; // Don't block response, but log error
        }
        if (stderr) {
          console.error(`[Routes] Script stderr: ${stderr}`);
        }
        console.log(`[Routes] Script stdout: ${stdout}`);
      });

      // Respond immediately to UI, script runs in background
      res.json({
        success: true,
        message: "Retention analysis triggered successfully"
      });
    } catch (error: any) {
      console.error('[Routes] Error triggering analysis:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to trigger analysis'
      });
    }
  });


  // Get retention analysis stats
  app.get("/api/analytics/retention-stats", authenticateToken, async (req, res) => {
    try {
      // Find the "Employee Exit Survey"
      const survey = await db.select().from(surveys).where(eq(surveys.title, "Employee Exit Survey")).limit(1);

      if (!survey.length) {
        return res.json({ completed: 0, pending: 0 });
      }

      const surveyId = survey[0].id;

      // Count completed (surveyCompleted is true)
      const completed = await db.select({ count: sql<number>`count(*)` })
        .from(responses)
        .where(and(eq(responses.surveyId, surveyId), eq(responses.surveyCompleted, true)));

      // Count pending (surveyCompleted is false or null)
      const pending = await db.select({ count: sql<number>`count(*)` })
        .from(responses)
        .where(and(
          eq(responses.surveyId, surveyId),
          or(eq(responses.surveyCompleted, false), isNull(responses.surveyCompleted))
        ));

      res.json({
        completed: Number(completed[0]?.count || 0),
        pending: Number(pending[0]?.count || 0)
      });
    } catch (error: any) {
      console.error('[Routes] Error fetching retention stats:', error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Get all leadership insights with optional type filtering
  app.get("/api/dashboard/leadership-insights/all", authenticateToken, async (req, res) => {
    try {
      const { type } = req.query;

      const baseQuery = db.select().from(leadershipInsights);

      const query = type === 'retention'
        ? baseQuery.where(eq(leadershipInsights.insight, 'RETENTION_ANALYSIS'))
        : baseQuery;

      const insights = await query.orderBy(desc(leadershipInsights.createdAt));

      res.json({
        success: true,
        data: insights
      });
    } catch (error: any) {
      console.error('[Routes] Error fetching all leadership insights:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch insights'
      });
    }
  });

  // Get leadership insights for a specific survey
  app.get("/api/dashboard/leadership-insights/:surveyId", async (req, res) => {
    try {
      const { surveyId } = req.params;
      const { departmentId } = req.query;

      let query: any = db.select().from(leadershipInsights).where(eq(leadershipInsights.surveyId, surveyId));

      // Filter by department if provided
      if (departmentId) {
        query = query.where(eq(leadershipInsights.departmentId, departmentId as string));
      }

      const insights = await query;

      res.json({
        success: true,
        data: insights
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch insights'
      });
    }
  });



  // Get departments
  app.get("/api/departments", async (req, res) => {
    try {
      const depts = await db.select().from(departments).where(eq(departments.isActive, true));
      res.json({
        success: true,
        data: depts
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch departments'
      });
    }
  });

  // Process survey for action plans insights
  app.post("/api/action-plans/process/:surveyId", async (req, res) => {
    try {
      const { surveyId } = req.params;

      console.log(`[Routes] Processing survey for action plans: ${surveyId}`);

      // Return empty insights for now - actionPlansInsightsProcessor not yet implemented
      const insights: any[] = [];

      res.json({
        success: true,
        surveyId,
        totalResponses: insights.length,
        message: 'Survey processed successfully for action plans',
        insights
      });
    } catch (error: any) {
      console.error('[Routes] Error processing survey for action plans:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to process survey',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Action plans processing status (completed vs pending)
  app.get("/api/action-plans/status", async (req, res) => {
    try {
      const surveysData = await db.execute(sql`
        SELECT id, title FROM surveys
      `);

      const responseCounts = await db.execute(sql`
        SELECT survey_id, COUNT(*)::int AS count
        FROM responses
        GROUP BY survey_id
      `);

      const actionPlansCounts = await db.execute(sql`
        SELECT survey_id, COUNT(*)::int AS count
        FROM action_plans
        WHERE category IS NULL OR category <> 'system'
        GROUP BY survey_id
      `);

      const processedRows = await db.execute(sql`
        SELECT survey_id, related_insights
        FROM action_plans
        WHERE category = 'system'
          AND action_title = '__processed__'
      `);

      const responseCountMap = new Map<string, number>();
      responseCounts.rows.forEach((row: any) => {
        responseCountMap.set(row.survey_id, Number(row.count || 0));
      });

      const processedMap = new Map<string, number>();
      processedRows.rows.forEach((row: any) => {
        try {
          const related = typeof row.related_insights === "string"
            ? JSON.parse(row.related_insights)
            : row.related_insights;
          const responseIds = Array.isArray(related?.responseIds) ? related.responseIds : [];
          processedMap.set(row.survey_id, responseIds.length);
        } catch {
          processedMap.set(row.survey_id, 0);
        }
      });

      const actionPlansMap = new Map<string, number>();
      actionPlansCounts.rows.forEach((row: any) => {
        actionPlansMap.set(row.survey_id, Number(row.count || 0));
      });

      const data = surveysData.rows.map((survey: any) => {
        const totalResponses = responseCountMap.get(survey.id) || 0;
        let processedResponses = processedMap.get(survey.id) || 0;
        if (processedResponses === 0 && (actionPlansMap.get(survey.id) || 0) > 0) {
          processedResponses = totalResponses;
        }
        const pendingResponses = Math.max(totalResponses - processedResponses, 0);
        return {
          surveyId: survey.id,
          surveyTitle: survey.title,
          totalResponses,
          processedResponses,
          pendingResponses,
        };
      });

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch action plans status',
      });
    }
  });

  // Test endpoint to verify route registration
  app.get("/api/action-plans/test", (req, res) => {
    res.json({ message: "Action plans routes are working!" });
  });

  // Patch action plan - update priority, status, category, or assignedTo
  app.patch("/api/action-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { priority, status, category, assignedTo } = req.body;

      // Build update query dynamically
      const updates = [];
      if (priority !== undefined) {
        updates.push(`priority = '${priority.replace(/'/g, "''")}'`);
      }
      if (status !== undefined) {
        updates.push(`status = '${status.replace(/'/g, "''")}'`);
      }
      if (category !== undefined) {
        updates.push(`category = '${category.replace(/'/g, "''")}'`);
      }
      if (assignedTo !== undefined) {
        updates.push(`assigned_to = ${assignedTo ? `'${assignedTo.replace(/'/g, "''")}'` : 'NULL'}`);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push(`updated_at = NOW()`);

      const query = `UPDATE action_plans SET ${updates.join(', ')} WHERE id = '${id}' RETURNING *`;

      console.log('[Routes] Executing query:', query);

      const result = await db.execute(sql.raw(query));

      if (!result.rows || result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Action plan not found'
        });
      }

      res.json({
        success: true,
        message: 'Action plan updated successfully in database',
        data: result.rows[0]
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to update action plan'
      });
    }
  });

  // Delete action plan
  app.delete("/api/action-plans/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // First check if the action plan exists
      const checkResult = await db.execute(sql`
        SELECT id, action_title FROM action_plans WHERE id = ${id}
      `);

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Action plan with ID ${id} not found in database`
        });
      }

      // Now delete it
      const result = await db.execute(sql`
        DELETE FROM action_plans 
        WHERE id = ${id}
        RETURNING id, action_title
      `);

      res.json({
        success: true,
        message: 'Action plan permanently deleted from database',
        id: id,
        title: result.rows?.[0]?.action_title
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`,
        error: error.code
      });
    }
  });

  // Delete all action plans for a survey
  app.delete("/api/action-plans/survey/:surveyId", async (req, res) => {
    try {
      const { surveyId } = req.params;

      // First get count of action plans to delete
      const countResult = await db.execute(sql`
        SELECT COUNT(*)::int as count FROM action_plans 
        WHERE survey_id = ${surveyId}
        AND (category IS NULL OR category <> 'system')
      `);

      const count = countResult.rows?.[0]?.count || 0;

      if (count === 0) {
        return res.json({
          success: true,
          message: 'No action plans found to delete',
          deletedCount: 0
        });
      }

      // Delete all action plans for this survey
      const result = await db.execute(sql`
        DELETE FROM action_plans 
        WHERE survey_id = ${surveyId}
        AND (category IS NULL OR category <> 'system')
        RETURNING id
      `);

      const deletedCount = result.rows?.length || 0;

      res.json({
        success: true,
        message: `Successfully deleted ${deletedCount} action plan(s)`,
        deletedCount
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`,
        error: error.code
      });
    }
  });

  // Reset action plans processing for a survey (clear plans + processed marker)
  app.delete("/api/action-plans/survey/:surveyId/reset", async (req, res) => {
    try {
      const { surveyId } = req.params;

      const deletePlansResult = await db.execute(sql`
        DELETE FROM action_plans
        WHERE survey_id = ${surveyId}
          AND (category IS NULL OR category <> 'system')
        RETURNING id
      `);

      const deleteMarkerResult = await db.execute(sql`
        DELETE FROM action_plans
        WHERE survey_id = ${surveyId}
          AND category = 'system'
          AND action_title = '__processed__'
        RETURNING id
      `);

      const deletedPlans = deletePlansResult.rows?.length || 0;
      const deletedMarkers = deleteMarkerResult.rows?.length || 0;

      res.json({
        success: true,
        message: 'Action plans reset successfully',
        deletedPlans,
        deletedMarkers
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`,
        error: error.code
      });
    }
  });

  // Leadership insights processing status (completed vs pending)
  app.get("/api/leadership-insights/status", async (req, res) => {
    try {
      const surveysData = await db.execute(sql`
        SELECT id, title FROM surveys
      `);

      const responseCounts = await db.execute(sql`
        SELECT survey_id, COUNT(*)::int AS count
        FROM responses
        GROUP BY survey_id
      `);

      const leadershipCounts = await db.execute(sql`
        SELECT survey_id, COUNT(*)::int AS count
        FROM leadership_insights
        WHERE insight <> '__processed__'
        GROUP BY survey_id
      `);

      const processedRows = await db.execute(sql`
        SELECT survey_id, stakeholders
        FROM leadership_insights
        WHERE insight = '__processed__'
      `);

      const responseCountMap = new Map<string, number>();
      responseCounts.rows.forEach((row: any) => {
        responseCountMap.set(row.survey_id, Number(row.count || 0));
      });

      const processedMap = new Map<string, number>();
      processedRows.rows.forEach((row: any) => {
        try {
          const stakeholders = typeof row.stakeholders === "string"
            ? JSON.parse(row.stakeholders)
            : row.stakeholders;
          const responseIds = Array.isArray(stakeholders?.responseIds) ? stakeholders.responseIds : [];
          processedMap.set(row.survey_id, responseIds.length);
        } catch {
          processedMap.set(row.survey_id, 0);
        }
      });

      const leadershipMap = new Map<string, number>();
      leadershipCounts.rows.forEach((row: any) => {
        leadershipMap.set(row.survey_id, Number(row.count || 0));
      });

      const data = surveysData.rows.map((survey: any) => {
        const totalResponses = responseCountMap.get(survey.id) || 0;
        let processedResponses = processedMap.get(survey.id) || 0;
        if (processedResponses === 0 && (leadershipMap.get(survey.id) || 0) > 0) {
          processedResponses = totalResponses;
        }
        const pendingResponses = Math.max(totalResponses - processedResponses, 0);
        return {
          surveyId: survey.id,
          surveyTitle: survey.title,
          totalResponses,
          processedResponses,
          pendingResponses,
        };
      });

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch leadership insights status',
      });
    }
  });

  // Storage debug
  app.get("/api/debug/storage", async (req, res) => {
    try {
      const info = getStorageInfo();
      res.json(info);
    } catch (err) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to resolve storage info" });
    }
  });

  // Simple health check for Caspio connectivity (uses existing storage path)
  app.get("/api/debug/caspio-check", async (req, res) => {
    try {
      const info = getStorageInfo();
      if (info.mode !== 'caspio') {
        return res.json({ ok: false, mode: info.mode, message: 'Caspio is not enabled' });
      }
      try {
        const list = await storage.getSurveys();
        return res.json({ ok: true, count: Array.isArray(list) ? list.length : 0 });
      } catch (e) {
        return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : String(e) });
      }
    } catch (err) {
      console.error('Server error:', res.status); res.status(500).json({ ok: false, message: "Failed to run caspio check" });
    }
  });

  // Debug endpoint to check database connection and users
  app.get("/api/debug/users", async (req, res) => {
    try {
      const users = await storage.getUser('admin') || await storage.getUserByUsername('admin');
      const demoUser = await storage.getUser('demo') || await storage.getUserByUsername('demo');

      res.json({
        adminExists: !!users,
        demoExists: !!demoUser,
        adminData: users ? { id: users.id, username: users.username, email: users.email, role: users.role, hasPassword: !!users.password } : null,
        demoData: demoUser ? { id: demoUser.id, username: demoUser.username, email: demoUser.email, role: demoUser.role, hasPassword: !!demoUser.password } : null,
        environment: process.env.NODE_ENV || 'unknown',
        databaseUrl: process.env.DATABASE_URL ? '***configured***' : 'NOT_SET'
      });
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password, organizationId } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        // Log failed login attempt
        try {
          const { ipAddress, userAgent } = getRequestInfo(req);
          await logAuthenticationEvent(
            undefined,
            username,
            'login_failed',
            'failed',
            'password',
            undefined,
            ipAddress,
            userAgent,
            'User not found',
            undefined
          );
        } catch (err) {
          
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Validate/assign organization early (needed for logging)
      let effectiveOrgId = user.organizationId || null;

      // For existing users with plain text passwords, check directly
      // For new users, we'll use bcrypt
      let isValidPassword = false;
      if (user.password.startsWith('$2b$')) {
        // This is a bcrypt hash
        isValidPassword = await bcrypt.compare(password, user.password);
      } else {
        // This is a plain text password (existing users)
        isValidPassword = user.password === password;
      }

      if (!isValidPassword) {
        // Log failed login attempt
        try {
          const { ipAddress, userAgent } = getRequestInfo(req);
          await logAuthenticationEvent(
            user.id,
            username,
            'login_failed',
            'failed',
            'password',
            undefined,
            ipAddress,
            userAgent,
            'Invalid password',
            effectiveOrgId || undefined
          );
        } catch (err) {
          
        }
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Validate/assign organization (required if user has none, optional if user already has one)
      effectiveOrgId = user.organizationId || null;

      // If organizationId provided in request, validate it
      if (organizationId) {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
        if (!org || !org.isActive) {
          return res.status(400).json({ message: "Invalid organization" });
        }
        // If user already has different organization, reject
        if (user.organizationId && user.organizationId !== organizationId) {
          return res.status(403).json({ message: "Organization mismatch" });
        }
        effectiveOrgId = organizationId;
      }

      // User must have an organization (either from request or pre-assigned)
      if (!effectiveOrgId) {
        return res.status(400).json({ message: "No organization found for this user. Please contact an administrator." });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: effectiveOrgId
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Create session for demo and admin users
      let sessionId = null;
      try {
        if (user.role === 'admin' || user.role === 'superuser' || user.role === 'culture_admin' || username.includes('demo')) {
          const session = await createSession(user.id, effectiveOrgId, req);
          if (session) {
            sessionId = session.id;
          }

          // Log successful login
          const { ipAddress, userAgent } = getRequestInfo(req);
          await logAuthenticationEvent(
            user.id,
            username,
            'login',
            'success',
            'password',
            sessionId || undefined,
            ipAddress,
            userAgent,
            undefined,
            user.organizationId || undefined
          );
        }
      } catch (err) {
        // Silent error handling
      }

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: effectiveOrgId
        },
        sessionId
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get login and signin events for admin dashboard
  app.get("/api/auth/login-events", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user || (user.role !== 'admin' && user.role !== 'superuser' && user.role !== 'culture_admin')) {
        return res.status(403).json({ message: "Access denied" });
      }

      const loginEvents = await db
        .select({
          id: authenticationEvents.id,
          userId: authenticationEvents.userId,
          username: authenticationEvents.username,
          eventType: authenticationEvents.eventType,
          status: authenticationEvents.status,
          authMethod: authenticationEvents.authMethod,
          deviceInfo: authenticationEvents.deviceInfo,
          ipAddress: authenticationEvents.ipAddress,
          createdAt: authenticationEvents.createdAt,
          failureReason: authenticationEvents.failureReason,
        })
        .from(authenticationEvents)
        .where(
          or(
            eq(authenticationEvents.eventType, 'login'),
            eq(authenticationEvents.eventType, 'signin')
          )
        )
        .orderBy(desc(authenticationEvents.createdAt))
        .limit(100); // Get last 100 login/signin events

      res.json(loginEvents);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch login events" });
    }
  });

  // Get user profile by ID (including password for profile page)
  app.get("/api/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Return full user data including password (plain text for display)
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        password: user.password, // Include password for profile view
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const organizationId = (req.body?.organizationId as string | undefined) || userData.organizationId;

      if (!organizationId) {
        return res.status(400).json({ message: "Organization required" });
      }

      const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
      if (!org || !org.isActive) {
        return res.status(400).json({ message: "Invalid organization" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }

      // Hash password with bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      const user = await storage.createUser({
        ...userData,
        organizationId,
        password: hashedPassword
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ message: "Registration failed" });
    }
  });

  // SSO login (Google / Microsoft)
  app.get("/api/auth/sso/:provider", async (req, res) => {
    try {
      const provider = (req.params.provider || "").toLowerCase();
      const organizationId = req.query.organizationId as string | undefined;

      // organizationId is optional - required for signup, optional for signin
      const ssoState = Buffer.from(JSON.stringify({ provider, organizationId: organizationId || null, ts: Date.now() })).toString("base64url");
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      if (provider === "google") {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        if (!clientId || !redirectUri) {
          return res.status(500).send("Google SSO not configured");
        }
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid email profile",
          prompt: "select_account",
          state: ssoState,
        });
        return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
      }

      if (provider === "microsoft") {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
        const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
        if (!clientId || !redirectUri) {
          return res.status(500).send("Microsoft SSO not configured");
        }
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          response_mode: "query",
          scope: "openid email profile",
          state: ssoState,
        });
        return res.redirect(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`);
      }

      return res.status(400).send("Unsupported SSO provider");
    } catch (error) {
      console.error('SSO initialization error:', error);
      res.status(500).send("SSO initialization failed");
    }
  });

  app.get("/api/auth/sso/callback/:provider", async (req, res) => {
    try {
      const provider = (req.params.provider || "").toLowerCase();
      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

      if (!code || !state) {
        return res.status(400).send("Missing code/state");
      }

      let stateData: { provider: string; organizationId: string } | null = null;
      try {
        stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      } catch {
        return res.status(400).send("Invalid state");
      }

      if (!stateData || stateData.provider !== provider) {
        return res.status(400).send("Provider mismatch");
      }

      const organizationId = stateData.organizationId;

      // Validate organization if provided (required for signup, optional for signin)
      if (organizationId) {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId));
        if (!org || !org.isActive) {
          return res.status(400).send("Invalid organization");
        }
      }

      let tokenUrl = "";
      let tokenBody: Record<string, string> = {};

      if (provider === "google") {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;
        if (!clientId || !clientSecret || !redirectUri) {
          return res.status(500).send("Google SSO not configured");
        }
        tokenUrl = "https://oauth2.googleapis.com/token";
        tokenBody = {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        };
      } else if (provider === "microsoft") {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
        const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
        if (!clientId || !clientSecret || !redirectUri) {
          return res.status(500).send("Microsoft SSO not configured");
        }
        tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
        tokenBody = {
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        };
      } else {
        return res.status(400).send("Unsupported SSO provider");
      }

      const tokenRes = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(tokenBody),
      });
      if (!tokenRes.ok) {
        return res.status(500).send("SSO token exchange failed");
      }
      const tokenJson: any = await tokenRes.json();
      const idToken = tokenJson.id_token;
      if (!idToken) {
        return res.status(500).send("Missing id_token");
      }

      const profile: any = jwt.decode(idToken);
      const email = profile?.email || profile?.preferred_username;
      const name = profile?.name || (email ? email.split("@")[0] : undefined);
      if (!email) {
        return res.status(500).send("Email not available from SSO provider");
      }

      let user = await storage.getUserByEmail(email);

      if (user) {
        // For signin: user must already have an organization
        // For signup: we assign the provided organizationId
        if (organizationId) {
          if (user.organizationId && user.organizationId !== organizationId) {
            return res.status(403).send("Organization mismatch");
          }
          if (!user.organizationId) {
            const [updated] = await db
              .update(users)
              .set({ organizationId })
              .where(eq(users.id, user.id))
              .returning();
            user = updated || user;
          }
        } else {
          // Signin without organizationId: user must already have organization
          if (!user.organizationId) {
            return res.status(400).send("No organization found for this user. Please contact an administrator.");
          }
        }
      } else {
        // New user creation via SSO
        if (!organizationId) {
          return res.status(400).send("Organization required for new account creation");
        }

        let usernameBase = (email.split("@")[0] || "user").replace(/[^a-zA-Z0-9_\-]/g, "");
        if (!usernameBase) usernameBase = "user";
        let usernameCandidate = usernameBase;
        let attempt = 0;
        while (await storage.getUserByUsername(usernameCandidate)) {
          attempt += 1;
          usernameCandidate = `${usernameBase}${attempt}`;
        }
        const randomPassword = crypto.randomBytes(16).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        user = await storage.createUser({
          username: usernameCandidate,
          email,
          password: hashedPassword,
          role: "user",
          organizationId,
        } as any);
      }

      const session = await createSession(user.id, user.organizationId, req);
      const sessionId = session?.id;

      await logAuthenticationEvent(
        user.id,
        user.username,
        "login",
        "success",
        "sso",
        sessionId || undefined,
        undefined,
        req.headers["user-agent"] as string | undefined,
        undefined,
        user.organizationId || undefined
      );

      const token = jwt.sign(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const safeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      };

      res.setHeader("Content-Type", "text/html");
      res.send(`<!doctype html><html><head><meta charset="utf-8" /><title>Signing in...</title></head><body>
<script>
  try {
    localStorage.setItem('insightpulse_user', ${JSON.stringify(JSON.stringify(safeUser))});
    localStorage.setItem('insightpulse_token', ${JSON.stringify(token)});
  } catch (e) {}
  window.location.replace(${JSON.stringify(`${frontendUrl}/ui/dashboard`)});
</script>
Signing in...
</body></html>`);
    } catch (error) {
      console.error('SSO callback error:', error);
      res.status(500).send("SSO login failed");
    }
  });

  // Delete account endpoint
  app.delete("/api/auth/delete-account", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Delete user
      const result = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();

      if (!result || result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Log the deletion
      try {
        const { ipAddress, userAgent } = getRequestInfo(req);
        // Note: account_deleted is not a standard auth event, user deletion is handled separately
        // await logAuthenticationEvent(
        //   userId,
        //   result[0].username,
        //   'logout',
        //   'success',
        //   'direct',
        //   undefined,
        //   ipAddress,
        //   userAgent,
        //   'User deleted their account',
        //   result[0].organizationId || undefined
        // );
      } catch (err) {
        // Silent error handling
      }

      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Update profile endpoint
  app.put("/api/auth/update-profile", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { username } = req.body;

      if (!username || typeof username !== 'string' || username.trim().length === 0) {
        return res.status(400).json({ message: "Username is required" });
      }

      // Update user
      const result = await db
        .update(users)
        .set({ username: username.trim() })
        .where(eq(users.id, userId))
        .returning();

      if (!result || result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "Profile updated successfully",
        user: {
          id: result[0].id,
          username: result[0].username,
          email: result[0].email
        }
      });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Survey routes
  // Test endpoint for direct survey access without auth
  app.get("/api/surveys/test/:id", async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.json(survey);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch survey", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Require JWT so req.user is available for survey filtering
  app.get("/api/surveys", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get surveys for current user only
      const allSurveys = await storage.getSurveys();
      const userSurveys = allSurveys.filter((survey: any) => survey.createdBy === userId);

      res.json(userSurveys);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch surveys", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // PUBLIC endpoint for the shareable survey link.
  // Returns only fields safe to expose to anonymous respondents (no createdBy,
  // no internal flags). Only active surveys are accessible.
  app.get("/api/public/surveys/:id", async (req, res) => {
    try {
      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      if (survey.isActive === false) {
        return res.status(403).json({ message: "Survey is no longer active" });
      }
      return res.json({
        id: survey.id,
        title: survey.title,
        description: survey.description,
        questions: survey.questions,
        isActive: survey.isActive,
      });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  app.get("/api/surveys/:id", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const survey = await storage.getSurvey(req.params.id);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.createdBy !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // console.log('GET /api/surveys/:id', { surveyId: req.params.id, title: survey.title, questionCount: survey.questions?.length, questions: survey.questions });

      res.json(survey);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch survey", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get response count for a survey
  app.get("/api/surveys/:id/responses/count", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const surveyId = req.params.id;

      // Verify user has access to this survey
      const survey = await storage.getSurvey(surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.createdBy !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get response count
      const result = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(responses)
        .where(eq(responses.surveyId, surveyId));

      const count = result[0]?.count || 0;

      res.json({ count: Number(count) });
    } catch (error) {
      console.error('GET /api/surveys/:id/responses/count failed:', error);
      res.status(500).json({
        message: "Failed to fetch response count",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get response rate for a survey (as percentage)
  app.get("/api/surveys/:id/response-rate", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const surveyId = req.params.id;

      // Verify user has access to this survey
      const survey = await storage.getSurvey(surveyId);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      if (survey.createdBy !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get response count for this survey
      const responseResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(responses)
        .where(eq(responses.surveyId, surveyId));

      const responseCount = Number(responseResult[0]?.count || 0);

      // Get total users in system to calculate response rate
      const userResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users);

      const totalUsers = Number(userResult[0]?.count || 1); // Default to 1 to avoid division by zero

      // Calculate response rate as percentage (responses / total users * 100)
      const responseRate = totalUsers > 0 ? (responseCount / totalUsers) * 100 : 0;

      console.log(`[Response Rate] Survey: ${surveyId}, Responses: ${responseCount}, Total Users: ${totalUsers}, Rate: ${responseRate}%`);

      res.json({ 
        count: responseCount,
        responseRate: Math.round(responseRate * 10) / 10, // Round to 1 decimal place
        totalUsers,
        percentage: `${Math.round(responseRate * 10) / 10}%`
      });
    } catch (error) {
      console.error('GET /api/surveys/:id/response-rate failed:', error);
      res.status(500).json({
        message: "Failed to fetch response rate",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Debug endpoint to check response counts
  app.get("/api/debug/response-counts", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Get user's surveys
      const surveysResult = await db
        .select({ 
          id: surveys.id, 
          title: surveys.title,
          createdBy: surveys.createdBy 
        })
        .from(surveys)
        .where(eq(surveys.createdBy, userId));

      // Get response counts per survey
      const surveyIds = surveysResult.map(s => s.id);
      
      const responseData = await Promise.all(
        surveyIds.map(async (surveyId) => {
          const result = await db
            .select({ count: sql<number>`cast(count(*) as integer)` })
            .from(responses)
            .where(eq(responses.surveyId, surveyId));
          return {
            surveyId,
            responseCount: Number(result[0]?.count || 0)
          };
        })
      );

      // Get total users
      const totalUsersResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(users);
      const totalUsers = Number(totalUsersResult[0]?.count || 0);

      res.json({
        totalUsers,
        surveys: surveysResult.map(survey => {
          const respData = responseData.find(r => r.surveyId === survey.id);
          const count = respData?.responseCount || 0;
          const rate = totalUsers > 0 ? (count / totalUsers) * 100 : 0;
          return {
            id: survey.id,
            title: survey.title,
            responseCount: count,
            responseRate: `${Math.round(rate * 10) / 10}%`
          };
        })
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Debug endpoint to check all responses in system
  app.get("/api/debug/all-responses", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user || (user.role !== 'admin' && user.role !== 'superuser')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allResponses = await db.select().from(responses);
      
      res.json({
        totalResponses: allResponses.length,
        responses: allResponses.slice(0, 50).map(r => ({
          id: r.id,
          surveyId: r.surveyId,
          submittedAt: r.submittedAt
        }))
      });
    } catch (error) {
      console.error('Debug endpoint error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Database diagnostic endpoint
  app.get("/api/debug/db-status", async (req, res) => {
    try {
      const surveyCount = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(surveys);
      const responseCount = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(responses);
      const userCount = await db.select({ count: sql<number>`cast(count(*) as integer)` }).from(users);

      res.json({
        databaseConnected: true,
        tables: {
          surveys: Number(surveyCount[0]?.count || 0),
          responses: Number(responseCount[0]?.count || 0),
          users: Number(userCount[0]?.count || 0)
        }
      });
    } catch (error) {
      console.error('Database diagnostic error:', error);
      res.status(500).json({
        databaseConnected: false,
        error: error instanceof Error ? error.message : 'Database connection failed'
      });
    }
  });

  // Template Routes

  // Create a new template
  // Create a new template
  app.post("/api/templates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const templateData = insertSurveyTemplateSchema.parse(req.body);
      const template = await storage.createTemplate({
        ...templateData,
        userId: req.user.id,
        category: req.body.category || 'General',
        isPublic: req.body.isPublic || false
      });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation failed", errors: error.errors });
      }
      res.status(400).json({ message: "Failed to create template", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Get user templates
  // Get user templates
  app.get("/api/templates", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const templates = await storage.getTemplates(req.user.id);
      console.log('GET /api/templates', { userId: req.user.id, templateCount: templates.length, templates: templates.map(t => ({ id: t.id, title: t.title, questionCount: (t.questions as any)?.length || 0 })) });
      res.json(templates);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.delete("/api/templates/:id", authenticateToken, async (req: AuthRequest, res) => {
    try {
      const success = await storage.deleteTemplate(req.params.id);
      if (success) {
        res.status(204).send();
      } else {
        res.status(404).json({ message: "Template not found" });
      }
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Create new survey w/ AI (generateInitialAnalytics)
  app.post("/api/surveys", authenticateToken, async (req, res) => {
    try {
      console.log('POST /api/surveys - Request body:', { title: req.body.title, description: req.body.description, questionCount: req.body.questions?.length });
      
      const surveyData = insertSurveySchema.parse(req.body);
      const survey = await storage.createSurvey(surveyData);

      console.log('POST /api/surveys - Survey created:', { id: survey.id, title: survey.title, questionCount: (survey.questions as any)?.length || 0, questions: survey.questions });

      // Generate initial analytics for the survey
      try {
        await generateInitialAnalytics(
          survey.id,
          surveyData.title,
          surveyData.description || undefined,
          surveyData.questions as any[]
        );
      } catch (err) {
        // Don't fail the survey creation if analytics generation fails
      }

      // Log activity
      try {
        const { ipAddress, userAgent } = getRequestInfo(req);
        const userId = (req as any).user?.id || surveyData.createdBy;
        const orgId = (req as any).user?.organizationId;

        await logActivity(
          userId,
          orgId,
          'survey.created',
          'create',
          'survey',
          survey.id,
          surveyData.title,
          { questionCount: (surveyData.questions as any[]).length || 0 },
          ipAddress,
          userAgent
        );
      } catch (err) {
        // Silent error handling
      }

      res.status(201).json(survey);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Survey validation error:', error.issues);
        return res.status(400).json({ message: "Validation failed", issues: error.issues });
      }
      console.error('Survey creation error:', error);
      res.status(400).json({ message: "Failed to create survey", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/generate-survey-questions", async (req, res) => {
    try {
      const { prompt, title, description, surveyType } = req.body;

      if (!prompt || !title) {
        return res.status(400).json({ message: "Prompt and title are required" });
      }

      const questions = await generateSurveyQuestions({
        prompt,
        title,
        description: description || "",
        surveyType: surveyType || "general"
      });

      res.json({ questions });
    } catch (error) {
      console.error('POST /api/generate-survey-questions failed:', error);
      res.status(500).json({
        message: "Failed to generate survey questions",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/analytics/backfill/:surveyId", async (req, res) => {
    try {
      const surveyId = req.params.surveyId;
      const survey = await storage.getSurvey(surveyId);

      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      await generateInitialAnalytics(
        survey.id,
        survey.title,
        survey.description || "",
        (survey.questions as any[]) || []
      );

      res.json({ success: true });
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to backfill analytics", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.put("/api/surveys/:id", authenticateToken, async (req, res) => {
    try {
      const surveyId = req.params.id;
      const updates = req.body;
      const survey = await storage.updateSurvey(surveyId, updates);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }

      // Log activity
      try {
        const { ipAddress, userAgent } = getRequestInfo(req);
        const userId = (req as any).user?.id;
        const orgId = (req as any).user?.organizationId;

        await logActivity(
          userId,
          orgId,
          'survey.updated',
          'update',
          'survey',
          surveyId,
          survey.title,
          { updatedFields: Object.keys(updates) },
          ipAddress,
          userAgent
        );
      } catch (err) {
        // Silent error handling
      }

      res.json(survey);
    } catch (error) {
      console.error('Server error:', res.status); res.status(400).json({ message: "Failed to update survey", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/surveys/:id", authenticateToken, async (req, res) => {
    try {
      const survey = await storage.updateSurvey(req.params.id, req.body);
      if (!survey) return res.status(404).json({ message: "Survey not found" });
      res.json(survey);
    } catch (error) {
      res.status(400).json({ message: "Failed to update survey" });
    }
  });

  app.delete("/api/surveys/:id", authenticateToken, async (req, res) => {
    try {
      const deleted = await storage.deleteSurvey(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Survey not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to delete survey" });
    }
  });

  // Response routes
  app.get("/api/responses", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { surveyId } = req.query;
      const userSurveys = (await storage.getSurveys()).filter((survey: any) => survey.createdBy === userId);
      const allowedSurveyIds = new Set(userSurveys.map((survey: any) => survey.id));

      if (surveyId) {
        if (!allowedSurveyIds.has(surveyId as string)) {
          return res.status(403).json({ message: "Forbidden" });
        }
        const responses = await storage.getResponsesBySurvey(surveyId as string);
        return res.json(responses);
      }

      const allResponses = await storage.getResponses();
      const filteredResponses = allResponses.filter((response: any) => allowedSurveyIds.has(response.surveyId));

      res.json(filteredResponses);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch responses", error: error instanceof Error ? error.message : String(error) });
    }
  });

  // Voice Agent: start a survey call via Vapi
  // NOTE: This route is now handled by voiceRoutes.ts -> /api/start-survey
  // Keeping this for backward compatibility with old frontend code
  app.post('/api/voice/sessions', async (req, res) => {
    // Redirect to new endpoint
    const { surveyId, phone } = req.body || {};
    req.body = { phone, survey_id: surveyId };

    // Forward to the new /api/start-survey endpoint
    try {
      const response = await fetch(`http://localhost:${process.env.PORT || 5001}/api/start-survey`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, survey_id: surveyId })
      });
      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json(data);
      }
      res.status(201).json({ call: data });
    } catch (e: any) {
      console.error('Server error:', res.status); res.status(500).json({ message: 'Failed to start voice session', error: e?.message || String(e) });
    }
  });

  // Voice Agent webhook: receive variables on completion and store as responses in Caspio
  app.post(process.env.VOICE_WEBHOOK_PATH || '/api/voice/webhook', async (req, res) => {
    try {
      // Optional signature validation placeholder
      const secret = process.env.VOICE_WEBHOOK_SECRET;
      if (secret) {
        // Implement proper signature verification with Vapi if available
      }

      const body = req.body || {};
      const meta = body.metadata || body.call?.metadata || {};
      const surveyId = meta.surveyId;
      if (!surveyId) return res.status(400).json({ message: 'Missing surveyId in metadata' });

      const vars = body.variables || body.call?.variables || {};
      const answers: Record<string, any> = {};
      Object.keys(vars || {}).forEach((k) => {
        if (k.startsWith('q_')) {
          const clientId = k.substring(2); // remove q_
          answers[clientId] = vars[k];
        }
      });

      await storage.createResponse({
        surveyId,
        respondentEmail: undefined,
        answers,
      } as any);

      res.json({ ok: true });
    } catch (e: any) {
      console.error('Server error:', res.status); res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  });

  // Short survey link: /s/:id -> /survey/:id (client route)
  app.get('/s/:id', (req, res) => {
    const id = req.params.id;
    res.redirect(302, `/survey/${id}`);
  });

  // Lightweight survey summaries with question counts to reduce N+1 client requests
  app.get("/api/surveys/summary", async (_req, res) => {
    try {
      const list = await storage.getSurveys();
      const summaries = await Promise.all(
        (list as any[]).map(async (s: any) => {
          try {
            const details = await storage.getSurvey(s.id);
            const questionCount = Array.isArray((details as any)?.questions)
              ? (details as any).questions.length
              : 0;
            return {
              id: s.id,
              title: s.title,
              description: s.description,
              isActive: (s as any).isActive ?? (s as any).is_published ?? true,
              questionCount,
            };
          } catch (e) {
            return {
              id: s.id,
              title: s.title,
              description: s.description,
              isActive: (s as any).isActive ?? (s as any).is_published ?? true,
              questionCount: 0,
            };
          }
        })
      );
      res.json(summaries);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch survey summaries" });
    }
  });

  app.post("/api/responses", async (req, res) => {
    try {
      const responseData = insertResponseSchema.parse(req.body);
      const response = await storage.createResponse(responseData);

      // Trigger AI analysis asynchronously (don't block response)
      processSurveyResponse(
        response.surveyId!,
        response.id,
        response.answers as Record<string, any>,
        response.respondentEmail || undefined
      ).catch(() => {});

      res.status(201).json(response);
    } catch (error) {
      console.error('Response submission error:', error);
      res.status(400).json({
        message: "Failed to submit response",
        error: error instanceof Error ? error.message : 'Unknown error',
        details: req.body
      });
    }
  });

  // Analytics routes
  app.get("/api/analytics", authenticateToken, async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const analytics = await storage.getAnalytics();

      // Enhanced analytics with trends and distribution data
      const allResponses = await storage.getResponses();
      const allSurveys = await storage.getSurveys();

      const surveys = allSurveys.filter((survey: any) => survey.createdBy === userId);
      const allowedSurveyIds = new Set(surveys.map((survey: any) => survey.id));
      const responses = allResponses.filter((response: any) => allowedSurveyIds.has(response.surveyId));

      // Calculate emotion trends (mock data for visualization)
      const emotionTrends = [
        { date: '2025-01-01', joy: 45, anger: 10, sadness: 15, fear: 8, surprise: 12, trust: 35 },
        { date: '2025-01-07', joy: 50, anger: 8, sadness: 12, fear: 6, surprise: 15, trust: 40 },
        { date: '2025-01-14', joy: 55, anger: 5, sadness: 10, fear: 4, surprise: 18, trust: 45 },
        { date: '2025-01-21', joy: 60, anger: 3, sadness: 8, fear: 3, surprise: 20, trust: 50 },
        { date: '2025-01-28', joy: 58, anger: 4, sadness: 9, fear: 5, surprise: 19, trust: 48 }
      ];

      // Calculate sentiment distribution
      const positiveCount = responses.filter((r: any) => r.eviScore >= 70).length;
      const neutralCount = responses.filter((r: any) => r.eviScore >= 40 && r.eviScore < 70).length;
      const negativeCount = responses.filter((r: any) => r.eviScore < 40).length;
      const totalResponses = responses.length || 1;

      const distribution = {
        positive: Math.round((positiveCount / totalResponses) * 100),
        neutral: Math.round((neutralCount / totalResponses) * 100),
        negative: Math.round((negativeCount / totalResponses) * 100)
      };

      // Enhanced response with comprehensive data
      const enhancedAnalytics = {
        ...analytics,
        totalSurveys: surveys.length,
        trends: {
          emotion: emotionTrends
        },
        distribution,
        kpis: {
          evi: analytics.averageEVI,
          nps: analytics.averageNPS,
          csat: analytics.averageCSAT,
          responseRate: 68 // Mock response rate
        }
      };

      res.json(enhancedAnalytics);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Feedback Analysis route
  app.post("/api/analyze-feedback", async (req, res) => {
    try {
      const { feedback } = req.body;

      if (!feedback || typeof feedback !== 'string') {
        return res.status(400).json({ message: "Feedback text is required" });
      }

      // Check RAG cache for similar feedback first
      const similarFeedback = findSimilarFeedback(feedback);
      if (similarFeedback) {
        return res.json(similarFeedback.analysis);
      }

      // Generate core analysis first
      const sentiment = determineSentiment(feedback);
      const eviScore = calculateEVIScore(feedback, sentiment);
      const emotions = analyzeEmotions(feedback);
      const category = categorizeFeedback(feedback);
      const urgency = determineUrgency(feedback, sentiment);
      const npsScore = calculateNPSFromEVI(eviScore);
      const csatScore = calculateCSATFromEVI(eviScore);

      const insights = generateInsights(feedback, sentiment, emotions);
      const recommendations = generateRecommendations(feedback, sentiment, urgency);

      let aiAnalysis = "AI analysis unavailable";

      // Generate comprehensive AI analysis for all cases
      const topEmotion = Object.entries(emotions).reduce((a: any, b: any) => emotions[a[0]] > emotions[b[0]] ? a : b);
      const emotionName = topEmotion[0];
      const emotionPercent = topEmotion[1] as number;
      const lowerFeedback = feedback.toLowerCase();

      // Try Perplexity API for negative/high-urgency feedback, otherwise use advanced local analysis
      if ((sentiment === 'negative' || urgency === 'high') && process.env.PERPLEXITY_API_KEY) {
        try {
          const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'sonar',
              messages: [
                {
                  role: 'system',
                  content: 'Provide a brief 2-sentence analysis of this customer feedback. Focus on key issues and urgency.'
                },
                {
                  role: 'user',
                  content: `Brief analysis needed: "${feedback}"`
                }
              ],
              max_tokens: 100,
              temperature: 0.1
            })
          });

          if (perplexityResponse.ok) {
            const perplexityData = await perplexityResponse.json();
            const rawAnalysis = perplexityData.choices[0]?.message?.content || "";
            if (rawAnalysis && rawAnalysis.length > 10) {
              aiAnalysis = formatAIAnalysis(rawAnalysis);
            }
          }
        } catch (error) {
          // Silent error handling
        }
      }

      // Use advanced local analysis if API didn't provide results or for other cases
      if (aiAnalysis === "AI analysis unavailable") {
        if (sentiment === 'positive') {
          if (emotionName === 'joy' && emotionPercent > 70) {
            aiAnalysis = `Customer demonstrates exceptional satisfaction with strong ${emotionName} (${emotionPercent}%). This feedback indicates successful service delivery and represents a potential brand advocate. The positive emotional response suggests effective problem resolution and exceeded expectations.`;
          } else {
            aiAnalysis = `Customer expresses positive sentiment with ${emotionName} as the primary emotion (${emotionPercent}%). The feedback reflects satisfaction with the service or product, indicating successful customer experience delivery. This represents an opportunity for testimonial collection and loyalty building.`;
          }
        } else if (sentiment === 'negative') {
          if (lowerFeedback.includes('will not use') || lowerFeedback.includes('wont use')) {
            aiAnalysis = `Critical customer churn risk detected with primary emotion being ${emotionName} (${emotionPercent}%). The customer has explicitly stated intent to discontinue service, indicating severe dissatisfaction. Immediate intervention required to prevent revenue loss and potential negative word-of-mouth impact.`;
          } else if (lowerFeedback.includes('confusing') || lowerFeedback.includes('cant find')) {
            aiAnalysis = `Usability issues identified causing customer frustration, with ${emotionName} (${emotionPercent}%) as the dominant emotional response. The feedback indicates interface or process complexity that impairs user experience. UX optimization and user guidance improvements are essential to prevent further dissatisfaction.`;
          } else {
            aiAnalysis = `Customer dissatisfaction detected with ${emotionName} (${emotionPercent}%) as the primary emotional driver. The negative feedback suggests service gaps or unmet expectations requiring systematic review. Prompt response and service recovery protocols should be implemented to restore customer confidence.`;
          }
        } else {
          aiAnalysis = `Customer provides balanced feedback with ${emotionName} (${emotionPercent}%) as the primary emotional indicator. The neutral sentiment suggests mixed experiences with both positive and improvement areas identified. This feedback offers valuable insights for incremental service enhancements and customer experience optimization.`;
        }
      }

      const analysis = {
        sentiment,
        eviScore,
        npsScore,
        csatScore,
        emotions,
        insights,
        recommendations,
        aiAnalysis,
        category,
        urgency
      };

      // Cache the analysis for future similar feedback
      cacheFeedbackAnalysis(feedback, analysis);

      // Store analytics in database for admin dashboard
      try {
        // Determine user information
        const user = (req as any).user;
        const customerEmail = req.body.userInfo?.email || user?.email || null;
        const customerName = req.body.userInfo?.name || (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null) || null;
        const userId = user?.id || null;
        const userType = user ? "registered" : "guest";

        await storage.createFeedbackAnalytics({
          feedbackText: feedback,
          sentiment,
          eviScore,
          npsScore,
          csatScore,
          emotions,
          insights,
          recommendations,
          aiAnalysis,
          category,
          urgency,
          customerEmail,
          customerName,
          userId,
          userType,
          source: 'feedback_analyzer'
        });
      } catch (error) {
        // Silent error handling
      }

      res.json(analysis);
    } catch (error) {
      console.error('Feedback analysis error:', error);
      res.status(500).json({ message: "Failed to analyze feedback" });
    }
  });

  // Admin Dashboard Routes
  app.get('/api/admin/dashboard', async (req, res) => {
    try {
      const dashboardData = await storage.getAnalyticsDashboardData();
      res.json(dashboardData);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to retrieve dashboard data' });
    }
  });

  app.get('/api/admin/feedback-analytics', async (req, res) => {
    try {
      const { status, urgency, limit = 50 } = req.query;

      let feedbackData;
      if (status) {
        feedbackData = await storage.getFeedbackAnalyticsByStatus(status as string);
      } else if (urgency) {
        feedbackData = await storage.getFeedbackAnalyticsByUrgency(urgency as string);
      } else {
        feedbackData = await storage.getFeedbackAnalytics();
      }

      // Limit results if needed
      const limitNum = parseInt(limit as string);
      const limitedData = feedbackData.slice(0, limitNum);

      res.json(limitedData);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to retrieve feedback analytics' });
    }
  });

  app.patch('/api/admin/feedback-analytics/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updatedAnalytics = await storage.updateFeedbackAnalytics(id, updates);
      if (!updatedAnalytics) {
        return res.status(404).json({ error: 'Feedback analytics not found' });
      }

      res.json(updatedAnalytics);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to update feedback analytics' });
    }
  });

  // Admin Dashboard Statistics Endpoint
  app.get("/api/admin/dashboard-stats", authenticateToken, async (req: AuthRequest, res) => {
    try {
      // Check if user is admin or has dashboard.view permission
      if (req.user.role !== 'admin' && req.user.role !== 'superuser') {
        // Check via permission: dashboard.view
        const { db } = await import('./db');
        const { permissions: permsTable, rolePermissions: rpTable, userRoles: urTable } = await import('@shared/schema');
        const { inArray, eq: eqOp } = await import('drizzle-orm');
        const userRolesList = await db.select({ roleId: urTable.roleId }).from(urTable).where(eqOp(urTable.userId, req.user.id));
        const roleIds = userRolesList.map((r: any) => r.roleId);
        if (roleIds.length === 0) return res.status(403).json({ error: 'Admin access required' });
        const userPerms = await db.select({ code: permsTable.code }).from(rpTable).innerJoin(permsTable, eqOp(rpTable.permissionId, permsTable.id)).where(inArray(rpTable.roleId, roleIds));
        if (!userPerms.some((p: any) => p.code === 'admin.dashboard.view')) {
          return res.status(403).json({ error: 'Permission denied: admin.dashboard.view not granted' });
        }
      }

      // Get all users in the current organization
      const allUsers = await storage.getAllUsers();
      const orgUsers = allUsers.filter((u: any) => u.organizationId === req.user.organizationId);

      // Get all surveys
      const allSurveys = await storage.getAllSurveys();

      // Get all responses
      const allResponses = await storage.getAllResponses();

      // Calculate stats - filter by organization users
      const totalUsers = orgUsers.length;
      // Filter for active surveys only, created by users in this organization
      const activeSurveys = allSurveys.filter((s: any) =>
        s.isActive !== false && orgUsers.some((u: any) => u.id === s.createdBy)
      );

      // Since we don't have lastLogin, mark users as active if they have surveys or responses
      const activeUsers = orgUsers.filter((u: any) => {
        const userSurveys = activeSurveys.filter((s: any) => s.createdBy === u.id);
        const hasActivity = userSurveys.length > 0;
        return hasActivity;
      }).length;

      const totalSurveys = activeSurveys.length;
      const totalResponses = allResponses.filter((r: any) =>
        activeSurveys.some((s: any) => s.id === r.surveyId)
      ).length;
      const avgResponseRate = totalSurveys > 0
        ? (totalResponses / (totalSurveys * Math.max(totalUsers, 1))) * 100
        : 0;

      // User activity details
      const userActivity = orgUsers.map((u: any) => {
        const userSurveys = activeSurveys.filter((s: any) => s.createdBy === u.id);
        const userResponses = allResponses.filter((r: any) =>
          userSurveys.some((s: any) => s.id === r.surveyId)
        );

        return {
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role || 'user',
          createdAt: u.createdAt,
          surveyCount: userSurveys.length,
          responseCount: userResponses.length,
          status: u.isActive !== false ? 'active' : 'inactive'
        };
      });

      // Top surveys by response count
      const topSurveys = activeSurveys
        .map((s: any) => {
          const surveyResponses = allResponses.filter((r: any) => r.surveyId === s.id);
          const creator = allUsers.find((u: any) => u.id === s.createdBy);
          return {
            id: s.id,
            title: s.title,
            createdBy: creator?.username || 'Unknown',
            responseCount: surveyResponses.length,
            createdAt: s.createdAt
          };
        })
        .sort((a: any, b: any) => b.responseCount - a.responseCount)
        .slice(0, 10);

      // Generate trend data (last 7 days)
      const now = new Date();
      const usersTrend = [];
      const responseTrend = [];

      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const usersCount = allUsers.filter((u: any) => {
          const createdDate = new Date(u.createdAt).toISOString().split('T')[0];
          return createdDate <= dateStr;
        }).length;

        const responsesCount = allResponses.filter((r: any) => {
          const createdDate = new Date(r.submittedAt || r.createdAt).toISOString().split('T')[0];
          return createdDate === dateStr;
        }).length;

        usersTrend.push({ date: dateStr, users: usersCount });
        responseTrend.push({ date: dateStr, responses: responsesCount });
      }

      res.json({
        totalUsers,
        activeUsers,
        totalSurveys,
        totalResponses,
        avgResponseRate: Math.round(avgResponseRate * 10) / 10,
        usersTrend,
        responseTrend,
        userActivity: userActivity.sort((a: any, b: any) => b.surveyCount - a.surveyCount),
        topSurveys
      });
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ error: 'Failed to retrieve dashboard statistics' });
    }
  });

  // Notifications routes
  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifications = await storage.getNotifications(req.params.userId);
      res.json(notifications);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationRead(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Admin: Audit Logs
  app.get("/api/admin/audit-logs", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || (user.role !== 'admin' && user.role !== 'superuser')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await (storage as any).getAuditLogs?.(limit) || [];
      res.json(logs);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Admin: SSO Providers - GET list
  app.get("/api/sso/providers", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || (user.role !== 'admin' && user.role !== 'superuser')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Return configured SSO providers from environment
      const providers = [];

      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        providers.push({
          id: 'google',
          name: 'Google',
          type: 'oauth2',
          enabled: true,
          clientId: process.env.GOOGLE_CLIENT_ID,
          endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          createdAt: new Date().toISOString()
        });
      }

      if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
        providers.push({
          id: 'microsoft',
          name: 'Microsoft',
          type: 'oauth2',
          enabled: true,
          clientId: process.env.MICROSOFT_CLIENT_ID,
          endpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          createdAt: new Date().toISOString()
        });
      }

      res.json(providers);
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to fetch SSO providers" });
    }
  });

  // Admin: SSO Providers - POST (add new)
  app.post("/api/sso/providers", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || (user.role !== 'admin' && user.role !== 'superuser' && user.role !== 'culture_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { type, clientId, endpoint } = req.body;

      if (!type || !clientId) {
        return res.status(400).json({ message: "Missing required fields: type, clientId" });
      }

      // In a real implementation, you would save this to a database
      // For now, we just return success but suggest storing in environment
      res.json({
        id: clientId.substring(0, 8),
        name: type.charAt(0).toUpperCase() + type.slice(1),
        type: 'oauth2',
        enabled: true,
        clientId,
        endpoint: endpoint || 'https://oauth-endpoint.example.com',
        createdAt: new Date().toISOString(),
        message: 'Note: To persist SSO provider settings, update environment variables'
      });
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to add SSO provider" });
    }
  });

  // Admin: SSO Providers - DELETE
  app.delete("/api/sso/providers/:id", authenticateToken, async (req, res) => {
    try {
      const user = (req as AuthRequest).user;
      if (!user || (user.role !== 'admin' && user.role !== 'superuser' && user.role !== 'culture_admin')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // In a real implementation, you would delete from database
      // For now, we just return success
      res.json({ message: "SSO provider removed successfully" });
    } catch (error) {
      console.error('Server error:', res.status); res.status(500).json({ message: "Failed to delete SSO provider" });
    }
  });

  // ===== ACTION ITEMS API =====

  // Get all action items for a survey
  app.get("/api/action-items", async (req, res) => {
    try {
      const { surveyId, departmentId, status } = req.query;

      const { actionItems } = await import("@shared/schema");
      let query = db.select().from(actionItems);

      const conditions = [];
      if (surveyId) conditions.push(eq(actionItems.surveyId, surveyId as string));
      if (departmentId && departmentId !== "all") conditions.push(eq(actionItems.departmentId, departmentId as string));
      if (status) conditions.push(eq(actionItems.status, status as string));

      if (conditions.length > 0) {
        query = (query as any).where(or(...conditions));
      }

      const items = await query;

      res.json({
        success: true,
        data: items,
        total: items.length
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch action items'
      });
    }
  });

  // Get single action item with details
  app.get("/api/action-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { actionItems } = await import("@shared/schema");

      const item = await db.select().from(actionItems).where(eq(actionItems.id, id));

      if (!item || item.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Action item not found'
        });
      }

      res.json({
        success: true,
        data: item[0]
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch action item'
      });
    }
  });

  // Update action item status/priority
  app.put("/api/action-items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, priority, actualImpact, completedAt } = req.body;

      const { actionItems } = await import("@shared/schema");

      const updateData: any = { updatedAt: new Date() };
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (actualImpact) updateData.actualImpact = actualImpact;
      if (completedAt && status === 'completed') updateData.completedAt = new Date(completedAt);

      const updated = await db.update(actionItems)
        .set(updateData)
        .where(eq(actionItems.id, id))
        .returning();

      res.json({
        success: true,
        message: 'Action item updated successfully',
        data: updated[0]
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to update action item'
      });
    }
  });

  // ===== TEAM METRICS & COMPARISON API =====

  // Get team metrics for comparison
  app.get("/api/team-metrics", async (req, res) => {
    try {
      const { departmentId } = req.query;

      // Get all departments with their insights
      let deptQuery = db.select().from(departments);
      if (departmentId && departmentId !== "all") {
        deptQuery = (deptQuery as any).where(eq(departments.id, departmentId as string));
      }

      const depts = await deptQuery;

      // For each department, get metrics
      const teamMetrics = await Promise.all(depts.map(async (dept) => {
        const insights = await db.select().from(leadershipInsights)
          .where(eq(leadershipInsights.departmentId, dept.id));

        const avgEngagement = insights.length > 0
          ? insights.reduce((sum: number, i: any) => sum + (i.engagementScore || 0), 0) / insights.length
          : 0;

        const avgStrengths = insights.length > 0
          ? insights.filter((i: any) => i.strengths).length
          : 0;

        const topRisks = insights
          .filter((i: any) => i.risks && Array.isArray(i.risks))
          .flatMap((i: any) => i.risks)
          .slice(0, 3);

        const actionItemsCount = await db.select().from(actionItems)
          .where(eq(actionItems.departmentId, dept.id));

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          teamSize: insights.length,
          avgEngagement: Math.round(avgEngagement * 100) / 100,
          insightsGenerated: insights.length,
          topRisks: topRisks,
          actionItemsCount: actionItemsCount.length,
          lastUpdated: insights.length > 0 ? insights[0].createdAt : null
        };
      }));

      res.json({
        success: true,
        data: teamMetrics
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch team metrics'
      });
    }
  });

  // Get HR metrics and aggregations
  app.get("/api/hr-metrics", async (req, res) => {
    try {
      const { interventions } = await import("@shared/schema");

      // Get all interventions with their details
      const allInterventions = await db.select().from(interventions);

      // Group by priority/urgency for matrix view
      const matrix = {
        critical_immediate: allInterventions.filter((i: any) => i.priority === 'critical' && i.urgency === 'immediate'),
        critical_high: allInterventions.filter((i: any) => i.priority === 'critical' && i.urgency === 'high'),
        high_immediate: allInterventions.filter((i: any) => i.priority === 'high' && i.urgency === 'immediate'),
        high_high: allInterventions.filter((i: any) => i.priority === 'high' && i.urgency === 'high'),
        medium: allInterventions.filter((i: any) => i.priority === 'medium'),
        low: allInterventions.filter((i: any) => i.priority === 'low'),
      };

      // Summary stats
      const summary = {
        totalInterventions: allInterventions.length,
        activeInterventions: allInterventions.filter((i: any) => i.status === 'in_progress').length,
        completedInterventions: allInterventions.filter((i: any) => i.status === 'completed').length,
        plannedInterventions: allInterventions.filter((i: any) => i.status === 'planned').length,
        avgROI: allInterventions.length > 0
          ? allInterventions.reduce((sum: any, i: any) => sum + (parseFloat(i.roi as string) || 0), 0) / allInterventions.length
          : 0,
      };

      res.json({
        success: true,
        data: {
          matrix,
          summary,
          interventions: allInterventions
        }
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch HR metrics'
      });
    }
  });

  // ===== ANALYTICS/TRENDS API =====

  // Get historical trends for a survey
  app.get("/api/analytics/trends", async (req, res) => {
    try {
      const { surveyId, metric = "engagement" } = req.query;

      if (!surveyId) {
        return res.status(400).json({
          success: false,
          message: 'surveyId parameter required'
        });
      }

      // Get insights grouped by date for trend analysis
      const insights = await db.select().from(leadershipInsights)
        .where(eq(leadershipInsights.surveyId, surveyId as string));

      // Group by date
      const trendsByDate = new Map<string, any[]>();
      insights.forEach((insight: any) => {
        const date = new Date(insight.createdAt).toISOString().split('T')[0];
        if (!trendsByDate.has(date)) {
          trendsByDate.set(date, []);
        }
        trendsByDate.get(date)!.push(insight);
      });

      // Calculate metrics by date
      const trends = Array.from(trendsByDate.entries())
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, dateInsights]) => {
          const engagementScores = dateInsights.map((i: any) => i.engagementScore || 0);
          const npsScores = dateInsights.map((i: any) => i.npsScore || 0);

          return {
            date,
            engagement: Math.round(engagementScores.reduce((a, b) => a + b, 0) / engagementScores.length * 100) / 100,
            nps: Math.round(npsScores.reduce((a, b) => a + b, 0) / npsScores.length * 100) / 100,
            responsesCount: dateInsights.length,
            avgStrengths: dateInsights.filter((i: any) => i.strengths).length,
            avgRisks: dateInsights.filter((i: any) => i.risks).length
          };
        });

      res.json({
        success: true,
        data: trends,
        metric
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch trends'
      });
    }
  });

  // Get individual response details for drill-down
  app.get("/api/responses/:insightId", async (req, res) => {
    try {
      const { insightId } = req.params;

      const insight = await db.select().from(leadershipInsights)
        .where(eq(leadershipInsights.id, insightId));

      if (!insight || insight.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Insight not found'
        });
      }

      const insightData = insight[0];

      // Get the responses for this insight
      const responseData = await db.select().from(responses)
        .where(eq(responses.surveyId, insightData.surveyId));

      // Get the survey to get question details
      const survey = await db.select().from(surveys)
        .where(eq(surveys.id, insightData.surveyId));

      if (!survey || survey.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Survey not found'
        });
      }

      const questions = survey[0].questions as any[];

      // Match responses to questions
      const detailedResponses = responseData.slice(0, 5).map((resp: any) => {
        const answers = resp.answers as Record<string, any>;
        return {
          respondentEmail: resp.respondentEmail,
          eviScore: resp.eviScore,
          npsScore: resp.npsScore,
          answers: questions.map((q) => ({
            questionId: q.id,
            question: q.question,
            answer: answers[q.id] || 'N/A',
            type: q.type
          }))
        };
      });

      res.json({
        success: true,
        data: {
          insight: insightData,
          respondentCount: responseData.length,
          detailedResponses
        }
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch response details'
      });
    }
  });

  // Get comparison data between team and company average
  app.get("/api/analytics/compare", async (req, res) => {
    try {
      const { departmentId, surveyId } = req.query;

      if (!surveyId) {
        return res.status(400).json({
          success: false,
          message: 'surveyId parameter required'
        });
      }

      // Get all insights for the survey
      const allInsights = await db.select().from(leadershipInsights)
        .where(eq(leadershipInsights.surveyId, surveyId as string));

      // Calculate company average
      const companyAvg = {
        engagement: allInsights.length > 0
          ? Math.round(allInsights.reduce((sum: number, i: any) => sum + (i.engagementScore || 0), 0) / allInsights.length * 100) / 100
          : 0,
        nps: allInsights.length > 0
          ? Math.round(allInsights.reduce((sum: number, i: any) => sum + (i.npsScore || 0), 0) / allInsights.length * 100) / 100
          : 0,
        strengthsCount: allInsights.filter((i: any) => i.strengths).length,
        risksCount: allInsights.filter((i: any) => i.risks).length,
      };

      // Get department data if specified
      let departmentAvg = null;
      if (departmentId && departmentId !== "all") {
        const deptInsights = allInsights.filter((i: any) => i.departmentId === departmentId);

        departmentAvg = {
          engagement: deptInsights.length > 0
            ? Math.round(deptInsights.reduce((sum: number, i: any) => sum + (i.engagementScore || 0), 0) / deptInsights.length * 100) / 100
            : 0,
          nps: deptInsights.length > 0
            ? Math.round(deptInsights.reduce((sum: number, i: any) => sum + (i.npsScore || 0), 0) / deptInsights.length * 100) / 100
            : 0,
          strengthsCount: deptInsights.filter((i: any) => i.strengths).length,
          risksCount: deptInsights.filter((i: any) => i.risks).length,
        };
      }

      res.json({
        success: true,
        data: {
          companyAverage: companyAvg,
          departmentAverage: departmentAvg,
          isAboveAverage: departmentAvg
            ? departmentAvg.engagement > companyAvg.engagement
            : null
        }
      });
    } catch (error: any) {
      console.error('Server error:', res.status); res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch comparison data'
      });
    }
  });

  // High-Risk Indicator Detection Routes
  app.post("/api/risk-detection/start", authenticateToken, async (req, res) => {
    try {
      const { surveyId } = req.body;
      const userId = (req as any).user?.id;

      if (!surveyId) {
        return res.status(400).json({ message: "Survey ID is required" });
      }

      const { startRiskDetectionBatch } = await import('./services/riskDetectionService');
      const result = await startRiskDetectionBatch(surveyId, userId, 50);

      res.json(result);
    } catch (error: any) {
      console.error('[RiskDetection] Error starting batch:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start risk detection',
        error: error.message,
      });
    }
  });

  app.get("/api/risk-detection/batch/:batchId", authenticateToken, async (req, res) => {
    try {
      const { batchId } = req.params;
      const { getBatchStatus } = await import('./services/riskDetectionService');
      const status = await getBatchStatus(batchId);

      if (!status) {
        return res.status(404).json({ message: "Batch not found" });
      }

      res.json(status);
    } catch (error: any) {
      console.error('[RiskDetection] Error getting batch status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch batch status',
        error: error.message,
      });
    }
  });

  app.get("/api/risk-detection/survey/:surveyId", authenticateToken, async (req, res) => {
    try {
      const { surveyId } = req.params;
      const { getSurveyRiskSummary } = await import('./services/riskDetectionService');
      const summary = await getSurveyRiskSummary(surveyId);

      if (!summary) {
        return res.status(404).json({ message: "No risk detection data found" });
      }

      res.json(summary);
    } catch (error: any) {
      console.error('[RiskDetection] Error getting survey summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch risk summary',
        error: error.message,
      });
    }
  });

  app.get("/api/risk-detection/results/:responseId", authenticateToken, async (req, res) => {
    try {
      const { responseId } = req.params;

      const result = await db
        .select()
        .from(riskDetectionResults)
        .where(eq(riskDetectionResults.responseId, responseId))
        .then(results => results[0]);

      if (!result) {
        return res.status(404).json({ message: "No risk detection results found" });
      }

      res.json(result);
    } catch (error: any) {
      console.error('[RiskDetection] Error getting results:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch risk results',
        error: error.message,
      });
    }
  });

  // Register surveyScheduleRoutes at the END (after all auth routes) 
  // because it has router.use(authenticateToken) which applies to all subsequent routes
  app.use("/api", surveyScheduleRoutes);

  // GET organization employees - for assigning action plans
  app.get("/api/users", authenticateToken, async (req: any, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const orgId = user[0]?.organizationId;

      console.log(`[API /users] userId: ${userId}, orgId: ${orgId}`);

      if (!orgId) {
        return res.status(401).json({ error: "No organization found" });
      }

      // Get all employees in the organization from employees table
      const orgEmployees = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          fullName: employees.fullName,
          username: employees.fullName, // Use fullName as username for display
          email: employees.email,
        })
        .from(employees)
        .where(eq(employees.organizationId, orgId))
        .orderBy(employees.firstName);

      console.log(`[API /users] Found ${orgEmployees.length} employees in organization ${orgId}`);
      res.json(orgEmployees);
    } catch (error) {
      console.error("Error fetching organization employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  // GET department NPS - for dashboard Overall NPS display
  app.get("/api/department-nps", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const orgId = user[0]?.organizationId;

      if (!orgId) {
        return res.status(401).json({ error: "No organization found" });
      }

      // Get current month/year or from query params
      const now = new Date();
      const month = req.query.month ? parseInt(String(req.query.month)) : now.getMonth() + 1;
      const year = req.query.year ? parseInt(String(req.query.year)) : now.getFullYear();

      // Fetch department NPS data
      const npsData = await db
        .select({
          id: departmentNps.id,
          departmentId: departmentNps.departmentId,
          departmentName: departments.name,
          npsScore: departmentNps.npsScore,
          promoters: departmentNps.promoters,
          passives: departmentNps.passives,
          detractors: departmentNps.detractors,
          totalResponses: departmentNps.totalResponses,
        })
        .from(departmentNps)
        .leftJoin(departments, eq(departmentNps.departmentId, departments.id))
        .where(
          and(
            eq(departmentNps.organizationId, orgId),
            eq(departmentNps.periodMonth, month),
            eq(departmentNps.periodYear, year)
          )
        )
        .orderBy(sql`CAST(${departmentNps.npsScore} AS NUMERIC) DESC`);

      // Calculate overall NPS
      const totalPromotedrs = npsData.reduce((sum: number, d: any) => sum + (d.promoters || 0), 0);
      const totalDetractors = npsData.reduce((sum: number, d: any) => sum + (d.detractors || 0), 0);
      const totalResponses = npsData.reduce((sum: number, d: any) => sum + (d.totalResponses || 0), 0);
      const overallNps =
        totalResponses > 0
          ? Math.round(((totalPromotedrs - totalDetractors) / totalResponses) * 100)
          : 0;

      res.json({
        overallNps,
        month,
        year,
        departments: npsData,
        totalResponses,
      });
    } catch (error) {
      console.error("Error fetching department NPS:", error);
      res.status(500).json({ error: "Failed to fetch department NPS" });
    }
  });
  
  // Register action planning routes
  app.use("/api", actionPlanningRoutes);

  const httpServer = server ?? createServer(app);
  return httpServer;
}

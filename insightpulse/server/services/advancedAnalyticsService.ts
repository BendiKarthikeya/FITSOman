import { db } from "../db";
import { 
  responses,
  analyticsSurveys,
  users,
  departments,
  organizations
} from "../../shared/schema";
import { eq, and, gte, lte, sql, inArray, desc, asc } from "drizzle-orm";

/**
 * Advanced Analytics Service
 * Provides trend analysis, sentiment tracking, and engagement driver detection
 */

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface TrendAnalysisParams {
  surveyId?: string;
  metricType: 'csat' | 'nps' | 'engagement' | 'sentiment';
  periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  periodStart: Date;
  periodEnd: Date;
  segmentType?: 'department' | 'location' | 'role' | 'overall';
  segmentValue?: string;
}

export interface TrendResult {
  id: string;
  metricType: string;
  periodStart: Date;
  periodEnd: Date;
  currentValue: number;
  previousValue: number | null;
  changeValue: number | null;
  changePercentage: number | null;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  isSignificant: boolean;
  confidenceLevel: number | null;
}

export interface SentimentAnalysisResult {
  id: string;
  surveyId: string;
  responseId: string;
  sentimentLabel: 'positive' | 'negative' | 'neutral' | 'mixed';
  sentimentScore: number;
  confidence: number;
  emotions: Record<string, number>;
  keyPhrases: string[];
  topics: string[];
  departmentId?: string;
  location?: string;
  userRole?: string;
}

export interface EngagementDriver {
  id: string;
  surveyId: string;
  driverName: string;
  driverCategory: string;
  impactScore: number;
  correlationCoefficient: number;
  sampleSize: number;
  statisticalSignificance: number;
  relatedQuestions: string[];
  affectedSegments: any[];
  description: string;
  recommendation: string;
}

export interface SegmentationFilters {
  departmentIds?: string[];
  locations?: string[];
  roles?: string[];
  organizationId?: string;
}

// ==========================================
// TREND ANALYSIS
// ==========================================

export class AdvancedAnalyticsService {
  
  /**
   * Detect trends over time for a specific metric
   */
  static async detectTrends(params: TrendAnalysisParams): Promise<TrendResult[]> {
    const { surveyId, metricType, periodType, periodStart, periodEnd, segmentType, segmentValue } = params;

    // Get current period data
    const currentData = await this.calculateMetricForPeriod({
      surveyId,
      metricType,
      periodStart,
      periodEnd,
      segmentType,
      segmentValue
    });

    // Get previous period for comparison
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const previousPeriodEnd = new Date(periodStart.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);

    const previousData = await this.calculateMetricForPeriod({
      surveyId,
      metricType,
      periodStart: previousPeriodStart,
      periodEnd: previousPeriodEnd,
      segmentType,
      segmentValue
    });

    // Calculate trend
    const changeValue = previousData ? currentData - previousData : null;
    const changePercentage = previousData && previousData !== 0 
      ? ((currentData - previousData) / Math.abs(previousData)) * 100 
      : null;

    let trendDirection: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (changePercentage !== null) {
      if (changePercentage > 5) trendDirection = 'increasing';
      else if (changePercentage < -5) trendDirection = 'decreasing';
    }

    // Determine if change is statistically significant (simple threshold for now)
    const isSignificant = changePercentage !== null && Math.abs(changePercentage) > 10;
    const confidenceLevel = isSignificant ? 0.95 : 0.50;

    // Store trend in database
    const trendId = crypto.randomUUID();
    await db.execute(sql`
      INSERT INTO analytics_trends (
        id, survey_id, metric_type, period_start, period_end, period_type,
        current_value, previous_value, change_value, change_percentage,
        trend_direction, is_significant, confidence_level,
        segment_type, segment_value
      ) VALUES (
        ${trendId}, ${surveyId || null}, ${metricType}, ${periodStart}, ${periodEnd}, ${periodType},
        ${currentData}, ${previousData}, ${changeValue}, ${changePercentage},
        ${trendDirection}, ${isSignificant}, ${confidenceLevel},
        ${segmentType || null}, ${segmentValue || null}
      )
    `);

    return [{
      id: trendId,
      metricType,
      periodStart,
      periodEnd,
      currentValue: currentData,
      previousValue: previousData,
      changeValue,
      changePercentage,
      trendDirection,
      isSignificant,
      confidenceLevel
    }];
  }

  /**
   * Calculate metric value for a specific period
   */
  private static async calculateMetricForPeriod(params: {
    surveyId?: string;
    metricType: string;
    periodStart: Date;
    periodEnd: Date;
    segmentType?: string;
    segmentValue?: string;
  }): Promise<number> {
    const { surveyId, metricType, periodStart, periodEnd, segmentType, segmentValue } = params;

    let query = db
      .select({
        csatScore: responses.csatScore,
        npsScore: responses.npsScore,
        eviScore: responses.eviScore,
      })
      .from(responses)
      .where(
        and(
          surveyId ? eq(responses.surveyId, surveyId) : sql`1=1`,
          gte(responses.submittedAt, periodStart),
          lte(responses.submittedAt, periodEnd)
        )
      );

    const results = await query;

    if (results.length === 0) return 0;

    // Calculate based on metric type
    switch (metricType) {
      case 'csat':
        const avgCsat = results.reduce((sum, r) => sum + (r.csatScore || 0), 0) / results.length;
        return avgCsat;
      
      case 'nps':
        const avgNps = results.reduce((sum, r) => sum + (r.npsScore || 0), 0) / results.length;
        return avgNps;
      
      case 'engagement':
        // Use EVI score as engagement metric
        const avgEvi = results.reduce((sum, r) => sum + (r.eviScore || 0), 0) / results.length;
        return avgEvi;
      
      case 'sentiment':
        // For sentiment, we'll use a composite of all scores
        const avgSentiment = results.reduce((sum, r) => {
          const composite = ((r.csatScore || 0) + (r.npsScore || 0) + (r.eviScore || 0)) / 3;
          return sum + composite;
        }, 0) / results.length;
        return avgSentiment;
      
      default:
        return 0;
    }
  }

  /**
   * Get trend history for multiple periods
   */
  static async getTrendHistory(params: {
    surveyId?: string;
    metricType: 'csat' | 'nps' | 'engagement' | 'sentiment';
    periodsBack: number;
    periodType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    segmentType?: 'department' | 'location' | 'role' | 'overall';
    segmentValue?: string;
  }): Promise<TrendResult[]> {
    const { surveyId, metricType, periodsBack, periodType, segmentType, segmentValue } = params;

    const trends: TrendResult[] = [];
    const now = new Date();

    for (let i = 0; i < periodsBack; i++) {
      let periodStart: Date, periodEnd: Date;

      switch (periodType) {
        case 'daily':
          periodEnd = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
          periodStart = new Date(periodEnd.getTime() - (24 * 60 * 60 * 1000));
          break;
        case 'weekly':
          periodEnd = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
          periodStart = new Date(periodEnd.getTime() - (7 * 24 * 60 * 60 * 1000));
          break;
        case 'monthly':
          periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 1);
          periodStart = new Date(periodEnd.getFullYear(), periodEnd.getMonth() - 1, 1);
          break;
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3) - i;
          periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        default:
          periodEnd = now;
          periodStart = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      }

      const trend = await this.detectTrends({
        surveyId,
        metricType,
        periodType,
        periodStart,
        periodEnd,
        segmentType,
        segmentValue
      });

      trends.push(...trend);
    }

    return trends;
  }

  // ==========================================
  // SENTIMENT ANALYSIS
  // ==========================================

  /**
   * Analyze sentiment shifts over time
   */
  static async analyzeSentimentShifts(params: {
    surveyId: string;
    periodStart: Date;
    periodEnd: Date;
    segmentType?: string;
    segmentValue?: string;
  }): Promise<{
    overallSentiment: string;
    sentimentScore: number;
    distribution: Record<string, number>;
    shifts: Array<{ period: string; sentiment: string; score: number }>;
  }> {
    const { surveyId, periodStart, periodEnd } = params;

    // Get sentiment data from responses
    const results = await db
      .select({
        sentiment: responses.overallSentiment,
        submittedAt: responses.submittedAt,
      })
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          gte(responses.submittedAt, periodStart),
          lte(responses.submittedAt, periodEnd)
        )
      )
      .orderBy(asc(responses.submittedAt));

    // Calculate distribution
    const distribution: Record<string, number> = {
      positive: 0,
      neutral: 0,
      negative: 0,
      mixed: 0
    };

    results.forEach(r => {
      if (r.sentiment) {
        distribution[r.sentiment] = (distribution[r.sentiment] || 0) + 1;
      }
    });

    // Calculate overall sentiment
    const total = results.length;
    const sentimentScore = total > 0 
      ? ((distribution.positive * 1) + (distribution.neutral * 0) + (distribution.negative * -1)) / total
      : 0;

    let overallSentiment = 'neutral';
    if (sentimentScore > 0.3) overallSentiment = 'positive';
    else if (sentimentScore < -0.3) overallSentiment = 'negative';

    // Detect shifts by week
    const shifts = this.groupSentimentByWeek(results);

    return {
      overallSentiment,
      sentimentScore,
      distribution,
      shifts
    };
  }

  /**
   * Group sentiment data by week
   */
  private static groupSentimentByWeek(results: any[]): Array<{ period: string; sentiment: string; score: number }> {
    const weekGroups: Map<string, any[]> = new Map();

    results.forEach(r => {
      const date = new Date(r.submittedAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, []);
      }
      weekGroups.get(weekKey)!.push(r);
    });

    const shifts: Array<{ period: string; sentiment: string; score: number }> = [];

    weekGroups.forEach((group, weekKey) => {
      const dist: Record<string, number> = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
      group.forEach(r => {
        if (r.sentiment) dist[r.sentiment]++;
      });

      const score = group.length > 0
        ? ((dist.positive * 1) + (dist.neutral * 0) + (dist.negative * -1)) / group.length
        : 0;

      let sentiment = 'neutral';
      if (score > 0.3) sentiment = 'positive';
      else if (score < -0.3) sentiment = 'negative';

      shifts.push({ period: weekKey, sentiment, score });
    });

    return shifts;
  }

  // ==========================================
  // ENGAGEMENT DRIVERS
  // ==========================================

  /**
   * Identify key engagement drivers
   */
  static async identifyEngagementDrivers(params: {
    surveyId: string;
    periodStart: Date;
    periodEnd: Date;
    segmentType?: string;
    segmentValue?: string;
  }): Promise<EngagementDriver[]> {
    const { surveyId, periodStart, periodEnd } = params;

    // Common engagement driver categories and their indicators
    const driverCategories = [
      {
        name: 'Leadership',
        category: 'leadership',
        keywords: ['leader', 'manager', 'supervisor', 'management', 'direction', 'vision'],
        impactWeight: 0.85
      },
      {
        name: 'Culture',
        category: 'culture',
        keywords: ['culture', 'values', 'environment', 'atmosphere', 'workplace'],
        impactWeight: 0.80
      },
      {
        name: 'Growth & Development',
        category: 'growth',
        keywords: ['growth', 'development', 'career', 'learning', 'training', 'opportunity'],
        impactWeight: 0.75
      },
      {
        name: 'Compensation & Benefits',
        category: 'compensation',
        keywords: ['salary', 'pay', 'compensation', 'benefits', 'bonus', 'rewards'],
        impactWeight: 0.70
      },
      {
        name: 'Work-Life Balance',
        category: 'balance',
        keywords: ['balance', 'flexible', 'remote', 'hours', 'time-off', 'workload'],
        impactWeight: 0.65
      },
      {
        name: 'Recognition',
        category: 'recognition',
        keywords: ['recognition', 'appreciate', 'acknowledge', 'praise', 'celebrate'],
        impactWeight: 0.60
      }
    ];

    const drivers: EngagementDriver[] = [];

    // Get responses with text analysis
    const results = await db
      .select({
        id: responses.id,
        answers: responses.answers,
        csatScore: responses.csatScore,
        npsScore: responses.npsScore,
        eviScore: responses.eviScore,
        analysisSummary: responses.analysisSummary,
      })
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          gte(responses.submittedAt, periodStart),
          lte(responses.submittedAt, periodEnd)
        )
      );

    const sampleSize = results.length;

    for (const driver of driverCategories) {
      // Count mentions and correlate with scores
      let mentionCount = 0;
      let positiveCorrelationScore = 0;
      
      results.forEach(r => {
        const text = JSON.stringify(r.answers).toLowerCase() + ' ' + (r.analysisSummary || '').toLowerCase();
        const hasMention = driver.keywords.some(kw => text.includes(kw));
        
        if (hasMention) {
          mentionCount++;
          const avgScore = ((r.csatScore || 0) + (r.npsScore || 0) + (r.eviScore || 0)) / 3;
          positiveCorrelationScore += avgScore;
        }
      });

      if (mentionCount > 0) {
        const avgCorrelationScore = positiveCorrelationScore / mentionCount;
        const mentionRate = mentionCount / sampleSize;
        const impactScore = (avgCorrelationScore / 100) * driver.impactWeight * 100;
        const correlationCoefficient = (avgCorrelationScore / 100) * 2 - 1; // Convert to -1 to 1

        const driverId = crypto.randomUUID();

        // Store in database
        await db.execute(sql`
          INSERT INTO engagement_drivers (
            id, survey_id, period_start, period_end,
            driver_name, driver_category, impact_score, correlation_coefficient,
            sample_size, statistical_significance,
            related_questions, affected_segments,
            description, recommendation
          ) VALUES (
            ${driverId}, ${surveyId}, ${periodStart}, ${periodEnd},
            ${driver.name}, ${driver.category}, ${impactScore}, ${correlationCoefficient},
            ${sampleSize}, ${mentionRate},
            ${JSON.stringify([])}, ${JSON.stringify([])},
            ${'Detected through keyword analysis and score correlation'},
            ${'Focus on improving ' + driver.name.toLowerCase() + ' to increase engagement'}
          )
        `);

        drivers.push({
          id: driverId,
          surveyId,
          driverName: driver.name,
          driverCategory: driver.category,
          impactScore: Number(impactScore.toFixed(2)),
          correlationCoefficient: Number(correlationCoefficient.toFixed(4)),
          sampleSize,
          statisticalSignificance: Number(mentionRate.toFixed(4)),
          relatedQuestions: [],
          affectedSegments: [],
          description: 'Detected through keyword analysis and score correlation',
          recommendation: 'Focus on improving ' + driver.name.toLowerCase() + ' to increase engagement'
        });
      }
    }

    // Sort by impact score
    return drivers.sort((a, b) => b.impactScore - a.impactScore);
  }

  // ==========================================
  // SEGMENTATION
  // ==========================================

  /**
   * Get segmented analytics data
   */
  static async getSegmentedAnalytics(params: {
    surveyId: string;
    periodStart: Date;
    periodEnd: Date;
    segmentBy: 'department' | 'location' | 'role' | 'organization';
  }): Promise<Array<{
    segment: string;
    segmentValue: string;
    responseCount: number;
    avgCsat: number;
    avgNps: number;
    avgEvi: number;
    sentiment: string;
    participationRate: number;
  }>> {
    const { surveyId, periodStart, periodEnd, segmentBy } = params;

    // This would require joining with users table to get department/location/role
    // For now, returning a placeholder structure
    
    const results = await db
      .select({
        csatScore: responses.csatScore,
        npsScore: responses.npsScore,
        eviScore: responses.eviScore,
        sentiment: responses.overallSentiment,
        respondentEmail: responses.respondentEmail,
      })
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          gte(responses.submittedAt, periodStart),
          lte(responses.submittedAt, periodEnd)
        )
      );

    // Group by segment (simplified - in real implementation would join with users table)
    const segments = new Map<string, any[]>();
    
    results.forEach(r => {
      const segmentValue = 'Overall'; // Would extract from user data
      if (!segments.has(segmentValue)) {
        segments.set(segmentValue, []);
      }
      segments.get(segmentValue)!.push(r);
    });

    const segmentedData: any[] = [];

    segments.forEach((data, segmentValue) => {
      const responseCount = data.length;
      const avgCsat = data.reduce((sum, r) => sum + (r.csatScore || 0), 0) / responseCount;
      const avgNps = data.reduce((sum, r) => sum + (r.npsScore || 0), 0) / responseCount;
      const avgEvi = data.reduce((sum, r) => sum + (r.eviScore || 0), 0) / responseCount;

      const sentimentDist: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
      data.forEach(r => {
        if (r.sentiment) sentimentDist[r.sentiment]++;
      });
      const dominantSentiment = Object.entries(sentimentDist).sort((a, b) => b[1] - a[1])[0][0];

      segmentedData.push({
        segment: segmentBy,
        segmentValue,
        responseCount,
        avgCsat: Number(avgCsat.toFixed(2)),
        avgNps: Number(avgNps.toFixed(2)),
        avgEvi: Number(avgEvi.toFixed(2)),
        sentiment: dominantSentiment,
        participationRate: 0 // Would calculate from total users in segment
      });
    });

    return segmentedData;
  }
}

export default AdvancedAnalyticsService;

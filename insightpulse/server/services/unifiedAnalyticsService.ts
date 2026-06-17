import { db } from "../db";
import { surveys, responses, feedbackAnalytics, users, dailyInsights } from "../../shared/schema";
import { eq, gte, lt, and, desc, inArray, sql } from "drizzle-orm";

interface TrendDelta {
  value: number; // signed % change vs previous period
  direction: 'up' | 'down' | 'flat';
}

interface InsightsBundle {
  topInsights: { text: string; count: number }[];
  topRecommendations: { text: string; count: number }[];
  urgencyBreakdown: { high: number; medium: number; low: number };
}

interface ThemeRow {
  theme: string;
  mention: number;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  example: string;
}

interface UnifiedMetrics {
  eviScore: number;
  npsScore: number;
  csatScore: number;
  cesScore: number;
  totalFeedback30d: number;
  responseRate: number;
  activeSurveys: number;
  trends: {
    evi: TrendDelta;
    nps: TrendDelta;
    csat: TrendDelta;
    responseRate: TrendDelta;
  };
  themes: ThemeRow[];
  insights: InsightsBundle;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  };
  promotersPercent: number;
  passivesPercent: number;
  detractorsPercent: number;
  satisfactionDistribution: {
    verySatisfied: number;
    satisfied: number;
    neutral: number;
    dissatisfied: number;
    veryDissatisfied: number;
  };
  emotionTrends: {
    date: string;
    joy: number;
    trust: number;
    fear: number;
    surprise: number;
    sadness: number;
    disgust: number;
    anger: number;
    anticipation: number;
  }[];
  eviTrends: {
    date: string;
    evi: number;
    nps: number;
  }[];
  recentFeedback: {
    id: string;
    surveyId: string;
    surveyName: string;
    respondentEmail: string;
    eviScore: number | null;
    npsScore: number | null;
    csatScore: number | null;
    submittedAt: Date;
    sentiment: string | null;
  }[];
  surveyComparison: {
    surveyId: string;
    surveyTitle: string;
    evi: number;
    nps: number;
    csat: number;
    sentimentScore: number;
    responseRate: number;
    compositeScore: number;
    vsBestPct: number; // % difference vs best-performing survey (0 for best)
  }[];
}

export class UnifiedAnalyticsService {
  /**
   * Calculate date range based on string identifier
   */
  private static calculateDateRange(dateRange: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '60d':
        startDate.setDate(startDate.getDate() - 60);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30); // default to 30 days
    }
    
    return { startDate, endDate };
  }

  /**
   * Get aggregated metrics from all surveys with deduplication
   * Filtered to only show surveys created by the specified user
   * Supports date range filtering
   */
  async getUnifiedMetrics(userId?: string, dateRange: string = '30d', surveyId?: string, startDateStr?: string, endDateStr?: string): Promise<UnifiedMetrics> {
    // Use explicit dates when provided (month filter), otherwise compute from dateRange string
    let startDate: Date, endDate: Date;
    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      ({ startDate, endDate } = UnifiedAnalyticsService.calculateDateRange(dateRange));
    }

    // Get user's surveys if userId is provided
    let userSurveyIds: (string | number)[] = [];
    if (userId) {
      const userSurveys = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.createdBy, userId));
      userSurveyIds = userSurveys.map(s => s.id);

      // Narrow to a single survey if requested (verify ownership)
      if (surveyId) {
        if (userSurveyIds.includes(surveyId)) {
          userSurveyIds = [surveyId];
        } else {
          userSurveyIds = []; // not owned — fall through to empty metrics below
        }
      }

      // If user has no surveys, return empty metrics
      if (userSurveyIds.length === 0) {
        const flat: TrendDelta = { value: 0, direction: 'flat' };
        return {
          eviScore: 0,
          npsScore: 0,
          csatScore: 0,
          cesScore: 0,
          totalFeedback30d: 0,
          responseRate: 0,
          activeSurveys: 0,
          trends: { evi: flat, nps: flat, csat: flat, responseRate: flat },
          themes: [],
          insights: { topInsights: [], topRecommendations: [], urgencyBreakdown: { high: 0, medium: 0, low: 0 } },
          sentimentBreakdown: { positive: 0, neutral: 0, negative: 0, total: 0 },
          promotersPercent: 0,
          passivesPercent: 0,
          detractorsPercent: 0,
          satisfactionDistribution: {
            verySatisfied: 0,
            satisfied: 0,
            neutral: 0,
            dissatisfied: 0,
            veryDissatisfied: 0,
          },
          emotionTrends: [],
          eviTrends: [],
          recentFeedback: [],
          surveyComparison: [],
        };
      }
    }

    // Get responses filtered by date range
    const query = db
      .select({
        id: responses.id,
        surveyId: responses.surveyId,
        surveyName: surveys.title,
        respondentEmail: responses.respondentEmail,
        eviScore: responses.eviScore,
        npsScore: responses.npsScore,
        csatScore: responses.csatScore,
        cesScore: responses.cesScore,
        submittedAt: responses.submittedAt,
        overallSentiment: responses.overallSentiment,
        detailedResponses: responses.detailedResponses,
      })
      .from(responses)
      .leftJoin(surveys, eq(responses.surveyId, surveys.id))
      .where(
        userId && userSurveyIds.length > 0
          ? and(
              gte(responses.submittedAt, startDate),
              inArray(responses.surveyId, userSurveyIds as string[]),
            )
          : gte(responses.submittedAt, startDate),
      );

    const recentResponses = await query.orderBy(desc(responses.submittedAt));

    // Remove duplicates based on unique response ID
    const uniqueResponses = this.deduplicateResponses(recentResponses);

    // ── Previous period for trend deltas ────────────────────────────────────
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs);
    const prevEnd = startDate;
    const prevConditions = userId && userSurveyIds.length > 0
      ? and(
          gte(responses.submittedAt, prevStart),
          lt(responses.submittedAt, prevEnd),
          inArray(responses.surveyId, userSurveyIds as string[]),
        )
      : and(
          gte(responses.submittedAt, prevStart),
          lt(responses.submittedAt, prevEnd),
        );
    const prevResponses = await db
      .select({
        id: responses.id,
        eviScore: responses.eviScore,
        npsScore: responses.npsScore,
        csatScore: responses.csatScore,
        respondentEmail: responses.respondentEmail,
      })
      .from(responses)
      .where(prevConditions);
    const uniquePrev = this.deduplicateResponses(prevResponses);

    // ── Themes from feedback_analytics (real categories + sentiment) ───────
    const themeRows = await db
      .select({
        category: feedbackAnalytics.category,
        sentiment: feedbackAnalytics.sentiment,
        feedbackText: feedbackAnalytics.feedbackText,
        aiAnalysis: feedbackAnalytics.aiAnalysis,
        createdAt: feedbackAnalytics.createdAt,
      })
      .from(feedbackAnalytics)
      .where(
        userId && userSurveyIds.length > 0
          ? and(
              gte(feedbackAnalytics.createdAt, startDate),
              inArray(feedbackAnalytics.surveyId, userSurveyIds as string[]),
            )
          : gte(feedbackAnalytics.createdAt, startDate),
      );
    const themes = this.aggregateThemes(themeRows);

    // ── Insights bundle — read from daily_insights (LLM-synthesised, one run/day) ──
    const insights = await this.loadDailyInsights(userId, startDate, endDate);

    // ── Emotion rows for daily aggregation ─────────────────────────────────
    const emotionRows = await db
      .select({
        emotions: feedbackAnalytics.emotions,
        createdAt: feedbackAnalytics.createdAt,
      })
      .from(feedbackAnalytics)
      .where(
        userId && userSurveyIds.length > 0
          ? and(
              gte(feedbackAnalytics.createdAt, startDate),
              inArray(feedbackAnalytics.surveyId, userSurveyIds as string[]),
            )
          : gte(feedbackAnalytics.createdAt, startDate),
      );

    // Calculate unified metrics
    const eviScore = this.calculateAverageEVI(uniqueResponses);
    const npsScore = this.calculateAverageNPS(uniqueResponses);
    const csatScore = this.calculateAverageCSAT(uniqueResponses);
    const cesScore = this.calculateAverageCES(uniqueResponses);
    const npsBreakdown = this.calculateNPSBreakdown(uniqueResponses);
    const satisfactionDistribution = this.calculateSatisfactionDistribution(uniqueResponses);
    const emotionTrends = this.calculateEmotionTrendsFromAnalytics(emotionRows);
    const eviTrends = this.calculateEVITrends(uniqueResponses);
    const sentimentBreakdown = this.calculateSentimentBreakdown(uniqueResponses);

    // Previous-period scores
    const prevEvi = this.calculateAverageEVI(uniquePrev);
    const prevNps = this.calculateAverageNPS(uniquePrev);
    const prevCsat = this.calculateAverageCSAT(uniquePrev);
    // Active surveys (within window)
    const activeSurveys = userSurveyIds.length > 0
      ? (await db.select({ id: surveys.id, isActive: surveys.isActive })
          .from(surveys)
          .where(inArray(surveys.id, userSurveyIds as string[])))
          .filter((s: any) => s.isActive).length
      : 0;

    // Response rate = responses received / total sent (sum of sentCount on scoped surveys)
    let totalSent = 0;
    if (userSurveyIds.length > 0) {
      const [{ s }] = await db
        .select({ s: sql<number>`COALESCE(SUM(sent_count), 0)` })
        .from(surveys)
        .where(inArray(surveys.id, userSurveyIds as string[]));
      totalSent = Number(s);
    }

    const totalResponses = uniqueResponses.length;
    const prevTotalResponses = uniquePrev.length;

    const calcRate = (received: number) =>
      totalSent > 0 ? Math.min(Math.round((received / totalSent) * 100), 100) : 0;

    const responseRate = calcRate(totalResponses);
    const prevResponseRate = calcRate(prevTotalResponses);

    return {
      eviScore: Math.round(eviScore * 10) / 10,
      npsScore: Math.round(npsScore),
      csatScore: Math.round(csatScore * 10) / 10,
      cesScore: Math.round(cesScore * 10) / 10,
      totalFeedback30d: uniqueResponses.length,
      responseRate,
      activeSurveys,
      trends: {
        evi: this.computeDelta(eviScore, prevEvi),
        nps: this.computeDelta(npsScore, prevNps),
        csat: this.computeDelta(csatScore, prevCsat),
        responseRate: this.computeDelta(responseRate, prevResponseRate),
      },
      themes,
      insights,
      sentimentBreakdown,
      promotersPercent: npsBreakdown.promoters,
      passivesPercent: npsBreakdown.passives,
      detractorsPercent: npsBreakdown.detractors,
      satisfactionDistribution,
      emotionTrends,
      eviTrends,
      recentFeedback: uniqueResponses.slice(0, 10).map(r => ({
        id: r.id,
        surveyId: r.surveyId,
        surveyName: r.surveyName || 'Unknown Survey',
        respondentEmail: r.respondentEmail || 'Anonymous',
        eviScore: r.eviScore,
        npsScore: r.npsScore,
        csatScore: r.csatScore,
        submittedAt: r.submittedAt,
        sentiment: r.overallSentiment,
      })),
      surveyComparison: this.buildSurveyComparison(uniqueResponses),
    };
  }

  private buildSurveyComparison(rows: any[]): UnifiedMetrics['surveyComparison'] {
    // Group responses by survey
    const bySurvey = new Map<string, { title: string; eviSum: number; npsSum: number; csatSum: number; posCount: number; negCount: number; count: number }>();
    for (const r of rows) {
      const sid = r.surveyId as string;
      if (!sid) continue;
      if (!bySurvey.has(sid)) bySurvey.set(sid, { title: r.surveyName || 'Unknown', eviSum: 0, npsSum: 0, csatSum: 0, posCount: 0, negCount: 0, count: 0 });
      const s = bySurvey.get(sid)!;
      s.eviSum += r.eviScore ?? 0;
      s.npsSum += r.npsScore ?? 0;
      s.csatSum += r.csatScore ?? 0;
      const sent = (r.overallSentiment || '').toLowerCase();
      if (sent.includes('positive')) s.posCount += 1;
      else if (sent.includes('negative')) s.negCount += 1;
      s.count += 1;
    }

    const results = Array.from(bySurvey.entries()).map(([surveyId, s]) => {
      const evi = s.count > 0 ? Math.round(s.eviSum / s.count) : 0;
      const nps = s.count > 0 ? Math.round(s.npsSum / s.count) : 0;
      const csat = s.count > 0 ? Math.round(s.csatSum / s.count) : 0;
      const sentimentScore = s.count > 0 ? Math.round(((s.posCount - s.negCount) / s.count) * 100) : 0;
      const responseRate = 0; // sentCount lookup not available here; kept at 0
      // Composite: equal weight on EVI, NPS (0-100 scale), CSAT, sentiment
      const npsNorm = Math.round(((nps + 100) / 200) * 100); // -100..100 → 0..100
      const compositeScore = Math.round((evi + npsNorm + csat + Math.max(0, sentimentScore)) / 4);
      return { surveyId, surveyTitle: s.title, evi, nps, csat, sentimentScore, responseRate, compositeScore, vsBestPct: 0 };
    });

    if (results.length === 0) return [];
    const best = Math.max(...results.map(r => r.compositeScore));
    return results
      .map(r => ({ ...r, vsBestPct: best > 0 ? Math.round(((r.compositeScore - best) / best) * 100) : 0 }))
      .sort((a, b) => b.compositeScore - a.compositeScore);
  }

  private computeDelta(current: number, previous: number): TrendDelta {
    if (!previous || previous === 0) {
      return { value: 0, direction: 'flat' };
    }
    const pct = ((current - previous) / Math.abs(previous)) * 100;
    const rounded = Math.round(pct * 10) / 10;
    return {
      value: Math.abs(rounded),
      direction: rounded > 0.05 ? 'up' : rounded < -0.05 ? 'down' : 'flat',
    };
  }

  private calculateSentimentBreakdown(rows: any[]): {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  } {
    let positive = 0;
    let neutral = 0;
    let negative = 0;
    let total = 0;
    for (const r of rows) {
      const s = (r.overallSentiment || '').toString().toLowerCase();
      if (!s) continue;
      total += 1;
      if (s.includes('positive') || s.includes('good') || s.includes('excellent')) positive += 1;
      else if (s.includes('negative') || s.includes('bad') || s.includes('poor')) negative += 1;
      else neutral += 1;
    }
    return { positive, neutral, negative, total };
  }

  /**
   * Load LLM-synthesised insights from daily_insights rows within the date range.
   * Merges all days in range, deduplicates by text, and returns top 5 each.
   */
  private async loadDailyInsights(userId: string | undefined, startDate: Date, endDate: Date): Promise<InsightsBundle> {
    const empty: InsightsBundle = {
      topInsights: [],
      topRecommendations: [],
      urgencyBreakdown: { high: 0, medium: 0, low: 0 },
    };

    if (!userId) return empty;

    const startStr = startDate.toISOString().slice(0, 10);
    const endStr = endDate.toISOString().slice(0, 10);

    const rows = await db
      .select({ topInsights: dailyInsights.topInsights, topRecommendations: dailyInsights.topRecommendations })
      .from(dailyInsights)
      .where(
        and(
          eq(dailyInsights.userId, userId),
          gte(dailyInsights.date, startStr),
          lt(dailyInsights.date, endStr),
        ),
      );

    if (rows.length === 0) return empty;

    // Deduplicate by text and pick top 5
    const insightSet = new Map<string, number>();
    const recSet = new Map<string, number>();
    for (const row of rows) {
      for (const item of (row.topInsights as { text: string }[] | null) ?? []) {
        if (item?.text) insightSet.set(item.text, (insightSet.get(item.text) ?? 0) + 1);
      }
      for (const item of (row.topRecommendations as { text: string }[] | null) ?? []) {
        if (item?.text) recSet.set(item.text, (recSet.get(item.text) ?? 0) + 1);
      }
    }

    const top = (m: Map<string, number>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([text, count]) => ({ text, count }));

    return {
      topInsights: top(insightSet),
      topRecommendations: top(recSet),
      urgencyBreakdown: { high: 0, medium: 0, low: 0 },
    };
  }

  private aggregateInsights(rows: any[]): InsightsBundle {
    const insightCounts = new Map<string, number>();
    const recCounts = new Map<string, number>();
    const urgency = { high: 0, medium: 0, low: 0 };

    for (const r of rows) {
      const insightArr: string[] = Array.isArray(r.insights) ? r.insights : [];
      const recArr: string[] = Array.isArray(r.recommendations) ? r.recommendations : [];
      for (const text of insightArr) {
        if (!text) continue;
        const k = String(text).trim();
        if (!k) continue;
        insightCounts.set(k, (insightCounts.get(k) ?? 0) + 1);
      }
      for (const text of recArr) {
        if (!text) continue;
        const k = String(text).trim();
        if (!k) continue;
        recCounts.set(k, (recCounts.get(k) ?? 0) + 1);
      }
      const u = (r.urgency || '').toLowerCase();
      if (u === 'high' || u === 'medium' || u === 'low') urgency[u as 'high' | 'medium' | 'low'] += 1;
    }

    const top = (m: Map<string, number>) =>
      Array.from(m.entries())
        .map(([text, count]) => ({ text, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
      topInsights: top(insightCounts),
      topRecommendations: top(recCounts),
      urgencyBreakdown: urgency,
    };
  }

  private aggregateThemes(rows: any[]): ThemeRow[] {
    const buckets = new Map<string, { count: number; pos: number; neg: number; example: string }>();
    for (const r of rows) {
      const theme = (r.category || 'Uncategorized') as string;
      const existing = buckets.get(theme) || { count: 0, pos: 0, neg: 0, example: '' };
      existing.count += 1;
      if (r.sentiment === 'positive') existing.pos += 1;
      else if (r.sentiment === 'negative') existing.neg += 1;
      if (!existing.example) {
        const text = r.aiAnalysis || r.feedbackText || '';
        existing.example = String(text).slice(0, 140);
      }
      buckets.set(theme, existing);
    }
    return Array.from(buckets.entries())
      .map(([theme, b]) => ({
        theme,
        mention: b.count,
        sentiment: (b.pos > b.neg ? 'Positive' : b.neg > b.pos ? 'Negative' : 'Neutral') as ThemeRow['sentiment'],
        example: b.example ? `"${b.example}"` : '',
      }))
      .sort((a, b) => b.mention - a.mention)
      .slice(0, 10);
  }

  /**
   * Remove duplicate responses based on unique ID
   */
  private deduplicateResponses(responses: any[]): any[] {
    const seen = new Set<string>();
    return responses.filter(response => {
      if (seen.has(response.id)) {
        return false;
      }
      seen.add(response.id);
      return true;
    });
  }

  /**
   * Calculate average EVI score
   */
  private calculateAverageEVI(responses: any[]): number {
    const validScores = responses
      .map(r => r.eviScore)
      .filter((score): score is number => score !== null && score !== undefined);
    
    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }

  /**
   * Calculate average NPS score
   */
  private calculateAverageNPS(responses: any[]): number {
    const validScores = responses
      .map(r => r.npsScore)
      .filter((score): score is number => score !== null && score !== undefined);
    
    if (validScores.length === 0) return 0;

    const promoters = validScores.filter(score => score >= 9).length;
    const detractors = validScores.filter(score => score <= 6).length;
    
    const promoterPercent = (promoters / validScores.length) * 100;
    const detractorPercent = (detractors / validScores.length) * 100;
    
    return promoterPercent - detractorPercent;
  }

  /**
   * Calculate average CSAT score
   */
  private calculateAverageCSAT(responses: any[]): number {
    const validScores = responses
      .map(r => r.csatScore)
      .filter((score): score is number => score !== null && score !== undefined)
      .map((score) => this.normalizeCSATToPercent(score));

    if (validScores.length === 0) return 0;
    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }

  /**
   * Calculate average CES score, normalized to 0-100
   * CES is stored as 1-5; lower raw score = less effort = better
   */
  private calculateAverageCES(responses: any[]): number {
    const validScores = responses
      .map(r => r.cesScore)
      .filter((score): score is number => score !== null && score !== undefined);

    if (validScores.length === 0) return 0;
    const avg = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;
    // Normalize 1-5 → 0-100 (1=0%, 5=100%)
    return Math.max(0, Math.min(100, ((avg - 1) / 4) * 100));
  }

  /**
   * Calculate NPS breakdown (promoters, passives, detractors)
   */
  private calculateNPSBreakdown(responses: any[]): {
    promoters: number;
    passives: number;
    detractors: number;
  } {
    const validScores = responses
      .map(r => r.npsScore)
      .filter((score): score is number => score !== null && score !== undefined);
    
    if (validScores.length === 0) {
      return { promoters: 0, passives: 0, detractors: 0 };
    }

    const promoters = validScores.filter(score => score >= 9).length;
    const passives = validScores.filter(score => score >= 7 && score <= 8).length;
    const detractors = validScores.filter(score => score <= 6).length;
    
    return {
      promoters: Math.round((promoters / validScores.length) * 100 * 10) / 10,
      passives: Math.round((passives / validScores.length) * 100 * 10) / 10,
      detractors: Math.round((detractors / validScores.length) * 100 * 10) / 10,
    };
  }

  /**
   * Calculate satisfaction distribution
   */
  private calculateSatisfactionDistribution(responses: any[]): {
    verySatisfied: number;
    satisfied: number;
    neutral: number;
    dissatisfied: number;
    veryDissatisfied: number;
  } {
    const validScores = responses
      .map(r => r.csatScore)
      .filter((score): score is number => score !== null && score !== undefined)
      .map((score) => this.mapCSATPercentToFivePoint(this.normalizeCSATToPercent(score)));
    
    if (validScores.length === 0) {
      return { verySatisfied: 0, satisfied: 0, neutral: 0, dissatisfied: 0, veryDissatisfied: 0 };
    }

    const verySatisfied = validScores.filter(score => score === 5).length;
    const satisfied = validScores.filter(score => score === 4).length;
    const neutral = validScores.filter(score => score === 3).length;
    const dissatisfied = validScores.filter(score => score === 2).length;
    const veryDissatisfied = validScores.filter(score => score === 1).length;
    
    const total = validScores.length;
    
    return {
      verySatisfied: Math.round((verySatisfied / total) * 100 * 10) / 10,
      satisfied: Math.round((satisfied / total) * 100 * 10) / 10,
      neutral: Math.round((neutral / total) * 100 * 10) / 10,
      dissatisfied: Math.round((dissatisfied / total) * 100 * 10) / 10,
      veryDissatisfied: Math.round((veryDissatisfied / total) * 100 * 10) / 10,
    };
  }

  /**
   * Normalize CSAT to 0-100 regardless of source scale.
   */
  private normalizeCSATToPercent(score: number): number {
    if (score <= 5) {
      return (score / 5) * 100;
    }

    if (score <= 10) {
      return (score / 10) * 100;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Map a 0-100 CSAT score into 1-5 buckets for distribution.
   */
  private mapCSATPercentToFivePoint(score: number): number {
    if (score <= 20) return 1;
    if (score <= 40) return 2;
    if (score <= 60) return 3;
    if (score <= 80) return 4;
    return 5;
  }

  /**
   * Calculate daily emotion trends from feedback_analytics rows.
   * Each row has a single emotions object (output of analyzeSurveyResponse).
   */
  private calculateEmotionTrendsFromAnalytics(rows: { emotions: any; createdAt: any }[]): {
    date: string;
    joy: number;
    trust: number;
    fear: number;
    surprise: number;
    sadness: number;
    disgust: number;
    anger: number;
    anticipation: number;
  }[] {
    const EMOTION_KEYS = [
      'joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger', 'anticipation',
    ] as const;

    const byDate = new Map<string, { sums: Record<string, number>; count: number }>();

    for (const row of rows) {
      if (!row.createdAt || !row.emotions) continue;
      const date = new Date(row.createdAt).toISOString().split('T')[0];
      const bucket = byDate.get(date) ?? {
        sums: Object.fromEntries(EMOTION_KEYS.map((k) => [k, 0])),
        count: 0,
      };
      for (const key of EMOTION_KEYS) {
        const v = Number((row.emotions as any)?.[key]);
        if (Number.isFinite(v)) bucket.sums[key] += v;
      }
      bucket.count += 1;
      byDate.set(date, bucket);
    }

    return Array.from(byDate.entries())
      .map(([date, { sums, count }]) => {
        const avg = (n: number) => (count > 0 ? Math.round((n / count) * 10) / 10 : 0);
        return {
          date,
          joy: avg(sums.joy),
          trust: avg(sums.trust),
          fear: avg(sums.fear),
          surprise: avg(sums.surprise),
          sadness: avg(sums.sadness),
          disgust: avg(sums.disgust),
          anger: avg(sums.anger),
          anticipation: avg(sums.anticipation),
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate EVI and NPS trends over time
   */
  private calculateEVITrends(responses: any[]): {
    date: string;
    evi: number;
    nps: number;
  }[] {
    // Group responses by date
    const responsesByDate = new Map<string, any[]>();
    
    responses.forEach(response => {
      const date = new Date(response.submittedAt).toISOString().split('T')[0];
      if (!responsesByDate.has(date)) {
        responsesByDate.set(date, []);
      }
      responsesByDate.get(date)!.push(response);
    });

    // Calculate average EVI and NPS per date
    const trends = Array.from(responsesByDate.entries()).map(([date, dayResponses]) => {
      const eviScores = dayResponses
        .map(r => r.eviScore)
        .filter((score): score is number => score !== null && score !== undefined);
      
      const npsScores = dayResponses
        .map(r => r.npsScore)
        .filter((score): score is number => score !== null && score !== undefined);

      const avgEvi = eviScores.length > 0
        ? eviScores.reduce((sum, score) => sum + score, 0) / eviScores.length
        : 0;

      // Calculate NPS for this day
      let avgNps = 0;
      if (npsScores.length > 0) {
        const promoters = npsScores.filter(score => score >= 9).length;
        const detractors = npsScores.filter(score => score <= 6).length;
        const promoterPercent = (promoters / npsScores.length) * 100;
        const detractorPercent = (detractors / npsScores.length) * 100;
        avgNps = promoterPercent - detractorPercent;
      }

      return {
        date,
        evi: Math.round(avgEvi * 10) / 10,
        nps: Math.round(avgNps),
      };
    });

    // Sort by date
    return trends.sort((a, b) => a.date.localeCompare(b.date));
  }

}

export const unifiedAnalyticsService = new UnifiedAnalyticsService();

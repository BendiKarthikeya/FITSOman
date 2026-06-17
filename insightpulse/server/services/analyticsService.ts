import { db } from "../db";
import {
  analyticsSurveys,
  surveyQuestions,
  surveyResponses,
  surveyMetrics,
  surveys as mainSurveys,
  responses as mainResponses,
  type SurveyAnalytics,
  type CSATMetrics,
  type NPSMetrics,
  type QuestionMetrics,
  type ScoreNormalization,
  type PerformanceLevel,
  type AnalyticsFilter,
} from "../../shared/schema";
import { eq, and, gte, lte, isNull, sql } from "drizzle-orm";

/**
 * Analytics Service for CSAT and NPS Calculations
 * Provides comprehensive survey analytics with normalized scoring
 */

export class AnalyticsService {
  /**
   * Normalize a score from any scale to 0-5 and 0-10 scales
   */
  static normalizeScore(originalScore: number, maxScale: number = 10): ScoreNormalization {
    // Ensure score is within bounds
    const validScore = Math.max(0, Math.min(originalScore, maxScale));

    // Convert to 0-5 scale (for CSAT)
    const normalizedScore5 = Math.round((validScore / maxScale) * 5);

    // Convert to 0-10 scale (for NPS)
    const normalizedScore10 = Math.round((validScore / maxScale) * 10);

    return {
      originalScore: validScore,
      normalizedScore5: Math.max(0, Math.min(5, normalizedScore5)),
      normalizedScore10: Math.max(0, Math.min(10, normalizedScore10)),
      maxScale,
    };
  }

  /**
   * Get CSAT performance level based on score
   */
  static getCSATPerformance(csatScore: number): PerformanceLevel {
    if (csatScore >= 80) return "EXCELLENT";
    if (csatScore >= 70) return "GOOD";
    if (csatScore >= 60) return "AVERAGE";
    return "POOR";
  }

  /**
   * Get NPS performance level based on score
   */
  static getNPSPerformance(npsScore: number): PerformanceLevel {
    if (npsScore > 50) return "EXCELLENT";
    if (npsScore >= 30) return "GOOD";
    if (npsScore >= 0) return "AVERAGE";
    return "POOR";
  }

  /**
   * Calculate CSAT metrics for a survey or question
   * CSAT = (Satisfied + Very Satisfied) / Total × 100
   * Satisfied = ratings 4-5 on 0-5 scale
   */
  static async calculateCSAT(filter: AnalyticsFilter): Promise<CSATMetrics> {
    const { surveyId, questionId, dateFrom, dateTo } = filter;

    // Build the WHERE clause
    const conditions = [eq(surveyResponses.surveyId, surveyId)];
    if (questionId) conditions.push(eq(surveyResponses.questionId, questionId));
    if (dateFrom) conditions.push(gte(surveyResponses.responseDate, dateFrom));
    if (dateTo) conditions.push(lte(surveyResponses.responseDate, dateTo));

    // Get response distribution
    const responses = await db
      .select({
        normalizedScore5: surveyResponses.normalizedScore5,
      })
      .from(surveyResponses)
      .where(and(...conditions));

    // Count responses by score
    const distribution = {
      score5: responses.filter(r => r.normalizedScore5 === 5).length,
      score4: responses.filter(r => r.normalizedScore5 === 4).length,
      score3: responses.filter(r => r.normalizedScore5 === 3).length,
      score2: responses.filter(r => r.normalizedScore5 === 2).length,
      score1: responses.filter(r => r.normalizedScore5 === 1).length,
      score0: responses.filter(r => r.normalizedScore5 === 0).length,
    };

    const totalResponses = responses.length;
    const satisfiedCount = distribution.score5 + distribution.score4;
    const csatScore = totalResponses > 0
      ? (satisfiedCount / totalResponses) * 100
      : 0;

    return {
      csatScore: Math.round(csatScore * 100) / 100, // Round to 2 decimals
      satisfiedCount,
      totalResponses,
      performance: this.getCSATPerformance(csatScore),
      distribution,
    };
  }

  /**
   * Calculate NPS metrics for a survey or question
   * NPS = (% Promoters) - (% Detractors)
   * Promoters = 9-10, Passives = 7-8, Detractors = 0-6 on 0-10 scale
   */
  static async calculateNPS(filter: AnalyticsFilter): Promise<NPSMetrics> {
    const { surveyId, questionId, dateFrom, dateTo } = filter;

    // Build the WHERE clause
    const conditions = [eq(surveyResponses.surveyId, surveyId)];
    if (questionId) conditions.push(eq(surveyResponses.questionId, questionId));
    if (dateFrom) conditions.push(gte(surveyResponses.responseDate, dateFrom));
    if (dateTo) conditions.push(lte(surveyResponses.responseDate, dateTo));

    // Get responses
    const responses = await db
      .select({
        normalizedScore10: surveyResponses.normalizedScore10,
      })
      .from(surveyResponses)
      .where(and(...conditions));

    // Categorize responses
    const promotersCount = responses.filter(r => r.normalizedScore10 >= 9).length;
    const passivesCount = responses.filter(r => r.normalizedScore10 >= 7 && r.normalizedScore10 <= 8).length;
    const detractorsCount = responses.filter(r => r.normalizedScore10 <= 6).length;

    const totalResponses = responses.length;

    // Calculate percentages
    const promotersPercent = totalResponses > 0 ? (promotersCount / totalResponses) * 100 : 0;
    const passivesPercent = totalResponses > 0 ? (passivesCount / totalResponses) * 100 : 0;
    const detractorsPercent = totalResponses > 0 ? (detractorsCount / totalResponses) * 100 : 0;

    // Calculate NPS
    const npsScore = promotersPercent - detractorsPercent;

    return {
      npsScore: Math.round(npsScore * 100) / 100, // Round to 2 decimals
      promotersCount,
      passivesCount,
      detractorsCount,
      totalResponses,
      performance: this.getNPSPerformance(npsScore),
      percentages: {
        promoters: Math.round(promotersPercent * 100) / 100,
        passives: Math.round(passivesPercent * 100) / 100,
        detractors: Math.round(detractorsPercent * 100) / 100,
      },
    };
  }

  /**
   * Calculate metrics for a specific question
   */
  static async calculateQuestionMetrics(
    surveyId: number,
    questionId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<QuestionMetrics> {
    // Get question details
    const question = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.questionId, questionId))
      .limit(1);

    if (!question.length) {
      throw new Error(`Question ${questionId} not found`);
    }

    const filter: AnalyticsFilter = { surveyId, questionId, dateFrom, dateTo };

    // Calculate both CSAT and NPS
    const [csat, nps] = await Promise.all([
      this.calculateCSAT(filter),
      this.calculateNPS(filter),
    ]);

    return {
      questionId: question[0].questionId,
      questionText: question[0].questionText,
      questionOrder: question[0].questionOrder,
      csat,
      nps,
    };
  }

  /**
   * Get comprehensive analytics for a survey
   */
  static async getSurveyAnalytics(
    surveyId: number,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<SurveyAnalytics> {
    // Get survey details
    const survey = await db
      .select()
      .from(analyticsSurveys)
      .where(eq(analyticsSurveys.surveyId, surveyId))
      .limit(1);

    if (!survey.length) {
      throw new Error(`Survey ${surveyId} not found`);
    }

    // Check if analytics responses exist for this survey
    const [{ count: analyticsResponseCount }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId));

    // If no analytics responses, fallback to main survey responses
    if (!analyticsResponseCount || analyticsResponseCount === 0) {
      const [mainSurvey] = await db
        .select()
        .from(mainSurveys)
        .where(eq(mainSurveys.title, survey[0].surveyName))
        .limit(1);

      if (mainSurvey) {
        const mainResponsesQuery = await db
          .select({
            csatScore: mainResponses.csatScore,
            npsScore: mainResponses.npsScore,
            submittedAt: mainResponses.submittedAt,
          })
          .from(mainResponses)
          .where(eq(mainResponses.surveyId, mainSurvey.id));

        const csatScores = mainResponsesQuery
          .map((r) => r.csatScore)
          .filter((s): s is number => typeof s === "number");
        const npsScores = mainResponsesQuery
          .map((r) => r.npsScore)
          .filter((s): s is number => typeof s === "number");

        const csatDistribution = {
          score5: 0,
          score4: 0,
          score3: 0,
          score2: 0,
          score1: 0,
          score0: 0,
        };

        for (const score of csatScores) {
          const normalized = this.normalizeScore(score, 10).normalizedScore5;
          if (normalized === 5) csatDistribution.score5 += 1;
          else if (normalized === 4) csatDistribution.score4 += 1;
          else if (normalized === 3) csatDistribution.score3 += 1;
          else if (normalized === 2) csatDistribution.score2 += 1;
          else if (normalized === 1) csatDistribution.score1 += 1;
          else csatDistribution.score0 += 1;
        }

        const csatTotal = csatScores.length;
        const satisfiedCount = csatDistribution.score5 + csatDistribution.score4;
        const csatScore = csatTotal > 0 ? (satisfiedCount / csatTotal) * 100 : 0;

        const promotersCount = npsScores.filter((s) => s >= 9).length;
        const passivesCount = npsScores.filter((s) => s >= 7 && s <= 8).length;
        const detractorsCount = npsScores.filter((s) => s <= 6).length;
        const npsTotal = npsScores.length;
        const promotersPercent = npsTotal > 0 ? (promotersCount / npsTotal) * 100 : 0;
        const detractorsPercent = npsTotal > 0 ? (detractorsCount / npsTotal) * 100 : 0;
        const passivesPercent = npsTotal > 0 ? (passivesCount / npsTotal) * 100 : 0;
        const npsScore = promotersPercent - detractorsPercent;

        const minDate = mainResponsesQuery
          .map((r) => r.submittedAt)
          .filter(Boolean)
          .sort((a, b) => (a! < b! ? -1 : 1))[0];
        const maxDate = mainResponsesQuery
          .map((r) => r.submittedAt)
          .filter(Boolean)
          .sort((a, b) => (a! > b! ? -1 : 1))[0];

        return {
          surveyId: survey[0].surveyId,
          surveyName: survey[0].surveyName,
          totalRespondents: mainResponsesQuery.length,
          dateRange: {
            start: minDate || new Date(),
            end: maxDate || new Date(),
          },
          overall: {
            csat: {
              csatScore: Math.round(csatScore * 100) / 100,
              satisfiedCount,
              totalResponses: csatTotal,
              performance: this.getCSATPerformance(csatScore),
              distribution: csatDistribution,
            },
            nps: {
              npsScore: Math.round(npsScore * 100) / 100,
              promotersCount,
              passivesCount,
              detractorsCount,
              totalResponses: npsTotal,
              performance: this.getNPSPerformance(npsScore),
              percentages: {
                promoters: Math.round(promotersPercent * 100) / 100,
                passives: Math.round(passivesPercent * 100) / 100,
                detractors: Math.round(detractorsPercent * 100) / 100,
              },
            },
          },
          questions: [],
          calculatedAt: new Date(),
        };
      }
    }

    // Get all questions for this survey
    const questions = await db
      .select()
      .from(surveyQuestions)
      .where(eq(surveyQuestions.surveyId, surveyId))
      .orderBy(surveyQuestions.questionOrder);

    // Calculate overall metrics
    const overallFilter: AnalyticsFilter = { surveyId, dateFrom, dateTo };
    const [overallCSAT, overallNPS] = await Promise.all([
      this.calculateCSAT(overallFilter),
      this.calculateNPS(overallFilter),
    ]);

    // Calculate metrics for each question
    const questionMetrics = await Promise.all(
      questions.map(q => this.calculateQuestionMetrics(surveyId, q.questionId, dateFrom, dateTo))
    );

    // Get date range from responses
    const dateRangeQuery = await db
      .select({
        minDate: sql<Date>`MIN(${surveyResponses.responseDate})`,
        maxDate: sql<Date>`MAX(${surveyResponses.responseDate})`,
      })
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId));

    return {
      surveyId: survey[0].surveyId,
      surveyName: survey[0].surveyName,
      totalRespondents: overallCSAT.totalResponses,
      dateRange: {
        start: dateRangeQuery[0]?.minDate || new Date(),
        end: dateRangeQuery[0]?.maxDate || new Date(),
      },
      overall: {
        csat: overallCSAT,
        nps: overallNPS,
      },
      questions: questionMetrics,
      calculatedAt: new Date(),
    };
  }

  /**
   * Store calculated metrics in the database
   */
  static async storeMetrics(
    surveyId: number,
    questionId: number | null,
    csat: CSATMetrics,
    nps: NPSMetrics,
    dateRangeStart?: Date | string,
    dateRangeEnd?: Date | string
  ): Promise<void> {
    // Convert date strings to Date objects if needed
    const startDate = dateRangeStart ? (typeof dateRangeStart === 'string' ? new Date(dateRangeStart) : dateRangeStart) : undefined;
    const endDate = dateRangeEnd ? (typeof dateRangeEnd === 'string' ? new Date(dateRangeEnd) : dateRangeEnd) : undefined;

    await db.insert(surveyMetrics).values({
      surveyId,
      questionId: questionId || undefined,
      csatScore: csat.csatScore.toString(),
      satisfiedCount: csat.satisfiedCount,
      totalResponses: csat.totalResponses,
      npsScore: nps.npsScore.toString(),
      promotersCount: nps.promotersCount,
      passivesCount: nps.passivesCount,
      detractorsCount: nps.detractorsCount,
      score5Count: csat.distribution.score5,
      score4Count: csat.distribution.score4,
      score3Count: csat.distribution.score3,
      score2Count: csat.distribution.score2,
      score1Count: csat.distribution.score1,
      score0Count: csat.distribution.score0,
      csatPerformance: csat.performance,
      npsPerformance: nps.performance,
      dateRangeStart: startDate,
      dateRangeEnd: endDate,
    });
  }

  /**
   * Update all metrics for a survey (overall and per-question)
   */
  static async updateAllMetrics(surveyId: number): Promise<void> {
    const analytics = await this.getSurveyAnalytics(surveyId);

    // Store overall metrics (questionId = null)
    await this.storeMetrics(
      surveyId,
      null,
      analytics.overall.csat,
      analytics.overall.nps,
      analytics.dateRange.start,
      analytics.dateRange.end
    );

    // Store per-question metrics
    for (const question of analytics.questions) {
      await this.storeMetrics(
        surveyId,
        question.questionId,
        question.csat,
        question.nps,
        analytics.dateRange.start,
        analytics.dateRange.end
      );
    }
  }

  /**
   * Submit a new survey response with automatic normalization
   */
  static async submitResponse(params: {
    surveyId: number;
    questionId: number;
    respondentId: string;
    score: number;
    maxScale?: number;
    sessionId?: string;
    metadata?: Record<string, any>;
    responseDate?: Date;
  }): Promise<void> {
    const { surveyId, questionId, respondentId, score, maxScale = 10, sessionId, metadata, responseDate } = params;

    // Normalize the score
    const normalized = this.normalizeScore(score, maxScale);

    // Build values object
    const values: any = {
      surveyId,
      questionId,
      respondentId,
      originalScore: normalized.originalScore.toString(),
      normalizedScore5: normalized.normalizedScore5,
      normalizedScore10: normalized.normalizedScore10,
      sessionId,
      metadata: metadata || null,
    };

    // Only include responseDate if provided
    if (responseDate) {
      values.responseDate = responseDate;
    }

    // Insert the response
    await db.insert(surveyResponses).values(values);

    // Update metrics automatically
    await this.updateAllMetrics(surveyId);
  }

  /**
   * Get historical metrics for trend analysis
   */
  static async getMetricHistory(
    surveyId: number,
    questionId?: number,
    limit: number = 30
  ) {
    const conditions = [eq(surveyMetrics.surveyId, surveyId)];
    if (questionId !== undefined) {
      conditions.push(eq(surveyMetrics.questionId, questionId));
    } else {
      conditions.push(isNull(surveyMetrics.questionId));
    }

    return await db
      .select()
      .from(surveyMetrics)
      .where(and(...conditions))
      .orderBy(sql`${surveyMetrics.calculationDate} DESC`)
      .limit(limit);
  }

  /**
   * Get completion funnel data - tracks survey progression
   */
  static async getCompletionFunnel(dateFrom?: Date, dateTo?: Date) {
    const conditions = [];
    if (dateFrom) conditions.push(gte(surveyResponses.responseDate, dateFrom));
    if (dateTo) conditions.push(lte(surveyResponses.responseDate, dateTo));

    const responses = await db
      .select({
        responseId: surveyResponses.responseId,
        questionOrder: surveyQuestions.questionOrder,
      })
      .from(surveyResponses)
      .leftJoin(surveyQuestions, eq(surveyResponses.questionId, surveyQuestions.questionId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Build funnel stages
    const stages = [
      { name: "Survey Started", value: responses.length },
    ];

    // Count by question order
    const maxQuestionOrder = Math.max(...responses.map(r => r.questionOrder || 0), 0);
    for (let i = 1; i <= maxQuestionOrder; i++) {
      const completed = responses.filter(r => r.questionOrder && r.questionOrder >= i).length;
      stages.push({
        name: `Question ${i} Completed`,
        value: completed,
      });
    }

    return stages;
  }

  /**
   * Get demographic distribution - gender and location breakdown
   */
  static async getDemographicDistribution(dateFrom?: Date, dateTo?: Date) {
    const conditions = [];
    if (dateFrom) conditions.push(gte(surveyResponses.responseDate, dateFrom));
    if (dateTo) conditions.push(lte(surveyResponses.responseDate, dateTo));

    const responses = await db
      .select({
        location: surveyResponses.location,
        gender: surveyResponses.gender,
      })
      .from(surveyResponses)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Group by location
    const locationMap = new Map<string, { male: number; female: number; other: number }>();
    responses.forEach(r => {
      const location = r.location || "Unknown";
      if (!locationMap.has(location)) {
        locationMap.set(location, { male: 0, female: 0, other: 0 });
      }
      const data = locationMap.get(location)!;
      if (r.gender === "M") data.male++;
      else if (r.gender === "F") data.female++;
      else data.other++;
    });

    return Array.from(locationMap.entries()).map(([label, data]) => ({
      label,
      ...data,
    }));
  }

  /**
   * Get question performance metrics - clarity vs satisfaction
   */
  static async getQuestionPerformance(dateFrom?: Date, dateTo?: Date) {
    const conditions = [];
    if (dateFrom) conditions.push(gte(surveyResponses.responseDate, dateFrom));
    if (dateTo) conditions.push(lte(surveyResponses.responseDate, dateTo));

    const responses = await db
      .select({
        questionId: surveyResponses.questionId,
        questionOrder: surveyQuestions.questionOrder,
        clarity: surveyResponses.clarity,
        satisfaction: surveyResponses.satisfaction,
      })
      .from(surveyResponses)
      .leftJoin(surveyQuestions, eq(surveyResponses.questionId, surveyQuestions.questionId))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Group by question
    const questionMap = new Map<number, { clarities: number[]; satisfactions: number[]; count: number }>();
    responses.forEach(r => {
      const qid = r.questionOrder || 1;
      if (!questionMap.has(qid)) {
        questionMap.set(qid, { clarities: [], satisfactions: [], count: 0 });
      }
      const data = questionMap.get(qid)!;
      if (r.clarity !== undefined && r.clarity !== null) data.clarities.push(r.clarity);
      if (r.satisfaction !== undefined && r.satisfaction !== null) data.satisfactions.push(r.satisfaction);
      data.count++;
    });

    // Calculate averages and format for bubble chart
    return Array.from(questionMap.entries()).map(([qOrder, data]) => {
      const avgClarity = data.clarities.length > 0
        ? Math.round((data.clarities.reduce((a, b) => a + b, 0) / data.clarities.length) * 10)
        : 50;
      const avgSatisfaction = data.satisfactions.length > 0
        ? Math.round((data.satisfactions.reduce((a, b) => a + b, 0) / data.satisfactions.length) * 10)
        : 50;

      return {
        name: `Q${qOrder}`,
        x: avgClarity,
        y: avgSatisfaction,
        size: data.count,
        category: avgSatisfaction >= 70 ? "High" : avgSatisfaction >= 50 ? "Medium" : "Low",
      };
    });
  }
}



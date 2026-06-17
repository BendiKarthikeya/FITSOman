import { db } from "../db";
import { responses, analyticsSurveys } from "../../shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { AdvancedAnalyticsService } from "./advancedAnalyticsService";

/**
 * Executive Summary Service
 * Generates comprehensive executive summaries with key findings, strengths, and improvement areas
 */

export interface ExecutiveSummary {
  id: string;
  surveyId: string;
  periodStart: Date;
  periodEnd: Date;
  title: string;
  generatedFor: string;
  segmentValue?: string;
  
  // Key findings
  keyFindings: Array<{
    finding: string;
    impact: 'high' | 'medium' | 'low';
    category: string;
  }>;
  
  strengths: Array<{
    area: string;
    score: number;
    description: string;
  }>;
  
  improvementAreas: Array<{
    area: string;
    currentScore: number;
    gapToTarget: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }>;
  
  criticalIssues: Array<{
    issue: string;
    severity: 'critical' | 'high';
    affectedCount: number;
    recommendation: string;
  }>;
  
  // Metrics
  overallScore: number;
  participationRate: number;
  responseCount: number;
  
  // Trends
  trendSummary: string;
  majorChanges: Array<{
    metric: string;
    change: number;
    direction: 'up' | 'down' | 'stable';
  }>;
  
  // Recommendations
  topRecommendations: Array<{
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }>;
}

export class ExecutiveSummaryService {
  
  /**
   * Generate comprehensive executive summary
   */
  static async generateExecutiveSummary(params: {
    surveyId: string;
    periodStart: Date;
    periodEnd: Date;
    generatedFor?: string;
    segmentValue?: string;
  }): Promise<ExecutiveSummary> {
    const { surveyId, periodStart, periodEnd, generatedFor = 'overall', segmentValue } = params;

    // Get all responses for the period
    const allResponses = await db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          gte(responses.submittedAt, periodStart),
          lte(responses.submittedAt, periodEnd)
        )
      );

    const responseCount = allResponses.length;
    
    // Calculate overall metrics
    const avgCsat = allResponses.reduce((sum, r) => sum + (r.csatScore || 0), 0) / responseCount || 0;
    const avgNps = allResponses.reduce((sum, r) => sum + (r.npsScore || 0), 0) / responseCount || 0;
    const avgEvi = allResponses.reduce((sum, r) => sum + (r.eviScore || 0), 0) / responseCount || 0;
    const overallScore = (avgCsat + avgNps + avgEvi) / 3;

    // Get trends
    const trends = await AdvancedAnalyticsService.detectTrends({
      surveyId,
      metricType: 'engagement',
      periodType: 'monthly',
      periodStart,
      periodEnd
    });

    // Identify key findings
    const keyFindings = this.identifyKeyFindings(allResponses, trends);
    
    // Identify strengths (areas with high scores)
    const strengths = this.identifyStrengths(allResponses);
    
    // Identify improvement areas (areas with low scores)
    const improvementAreas = this.identifyImprovementAreas(allResponses);
    
    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(allResponses, trends);
    
    // Generate trend summary
    const trendSummary = this.generateTrendSummary(trends);
    
    // Extract major changes
    const majorChanges = trends.filter(t => t.isSignificant).map(t => ({
      metric: t.metricType,
      change: t.changePercentage || 0,
      direction: t.trendDirection === 'increasing' ? 'up' as const : 
                 t.trendDirection === 'decreasing' ? 'down' as const : 
                 'stable' as const
    }));
    
    // Generate top recommendations
    const topRecommendations = this.generateTopRecommendations(
      improvementAreas,
      criticalIssues,
      await AdvancedAnalyticsService.identifyEngagementDrivers({
        surveyId,
        periodStart,
        periodEnd
      })
    );

    const summaryId = crypto.randomUUID();
    const title = `Executive Summary: ${generatedFor} - ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`;

    // Store in database
    await db.execute(sql`
      INSERT INTO executive_summaries (
        id, survey_id, period_start, period_end, title, generated_for, segment_value,
        key_findings, strengths, improvement_areas, critical_issues,
        overall_score, participation_rate, response_count,
        trend_summary, major_changes, top_recommendations
      ) VALUES (
        ${summaryId}, ${surveyId}, ${periodStart}, ${periodEnd}, ${title}, 
        ${generatedFor}, ${segmentValue || null},
        ${JSON.stringify(keyFindings)}, ${JSON.stringify(strengths)}, 
        ${JSON.stringify(improvementAreas)}, ${JSON.stringify(criticalIssues)},
        ${overallScore}, ${0}, ${responseCount},
        ${trendSummary}, ${JSON.stringify(majorChanges)}, 
        ${JSON.stringify(topRecommendations)}
      )
    `);

    return {
      id: summaryId,
      surveyId,
      periodStart,
      periodEnd,
      title,
      generatedFor,
      segmentValue,
      keyFindings,
      strengths,
      improvementAreas,
      criticalIssues,
      overallScore: Number(overallScore.toFixed(2)),
      participationRate: 0,
      responseCount,
      trendSummary,
      majorChanges,
      topRecommendations
    };
  }

  /**
   * Identify key findings from response data
   */
  private static identifyKeyFindings(responses: any[], trends: any[]): Array<{
    finding: string;
    impact: 'high' | 'medium' | 'low';
    category: string;
  }> {
    const findings: Array<{ finding: string; impact: 'high' | 'medium' | 'low'; category: string }> = [];

    // Analyze participation
    if (responses.length > 50) {
      findings.push({
        finding: `Strong participation with ${responses.length} responses`,
        impact: 'high',
        category: 'participation'
      });
    } else if (responses.length < 20) {
      findings.push({
        finding: `Low participation with only ${responses.length} responses - consider improving survey accessibility`,
        impact: 'high',
        category: 'participation'
      });
    }

    // Analyze sentiment distribution
    const sentiments = responses.map(r => r.overallSentiment).filter(Boolean);
    const positivePct = sentiments.filter(s => s === 'positive').length / sentiments.length * 100;
    const negativePct = sentiments.filter(s => s === 'negative').length / sentiments.length * 100;

    if (positivePct > 70) {
      findings.push({
        finding: `Overwhelmingly positive sentiment at ${positivePct.toFixed(0)}%`,
        impact: 'high',
        category: 'sentiment'
      });
    } else if (negativePct > 30) {
      findings.push({
        finding: `Concerning level of negative sentiment at ${negativePct.toFixed(0)}%`,
        impact: 'high',
        category: 'sentiment'
      });
    }

    // Analyze trends
    const significantTrends = trends.filter(t => t.isSignificant);
    if (significantTrends.length > 0) {
      significantTrends.forEach(trend => {
        findings.push({
          finding: `Significant ${trend.trendDirection} trend in ${trend.metricType} (${trend.changePercentage?.toFixed(1)}%)`,
          impact: Math.abs(trend.changePercentage || 0) > 20 ? 'high' : 'medium',
          category: 'trend'
        });
      });
    }

    return findings;
  }

  /**
   * Identify strengths (high-performing areas)
   */
  private static identifyStrengths(responses: any[]): Array<{
    area: string;
    score: number;
    description: string;
  }> {
    const strengths: Array<{ area: string; score: number; description: string }> = [];

    const avgCsat = responses.reduce((sum, r) => sum + (r.csatScore || 0), 0) / responses.length || 0;
    const avgNps = responses.reduce((sum, r) => sum + (r.npsScore || 0), 0) / responses.length || 0;
    const avgEvi = responses.reduce((sum, r) => sum + (r.eviScore || 0), 0) / responses.length || 0;

    if (avgCsat >= 75) {
      strengths.push({
        area: 'Customer Satisfaction',
        score: avgCsat,
        description: 'CSAT score is excellent, indicating high customer satisfaction'
      });
    }

    if (avgNps >= 50) {
      strengths.push({
        area: 'Net Promoter Score',
        score: avgNps,
        description: 'NPS is excellent, indicating strong customer loyalty and advocacy'
      });
    }

    if (avgEvi >= 75) {
      strengths.push({
        area: 'Employee Voice Index',
        score: avgEvi,
        description: 'EVI score is high, showing strong employee engagement and voice'
      });
    }

    // Analyze sentiment
    const positivePct = responses.filter(r => r.overallSentiment === 'positive').length / responses.length * 100;
    if (positivePct >= 60) {
      strengths.push({
        area: 'Overall Sentiment',
        score: positivePct,
        description: 'Strong positive sentiment across responses'
      });
    }

    return strengths;
  }

  /**
   * Identify improvement areas (low-performing areas)
   */
  private static identifyImprovementAreas(responses: any[]): Array<{
    area: string;
    currentScore: number;
    gapToTarget: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
  }> {
    const improvements: Array<{
      area: string;
      currentScore: number;
      gapToTarget: number;
      priority: 'critical' | 'high' | 'medium' | 'low';
      description: string;
    }> = [];

    const avgCsat = responses.reduce((sum, r) => sum + (r.csatScore || 0), 0) / responses.length || 0;
    const avgNps = responses.reduce((sum, r) => sum + (r.npsScore || 0), 0) / responses.length || 0;
    const avgEvi = responses.reduce((sum, r) => sum + (r.eviScore || 0), 0) / responses.length || 0;

    const targetCsat = 80;
    const targetNps = 50;
    const targetEvi = 80;

    if (avgCsat < targetCsat) {
      const gap = targetCsat - avgCsat;
      improvements.push({
        area: 'Customer Satisfaction',
        currentScore: avgCsat,
        gapToTarget: gap,
        priority: gap > 30 ? 'critical' : gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low',
        description: `CSAT is ${gap.toFixed(1)} points below target. Focus on improving customer experience.`
      });
    }

    if (avgNps < targetNps) {
      const gap = targetNps - avgNps;
      improvements.push({
        area: 'Net Promoter Score',
        currentScore: avgNps,
        gapToTarget: gap,
        priority: gap > 30 ? 'critical' : gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low',
        description: `NPS is ${gap.toFixed(1)} points below target. Work on increasing customer loyalty and advocacy.`
      });
    }

    if (avgEvi < targetEvi) {
      const gap = targetEvi - avgEvi;
      improvements.push({
        area: 'Employee Voice Index',
        currentScore: avgEvi,
        gapToTarget: gap,
        priority: gap > 30 ? 'critical' : gap > 20 ? 'high' : gap > 10 ? 'medium' : 'low',
        description: `EVI is ${gap.toFixed(1)} points below target. Enhance employee engagement and feedback mechanisms.`
      });
    }

    // Check negative sentiment
    const negativePct = responses.filter(r => r.overallSentiment === 'negative').length / responses.length * 100;
    if (negativePct > 20) {
      improvements.push({
        area: 'Negative Sentiment',
        currentScore: 100 - negativePct,
        gapToTarget: negativePct - 10, // Target is < 10% negative
        priority: negativePct > 40 ? 'critical' : negativePct > 30 ? 'high' : 'medium',
        description: `${negativePct.toFixed(0)}% negative sentiment detected. Address underlying concerns promptly.`
      });
    }

    return improvements.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Identify critical issues requiring immediate attention
   */
  private static identifyCriticalIssues(responses: any[], trends: any[]): Array<{
    issue: string;
    severity: 'critical' | 'high';
    affectedCount: number;
    recommendation: string;
  }> {
    const issues: Array<{
      issue: string;
      severity: 'critical' | 'high';
      affectedCount: number;
      recommendation: string;
    }> = [];

    // Check for sharp negative trends
    const negativeSignificantTrends = trends.filter(t => 
      t.isSignificant && t.trendDirection === 'decreasing' && (t.changePercentage || 0) < -15
    );

    if (negativeSignificantTrends.length > 0) {
      negativeSignificantTrends.forEach(trend => {
        issues.push({
          issue: `Sharp decline in ${trend.metricType} (${trend.changePercentage?.toFixed(1)}%)`,
          severity: 'critical',
          affectedCount: responses.length,
          recommendation: 'Immediate investigation required. Conduct focus groups or one-on-ones to understand root causes.'
        });
      });
    }

    // Check for high negative sentiment
    const negativeResponses = responses.filter(r => r.overallSentiment === 'negative');
    if (negativeResponses.length > responses.length * 0.3) {
      issues.push({
        issue: 'High proportion of negative sentiment',
        severity: 'critical',
        affectedCount: negativeResponses.length,
        recommendation: 'Address organizational concerns immediately. Consider town halls or listening sessions.'
      });
    }

    // Check for very low scores
    const criticallyLowScores = responses.filter(r => 
      (r.csatScore && r.csatScore < 40) || 
      (r.npsScore && r.npsScore < 20) || 
      (r.eviScore && r.eviScore < 40)
    );
    
    if (criticallyLowScores.length > responses.length * 0.2) {
      issues.push({
        issue: 'Significant number of critically low scores',
        severity: 'high',
        affectedCount: criticallyLowScores.length,
        recommendation: 'Investigate common themes in low-scoring responses. Implement immediate improvement actions.'
      });
    }

    return issues;
  }

  /**
   * Generate trend summary text
   */
  private static generateTrendSummary(trends: any[]): string {
    if (trends.length === 0) {
      return 'No significant trends detected in this period.';
    }

    const significantTrends = trends.filter(t => t.isSignificant);
    if (significantTrends.length === 0) {
      return 'Metrics remain stable with no significant changes from the previous period.';
    }

    const increasing = significantTrends.filter(t => t.trendDirection === 'increasing');
    const decreasing = significantTrends.filter(t => t.trendDirection === 'decreasing');

    let summary = '';
    if (increasing.length > 0) {
      summary += `Positive momentum with ${increasing.length} metric${increasing.length > 1 ? 's' : ''} showing significant improvement. `;
    }
    if (decreasing.length > 0) {
      summary += `Attention needed: ${decreasing.length} metric${decreasing.length > 1 ? 's' : ''} showing concerning decline. `;
    }

    return summary.trim();
  }

  /**
   * Generate top recommendations
   */
  private static generateTopRecommendations(
    improvementAreas: any[],
    criticalIssues: any[],
    engagementDrivers: any[]
  ): Array<{
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: string;
  }> {
    const recommendations: Array<{
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
      expectedImpact: string;
    }> = [];

    // Critical issues first
    criticalIssues.slice(0, 2).forEach(issue => {
      recommendations.push({
        recommendation: issue.recommendation,
        priority: 'high',
        expectedImpact: `Address critical concern affecting ${issue.affectedCount} respondents`
      });
    });

    // Top improvement areas
    improvementAreas.slice(0, 3).forEach(area => {
      if (area.priority === 'critical' || area.priority === 'high') {
        recommendations.push({
          recommendation: `Focus on improving ${area.area} - currently ${area.gapToTarget.toFixed(1)} points below target`,
          priority: area.priority === 'critical' ? 'high' : 'medium',
          expectedImpact: `Potential to improve overall score by ${(area.gapToTarget / 3).toFixed(1)} points`
        });
      }
    });

    // Top engagement drivers
    engagementDrivers.slice(0, 2).forEach(driver => {
      recommendations.push({
        recommendation: driver.recommendation,
        priority: driver.impactScore > 70 ? 'high' : 'medium',
        expectedImpact: `High correlation with engagement (impact score: ${driver.impactScore.toFixed(0)})`
      });
    });

    return recommendations.slice(0, 5); // Top 5 recommendations
  }

  /**
   * Get existing executive summary
   */
  static async getExecutiveSummary(summaryId: string): Promise<ExecutiveSummary | null> {
    const result = await db.execute(sql`
      SELECT * FROM executive_summaries WHERE id = ${summaryId}
    `);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0] as any;
    return {
      id: row.id,
      surveyId: row.survey_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      title: row.title,
      generatedFor: row.generated_for,
      segmentValue: row.segment_value,
      keyFindings: JSON.parse(row.key_findings),
      strengths: JSON.parse(row.strengths),
      improvementAreas: JSON.parse(row.improvement_areas),
      criticalIssues: JSON.parse(row.critical_issues),
      overallScore: row.overall_score,
      participationRate: row.participation_rate,
      responseCount: row.response_count,
      trendSummary: row.trend_summary,
      majorChanges: JSON.parse(row.major_changes),
      topRecommendations: JSON.parse(row.top_recommendations)
    };
  }
}

export default ExecutiveSummaryService;

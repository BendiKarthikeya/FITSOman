import { db } from "../db";
import { responses } from "../../shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { AdvancedAnalyticsService } from "./advancedAnalyticsService";

/**
 * Monitoring & Early Warning System Service
 * Identifies early warning signals and manages automated periodic reporting
 */

export interface MonitoringAlert {
  id: string;
  alertType: 'disengagement' | 'sentiment_drop' | 'participation_drop' | 'critical_score' | 'trend_reversal';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  
  title: string;
  description: string;
  alertMessage: string;
  
  surveyId?: string;
  affectedSegmentType?: string;
  affectedSegmentValue?: string;
  affectedCount: number;
  
  currentValue: number;
  thresholdValue: number;
  previousValue?: number;
  changePercentage?: number;
  
  supportingData: any;
  trendData?: any;
  
  recommendedActions: Array<{
    action: string;
    priority: 'immediate' | 'urgent' | 'normal';
    description: string;
  }>;
  
  assignedTo?: string;
  actionTaken?: string;
  
  detectedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export interface PeriodicReport {
  id: string;
  reportName: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'custom';
  frequency: string;
  
  includedSurveys: string[];
  includedSegments: any[];
  includedMetrics: string[];
  
  recipients: string[];
  distributionList?: string;
  
  periodStart: Date;
  periodEnd: Date;
  generatedAt: Date;
  
  summaryData: any;
  trendsData: any;
  alertsData: any;
  recommendationsData: any;
  
  deliveryMethod: 'email' | 'dashboard' | 'both';
  deliveredAt?: Date;
  deliveryStatus: 'pending' | 'sent' | 'failed';
  
  openedBy: string[];
  openCount: number;
  
  createdBy?: string;
}

export interface ReportSubscription {
  id: string;
  userId: string;
  reportType: string;
  frequency: string;
  
  surveyFilters?: any;
  segmentFilters?: any;
  metricFilters?: any;
  
  deliveryMethod: 'email' | 'dashboard' | 'both';
  deliveryTime?: string;
  deliveryDayOfWeek?: number;
  deliveryDayOfMonth?: number;
  
  isActive: boolean;
  lastSentAt?: Date;
  nextScheduledAt?: Date;
}

export class MonitoringService {
  
  // Thresholds for alerts
  private static readonly THRESHOLDS = {
    criticalScore: 40,
    lowEngagement: 50,
    highNegativeSentiment: 30, // percentage
    participationDrop: 50, // percentage drop
    significantChange: 15 // percentage change
  };

  /**
   * Monitor and detect early warning signals
   */
  static async monitorEarlyWarnings(params: {
    surveyId: string;
    periodStart: Date;
    periodEnd: Date;
    segmentType?: string;
    segmentValue?: string;
  }): Promise<MonitoringAlert[]> {
    const { surveyId, periodStart, periodEnd, segmentType, segmentValue } = params;
    const alerts: MonitoringAlert[] = [];

    // Get current period responses
    const currentResponses = await db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          gte(responses.submittedAt, periodStart),
          lte(responses.submittedAt, periodEnd)
        )
      );

    // Get previous period for comparison
    const periodLength = periodEnd.getTime() - periodStart.getTime();
    const previousPeriodEnd = new Date(periodStart.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);

    const previousResponses = await db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          gte(responses.submittedAt, previousPeriodStart),
          lte(responses.submittedAt, previousPeriodEnd)
        )
      );

    // 1. Check for critical scores
    const criticalScoreAlerts = this.detectCriticalScores(currentResponses, surveyId, segmentType, segmentValue);
    alerts.push(...criticalScoreAlerts);

    // 2. Check for sentiment drops
    const sentimentAlerts = this.detectSentimentDrops(currentResponses, previousResponses, surveyId, segmentType, segmentValue);
    alerts.push(...sentimentAlerts);

    // 3. Check for participation drops
    const participationAlerts = this.detectParticipationDrops(
      currentResponses.length,
      previousResponses.length,
      surveyId,
      segmentType,
      segmentValue
    );
    alerts.push(...participationAlerts);

    // 4. Check for engagement drops
    const engagementAlerts = this.detectEngagementDrops(currentResponses, previousResponses, surveyId, segmentType, segmentValue);
    alerts.push(...engagementAlerts);

    // Store alerts in database
    for (const alert of alerts) {
      await this.storeAlert(alert);
    }

    return alerts;
  }

  /**
   * Detect critical scores
   */
  private static detectCriticalScores(
    responses: any[],
    surveyId: string,
    segmentType?: string,
    segmentValue?: string
  ): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    const criticalResponses = responses.filter(r =>
      (r.csatScore && r.csatScore < this.THRESHOLDS.criticalScore) ||
      (r.npsScore && r.npsScore < this.THRESHOLDS.criticalScore) ||
      (r.eviScore && r.eviScore < this.THRESHOLDS.criticalScore)
    );

    if (criticalResponses.length > 0) {
      const percentage = (criticalResponses.length / responses.length) * 100;
      const avgScore = criticalResponses.reduce((sum, r) => 
        sum + ((r.csatScore || 0) + (r.npsScore || 0) + (r.eviScore || 0)) / 3, 0
      ) / criticalResponses.length;

      alerts.push({
        id: crypto.randomUUID(),
        alertType: 'critical_score',
        severity: percentage > 25 ? 'critical' : 'high',
        status: 'active',
        title: 'Critical Scores Detected',
        description: `${criticalResponses.length} responses with critically low scores`,
        alertMessage: `${percentage.toFixed(0)}% of responses show critical dissatisfaction`,
        surveyId,
        affectedSegmentType: segmentType,
        affectedSegmentValue: segmentValue,
        affectedCount: criticalResponses.length,
        currentValue: avgScore,
        thresholdValue: this.THRESHOLDS.criticalScore,
        supportingData: {
          criticalCount: criticalResponses.length,
          totalResponses: responses.length,
          percentage
        },
        recommendedActions: [
          {
            action: 'Immediate Investigation',
            priority: 'immediate',
            description: 'Conduct urgent investigation into root causes of dissatisfaction'
          },
          {
            action: 'Leadership Engagement',
            priority: 'immediate',
            description: 'Senior leadership should engage directly with affected teams'
          },
          {
            action: 'Action Plan',
            priority: 'urgent',
            description: 'Develop and communicate action plan within 48 hours'
          }
        ],
        detectedAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Detect sentiment drops
   */
  private static detectSentimentDrops(
    currentResponses: any[],
    previousResponses: any[],
    surveyId: string,
    segmentType?: string,
    segmentValue?: string
  ): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    const currentNegative = currentResponses.filter(r => r.overallSentiment === 'negative').length;
    const currentNegativePct = (currentNegative / currentResponses.length) * 100;

    const previousNegative = previousResponses.filter(r => r.overallSentiment === 'negative').length;
    const previousNegativePct = previousResponses.length > 0 
      ? (previousNegative / previousResponses.length) * 100 
      : 0;

    const change = currentNegativePct - previousNegativePct;

    if (currentNegativePct > this.THRESHOLDS.highNegativeSentiment || change > 10) {
      alerts.push({
        id: crypto.randomUUID(),
        alertType: 'sentiment_drop',
        severity: currentNegativePct > 40 ? 'critical' : 'high',
        status: 'active',
        title: 'Negative Sentiment Spike',
        description: `High level of negative sentiment detected`,
        alertMessage: `${currentNegativePct.toFixed(0)}% negative sentiment (${change > 0 ? '+' : ''}${change.toFixed(0)}% change)`,
        surveyId,
        affectedSegmentType: segmentType,
        affectedSegmentValue: segmentValue,
        affectedCount: currentNegative,
        currentValue: currentNegativePct,
        thresholdValue: this.THRESHOLDS.highNegativeSentiment,
        previousValue: previousNegativePct,
        changePercentage: change,
        supportingData: {
          currentNegative,
          previousNegative,
          totalCurrent: currentResponses.length,
          totalPrevious: previousResponses.length
        },
        recommendedActions: [
          {
            action: 'Sentiment Analysis',
            priority: 'immediate',
            description: 'Analyze text responses to identify specific concerns'
          },
          {
            action: 'Town Hall',
            priority: 'urgent',
            description: 'Schedule town hall or listening session'
          },
          {
            action: 'Targeted Interventions',
            priority: 'urgent',
            description: 'Implement targeted interventions for affected areas'
          }
        ],
        detectedAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Detect participation drops
   */
  private static detectParticipationDrops(
    currentCount: number,
    previousCount: number,
    surveyId: string,
    segmentType?: string,
    segmentValue?: string
  ): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    if (previousCount === 0) return alerts;

    const change = ((currentCount - previousCount) / previousCount) * 100;

    if (change < -this.THRESHOLDS.participationDrop) {
      alerts.push({
        id: crypto.randomUUID(),
        alertType: 'participation_drop',
        severity: change < -70 ? 'critical' : 'high',
        status: 'active',
        title: 'Significant Participation Drop',
        description: `Survey participation has dropped significantly`,
        alertMessage: `${Math.abs(change).toFixed(0)}% decrease in participation`,
        surveyId,
        affectedSegmentType: segmentType,
        affectedSegmentValue: segmentValue,
        affectedCount: previousCount - currentCount,
        currentValue: currentCount,
        thresholdValue: previousCount * (1 - this.THRESHOLDS.participationDrop / 100),
        previousValue: previousCount,
        changePercentage: change,
        supportingData: {
          currentCount,
          previousCount,
          difference: previousCount - currentCount
        },
        recommendedActions: [
          {
            action: 'Survey Communication',
            priority: 'urgent',
            description: 'Send reminder communications about survey importance'
          },
          {
            action: 'Accessibility Check',
            priority: 'urgent',
            description: 'Verify survey is accessible and user-friendly'
          },
          {
            action: 'Engagement Investigation',
            priority: 'normal',
            description: 'Investigate underlying engagement issues'
          }
        ],
        detectedAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Detect engagement drops
   */
  private static detectEngagementDrops(
    currentResponses: any[],
    previousResponses: any[],
    surveyId: string,
    segmentType?: string,
    segmentValue?: string
  ): MonitoringAlert[] {
    const alerts: MonitoringAlert[] = [];

    const currentAvg = currentResponses.reduce((sum, r) => sum + (r.eviScore || 0), 0) / currentResponses.length || 0;
    const previousAvg = previousResponses.length > 0
      ? previousResponses.reduce((sum, r) => sum + (r.eviScore || 0), 0) / previousResponses.length
      : 0;

    if (previousAvg === 0) return alerts;

    const change = ((currentAvg - previousAvg) / previousAvg) * 100;

    if (currentAvg < this.THRESHOLDS.lowEngagement || change < -this.THRESHOLDS.significantChange) {
      alerts.push({
        id: crypto.randomUUID(),
        alertType: 'disengagement',
        severity: currentAvg < 40 ? 'critical' : 'high',
        status: 'active',
        title: 'Engagement Level Concern',
        description: `Employee engagement shows concerning decline`,
        alertMessage: `Engagement score: ${currentAvg.toFixed(1)} (${change.toFixed(0)}% change)`,
        surveyId,
        affectedSegmentType: segmentType,
        affectedSegmentValue: segmentValue,
        affectedCount: currentResponses.length,
        currentValue: currentAvg,
        thresholdValue: this.THRESHOLDS.lowEngagement,
        previousValue: previousAvg,
        changePercentage: change,
        supportingData: {
          currentAvg,
          previousAvg,
          responseCount: currentResponses.length
        },
        trendData: {
          direction: 'decreasing',
          magnitude: Math.abs(change)
        },
        recommendedActions: [
          {
            action: 'Driver Analysis',
            priority: 'immediate',
            description: 'Identify key drivers of disengagement'
          },
          {
            action: 'Leadership Action',
            priority: 'urgent',
            description: 'Leadership should address concerns and communicate action plan'
          },
          {
            action: 'Quick Wins',
            priority: 'urgent',
            description: 'Implement quick win improvements to show responsiveness'
          }
        ],
        detectedAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Store alert in database
   */
  private static async storeAlert(alert: MonitoringAlert): Promise<void> {
    await db.execute(sql`
      INSERT INTO monitoring_alerts (
        id, alert_type, severity, status, title, description, alert_message,
        survey_id, affected_segment_type, affected_segment_value, affected_count,
        current_value, threshold_value, previous_value, change_percentage,
        supporting_data, trend_data, recommended_actions,
        assigned_to, action_taken, detected_at, acknowledged_at, resolved_at
      ) VALUES (
        ${alert.id}, ${alert.alertType}, ${alert.severity}, ${alert.status},
        ${alert.title}, ${alert.description}, ${alert.alertMessage},
        ${alert.surveyId || null}, ${alert.affectedSegmentType || null},
        ${alert.affectedSegmentValue || null}, ${alert.affectedCount},
        ${alert.currentValue}, ${alert.thresholdValue},
        ${alert.previousValue || null}, ${alert.changePercentage || null},
        ${JSON.stringify(alert.supportingData)}, ${JSON.stringify(alert.trendData || {})},
        ${JSON.stringify(alert.recommendedActions)},
        ${alert.assignedTo || null}, ${alert.actionTaken || null},
        ${alert.detectedAt}, ${alert.acknowledgedAt || null}, ${alert.resolvedAt || null}
      )
    `);
  }

  /**
   * Get active alerts
   */
  static async getActiveAlerts(filters?: {
    surveyId?: string;
    severity?: string;
    alertType?: string;
  }): Promise<MonitoringAlert[]> {
    let whereConditions = ['status = $1'];
    const values: any[] = ['active'];
    let paramCounter = 2;

    if (filters?.surveyId) {
      whereConditions.push(`survey_id = $${paramCounter}`);
      values.push(filters.surveyId);
      paramCounter++;
    }

    if (filters?.severity) {
      whereConditions.push(`severity = $${paramCounter}`);
      values.push(filters.severity);
      paramCounter++;
    }

    if (filters?.alertType) {
      whereConditions.push(`alert_type = $${paramCounter}`);
      values.push(filters.alertType);
    }

    const result = await db.execute(sql`
      SELECT * FROM monitoring_alerts
      WHERE ${sql.raw(whereConditions.join(' AND '))}
      ORDER BY severity DESC, detected_at DESC
    `);

    return this.mapAlertsFromRows(result.rows || []);
  }

  /**
   * Acknowledge alert
   */
  static async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    await db.execute(sql`
      UPDATE monitoring_alerts
      SET status = 'acknowledged',
          acknowledged_at = now(),
          assigned_to = ${userId}
      WHERE id = ${alertId}
    `);
  }

  /**
   * Resolve alert
   */
  static async resolveAlert(alertId: string, actionTaken: string): Promise<void> {
    await db.execute(sql`
      UPDATE monitoring_alerts
      SET status = 'resolved',
          resolved_at = now(),
          action_taken = ${actionTaken}
      WHERE id = ${alertId}
    `);
  }

  /**
   * Generate periodic report
   */
  static async generatePeriodicReport(params: {
    reportName: string;
    reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    periodStart: Date;
    periodEnd: Date;
    includedSurveys: string[];
    recipients: string[];
    createdBy?: string;
  }): Promise<PeriodicReport> {
    const { reportName, reportType, periodStart, periodEnd, includedSurveys, recipients, createdBy } = params;

    // Gather summary data
    const summaryData = await this.gatherSummaryData(includedSurveys, periodStart, periodEnd);
    
    // Gather trends data
    const trendsData = await this.gatherTrendsData(includedSurveys, periodStart, periodEnd);
    
    // Gather alerts data
    const alertsData = await this.gatherAlertsData(includedSurveys, periodStart, periodEnd);
    
    // Gather recommendations
    const recommendationsData = await this.gatherRecommendations(includedSurveys, periodStart, periodEnd);

    const reportId = crypto.randomUUID();
    const now = new Date();

    await db.execute(sql`
      INSERT INTO periodic_reports (
        id, report_name, report_type, frequency,
        included_surveys, included_segments, included_metrics,
        recipients, distribution_list, period_start, period_end, generated_at,
        summary_data, trends_data, alerts_data, recommendations_data,
        delivery_method, delivered_at, delivery_status,
        opened_by, open_count, created_by, created_at
      ) VALUES (
        ${reportId}, ${reportName}, ${reportType}, ${reportType},
        ${JSON.stringify(includedSurveys)}, ${JSON.stringify([])}, ${JSON.stringify([])},
        ${JSON.stringify(recipients)}, ${null}, ${periodStart}, ${periodEnd}, ${now},
        ${JSON.stringify(summaryData)}, ${JSON.stringify(trendsData)},
        ${JSON.stringify(alertsData)}, ${JSON.stringify(recommendationsData)},
        ${'email'}, ${null}, ${'pending'},
        ${JSON.stringify([])}, ${0}, ${createdBy || null}, ${now}
      )
    `);

    return {
      id: reportId,
      reportName,
      reportType,
      frequency: reportType,
      includedSurveys,
      includedSegments: [],
      includedMetrics: [],
      recipients,
      periodStart,
      periodEnd,
      generatedAt: now,
      summaryData,
      trendsData,
      alertsData,
      recommendationsData,
      deliveryMethod: 'email',
      deliveryStatus: 'pending',
      openedBy: [],
      openCount: 0,
      createdBy
    };
  }

  /**
   * Helper methods for report generation
   */
  private static async gatherSummaryData(surveyIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    // Simplified summary data gathering
    return {
      totalResponses: 0,
      averageScores: {
        csat: 0,
        nps: 0,
        evi: 0
      },
      participationRate: 0
    };
  }

  private static async gatherTrendsData(surveyIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    return {
      trends: [],
      significantChanges: []
    };
  }

  private static async gatherAlertsData(surveyIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    const alerts = await this.getActiveAlerts();
    return {
      activeAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      alerts: alerts.slice(0, 5) // Top 5 alerts
    };
  }

  private static async gatherRecommendations(surveyIds: string[], periodStart: Date, periodEnd: Date): Promise<any> {
    return {
      topRecommendations: [],
      actionItems: []
    };
  }

  /**
   * Map database rows to alert objects
   */
  private static mapAlertsFromRows(rows: any[]): MonitoringAlert[] {
    return rows.map((row: any) => ({
      id: row.id,
      alertType: row.alert_type,
      severity: row.severity,
      status: row.status,
      title: row.title,
      description: row.description,
      alertMessage: row.alert_message,
      surveyId: row.survey_id,
      affectedSegmentType: row.affected_segment_type,
      affectedSegmentValue: row.affected_segment_value,
      affectedCount: row.affected_count,
      currentValue: row.current_value,
      thresholdValue: row.threshold_value,
      previousValue: row.previous_value,
      changePercentage: row.change_percentage,
      supportingData: JSON.parse(row.supporting_data),
      trendData: row.trend_data ? JSON.parse(row.trend_data) : undefined,
      recommendedActions: JSON.parse(row.recommended_actions),
      assignedTo: row.assigned_to,
      actionTaken: row.action_taken,
      detectedAt: row.detected_at,
      acknowledgedAt: row.acknowledged_at,
      resolvedAt: row.resolved_at
    }));
  }
}

export default MonitoringService;

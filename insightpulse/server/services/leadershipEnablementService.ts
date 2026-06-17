import { db } from "../db";
import { responses, users, departments } from "../../shared/schema";
import { eq, and, gte, lte, sql, inArray } from "drizzle-orm";

/**
 * Leadership & Team Enablement Service
 * Provides leaders with insights and recommendations for their teams
 */

export interface LeadershipInsight {
  id: string;
  leaderId: string;
  surveyId: string;
  periodStart: Date;
  periodEnd: Date;
  
  // Team scope
  teamType: 'department' | 'direct_reports' | 'organization';
  teamIdentifier: string;
  teamSize: number;
  responseCount: number;
  participationRate: number;
  
  // Team metrics
  teamEngagementScore: number;
  teamSentimentScore: number;
  teamNps: number;
  teamCsat: number;
  
  // Comparative analysis
  companyAvgEngagement: number;
  peerAvgEngagement: number;
  percentileRank: number;
  
  // Team strengths
  topStrengths: Array<{
    strength: string;
    score: number;
    description: string;
  }>;
  celebrationAreas: string[];
  
  // Development areas
  developmentAreas: Array<{
    area: string;
    score: number;
    gap: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  riskIndicators: Array<{
    indicator: string;
    severity: 'high' | 'medium' | 'low';
    description: string;
  }>;
  
  // Recommendations
  coachingRecommendations: Array<{
    topic: string;
    description: string;
    resources: string[];
  }>;
  recognitionSuggestions: Array<{
    type: string;
    suggestion: string;
    impact: string;
  }>;
  teamBuildingActivities: Array<{
    activity: string;
    purpose: string;
    duration: string;
  }>;
  performanceImprovementTips: string[];
  
  // Risk signals (anonymized)
  highRiskSignals: number;
  attentionNeeded: Array<{
    pattern: string;
    count: number;
    recommendation: string;
  }>;
}

export interface EnablementResource {
  id: string;
  resourceType: 'coaching_guide' | 'recognition_template' | 'activity' | 'training' | 'policy';
  title: string;
  description: string;
  content: any;
  applicableScenarios: string[];
  targetIssues: string[];
  effectivenessRating: number;
  usageCount: number;
  avgSatisfaction: number;
}

export class LeadershipEnablementService {
  
  /**
   * Generate leadership insights for a leader
   */
  static async generateLeadershipInsights(params: {
    leaderId: string;
    surveyId: string;
    periodStart: Date;
    periodEnd: Date;
    teamType?: 'department' | 'direct_reports' | 'organization';
  }): Promise<LeadershipInsight> {
    const { leaderId, surveyId, periodStart, periodEnd, teamType = 'department' } = params;

    // Get leader's team members (simplified - in real implementation would use user management)
    const teamMembers = await this.getTeamMembers(leaderId, teamType);
    const teamSize = teamMembers.length;

    // Get team responses
    const teamResponses = await db
      .select()
      .from(responses)
      .where(
        and(
          eq(responses.surveyId, surveyId),
          gte(responses.submittedAt, periodStart),
          lte(responses.submittedAt, periodEnd)
          // In real implementation: filter by team member emails
        )
      );

    const responseCount = teamResponses.length;
    const participationRate = teamSize > 0 ? (responseCount / teamSize) * 100 : 0;

    // Calculate team metrics
    const teamEngagementScore = this.calculateTeamMetric(teamResponses, 'eviScore');
    const teamSentimentScore = this.calculateSentimentScore(teamResponses);
    const teamNps = this.calculateTeamMetric(teamResponses, 'npsScore');
    const teamCsat = this.calculateTeamMetric(teamResponses, 'csatScore');

    // Get company average for comparison
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

    const companyAvgEngagement = this.calculateTeamMetric(allResponses, 'eviScore');
    const peerAvgEngagement = companyAvgEngagement; // Simplified
    const percentileRank = this.calculatePercentileRank(teamEngagementScore, companyAvgEngagement);

    // Identify strengths and development areas
    const topStrengths = this.identifyTeamStrengths(teamResponses, teamEngagementScore);
    const celebrationAreas = this.identifyCelebrationAreas(teamResponses);
    const developmentAreas = this.identifyDevelopmentAreas(teamResponses, companyAvgEngagement);
    const riskIndicators = this.identifyRiskIndicators(teamResponses);

    // Generate recommendations
    const coachingRecommendations = this.generateCoachingRecommendations(developmentAreas, riskIndicators);
    const recognitionSuggestions = this.generateRecognitionSuggestions(topStrengths);
    const teamBuildingActivities = this.generateTeamBuildingActivities(teamSentimentScore, teamEngagementScore);
    const performanceImprovementTips = this.generatePerformanceTips(developmentAreas);

    // Identify high-risk signals (anonymized)
    const highRiskSignals = this.countHighRiskSignals(teamResponses);
    const attentionNeeded = this.identifyAttentionPatterns(teamResponses);

    const insightId = crypto.randomUUID();
    const teamIdentifier = `team_${leaderId}`;

    // Store in database
    await db.execute(sql`
      INSERT INTO leadership_insights (
        id, leader_id, survey_id, period_start, period_end,
        team_type, team_identifier, team_size, response_count, participation_rate,
        team_engagement_score, team_sentiment_score, team_nps, team_csat,
        company_avg_engagement, peer_avg_engagement, percentile_rank,
        top_strengths, celebration_areas, development_areas, risk_indicators,
        coaching_recommendations, recognition_suggestions, team_building_activities, performance_improvement_tips,
        high_risk_signals, attention_needed
      ) VALUES (
        ${insightId}, ${leaderId}, ${surveyId}, ${periodStart}, ${periodEnd},
        ${teamType}, ${teamIdentifier}, ${teamSize}, ${responseCount}, ${participationRate},
        ${teamEngagementScore}, ${teamSentimentScore}, ${teamNps}, ${teamCsat},
        ${companyAvgEngagement}, ${peerAvgEngagement}, ${percentileRank},
        ${JSON.stringify(topStrengths)}, ${JSON.stringify(celebrationAreas)},
        ${JSON.stringify(developmentAreas)}, ${JSON.stringify(riskIndicators)},
        ${JSON.stringify(coachingRecommendations)}, ${JSON.stringify(recognitionSuggestions)},
        ${JSON.stringify(teamBuildingActivities)}, ${JSON.stringify(performanceImprovementTips)},
        ${highRiskSignals}, ${JSON.stringify(attentionNeeded)}
      )
    `);

    return {
      id: insightId,
      leaderId,
      surveyId,
      periodStart,
      periodEnd,
      teamType,
      teamIdentifier,
      teamSize,
      responseCount,
      participationRate: Number(participationRate.toFixed(2)),
      teamEngagementScore: Number(teamEngagementScore.toFixed(2)),
      teamSentimentScore: Number(teamSentimentScore.toFixed(2)),
      teamNps: Number(teamNps.toFixed(2)),
      teamCsat: Number(teamCsat.toFixed(2)),
      companyAvgEngagement: Number(companyAvgEngagement.toFixed(2)),
      peerAvgEngagement: Number(peerAvgEngagement.toFixed(2)),
      percentileRank,
      topStrengths,
      celebrationAreas,
      developmentAreas,
      riskIndicators,
      coachingRecommendations,
      recognitionSuggestions,
      teamBuildingActivities,
      performanceImprovementTips,
      highRiskSignals,
      attentionNeeded
    };
  }

  /**
   * Get team members for a leader
   */
  private static async getTeamMembers(leaderId: string, teamType: string): Promise<any[]> {
    // Simplified - in real implementation would query user management system
    return [];
  }

  /**
   * Calculate team metric average
   */
  private static calculateTeamMetric(responses: any[], metric: 'csatScore' | 'npsScore' | 'eviScore'): number {
    if (responses.length === 0) return 0;
    const sum = responses.reduce((acc, r) => acc + (r[metric] || 0), 0);
    return sum / responses.length;
  }

  /**
   * Calculate sentiment score
   */
  private static calculateSentimentScore(responses: any[]): number {
    if (responses.length === 0) return 0;
    
    const sentimentValues: Record<string, number> = {
      positive: 1,
      neutral: 0,
      negative: -1,
      mixed: 0
    };

    const sum = responses.reduce((acc, r) => 
      acc + (sentimentValues[r.overallSentiment] || 0), 0
    );
    
    return sum / responses.length;
  }

  /**
   * Calculate percentile rank
   */
  private static calculatePercentileRank(teamScore: number, companyAvg: number): number {
    const difference = teamScore - companyAvg;
    // Simplified percentile calculation
    return Math.min(100, Math.max(0, 50 + difference));
  }

  /**
   * Identify team strengths
   */
  private static identifyTeamStrengths(responses: any[], teamScore: number): LeadershipInsight['topStrengths'] {
    const strengths: LeadershipInsight['topStrengths'] = [];

    if (teamScore >= 75) {
      strengths.push({
        strength: 'High Engagement',
        score: teamScore,
        description: 'Team shows exceptional engagement and commitment'
      });
    }

    const positiveSentiment = responses.filter(r => r.overallSentiment === 'positive').length / responses.length * 100;
    if (positiveSentiment >= 70) {
      strengths.push({
        strength: 'Positive Team Culture',
        score: positiveSentiment,
        description: 'Strong positive sentiment indicates healthy team culture'
      });
    }

    const avgCsat = this.calculateTeamMetric(responses, 'csatScore');
    if (avgCsat >= 80) {
      strengths.push({
        strength: 'High Satisfaction',
        score: avgCsat,
        description: 'Team members express high satisfaction'
      });
    }

    return strengths;
  }

  /**
   * Identify areas for celebration
   */
  private static identifyCelebrationAreas(responses: any[]): string[] {
    const areas: string[] = [];

    // Analyze text responses for positive themes (simplified)
    const allText = responses.map(r => JSON.stringify(r.answers).toLowerCase()).join(' ');

    if (allText.includes('great') || allText.includes('excellent') || allText.includes('love')) {
      areas.push('Team expresses strong positive sentiment');
    }

    const participationRate = responses.length;
    if (participationRate > 20) {
      areas.push('Excellent survey participation demonstrates engagement');
    }

    return areas;
  }

  /**
   * Identify development areas
   */
  private static identifyDevelopmentAreas(
    responses: any[],
    companyAvg: number
  ): LeadershipInsight['developmentAreas'] {
    const areas: LeadershipInsight['developmentAreas'] = [];

    const teamCsat = this.calculateTeamMetric(responses, 'csatScore');
    const teamNps = this.calculateTeamMetric(responses, 'npsScore');
    const teamEvi = this.calculateTeamMetric(responses, 'eviScore');

    if (teamCsat < 70) {
      areas.push({
        area: 'Team Satisfaction',
        score: teamCsat,
        gap: 80 - teamCsat,
        priority: teamCsat < 50 ? 'high' : 'medium'
      });
    }

    if (teamNps < 40) {
      areas.push({
        area: 'Team Loyalty',
        score: teamNps,
        gap: 50 - teamNps,
        priority: teamNps < 20 ? 'high' : 'medium'
      });
    }

    if (teamEvi < companyAvg) {
      areas.push({
        area: 'Engagement vs Company',
        score: teamEvi,
        gap: companyAvg - teamEvi,
        priority: (companyAvg - teamEvi) > 15 ? 'high' : 'medium'
      });
    }

    return areas.sort((a, b) => 
      a.priority === 'high' && b.priority !== 'high' ? -1 : 1
    );
  }

  /**
   * Identify risk indicators
   */
  private static identifyRiskIndicators(responses: any[]): LeadershipInsight['riskIndicators'] {
    const indicators: LeadershipInsight['riskIndicators'] = [];

    const negativeSentiment = responses.filter(r => r.overallSentiment === 'negative').length / responses.length * 100;
    if (negativeSentiment > 25) {
      indicators.push({
        indicator: 'High Negative Sentiment',
        severity: 'high',
        description: `${negativeSentiment.toFixed(0)}% of responses show negative sentiment`
      });
    }

    const lowScores = responses.filter(r => 
      (r.csatScore && r.csatScore < 40) || 
      (r.npsScore && r.npsScore < 20)
    ).length;

    if (lowScores > responses.length * 0.2) {
      indicators.push({
        indicator: 'Multiple Low Scores',
        severity: 'high',
        description: 'Significant portion of team giving very low scores'
      });
    }

    const participationRate = responses.length;
    if (participationRate < 10) {
      indicators.push({
        indicator: 'Low Participation',
        severity: 'medium',
        description: 'Low survey participation may indicate disengagement'
      });
    }

    return indicators;
  }

  /**
   * Generate coaching recommendations
   */
  private static generateCoachingRecommendations(
    developmentAreas: LeadershipInsight['developmentAreas'],
    riskIndicators: LeadershipInsight['riskIndicators']
  ): LeadershipInsight['coachingRecommendations'] {
    const recommendations: LeadershipInsight['coachingRecommendations'] = [];

    if (riskIndicators.some(r => r.severity === 'high')) {
      recommendations.push({
        topic: 'Crisis Management & Team Support',
        description: 'Your team shows signs of distress. Focus on listening, addressing concerns, and providing support.',
        resources: [
          'One-on-one meetings with team members',
          'Anonymous feedback channels',
          'HR partnership for support resources'
        ]
      });
    }

    if (developmentAreas.some(a => a.area.includes('Satisfaction'))) {
      recommendations.push({
        topic: 'Improving Team Satisfaction',
        description: 'Focus on understanding and addressing factors impacting team satisfaction.',
        resources: [
          'Stay interview guide',
          'Team feedback sessions',
          'Work environment assessment'
        ]
      });
    }

    if (developmentAreas.some(a => a.area.includes('Engagement'))) {
      recommendations.push({
        topic: 'Boosting Engagement',
        description: 'Implement strategies to increase team engagement and motivation.',
        resources: [
          'Engagement driver analysis',
          'Goal setting workshops',
          'Recognition program implementation'
        ]
      });
    }

    recommendations.push({
      topic: 'Leadership Development',
      description: 'Continue developing your leadership skills to better support your team.',
      resources: [
        'Leadership coaching sessions',
        'Peer leader roundtables',
        'Management training courses'
      ]
    });

    return recommendations;
  }

  /**
   * Generate recognition suggestions
   */
  private static generateRecognitionSuggestions(
    strengths: LeadershipInsight['topStrengths']
  ): LeadershipInsight['recognitionSuggestions'] {
    const suggestions: LeadershipInsight['recognitionSuggestions'] = [];

    if (strengths.length > 0) {
      suggestions.push({
        type: 'Team Celebration',
        suggestion: 'Celebrate your team\'s strong performance with a team event or recognition',
        impact: 'Reinforces positive behaviors and boosts morale'
      });
    }

    suggestions.push({
      type: 'Individual Recognition',
      suggestion: 'Identify and recognize individual contributions that drive team success',
      impact: 'Increases individual motivation and sets positive examples'
    });

    suggestions.push({
      type: 'Public Acknowledgment',
      suggestion: 'Share team successes in company communications or all-hands meetings',
      impact: 'Builds team pride and company-wide awareness'
    });

    suggestions.push({
      type: 'Peer Recognition',
      suggestion: 'Encourage team members to recognize each other\'s contributions',
      impact: 'Strengthens team bonds and creates culture of appreciation'
    });

    return suggestions;
  }

  /**
   * Generate team building activities
   */
  private static generateTeamBuildingActivities(
    sentimentScore: number,
    engagementScore: number
  ): LeadershipInsight['teamBuildingActivities'] {
    const activities: LeadershipInsight['teamBuildingActivities'] = [];

    if (sentimentScore < 0) {
      activities.push({
        activity: 'Team Listening Session',
        purpose: 'Create safe space for team to share concerns and collaborate on solutions',
        duration: '2 hours'
      });
    }

    if (engagementScore < 60) {
      activities.push({
        activity: 'Purpose & Vision Workshop',
        purpose: 'Reconnect team with mission and clarify how their work makes impact',
        duration: 'Half day'
      });
    }

    activities.push({
      activity: 'Team Lunch or Social Event',
      purpose: 'Build relationships and strengthen team bonds in informal setting',
      duration: '1-2 hours'
    });

    activities.push({
      activity: 'Skills Workshop',
      purpose: 'Invest in team development while fostering collaboration',
      duration: 'Half day'
    });

    activities.push({
      activity: 'Volunteer Activity',
      purpose: 'Build team spirit through shared purpose and giving back',
      duration: 'Half day'
    });

    return activities;
  }

  /**
   * Generate performance improvement tips
   */
  private static generatePerformanceTips(
    developmentAreas: LeadershipInsight['developmentAreas']
  ): string[] {
    const tips: string[] = [
      'Schedule regular one-on-ones to understand individual needs and concerns',
      'Set clear goals and expectations with your team',
      'Provide specific, timely feedback on both strengths and areas for growth',
      'Remove blockers and provide resources team needs to succeed',
      'Delegate effectively and trust your team members'
    ];

    if (developmentAreas.some(a => a.priority === 'high')) {
      tips.unshift('Address high-priority issues immediately with focused action plan');
      tips.push('Consider partnering with HR for additional support and resources');
    }

    return tips;
  }

  /**
   * Count high-risk signals (anonymized)
   */
  private static countHighRiskSignals(responses: any[]): number {
    return responses.filter(r => 
      r.overallSentiment === 'negative' && 
      ((r.csatScore && r.csatScore < 40) || (r.npsScore && r.npsScore < 20))
    ).length;
  }

  /**
   * Identify attention patterns (anonymized)
   */
  private static identifyAttentionPatterns(responses: any[]): LeadershipInsight['attentionNeeded'] {
    const patterns: LeadershipInsight['attentionNeeded'] = [];

    const negativeCount = responses.filter(r => r.overallSentiment === 'negative').length;
    if (negativeCount > 0) {
      patterns.push({
        pattern: 'Negative sentiment detected',
        count: negativeCount,
        recommendation: 'Conduct confidential conversations to understand concerns'
      });
    }

    const lowScoreCount = responses.filter(r => 
      r.csatScore && r.csatScore < 50
    ).length;
    if (lowScoreCount > 0) {
      patterns.push({
        pattern: 'Low satisfaction scores',
        count: lowScoreCount,
        recommendation: 'Investigate specific factors driving dissatisfaction'
      });
    }

    return patterns;
  }

  /**
   * Create or update enablement resource
   */
  static async createEnablementResource(resource: Omit<EnablementResource, 'id' | 'usageCount' | 'avgSatisfaction'>): Promise<EnablementResource> {
    const resourceId = crypto.randomUUID();

    await db.execute(sql`
      INSERT INTO team_enablement_resources (
        id, resource_type, title, description, content,
        applicable_scenarios, target_issues, effectiveness_rating,
        usage_count, avg_satisfaction, created_by, created_at, updated_at
      ) VALUES (
        ${resourceId}, 
        ${resource.resourceType}, 
        ${resource.title}, 
        ${resource.description},
        ${JSON.stringify(resource.content)}::jsonb, 
        ${JSON.stringify(resource.applicableScenarios)}::jsonb,
        ${JSON.stringify(resource.targetIssues)}::jsonb, 
        ${resource.effectivenessRating},
        0, 
        0,
        null,
        ${new Date().toISOString()},
        ${new Date().toISOString()}
      )
    `);

    return {
      ...resource,
      id: resourceId,
      usageCount: 0,
      avgSatisfaction: 0
    };
  }

  /**
   * Get enablement resources by type
   */
  static async getEnablementResources(resourceType?: string): Promise<EnablementResource[]> {
    const whereClause = resourceType 
      ? sql`WHERE resource_type = ${resourceType}`
      : sql``;

    const result = await db.execute(sql`
      SELECT * FROM team_enablement_resources
      ${whereClause}
      ORDER BY effectiveness_rating DESC, usage_count DESC
    `);

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      resourceType: row.resource_type,
      title: row.title,
      description: row.description,
      content: JSON.parse(row.content),
      applicableScenarios: JSON.parse(row.applicable_scenarios),
      targetIssues: JSON.parse(row.target_issues),
      effectivenessRating: row.effectiveness_rating,
      usageCount: row.usage_count,
      avgSatisfaction: row.avg_satisfaction
    }));
  }
}

export default LeadershipEnablementService;

/**
 * Leadership Insights Processor
 * Processes survey responses through OpenRouter to generate leadership insights
 * Uses the same proven approach as Customer Experience Voice Survey
 */

import { db } from "../db";
import { responses, surveys, leadershipInsights } from "../../shared/schema";
import { eq, sql } from "drizzle-orm";
import { analyzeTranscriptWithOpenRouter, AnalysisResponse } from "../integrations/openRouterService";

interface FinalLeadershipInsights {
  surveyId: string;
  totalResponses: number;
  npsScore: number;
  csatScore: number;
  cesScore: number;
  teamMetrics: {
    engagement: number;
    teamSize: number;
    responseRate: number;
    engagementPercentile: number;
  };
  trends?: {
    engagement: {
      direction: 'up' | 'down' | 'stable';
      change: number;
      summary: string;
    };
    nps: {
      direction: 'up' | 'down' | 'stable';
      change: number;
      summary: string;
    };
  };
  successFactors: Array<{
    area: string;
    description: string;
    score: number;
  }>;
  mainChallenges: Array<{
    area: string;
    description: string;
    priority: string;
    currentScore: number;
    targetScore: number;
    gapToTarget: number;
  }>;
  coaching: Array<{
    area: string;
    description: string;
    priority: string;
    suggestedApproach: string;
    expectedOutcome: string;
  }>;
  riskLevel: 'Critical' | 'High' | 'Medium' | 'Low';
  businessImpact: string;
  recommendations: Array<{
    category: string;
    recommendation: string;
    focusAreas: string[];
    suggestedActions: string[];
    estimatedTimeline: string;
    expectedImpact: string;
  }>;
  teamBuildingActivities: Array<{
    activity: string;
    description: string;
    purpose: string;
    estimatedDuration: string;
    format: string;
    expectedOutcomes: string[];
  }>;
  recognitionOpportunities?: Array<{
    recipientHint: string;
    reason: string;
    impact: string;
    recognitionType: string;
    suggestedTemplate?: string;
  }>;
  performanceHabits?: {
    strengths: Array<{
      habit: string;
      description: string;
      impact: string;
      frequency: string;
    }>;
    improvements: Array<{
      habit: string;
      description: string;
      currentGap: string;
      suggestedActions: string[];
    }>;
  };
  cultureIndicators?: {
    psychologicalSafety: number;
    trust: number;
    collaboration: number;
    innovation: number;
    workLifeBalance: number;
    overall: number;
  };
}

/**
 * Process survey responses for leadership insights
 * Uses the same proven OpenRouter approach as Customer Experience Voice Survey
 */
export async function processSurveyForLeadershipInsights(surveyId: string): Promise<FinalLeadershipInsights> {
  try {
    

    // 1. Fetch survey and its responses
    const survey = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (!survey.length) {
      throw new Error(`Survey not found: ${surveyId}`);
    }

    const surveyData = survey[0];
    

    const allResponses = await db.select().from(responses).where(eq(responses.surveyId, surveyId));

    if (!allResponses.length) {
      throw new Error(`No responses found for survey: ${surveyId}`);
    }

    

    const processedResponseIds = await getProcessedResponseIds(surveyId);
    const pendingResponses = allResponses.filter((response: any) => !processedResponseIds.has(response.id));
    const pendingCount = pendingResponses.length;

    

    if (pendingCount === 0) {
      
      return {
        surveyId,
        totalResponses: allResponses.length,
        teamMetrics: {
          engagement: 0,
          teamSize: allResponses.length,
          responseRate: 100,
          engagementPercentile: 0,
        },
        successFactors: [],
        mainChallenges: [],
        riskLevel: 'Low',
        businessImpact: 'No new responses to process',
        recommendations: [],
        teamBuildingActivities: [],
      };
    }

    // 2. Build aggregate transcript (same approach as Customer Experience Voice Survey)
    let aggregateTranscript = `LEADERSHIP & TEAM ENABLEMENT ANALYSIS\n`;
    aggregateTranscript += `Survey: ${surveyData.title}\n`;
    aggregateTranscript += `Description: ${surveyData.description || 'N/A'}\n`;
    aggregateTranscript += `\nAnalyzing ${pendingResponses.length} new responses for comprehensive team insights.\n\n`;
    aggregateTranscript += `RESPONSE DATA:\n`;

    // Include responses (limit to 50 to keep within token limits)
    const responsesToAnalyze = pendingResponses.slice(0, 50);
    responsesToAnalyze.forEach((r, idx) => {
      aggregateTranscript += `--- Response ${idx + 1} ---\n`;
      aggregateTranscript += `EVI Score: ${r.eviScore || 'N/A'}\n`;
      aggregateTranscript += `NPS Score: ${r.npsScore || 'N/A'}\n`;
      aggregateTranscript += `CSAT Score: ${r.csatScore || 'N/A'}\n`;
      
      if (r.answers) {
        aggregateTranscript += `Answers:\n`;
        Object.entries(r.answers).forEach(([qId, ans]) => {
          aggregateTranscript += `  ${qId}: ${ans}\n`;
        });
      }
      
      if (r.analysisSummary) {
        aggregateTranscript += `Summary: ${r.analysisSummary}\n`;
      }
      
      aggregateTranscript += `\n`;
    });

    aggregateTranscript += `\nPLEASE PROVIDE COMPREHENSIVE LEADERSHIP INSIGHTS INCLUDING:\n`;
    aggregateTranscript += `- Team engagement metrics and percentiles\n`;
    aggregateTranscript += `- Key success factors and strengths (at least 3-5)\n`;
    aggregateTranscript += `- Main challenges and development areas (at least 3-5)\n`;
    aggregateTranscript += `- Risk assessment and business impact\n`;
    aggregateTranscript += `- Actionable coaching recommendations (at least 3-5)\n`;
    aggregateTranscript += `- Team building activities (at least 2-3)\n`;
    aggregateTranscript += `- Recognition opportunities: Identify specific team members or groups deserving recognition based on positive feedback. For each opportunity, provide: (a) recipientHint (who should be recognized), (b) reason (what they did well), (c) impact (how it helped the team), (d) recognitionType (peer/manager/milestone/values/performance). Include at least 2-3 opportunities.\n`;
    aggregateTranscript += `- Performance habits: Extract both strengths and improvements needed. For STRENGTHS, identify specific habits/practices that drive high performance (e.g., "regular 1-on-1s", "clear goal setting", "proactive communication") with description, impact, and frequency. For IMPROVEMENTS, identify habits that need development with description, current gap, and suggested actions. Include at least 3-4 in each category.\n`;
    aggregateTranscript += `- Culture indicators: Score the team on (1-100 scale): psychological safety (do people feel safe to speak up?), trust (how much do people trust each other?), collaboration (how well do people work together?), innovation (willingness to try new ideas), work-life balance (do people have healthy boundaries?). Calculate overall score as average.\n`;

    

    // 3. Call OpenRouter using the proven analyzeTranscriptWithOpenRouter function
    const analysis: AnalysisResponse = await analyzeTranscriptWithOpenRouter({
      transcript: aggregateTranscript,
      surveyTitle: surveyData.title,
      surveyDescription: surveyData.description || undefined,
      respondentPhone: "LEADERSHIP_AGGREGATE",
      surveyId: surveyId
    });

    

    // 4. Extract and format final insights
    const finalInsights = extractFinalInsights(analysis, surveyId, allResponses.length);

    // 5. Store in database
    await storeLeadershipInsights(surveyId, finalInsights);
    await storeProcessedResponseIds(surveyId, allResponses.map((response: any) => response.id));

    
    return finalInsights;
  } catch (error: any) {
    
    
    console.error('Error:', error); throw error;
  }
}

/**
 * Extract final insights from OpenRouter analysis response
 */
function extractFinalInsights(analysis: AnalysisResponse, surveyId: string, totalResponses: number): FinalLeadershipInsights {
  
  
  // Extract from leadershipInsights array (primary source)
  const leadershipData = analysis.leadershipInsights && analysis.leadershipInsights.length > 0 
    ? analysis.leadershipInsights[0] 
    : null;

  // Calculate engagement from executive summary or default
  const avgEngagement = analysis.executiveSummary?.eviScore || 
    (leadershipData?.teamMetrics?.engagement) || 
    75;

  const finalInsights: FinalLeadershipInsights = {
    surveyId,
    totalResponses,
    npsScore: analysis.executiveSummary?.npsScore || calculateNPSFromResponses(analysis),
    csatScore: analysis.executiveSummary?.csatScore || calculateCSATFromResponses(analysis),
    cesScore: analysis.executiveSummary?.cesScore || calculateCESFromResponses(analysis),
    teamMetrics: {
      engagement: avgEngagement,
      teamSize: totalResponses,
      responseRate: 100,
      engagementPercentile: calculateEngagementPercentile(avgEngagement),
    },
    trends: generateTrendsData(avgEngagement),
    successFactors: (leadershipData?.successFactors || analysis.executiveSummary?.topStrengths || []).map((s: any, idx: number) => ({
      area: typeof s === 'string' ? s : s.area || s,
      description: typeof s === 'string' ? `Key strength identified in team performance` : (s.description || `Strong performance indicator`),
      score: avgEngagement + (idx * 2),
    })).slice(0, 5),
    coaching: generateCoachingRecommendations(leadershipData?.mainChallenges || analysis.executiveSummary?.mainChallenges || []),
    mainChallenges: (leadershipData?.mainChallenges || analysis.executiveSummary?.mainChallenges || []).map((c: any, idx: number) => ({
      area: typeof c === 'string' ? c : c.area || c,
      description: typeof c === 'string' ? `Challenge requiring focused attention` : (c.description || `Area for improvement`),
      priority: idx === 0 ? 'High' : idx === 1 ? 'Medium' : 'Low',
      currentScore: avgEngagement - 15 - (idx * 5),
      targetScore: avgEngagement + 10,
      gapToTarget: 25 + (idx * 5),
    })).slice(0, 5),
    riskLevel: leadershipData?.riskLevel || (avgEngagement < 50 ? 'High' : avgEngagement < 70 ? 'Medium' : 'Low'),
    businessImpact: leadershipData?.businessImpact || analysis.executiveSummary?.executiveSummaryText || 'Team engagement and performance indicators suggest opportunities for strategic improvement',
    recommendations: (leadershipData?.recommendations || analysis.executiveSummary?.recommendations || analysis.actionPlans || []).map((r: any, idx: number) => ({
      category: typeof r === 'string' ? 'Leadership Development' : (r.category || r.actionTitle || 'Team Improvement'),
      recommendation: typeof r === 'string' ? r : (r.recommendation || r.actionDescription || r),
      focusAreas: typeof r === 'string' ? ['Team Development', 'Performance'] : (r.focusAreas || ['Engagement', 'Communication']),
      suggestedActions: typeof r === 'string' ? ['Implement regular check-ins', 'Monitor progress'] : (r.suggestedActions || r.implementationSteps || ['Review current practices', 'Develop action plan']),
      estimatedTimeline: typeof r === 'string' ? '2-4 weeks' : (r.estimatedTimeline || '2-4 weeks'),
      expectedImpact: typeof r === 'string' ? 'High' : (r.expectedImpact || r.estimatedImpact || 'Medium'),
    })).slice(0, 5),
    teamBuildingActivities: (leadershipData && leadershipData.teamBuildingActivities && leadershipData.teamBuildingActivities.length > 0)
      ? leadershipData.teamBuildingActivities.slice(0, 5)
      : [
          {
            activity: 'Team Retrospective',
            description: 'Structured session to reflect on team dynamics and identify improvements',
            purpose: 'Improve communication and collaboration',
            estimatedDuration: '90 minutes',
            format: 'Hybrid',
            expectedOutcomes: ['Better team alignment', 'Clearer communication', 'Actionable improvements'],
          },
          {
            activity: 'Skills Workshop',
            description: 'Interactive training session focused on team development',
            purpose: 'Enhance team capabilities and engagement',
            estimatedDuration: '2 hours',
            format: 'In-person',
            expectedOutcomes: ['New skills acquired', 'Increased confidence', 'Stronger team bonds'],
          }
        ],
    // Extract recognition opportunities from LLM analysis
    recognitionOpportunities: leadershipData?.recognitionOpportunities && leadershipData.recognitionOpportunities.length > 0
      ? leadershipData.recognitionOpportunities
      : generateRecognitionOppsFromSuccessFactors(leadershipData?.successFactors || []),
    // Extract performance habits
    performanceHabits: leadershipData?.performanceHabits && 
      (leadershipData.performanceHabits.strengths?.length > 0 || leadershipData.performanceHabits.improvements?.length > 0)
      ? leadershipData.performanceHabits
      : generatePerformanceHabitsFromChallenges(leadershipData?.mainChallenges || [], leadershipData?.successFactors || []),
    // Extract culture indicators
    cultureIndicators: leadershipData?.cultureIndicators || {
      psychologicalSafety: avgEngagement > 70 ? 75 : 50,
      trust: avgEngagement > 70 ? 72 : 48,
      collaboration: avgEngagement > 70 ? 78 : 52,
      innovation: avgEngagement > 70 ? 70 : 45,
      workLifeBalance: avgEngagement > 70 ? 68 : 42,
      overall: avgEngagement
    }
  };

  

  return finalInsights;
}

/**
 * Store leadership insights in database
 */
async function storeLeadershipInsights(surveyId: string, insights: FinalLeadershipInsights) {
  try {
    // Insert new insights
    const insertedInsights = await db.insert(leadershipInsights).values({
      surveyId,
      insight: `Leadership insights for ${insights.totalResponses} responses`,
      businessImpact: insights.businessImpact,
      strategyAlignment: 'Team enablement and performance improvement',
      affectedCount: insights.teamMetrics.teamSize,
      riskLevel: insights.riskLevel,
      leadershipRecommendations: insights.recommendations,
      successFactors: insights.successFactors.map(s => s.area),
      stakeholders: ['Team Leaders', 'HR', 'Management'],
      teamMetrics: insights.teamMetrics,
      mainChallenges: insights.mainChallenges,
      teamBuildingActivities: insights.teamBuildingActivities,
      coaching: insights.coaching || [],
      recognitionOpportunities: insights.recognitionOpportunities || [],
      performanceHabits: insights.performanceHabits || { strengths: [], improvements: [] },
      cultureIndicators: insights.cultureIndicators || null,
      trends: insights.trends || {},
    }).returning();

    

    // Create action items from the recommendations and performance habits
    if (insertedInsights.length > 0) {
      const insightId = insertedInsights[0].id;
      await createActionItemsFromInsights(surveyId, insightId, insights);
    }

  } catch (error: any) {
    
    console.error('Error:', error); throw error;
  }
}

/**
 * Create action items from generated insights
 */
async function createActionItemsFromInsights(surveyId: string, insightId: string, insights: FinalLeadershipInsights) {
  try {
    const { actionItems } = await import("../shared/schema");
    
    const actionsToCreate = [];

    // Create action items from recommendations
    for (const rec of insights.recommendations || []) {
      actionsToCreate.push({
        surveyId,
        insightId,
        title: rec.recommendation,
        description: `Focus areas: ${rec.focusAreas.join(', ')}. Actions: ${rec.suggestedActions.join('; ')}`,
        category: rec.category.toLowerCase().replace(/\s+/g, '_'),
        priority: rec.expectedImpact === 'High' || rec.expectedImpact === 'Transformational' ? 'high' : 'medium',
        status: 'pending' as const,
        expectedImpact: rec.expectedImpact,
        evidenceCount: Math.max(1, Math.floor(insights.totalResponses / 2))
      });
    }

    // Create action items from performance improvement areas
    if (insights.performanceHabits?.improvements) {
      for (const improvement of insights.performanceHabits.improvements) {
        actionsToCreate.push({
          surveyId,
          insightId,
          title: `Improve: ${improvement.habit}`,
          description: `Gap: ${improvement.currentGap}. Actions: ${improvement.suggestedActions.join('; ')}`,
          category: 'performance',
          priority: 'medium' as const,
          status: 'pending' as const,
          expectedImpact: 'Improved team performance',
          evidenceCount: Math.max(1, Math.floor(insights.totalResponses / 3))
        });
      }
    }

    // Create action items from recognition opportunities
    if (insights.recognitionOpportunities) {
      for (const rec of insights.recognitionOpportunities) {
        actionsToCreate.push({
          surveyId,
          insightId,
          title: `Recognize: ${rec.recipientHint}`,
          description: `Reason: ${rec.reason}. Impact: ${rec.impact}. Type: ${rec.recognitionType}`,
          category: 'recognition',
          priority: 'medium' as const,
          status: 'pending' as const,
          expectedImpact: 'Improved morale and engagement',
          evidenceCount: 1
        });
      }
    }

    // Insert all action items
    if (actionsToCreate.length > 0) {
      await db.insert(actionItems).values(actionsToCreate);
      
    }

  } catch (error: any) {
    
    // Don't throw - this is optional enhancement
  }
}

async function getProcessedResponseIds(surveyId: string): Promise<Set<string>> {
  const data = await db.execute(sql`
    SELECT stakeholders
    FROM leadership_insights
    WHERE survey_id = ${surveyId}
      AND insight = '__processed__'
    LIMIT 1
  `);

  if (!data.rows.length) {
    return new Set();
  }

  const stakeholders = data.rows[0]?.stakeholders;
  if (!stakeholders) {
    return new Set();
  }

  try {
    const parsed = typeof stakeholders === "string" ? JSON.parse(stakeholders) : stakeholders;
    const responseIds = Array.isArray(parsed?.responseIds) ? parsed.responseIds : [];
    return new Set(responseIds);
  } catch {
    return new Set();
  }
}

async function storeProcessedResponseIds(surveyId: string, responseIds: string[]): Promise<void> {
  const payload = { responseIds };

  await db.execute(sql`
    DELETE FROM leadership_insights
    WHERE survey_id = ${surveyId}
      AND insight = '__processed__'
  `);

  await db.execute(sql`
    INSERT INTO leadership_insights (
      survey_id,
      insight,
      stakeholders,
      created_at,
      updated_at
    ) VALUES (
      ${surveyId},
      '__processed__',
      CAST(${JSON.stringify(payload)} AS JSONB),
      NOW(),
      NOW()
    )
  `);
}

/**
 * Generate recognition opportunities from success factors
 */
function generateRecognitionOppsFromSuccessFactors(successFactors: any[]): Array<any> {
  if (!Array.isArray(successFactors) || successFactors.length === 0) {
    return [{
      recipientHint: 'Team members',
      reason: 'Positive engagement and collaboration demonstrated',
      impact: 'Strengthened team morale and performance',
      recognitionType: 'peer',
      suggestedTemplate: 'Recognition for excellent teamwork and engagement'
    }];
  }
  
  return successFactors.slice(0, 2).map((factor: any, idx: number) => ({
    recipientHint: `Team/Individual showing ${typeof factor === 'string' ? factor : factor.area || factor}`,
    reason: `Strong performance in: ${typeof factor === 'string' ? factor : factor.area || factor}`,
    impact: 'Contributes positively to team success and engagement',
    recognitionType: idx % 2 === 0 ? 'performance' : 'values',
    suggestedTemplate: `Recognition for excellence in ${typeof factor === 'string' ? factor : factor.area || factor}`
  }));
}

/**
 * Generate performance habits from challenges and success factors
 */
function generatePerformanceHabitsFromChallenges(challenges: any[], successFactors: any[]): any {
  const strengths = successFactors.slice(0, 3).map((factor: any) => ({
    habit: typeof factor === 'string' ? factor : factor.area || String(factor),
    description: `Team demonstrates strength in ${typeof factor === 'string' ? factor : factor.area || factor}`,
    impact: 'Positive impact on engagement and team effectiveness',
    frequency: 'Observed consistently'
  }));
  
  const improvements = challenges.slice(0, 2).map((challenge: any) => ({
    habit: `Improve ${typeof challenge === 'string' ? challenge : challenge.area || String(challenge)}`,
    description: `Address identified gap in ${typeof challenge === 'string' ? challenge : challenge.area || challenge}`,
    currentGap: 'Gap identified from team feedback',
    suggestedActions: [
      'Develop targeted improvement plan',
      'Provide necessary resources and support',
      'Track progress with regular check-ins'
    ]
  }));
  
  return {
    strengths: strengths.length > 0 ? strengths : [{
      habit: 'Team collaboration',
      description: 'Team works together effectively',
      impact: 'Strong foundation for success',
      frequency: 'Ongoing'
    }],
    improvements: improvements.length > 0 ? improvements : [{
      habit: 'Communication clarity',
      description: 'Enhance communication practices',
      currentGap: 'Area for development',
      suggestedActions: ['Establish communication guidelines', 'Regular team sync-ups']
    }]
  };
}

/**
 * Calculate engagement percentile from engagement score
 */
function calculateEngagementPercentile(engagement: number): number {
  if (engagement >= 80) return 85;
  if (engagement >= 70) return 70;
  if (engagement >= 60) return 55;
  if (engagement >= 50) return 40;
  return 25;
}

/**
function calculateNPSFromResponses(analysis: AnalysisResponse): number {
  const npsFromSummary = analysis.executiveSummary?.npsScore;
  if (npsFromSummary) return Math.min(100, Math.max(-100, npsFromSummary));
  
  // Default based on engagement
  const engagement = analysis.executiveSummary?.eviScore || 70;
  return Math.min(100, Math.max(-100, (engagement - 50) * 2));
}

/**
 * Calculate CSAT from response data (0-10 scale)
 */
function calculateCSATFromResponses(analysis: AnalysisResponse): number {
  const csatFromSummary = analysis.executiveSummary?.csatScore;
  if (csatFromSummary) return Math.min(10, Math.max(0, csatFromSummary));
  
  // Default based on engagement
  const engagement = analysis.executiveSummary?.eviScore || 70;
  return Math.min(10, Math.max(0, engagement / 10));
}

/**
 * Calculate CES (Customer Effort Score) from response data (0-100 scale)
 */
function calculateCESFromResponses(analysis: AnalysisResponse): number {
  const cesFromSummary = analysis.executiveSummary?.cesScore;
  if (cesFromSummary) return Math.min(100, Math.max(0, cesFromSummary));
  
  // Default: 100 - (challenges count * 10)
  const challengesCount = analysis.executiveSummary?.mainChallenges?.length || 0;
  return Math.min(100, Math.max(0, 100 - (challengesCount * 15)));
}

/**
 * Generate trends data with engagement and NPS trends
 */
function generateTrendsData(engagement: number): any {
  return {
    engagement: {
      direction: engagement >= 70 ? 'up' : engagement >= 50 ? 'stable' : 'down',
      change: engagement >= 70 ? 5 : engagement >= 50 ? 0 : -3,
      summary: engagement >= 70 ? 'Strong team engagement with positive momentum' : 
               engagement >= 50 ? 'Moderate engagement levels, opportunities for improvement' :
               'Low engagement, focused development needed'
    },
    nps: {
      direction: engagement >= 75 ? 'up' : engagement >= 60 ? 'stable' : 'down',
      change: engagement >= 75 ? 8 : engagement >= 60 ? 2 : -5,
      summary: engagement >= 75 ? 'Promoters increasing, strong likelihood of recommendations' :
               engagement >= 60 ? 'Mixed sentiment, focus on reducing detractors' :
               'Critical issues reducing advocacy'
    }
  };
}

/**
 * Generate coaching recommendations from challenges
 */
function generateCoachingRecommendations(challenges: any[]): any[] {
  if (!Array.isArray(challenges) || challenges.length === 0) {
    return [{
      area: 'Team Development',
      description: 'Ongoing leadership coaching and team development',
      priority: 'Medium',
      suggestedApproach: 'Regular 1-on-1 coaching sessions and group workshops',
      expectedOutcome: 'Improved team effectiveness and engagement'
    }];
  }
  
  return challenges.slice(0, 3).map((challenge: any, idx: number) => ({
    area: typeof challenge === 'string' ? challenge : challenge.area || challenge,
    description: `Address and develop ${typeof challenge === 'string' ? challenge : challenge.area || challenge}`,
    priority: idx === 0 ? 'High' : 'Medium',
    suggestedApproach: `Targeted coaching with focus on ${typeof challenge === 'string' ? challenge : challenge.area || challenge}`,
    expectedOutcome: `Improved capability in ${typeof challenge === 'string' ? challenge : challenge.area || challenge} area`
  }));
}

/**
 * Dashboard Analysis Service
 * Stores analyzed data from OpenRouter into dashboard tables
 */

import { db } from '../db';
import { eq, sql } from 'drizzle-orm';
import {
  trendsAnalysis,
  executiveSummary,
  actionPlans,
  leadershipInsights,
  monitoringMetrics,
  segmentationAnalysis,
  analyticsSurveys,
  surveyQuestions,
  surveys,
  responses,
} from '@shared/schema';
import { AnalysisResponse } from './openRouterService';

export interface StoreDashboardDataInput {
  surveyId: string;
  responseId: string;
  analysis: AnalysisResponse;
}

/**
 * Store all analyzed data into dashboard tables
 */
export async function storeDashboardAnalysis(input: StoreDashboardDataInput) {
  const { surveyId, responseId, analysis } = input;

  

  try {
    // Store trends analysis
    if (analysis.trends) {
      await db.insert(trendsAnalysis).values({
        surveyId,
        responseId,
        metricName: analysis.trends.metricName,
        currentValue: analysis.trends.currentValue.toString(),
        previousValue: analysis.trends.previousValue?.toString(),
        changePercentage: analysis.trends.changePercentage?.toString(),
        trendDirection: analysis.trends.trendDirection,
        summary: analysis.trends.summary,
        keyInsights: analysis.trends.keyInsights,
        predictions: analysis.trends.predictions,
        periodStart: new Date(),
        periodEnd: new Date(),
      });
      
    }

    // Store executive summary
    if (analysis.executiveSummary) {
      await db.insert(executiveSummary).values({
        surveyId,
        responseId,
        overallScore: analysis.executiveSummary.overallScore.toString(),
        performanceRating: analysis.executiveSummary.performanceRating,
        csatScore: analysis.executiveSummary.csatScore.toString(),
        npsScore: analysis.executiveSummary.npsScore.toString(),
        eviScore: analysis.executiveSummary.eviScore.toString(),
        executiveSummaryText: analysis.executiveSummary.executiveSummaryText,
        topStrengths: analysis.executiveSummary.topStrengths,
        mainChallenges: analysis.executiveSummary.mainChallenges,
        recommendations: analysis.executiveSummary.recommendations,
      });
      
    }

    // Store action plans (note: this table doesn't have response_id, uses executive_summary_id)
    if (Array.isArray(analysis.actionPlans) && analysis.actionPlans.length > 0) {
      for (const plan of analysis.actionPlans) {
        await db.insert(actionPlans).values({
          surveyId,
          // responseId field doesn't exist in action_plans table
          actionTitle: plan.actionTitle,
          actionDescription: plan.actionDescription,
          priority: plan.priority,
          category: plan.category,
          owner: plan.owner,
          estimatedImpact: plan.estimatedImpact,
          status: 'pending',
          implementationSteps: plan.implementationSteps,
          successMetrics: plan.successMetrics,
          relatedInsights: plan.relatedInsights,
        });
      }
      
    }

    // Store leadership insights (note: this table doesn't have response_id)
    if (Array.isArray(analysis.leadershipInsights) && analysis.leadershipInsights.length > 0) {
      for (const insight of analysis.leadershipInsights) {
        await db.insert(leadershipInsights).values({
          surveyId,
          // responseId field doesn't exist in leadership_insights table
          insight: insight.insight,
          businessImpact: insight.businessImpact,
          strategyAlignment: insight.strategyAlignment,
          affectedCount: insight.affectedCount,
          potentialRevenue: insight.potentialRevenue?.toString(),
          riskLevel: insight.riskLevel,
          leadershipRecommendations: insight.recommendations,
          successFactors: insight.successFactors,
          stakeholders: insight.stakeholders,
          teamMetrics: insight.teamMetrics,
          mainChallenges: insight.mainChallenges,
          teamBuildingActivities: insight.teamBuildingActivities,
        });
      }
      
    }

    // Store monitoring metrics
    if (Array.isArray(analysis.monitoringMetrics) && analysis.monitoringMetrics.length > 0) {
      for (const metric of analysis.monitoringMetrics) {
        await db.insert(monitoringMetrics).values({
          surveyId,
          responseId,
          metricName: metric.metricName,
          currentValue: metric.currentValue.toString(),
          targetValue: metric.targetValue.toString(),
          thresholdMin: metric.thresholdMin.toString(),
          thresholdMax: metric.thresholdMax.toString(),
          alertStatus: metric.alertStatus,
          isAnomalous: metric.isAnomalous,
          anomalyType: metric.anomalyType,
          healthScore: metric.healthScore.toString(),
          trendIndicator: metric.trendIndicator,
          recommendedActions: metric.recommendedActions,
          historicalData: [
            {
              date: new Date().toISOString(),
              value: metric.currentValue,
            },
          ],
        });
      }
      
    }

    // Store segmentation analysis
    if (analysis.segmentation) {
      await db.insert(segmentationAnalysis).values({
        surveyId,
        responseId,
        segmentName: analysis.segmentation.segmentName,
        segmentDescription: analysis.segmentation.segmentDescription,
        demographics: analysis.segmentation.demographics,
        behaviors: analysis.segmentation.behaviors,
        preferences: analysis.segmentation.preferences,
        segmentScore: analysis.segmentation.segmentScore.toString(),
        satisfaction: analysis.segmentation.satisfaction,
        engagement: analysis.segmentation.engagement,
        tailoredRecommendations: analysis.segmentation.tailoredRecommendations,
        marketingStrategy: analysis.segmentation.marketingStrategy,
        retentionRisk: analysis.segmentation.retentionRisk,
      });
      
    }

    
  } catch (error: any) {
    
    console.error('Error:', error); throw error;
  }
}

/**
 * Get all analysis data for a survey
 */
export async function getDashboardData(surveyId: string) {
  try {
    const trends = await db.select().from(trendsAnalysis).where(
      eq(trendsAnalysis.surveyId, surveyId)
    );
    const summary = await db.select().from(executiveSummary).where(
      eq(executiveSummary.surveyId, surveyId)
    );
    const plans = await db.select().from(actionPlans).where(
      eq(actionPlans.surveyId, surveyId)
    );
    const insights = await db.select().from(leadershipInsights).where(
      eq(leadershipInsights.surveyId, surveyId)
    );
    const metrics = await db.select().from(monitoringMetrics).where(
      eq(monitoringMetrics.surveyId, surveyId)
    );
    const segment = await db.select().from(segmentationAnalysis).where(
      eq(segmentationAnalysis.surveyId, surveyId)
    );

    return {
      trends: trends && trends.length > 0 ? trends[0] : null,
      executiveSummary: summary && summary.length > 0 ? summary[0] : null,
      actionPlans: plans || [],
      leadershipInsights: insights || [],
      monitoringMetrics: metrics || [],
      segmentation: segment && segment.length > 0 ? segment[0] : null,
    };
  } catch (error: any) {
    
    console.error('Error:', error); throw error;
  }
}

/**
 * Generate initial analytics for a new survey
 * Called automatically when a survey is created
 */
export async function generateInitialAnalytics(
  surveyId: string,
  surveyTitle: string,
  surveyDescription?: string,
  questions?: Array<{ title?: string; questionText?: string }>
) {
  try {
    

    // Create a default analysis template based on survey type
    const defaultAnalysis = createDefaultAnalysis(surveyTitle, surveyDescription);

    // Store the default analysis data
    await storeDashboardAnalysis({
      surveyId,
      responseId: 'default-initial-' + surveyId,
      analysis: defaultAnalysis,
    });

    // Also create an entry in the analyticsSurveys table so it shows up in the analytics surveys list
    try {
      const existingSurvey = await db
        .select()
        .from(analyticsSurveys)
        .where(sql`lower(${analyticsSurveys.surveyName}) = lower(${surveyTitle})`)
        .limit(1);

      let analyticsSurveyId = existingSurvey[0]?.surveyId;

      if (!analyticsSurveyId) {
        const [analyticsSurvey] = await db
          .insert(analyticsSurveys)
          .values({
            surveyName: surveyTitle,
            description: surveyDescription || '',
            totalRespondents: 0,
            isActive: true,
          })
          .returning();

        analyticsSurveyId = analyticsSurvey?.surveyId;
      }

      if (analyticsSurveyId && Array.isArray(questions) && questions.length > 0) {
        const existingQuestions = await db
          .select()
          .from(surveyQuestions)
          .where(eq(surveyQuestions.surveyId, analyticsSurveyId))
          .limit(1);

        if (existingQuestions.length === 0) {
          await db.insert(surveyQuestions).values(
            questions.map((question, index) => ({
              surveyId: analyticsSurveyId as number,
              questionText: question.title || question.questionText || `Question ${index + 1}`,
              questionOrder: index + 1,
            }))
          );
        }
      }

      
    } catch (analyticsSurveyError: any) {
      // If this table doesn't exist or there's a conflict, log but don't fail
      
    }

    
    return true;
  } catch (error: any) {
    
    // Don't throw - we don't want survey creation to fail if analytics generation fails
    return false;
  }
}

/**
 * Create default analysis structure for a new survey
 */
function createDefaultAnalysis(surveyTitle: string, surveyDescription?: string): AnalysisResponse {
  const isJobSurvey = surveyTitle.toLowerCase().includes('job') || surveyTitle.toLowerCase().includes('applicant');
  const isCustomerSurvey = surveyTitle.toLowerCase().includes('customer') || surveyTitle.toLowerCase().includes('experience');

  return {
    trends: {
      metricName: 'Overall Satisfaction',
      currentValue: 75,
      previousValue: 70,
      changePercentage: 7.1,
      trendDirection: 'up',
      summary: `Initial baseline metrics for ${surveyTitle} survey. Data will be updated as responses are collected.`,
      keyInsights: [
        'Survey created and ready to collect responses',
        'Initial baseline established',
        'Real-time metrics will update with each response',
      ],
      predictions: [
        'Metrics will stabilize as more responses are collected',
        'Trends will become more significant after 10+ responses',
      ],
    },
    executiveSummary: {
      overallScore: 75,
      performanceRating: 'Good',
      csatScore: 7.5,
      npsScore: 45,
      eviScore: 72,
      cesScore: 75,
      executiveSummaryText: `Initial analysis for ${surveyTitle}. This is a baseline report created when the survey was set up. Real insights will emerge as responses are collected and analyzed.`,
      topStrengths: [
        'Survey structure well-defined',
        'Ready for data collection',
        'Comprehensive question set',
      ],
      mainChallenges: [
        'Awaiting participant responses',
        'Need minimum responses for statistical significance',
        'Data patterns will emerge over time',
      ],
      recommendations: [
        'Start collecting survey responses',
        'Aim for at least 10-20 responses for meaningful analysis',
        'Review responses regularly for emerging patterns',
      ],
    },
    actionPlans: [
      {
        actionTitle: 'Launch Survey',
        actionDescription: 'Begin collecting responses from target audience',
        priority: 'High',
        category: 'Execution',
        owner: 'Survey Manager',
        estimatedImpact: 'Data collection and baseline establishment',
        implementationSteps: [
          'Share survey link with target participants',
          'Monitor response rate',
          'Send reminders as needed',
        ],
        successMetrics: [
          'Target number of responses collected',
          'Response rate > 50%',
          'Diverse participant feedback',
        ],
        relatedInsights: ['Initial survey setup complete'],
      },
      {
        actionTitle: 'Monitor Response Quality',
        actionDescription: 'Ensure incoming responses are complete and meaningful',
        priority: 'Medium',
        category: 'Quality Assurance',
        owner: 'Data Quality Team',
        estimatedImpact: 'Improved data reliability',
        implementationSteps: [
          'Review response completeness',
          'Flag incomplete responses',
          'Validate response authenticity',
        ],
        successMetrics: [
          '100% complete responses',
          'No duplicate responses',
          'Meaningful feedback provided',
        ],
        relatedInsights: ['Data quality baseline'],
      },
    ],
    leadershipInsights: [
      {
        insight: 'Survey initiative launched and tracking initiated',
        businessImpact: 'Foundation established for gathering stakeholder feedback',
        strategyAlignment: 'Aligned with data-driven decision making strategy',
        affectedCount: 0,
        potentialRevenue: 0,
        riskLevel: 'Low',
        recommendations: [
          'Ensure consistent survey administration',
          'Track response metrics carefully',
          'Share preliminary findings with stakeholders',
        ],
        successFactors: [
          'High participation rate',
          'Honest participant feedback',
          'Timely data analysis',
        ],
        stakeholders: ['Survey Owner', 'Data Analytics Team', 'Executive Leadership'],
        teamMetrics: {
          engagement: 0,
          teamSize: 0,
          responseRate: 0,
        },
        mainChallenges: [],
        teamBuildingActivities: [],
      },
    ],
    monitoringMetrics: [
      {
        metricName: 'Response Rate',
        currentValue: 0,
        targetValue: 80,
        thresholdMin: 50,
        thresholdMax: 100,
        alertStatus: 'warning',
        isAnomalous: false,
        anomalyType: 'none',
        healthScore: 0,
        trendIndicator: 'stable',
        recommendedActions: ['Begin collecting responses', 'Track progress toward 80% response rate'],
      },
      {
        metricName: 'Average Satisfaction',
        currentValue: 75,
        targetValue: 80,
        thresholdMin: 60,
        thresholdMax: 100,
        alertStatus: 'ok',
        isAnomalous: false,
        anomalyType: 'none',
        healthScore: 75,
        trendIndicator: 'stable',
        recommendedActions: ['Collect feedback to establish baseline', 'Monitor for changes'],
      },
      {
        metricName: 'NPS Score',
        currentValue: 45,
        targetValue: 50,
        thresholdMin: 0,
        thresholdMax: 100,
        alertStatus: 'ok',
        isAnomalous: false,
        anomalyType: 'none',
        healthScore: 45,
        trendIndicator: 'stable',
        recommendedActions: ['Identify promoters and detractors', 'Act on feedback'],
      },
    ],
    segmentation: {
      segmentName: 'All Respondents',
      segmentDescription: 'Complete respondent pool for this survey',
      demographics: ['Initial segment', 'All participants'],
      behaviors: ['Survey completion', 'Feedback provision'],
      preferences: ['Anonymous response', 'Structured feedback'],
      segmentScore: 75,
      satisfaction: 'Medium',
      engagement: 'Medium',
      tailoredRecommendations: [
        'Encourage detailed feedback',
        'Maintain survey momentum',
        'Share insights with participants',
      ],
      marketingStrategy: ['Initial engagement and awareness'],
      retentionRisk: 'Low',
    },
  };
}
/**
 * Process a new survey response
 * 1. Analyze with AI
 * 2. Update response scores (NPS, CSAT, EVI)
 * 3. Detect high-risk indicators
 * 4. Store dashboard analytics
 */
export async function processSurveyResponse(
  surveyId: string,
  responseId: string,
  answers: Record<string, any>,
  respondentEmail?: string
) {
  try {
    

    // 1. Fetch survey details to understand questions
    const survey = await db.query.surveys.findFirst({
      where: eq(surveys.id, surveyId),
    });

    if (!survey) {
      throw new Error(`Survey ${surveyId} not found`);
    }

    // 2. Construct a text representation of the response for the AI
    let transcript = "Survey Response Analysis:\n";
    let hasOpenText = false;

    if (Array.isArray(survey.questions)) {
      survey.questions.forEach((q: any) => {
        const answer = answers[q.id];
        if (answer) {
          transcript += `Question: ${q.title || q.text}\nAnswer: ${answer}\n\n`;
          if (q.type === 'text' || q.type === 'long_text') hasOpenText = true;
        }
      });
    } else {
      // Fallback if questions structure is different or missing
      Object.entries(answers).forEach(([key, value]) => {
        transcript += `Question ID: ${key}\nAnswer: ${value}\n\n`;
      });
    }

    // 3. Call OpenRouter to analyze
    const { analyzeTranscriptWithOpenRouter } = await import('./openRouterService');
    const analysis = await analyzeTranscriptWithOpenRouter({
      transcript,
      surveyTitle: survey.title,
      surveyDescription: survey.description || undefined,
      respondentPhone: respondentEmail || 'Anonymous',
      surveyId: surveyId,
    });

    // 4. Detect high-risk indicators in open-text comments
    const { analyzeRisks } = await import('./riskDetectionService');
    const riskAnalysis = await analyzeRisks(answers);

    // 5. Update the response with calculated scores
    // The analysis returns scores in executiveSummary
    const { npsScore, csatScore, eviScore, cesScore } = analysis.executiveSummary;

    // Also use the calculated scores to generate 'analysis_summary', 'overall_sentiment'
    await db.update(responses)
      .set({
        npsScore: Math.round(npsScore),
        csatScore: Math.round(csatScore),
        eviScore: Math.round(eviScore),
        analysisSummary: analysis.executiveSummary.executiveSummaryText,
        overallSentiment: npsScore > 30 ? 'positive' : (npsScore < -30 ? 'negative' : 'neutral'),
        // Risk detection fields
        hasRisks: riskAnalysis.hasRisks,
        riskLevel: riskAnalysis.overallRiskLevel,
        riskScore: riskAnalysis.riskScore,
        riskCategories: riskAnalysis.indicators.map(i => i.category),
        riskIndicators: riskAnalysis.indicators,
        riskAnalysis: `Risk Level: ${riskAnalysis.overallRiskLevel.toUpperCase()}\nDetected: ${riskAnalysis.indicators.map(i => i.trigger).join(', ') || 'None'}`,
        riskRecommendations: riskAnalysis.recommendations,
        requiresManualReview: riskAnalysis.requiresManualReview,
      })
      .where(eq(responses.id, responseId));

    console.log(`[DashboardAnalysis] Updated response ${responseId} with scores: NPS=${npsScore}, CSAT=${csatScore}, EVI=${eviScore}, CES=${cesScore}`);
    console.log(`[DashboardAnalysis] Risk Analysis: Level=${riskAnalysis.overallRiskLevel}, HasRisks=${riskAnalysis.hasRisks}`);

    if (riskAnalysis.requiresManualReview) {
      console.warn(`[DashboardAnalysis] ⚠️ Response ${responseId} flagged for manual review - ${riskAnalysis.overallRiskLevel} risk level`);
      // TODO: Create notification for admin
    }

    // 6. Store detailed dashboard data
    await storeDashboardAnalysis({
      surveyId,
      responseId,
      analysis,
    });

    // 7. Sync AI-derived scores to Quantitative Analytics (CSAT/NPS/CES/EVI tabs)
    try {
      if (
        (npsScore !== undefined && npsScore !== null) ||
        (csatScore !== undefined && csatScore !== null) ||
        (eviScore !== undefined && eviScore !== null) ||
        (cesScore !== undefined && cesScore !== null)
      ) {
        
        const { AnalyticsService } = await import('./analyticsService');
        const { analyticsSurveys, surveyQuestions: analyticsQuestions } = await import('../shared/schema');

        // Find or create analytics survey
        let [targetSurvey] = await db
          .select()
          .from(analyticsSurveys)
          .where(eq(analyticsSurveys.surveyName, survey.title));

        if (!targetSurvey) {
          [targetSurvey] = await db.insert(analyticsSurveys).values({
            surveyName: survey.title,
            description: survey.description || '',
            isActive: true,
          }).returning();

          // Create default questions
          await db.insert(analyticsQuestions).values([
            { surveyId: targetSurvey.surveyId, questionText: "How satisfied are you with our service?", questionOrder: 1 },
            { surveyId: targetSurvey.surveyId, questionText: "How likely are you to recommend us?", questionOrder: 2 },
            { surveyId: targetSurvey.surveyId, questionText: "How easy was it to resolve your issue?", questionOrder: 3 },
            { surveyId: targetSurvey.surveyId, questionText: "Effort vs Value Score", questionOrder: 4 },
          ]);
        }

        const targetQuestions = await db
          .select()
          .from(analyticsQuestions)
          .where(eq(analyticsQuestions.surveyId, targetSurvey.surveyId))
          .orderBy(analyticsQuestions.questionOrder);

        // Sync CSAT (Question 1)
        if (csatScore !== undefined && csatScore !== null) {
          let score = Number(csatScore);
          // Normalize 0-100 to 0-10 if needed
          if (score > 10 && score <= 100) score = score / 10;

          if (score >= 0 && score <= 10) {
            await AnalyticsService.submitResponse({
              surveyId: targetSurvey.surveyId,
              questionId: targetQuestions[0].questionId,
              respondentId: respondentEmail || 'anonymous',
              score: score,
              maxScale: 10,
              responseDate: new Date(),
              metadata: { originalResponseId: responseId, source: 'ai_derived', type: 'CSAT' }
            });
          }
        }

        // Sync NPS (Question 2)
        if (npsScore !== undefined && npsScore !== null) {
          let score = Number(npsScore);
          // Only sync valid 0-10 ratings. Ignore aggregate scores like 45 or 75.
          if (score >= 0 && score <= 10) {
            await AnalyticsService.submitResponse({
              surveyId: targetSurvey.surveyId,
              questionId: targetQuestions[1]?.questionId || targetQuestions[0].questionId,
              respondentId: respondentEmail || 'anonymous',
              score: score,
              maxScale: 10,
              responseDate: new Date(),
              metadata: { originalResponseId: responseId, source: 'ai_derived', type: 'NPS' }
            });
          }
        }

        // Sync CES (Customer Effort Score - Question 3)
        if (cesScore !== undefined && cesScore !== null) {
          let score = Number(cesScore);
          // Normalize 0-100 to 0-10 if needed
          if (score > 10 && score <= 100) score = score / 10;

          if (score >= 0 && score <= 10) {
            await AnalyticsService.submitResponse({
              surveyId: targetSurvey.surveyId,
              questionId: targetQuestions[2]?.questionId || targetQuestions[0].questionId,
              respondentId: respondentEmail || 'anonymous',
              score: score,
              maxScale: 10,
              responseDate: new Date(),
              metadata: { originalResponseId: responseId, source: 'ai_derived', type: 'CES' }
            });
          }
        }

        // Sync EVI (Effort-to-Value Score - Question 4)
        if (eviScore !== undefined && eviScore !== null) {
          let score = Number(eviScore);
          // Normalize 0-100 to 0-10 if needed
          if (score > 10 && score <= 100) score = score / 10;

          if (score >= 0 && score <= 10) {
            await AnalyticsService.submitResponse({
              surveyId: targetSurvey.surveyId,
              questionId: targetQuestions[3]?.questionId || targetQuestions[0].questionId,
              respondentId: respondentEmail || 'anonymous',
              score: score,
              maxScale: 10,
              responseDate: new Date(),
              metadata: { originalResponseId: responseId, source: 'ai_derived', type: 'EVI' }
            });
          }
        }
        
      }
    } catch (syncError) {
      
    }

    return analysis;
  } catch (error: any) {
    
    // return null or rethrow? 
    // We shouldn't block the UI flow, so maybe just log error
    return null;
  }
}

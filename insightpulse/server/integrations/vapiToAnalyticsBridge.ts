import { db } from "../db";
import {
  surveys,
  analyticsSurveys,
  surveyQuestions,
  responses,
  feedbackAnalytics,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { AnalyticsService } from "../services/analyticsService";
import { analyzeSurveyResponse } from "../services/surveyResponseAnalysisService";
import { aggregateDepartmentNps } from "../services/departmentNpsService";

/**
 * Bridge service to sync VAPI voice survey responses to analytics tables
 * This enables real-time analytics dashboard updates when users complete voice surveys
 */

interface VAPIAnswers {
  [questionId: string]: string | number | boolean;
}

interface VAPISurveyResponse {
  surveyId: string; // UUID from main surveys table
  respondentId: string; // Phone number or unique identifier
  answers: VAPIAnswers;
  sessionId?: string;
  responseTimeMinutes?: number;
  csatScore?: number | null;
  npsScore?: number | null;
  eviScore?: number | null;
  cesScore?: number | null;
}

/**
 * Normalize score from various formats to 0-5 scale for CSAT
 */
function normalizeToScale5(answer: any, _questionType?: string): number {
  // Handle numeric ratings
  if (typeof answer === 'number') {
    if (answer >= 0 && answer <= 5) return Math.round(answer);
    if (answer >= 0 && answer <= 10) return Math.round(answer / 2); // Convert 10-scale to 5-scale
    return 3; // Default to neutral
  }

  // Handle string answers
  const answerStr = String(answer).toLowerCase().trim();

  // Yes/No questions
  if (answerStr === 'yes' || answerStr === 'yeah' || answerStr === 'yep' || answerStr === 'sure') {
    return 5; // Very satisfied
  }
  if (answerStr === 'no' || answerStr === 'nope') {
    return 1; // Very dissatisfied
  }

  // Try to parse numeric from string
  const numMatch = answerStr.match(/(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 0 && num <= 5) return num;
    if (num >= 0 && num <= 10) return Math.round(num / 2);
  }

  // Sentiment-based answers
  if (answerStr.includes('excellent') || answerStr.includes('great') || answerStr.includes('amazing')) {
    return 5;
  }
  if (answerStr.includes('good') || answerStr.includes('satisfied') || answerStr.includes('happy')) {
    return 4;
  }
  if (answerStr.includes('okay') || answerStr.includes('fine') || answerStr.includes('average')) {
    return 3;
  }
  if (answerStr.includes('bad') || answerStr.includes('poor') || answerStr.includes('disappointed')) {
    return 2;
  }
  if (answerStr.includes('terrible') || answerStr.includes('awful') || answerStr.includes('horrible')) {
    return 1;
  }

  // Default to neutral
  return 3;
}

/**
 * Find or create analytics survey matching the main survey
 */
async function findOrCreateAnalyticsSurvey(mainSurveyId: string): Promise<number> {
  // Get main survey
  const [mainSurvey] = await db
    .select()
    .from(surveys)
    .where(eq(surveys.id, mainSurveyId))
    .limit(1);

  if (!mainSurvey) {
    throw new Error(`Main survey not found: ${mainSurveyId}`);
  }

  // Check if analytics survey already exists with matching name
  const existingSurveys = await db
    .select()
    .from(analyticsSurveys)
    .where(eq(analyticsSurveys.surveyName, mainSurvey.title));

  if (existingSurveys.length > 0) {
    
    return existingSurveys[0].surveyId;
  }

  // Create new analytics survey
  const [analyticsSurvey] = await db
    .insert(analyticsSurveys)
    .values({
      surveyName: mainSurvey.title,
      description: mainSurvey.description || `Voice survey: ${mainSurvey.title}`,
      isActive: true,
    })
    .returning();

  
  return analyticsSurvey.surveyId;
}

/**
 * Find or create analytics question matching the main survey question
 */
async function findOrCreateAnalyticsQuestion(
  analyticsSurveyId: number,
  questionText: string,
  questionOrder: number
): Promise<number> {
  // Check if question already exists
  const existingQuestions = await db
    .select()
    .from(surveyQuestions)
    .where(
      and(
        eq(surveyQuestions.surveyId, analyticsSurveyId),
        eq(surveyQuestions.questionText, questionText)
      )
    );

  if (existingQuestions.length > 0) {
    return existingQuestions[0].questionId;
  }

  // Create new question
  const [question] = await db
    .insert(surveyQuestions)
    .values({
      surveyId: analyticsSurveyId,
      questionText,
      questionOrder,
    })
    .returning();

  
  return question.questionId;
}

/**
 * Main bridge function: Convert VAPI response to analytics format
 */
export async function syncVAPIResponseToAnalytics(
  vapiResponse: VAPISurveyResponse
): Promise<void> {
  
  
  
  
  
  if (vapiResponse.csatScore !== undefined && vapiResponse.csatScore !== null) {
    
  }
  if (vapiResponse.npsScore !== undefined && vapiResponse.npsScore !== null) {
    
  }
  if (vapiResponse.eviScore !== undefined && vapiResponse.eviScore !== null) {
    
  }
  if (vapiResponse.cesScore !== undefined && vapiResponse.cesScore !== null) {
    
  }
  

  try {
    // Get main survey and its questions
    const [mainSurvey] = await db
      .select()
      .from(surveys)
      .where(eq(surveys.id, vapiResponse.surveyId))
      .limit(1);

    if (!mainSurvey) {
      throw new Error(`Survey not found: ${vapiResponse.surveyId}`);
    }

    const mainQuestions = Array.isArray(mainSurvey.questions) ? mainSurvey.questions : [];
    if (mainQuestions.length === 0) {
      
      return;
    }

    // Find or create analytics survey
    const analyticsSurveyId = await findOrCreateAnalyticsSurvey(vapiResponse.surveyId);

    // Process each answer
    let responsesStored = 0;

    for (const [questionId, answer] of Object.entries(vapiResponse.answers)) {
      // Find the question in main survey
      const question = mainQuestions.find((q: any) => q.id === questionId);
      
      if (!question) {
        
        continue;
      }

      const questionText = question.title || question.text || question.questionText || 'Unknown Question';
      const questionType = question.type || 'text';
      const questionOrder = mainQuestions.indexOf(question) + 1;

      
      

      // Find or create analytics question
      const analyticsQuestionId = await findOrCreateAnalyticsQuestion(
        analyticsSurveyId,
        questionText,
        questionOrder
      );

      // Normalize scores
      const normalizedScore5 = normalizeToScale5(answer, questionType);
      const originalScore = typeof answer === 'number' ? answer : normalizedScore5;

      

      // Store response using AnalyticsService
      await AnalyticsService.submitResponse({
        surveyId: analyticsSurveyId,
        questionId: analyticsQuestionId,
        respondentId: vapiResponse.respondentId,
        score: originalScore,
        maxScale: questionType === 'rating' ? 5 : 10,
        sessionId: vapiResponse.sessionId || `vapi_${Date.now()}`,
        metadata: {
          channel: 'voice',
          responseTime: vapiResponse.responseTimeMinutes ?? 0,
          source: 'vapi',
          questionType,
          originalAnswer: String(answer),
        },
      });

      responsesStored++;
    }

    // Store CSAT score if provided
    if (vapiResponse.csatScore !== undefined && vapiResponse.csatScore !== null) {
      try {
        let csatScore = Number(vapiResponse.csatScore);
        // Normalize 0-100 to 0-10 if needed
        if (csatScore > 10 && csatScore <= 100) csatScore = csatScore / 10;

        if (csatScore >= 0 && csatScore <= 10 && mainQuestions.length > 0) {
          const csatQuestionId = await findOrCreateAnalyticsQuestion(
            analyticsSurveyId,
            'Overall CSAT Score',
            mainQuestions.length + 1
          );

          await AnalyticsService.submitResponse({
            surveyId: analyticsSurveyId,
            questionId: csatQuestionId,
            respondentId: vapiResponse.respondentId,
            score: csatScore,
            maxScale: 10,
            sessionId: vapiResponse.sessionId || `vapi_${Date.now()}`,
            metadata: {
              channel: 'voice',
              responseTime: vapiResponse.responseTimeMinutes ?? 0,
              source: 'vapi',
              questionType: 'metric',
              originalAnswer: String(csatScore),
              type: 'CSAT',
            },
          });
          
        }
      } catch (csatError) {
        
      }
    }

    // Store NPS score if provided
    if (vapiResponse.npsScore !== undefined && vapiResponse.npsScore !== null) {
      try {
        let npsScore = Number(vapiResponse.npsScore);
        // Only sync valid 0-10 ratings. Ignore aggregate scores like 45 or 75.
        if (npsScore >= 0 && npsScore <= 10 && mainQuestions.length > 0) {
          const npsQuestionId = await findOrCreateAnalyticsQuestion(
            analyticsSurveyId,
            'NPS Score',
            mainQuestions.length + 2
          );

          await AnalyticsService.submitResponse({
            surveyId: analyticsSurveyId,
            questionId: npsQuestionId,
            respondentId: vapiResponse.respondentId,
            score: npsScore,
            maxScale: 10,
            sessionId: vapiResponse.sessionId || `vapi_${Date.now()}`,
            metadata: {
              channel: 'voice',
              responseTime: vapiResponse.responseTimeMinutes ?? 0,
              source: 'vapi',
              questionType: 'metric',
              originalAnswer: String(npsScore),
              type: 'NPS',
            },
          });
          
        }
      } catch (npsError) {
        
      }
    }

    // Store EVI score if provided
    if (vapiResponse.eviScore !== undefined && vapiResponse.eviScore !== null) {
      try {
        let eviScore = Number(vapiResponse.eviScore);
        // Normalize 0-100 to 0-10 if needed
        if (eviScore > 10 && eviScore <= 100) eviScore = eviScore / 10;

        if (eviScore >= 0 && eviScore <= 10 && mainQuestions.length > 0) {
          const eviQuestionId = await findOrCreateAnalyticsQuestion(
            analyticsSurveyId,
            'EVI Score',
            mainQuestions.length + 3
          );

          await AnalyticsService.submitResponse({
            surveyId: analyticsSurveyId,
            questionId: eviQuestionId,
            respondentId: vapiResponse.respondentId,
            score: eviScore,
            maxScale: 10,
            sessionId: vapiResponse.sessionId || `vapi_${Date.now()}`,
            metadata: {
              channel: 'voice',
              responseTime: vapiResponse.responseTimeMinutes ?? 0,
              source: 'vapi',
              questionType: 'metric',
              originalAnswer: String(eviScore),
              type: 'EVI',
            },
          });
          
        }
      } catch (eviError) {
        
      }
    }

    // Store CES score if provided
    if (vapiResponse.cesScore !== undefined && vapiResponse.cesScore !== null) {
      try {
        let cesScore = Number(vapiResponse.cesScore);
        // Normalize 0-100 to 0-10 if needed, or 1-5 to 0-10
        if (cesScore > 10 && cesScore <= 100) cesScore = cesScore / 10;
        if (cesScore >= 1 && cesScore <= 5) cesScore = (cesScore - 1) * 2.5; // Convert 1-5 to 0-10

        if (cesScore >= 0 && cesScore <= 10 && mainQuestions.length > 0) {
          const cesQuestionId = await findOrCreateAnalyticsQuestion(
            analyticsSurveyId,
            'CES Score',
            mainQuestions.length + 4
          );

          await AnalyticsService.submitResponse({
            surveyId: analyticsSurveyId,
            questionId: cesQuestionId,
            respondentId: vapiResponse.respondentId,
            score: cesScore,
            maxScale: 10,
            sessionId: vapiResponse.sessionId || `vapi_${Date.now()}`,
            metadata: {
              channel: 'voice',
              responseTime: vapiResponse.responseTimeMinutes ?? 0,
              source: 'vapi',
              questionType: 'metric',
              originalAnswer: String(cesScore),
              type: 'CES',
            },
          });
          
        }
      } catch (cesError) {
        
      }
    }

    
    
    
  } catch (error) {
    
    console.error('Error:', error); throw error;
  }
}

/**
 * Sync all VAPI responses from a completed call
 * Call this from the VAPI webhook handler
 */
export async function syncVAPICallToAnalytics(
  surveyId: string,
  customerPhone: string,
  answersObject: Record<string, any>,
  callId?: string,
  responseTimeMinutes?: number,
  csatScore?: number | null,
  npsScore?: number | null,
  eviScore?: number | null,
  cesScore?: number | null
): Promise<void> {
  const vapiResponse: VAPISurveyResponse = {
    surveyId,
    respondentId: customerPhone || `anonymous_${Date.now()}`,
    answers: answersObject,
    sessionId: callId || `call_${Date.now()}`,
    responseTimeMinutes,
    csatScore,
    npsScore,
    eviScore,
    cesScore,
  };

  // Run both paths concurrently: legacy analytics tables + unified dashboard tables
  await Promise.allSettled([
    syncVAPIResponseToAnalytics(vapiResponse),
    syncVAPIToUnifiedTables(surveyId, customerPhone, answersObject, { csatScore, npsScore, eviScore, cesScore }),
  ]);
}

/**
 * Write VAPI voice response into the unified `responses` + `feedback_analytics` tables
 * so it appears in the Overview dashboard alongside web/link/WhatsApp submissions.
 */
async function syncVAPIToUnifiedTables(
  surveyId: string,
  customerPhone: string,
  answersObject: Record<string, any>,
  scores: { csatScore?: number | null; npsScore?: number | null; eviScore?: number | null; cesScore?: number | null }
): Promise<void> {
  try {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, surveyId)).limit(1);
    if (!survey) return;

    // Run LLM analysis for feedback_analytics fields (emotions, insights, category, urgency).
    // VAPI already provides the numeric scores via structured outputs, so we trust those first.
    const analysis = await analyzeSurveyResponse({
      surveyId,
      surveyTitle: survey.title,
      surveyDescription: survey.description || undefined,
      answers: answersObject,
      respondentPhone: customerPhone || null,
    });

    // VAPI structured output scores take priority — they come directly from the agent model.
    // Fall back to LLM-derived scores only when VAPI didn't return a value.
    const finalEvi  = scores.eviScore  ?? analysis.eviScore;
    const finalNps  = scores.npsScore  ?? analysis.npsScore;
    const finalCsat = scores.csatScore ?? analysis.csatScore;
    const finalCes  = scores.cesScore  ?? analysis.cesScore;

    const [storedResponse] = await db
      .insert(responses)
      .values({
        surveyId,
        respondentEmail: null,
        respondentPhone: customerPhone || null,
        answers: answersObject,
        eviScore: finalEvi,
        npsScore: finalNps,
        csatScore: finalCsat,
        cesScore: finalCes,
        analysisSummary: analysis.summary,
        overallSentiment: analysis.sentiment,
        detailedResponses: {
          keyInsights: analysis.keyInsights,
          recommendations: analysis.recommendations,
          actionItems: analysis.actionItems,
        },
        surveyCompleted: true,
        totalQuestionsAsked: Object.keys(answersObject).length,
      })
      .returning();

    await db.insert(feedbackAnalytics).values({
      surveyId,
      responseId: storedResponse.id,
      feedbackText: JSON.stringify(answersObject),
      sentiment: analysis.sentiment,
      eviScore: finalEvi,
      npsScore: finalNps,
      csatScore: finalCsat,
      emotions: analysis.emotions,
      insights: analysis.keyInsights,
      recommendations: analysis.recommendations,
      aiAnalysis: analysis.summary,
      category: analysis.category,
      urgency: analysis.urgency,
      userType: 'guest',
      source: 'voice',
    });

    aggregateDepartmentNps({
      surveyId,
      responseId: storedResponse.id,
      respondentPhone: customerPhone || null,
      npsScore: finalNps,
    });
  } catch (err) {
    console.error('[vapiToAnalyticsBridge] syncVAPIToUnifiedTables failed:', err);
  }
}

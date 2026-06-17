import { db } from '../db';
import { responses, analyticsSurveys, surveyQuestions } from '../../shared/schema';
import type { InsertResponse, Response } from '../../shared/schema';
import { AnalyticsService } from '../services/analyticsService';
import { eq } from 'drizzle-orm';

export interface StoreResponseInput {
  surveyId: string;
  answers: Record<string, any>;
  respondentPhone?: string | null;
  respondentEmail?: string | null;
  eviScore?: number | null;
  npsScore?: number | null;
  csatScore?: number | null;
  cesScore?: number | null;

  // VAPI Analysis fields
  analysisSummary?: string | null;
  surveyCompleted?: boolean | null;
  totalQuestionsAsked?: number | null;
  overallSentiment?: string | null;
  detailedResponses?: any[] | null;
}

/**
 * Persists a survey response using the active storage backend (local DB or Caspio).
 * Normalizes phone/email into respondentEmail for the local schema while allowing
 * Caspio storage to expand per-question answers when enabled.
 */
export async function storeSurveyResponse(input: StoreResponseInput): Promise<Response> {
  const {
    surveyId,
    answers,
    respondentPhone,
    respondentEmail,
    eviScore = null,
    npsScore = null,
    csatScore = null,
    cesScore = null,
    analysisSummary = null,
    surveyCompleted = null,
    totalQuestionsAsked = null,
    overallSentiment = null,
    detailedResponses = null,
  } = input;

  const payload: InsertResponse = {
    surveyId,
    // Local schema uses respondentEmail; store phone there if provided
    respondentEmail: respondentPhone ?? respondentEmail ?? null as any,
    answers,
    eviScore,
    npsScore,
    csatScore,
    cesScore,
    analysisSummary,
    surveyCompleted,
    totalQuestionsAsked,
    overallSentiment,
    detailedResponses,
  } as InsertResponse;

  const [row] = await db.insert(responses).values(payload).returning();

  // --- Real-time Analytics Sync ---
  // Fire-and-forget sync to ensure analytics dashboard is updated immediately
  (async () => {
    try {
      

      // 1. Find or create analytics survey
      // We need to look up the survey title to map it
      // For efficiency, we might want to cache this mapping, but for now db lookup is fine
      const surveyResult = await db.query.surveys.findFirst({
        where: (surveys, { eq }) => eq(surveys.id, surveyId)
      });

      if (!surveyResult) {
        
        return;
      }

      let [targetSurvey] = await db
        .select()
        .from(analyticsSurveys)
        .where(eq(analyticsSurveys.surveyName, surveyResult.title));

      if (!targetSurvey) {
        
        [targetSurvey] = await db
          .insert(analyticsSurveys)
          .values({
            surveyName: surveyResult.title,
            description: surveyResult.description,
            isActive: true,
          })
          .returning();

        // Create default questions
        await db.insert(surveyQuestions).values([
          { surveyId: targetSurvey.surveyId, questionText: "How satisfied are you with our service?", questionOrder: 1 },
          { surveyId: targetSurvey.surveyId, questionText: "How likely are you to recommend us?", questionOrder: 2 },
        ]);
      }

      const targetSurveyId = targetSurvey.surveyId;

      // 2. Get target questions
      const targetQuestions = await db
        .select()
        .from(surveyQuestions)
        .where(eq(surveyQuestions.surveyId, targetSurveyId))
        .orderBy(surveyQuestions.questionOrder);

      // 3. Submit metrics
      if (csatScore !== null && csatScore !== undefined) {
        await AnalyticsService.submitResponse({
          surveyId: targetSurveyId,
          questionId: targetQuestions[0].questionId,
          respondentId: respondentEmail || respondentPhone || "anonymous",
          score: Number(csatScore),
          maxScale: 5,
          responseDate: new Date(),
          metadata: { originalResponseId: row.id }
        });
      }

      if (npsScore !== null && npsScore !== undefined) {
        await AnalyticsService.submitResponse({
          surveyId: targetSurveyId,
          questionId: targetQuestions[1]?.questionId || targetQuestions[0].questionId,
          respondentId: respondentEmail || respondentPhone || "anonymous",
          score: Number(npsScore),
          maxScale: 10,
          responseDate: new Date(),
          metadata: { originalResponseId: row.id }
        });
      }

      // Update totals
      // We can increment safely or just let updateAllMetrics handle consistency
      // But updateAllMetrics is heavy, maybe just increment total?
      // For now, let's trust submitResponse's call to updateAllMetrics which is safe/correct

      

    } catch (err) {
      
      // Don't fail the main request just because analytics sync failed
    }
  })();

  return row as Response;
}

/**
 * Survey Response Routes
 * Handles survey response submission with AI analysis
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { responses, surveys, feedbackAnalytics } from "@shared/schema";
import { eq } from "drizzle-orm";
import { analyzeSurveyResponse } from "../services/surveyResponseAnalysisService";
import { aggregateDepartmentNps } from "../services/departmentNpsService";

export function registerSurveyResponseRoutes(app: Express) {
  /**
   * POST /api/survey-responses/analyze
   * Submit survey response and process through AI
   */
  app.post("/api/survey-responses/analyze", async (req: Request, res: Response) => {
    try {
      const { surveyId, answers, respondentEmail, respondentPhone } = req.body;

      if (!surveyId || !answers) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields: surveyId, answers",
        });
      }

      // Get survey details
      const [survey] = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, surveyId))
        .limit(1);

      if (!survey) {
        return res.status(404).json({
          success: false,
          message: "Survey not found",
        });
      }

      // Analyze survey response through AI
      const analysis = await analyzeSurveyResponse({
        surveyId,
        surveyTitle: survey.title,
        surveyDescription: survey.description || undefined,
        answers,
        respondentEmail,
        respondentPhone,
      });

      // Store response in database
      const [storedResponse] = await db
        .insert(responses)
        .values({
          surveyId,
          respondentEmail: respondentEmail || null,
          answers,
          eviScore: analysis.eviScore,
          npsScore: analysis.npsScore,
          csatScore: analysis.csatScore,
          cesScore: analysis.cesScore,
          analysisSummary: analysis.summary,
          overallSentiment: analysis.sentiment,
          detailedResponses: {
            keyInsights: analysis.keyInsights,
            recommendations: analysis.recommendations,
            actionItems: analysis.actionItems,
          },
          surveyCompleted: true,
          totalQuestionsAsked: Object.keys(answers).length,
        })
        .returning();

      // Fire-and-forget department NPS aggregation
      aggregateDepartmentNps({
        surveyId,
        responseId: storedResponse.id,
        respondentEmail: respondentEmail ?? null,
        respondentPhone: respondentPhone ?? null,
        npsScore: analysis.npsScore,
      });

      // Store detailed analysis in feedbackAnalytics table
      await db.insert(feedbackAnalytics).values({
        surveyId,
        responseId: storedResponse.id,
        feedbackText: JSON.stringify(answers),
        sentiment: analysis.sentiment,
        eviScore: analysis.eviScore,
        npsScore: analysis.npsScore,
        csatScore: analysis.csatScore,
        emotions: analysis.emotions,
        insights: analysis.keyInsights,
        recommendations: analysis.recommendations,
        aiAnalysis: analysis.summary,
        category: analysis.category,
        urgency: analysis.urgency,
        customerEmail: respondentEmail,
        userType: respondentEmail ? "registered" : "guest",
        source: "survey",
      });

      return res.json({
        success: true,
        message: "Survey response analyzed and stored successfully",
        responseId: storedResponse.id,
        analysis: {
          sentiment: analysis.sentiment,
          sentimentScore: analysis.sentimentScore,
          eviScore: analysis.eviScore,
          npsScore: analysis.npsScore,
          csatScore: analysis.csatScore,
          cesScore: analysis.cesScore,
          keyInsights: analysis.keyInsights,
          recommendations: analysis.recommendations,
          category: analysis.category,
          urgency: analysis.urgency,
        },
      });
    } catch (error: any) {
      console.error("Error analyzing survey response:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to analyze survey response",
        error: error.message,
      });
    }
  });

  /**
   * GET /api/survey-responses/:responseId
   * Get stored response with analysis
   */
  app.get("/api/survey-responses/:responseId", async (req: Request, res: Response) => {
    try {
      const { responseId } = req.params;

      const [response] = await db
        .select()
        .from(responses)
        .where(eq(responses.id, responseId))
        .limit(1);

      if (!response) {
        return res.status(404).json({
          success: false,
          message: "Response not found",
        });
      }

      // Get detailed analysis
      const [analysis] = await db
        .select()
        .from(feedbackAnalytics)
        .where(eq(feedbackAnalytics.responseId, responseId))
        .limit(1);

      return res.json({
        success: true,
        response: {
          id: response.id,
          surveyId: response.surveyId,
          respondentEmail: response.respondentEmail,
          answers: response.answers,
          eviScore: response.eviScore,
          npsScore: response.npsScore,
          csatScore: response.csatScore,
          cesScore: response.cesScore,
          sentiment: response.overallSentiment,
          summary: response.analysisSummary,
          submittedAt: response.submittedAt,
          analysis: analysis ? {
            sentiment: analysis.sentiment,
            eviScore: analysis.eviScore,
            npsScore: analysis.npsScore,
            csatScore: analysis.csatScore,
            emotions: analysis.emotions,
            insights: analysis.insights,
            recommendations: analysis.recommendations,
            category: analysis.category,
            urgency: analysis.urgency,
          } : null,
        },
      });
    } catch (error: any) {
      console.error("Error fetching survey response:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch survey response",
        error: error.message,
      });
    }
  });

  /**
   * GET /api/survey-responses/survey/:surveyId
   * Get all responses for a survey with analysis
   */
  app.get("/api/survey-responses/survey/:surveyId", async (req: Request, res: Response) => {
    try {
      const { surveyId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

      const surveyResponses = await db
        .select()
        .from(responses)
        .where(eq(responses.surveyId, surveyId))
        .limit(limit);

      // Get analysis for each response
      const responseIds = surveyResponses.map(r => r.id);
      const analyses = await db
        .select()
        .from(feedbackAnalytics)
        .where(eq(feedbackAnalytics.responseId, responseIds[0]));

      const analysisMap = new Map(analyses.map(a => [a.responseId, a]));

      const enrichedResponses = surveyResponses.map(response => ({
        id: response.id,
        surveyId: response.surveyId,
        respondentEmail: response.respondentEmail,
        answers: response.answers,
        eviScore: response.eviScore,
        npsScore: response.npsScore,
        csatScore: response.csatScore,
        cesScore: response.cesScore,
        sentiment: response.overallSentiment,
        summary: response.analysisSummary,
        submittedAt: response.submittedAt,
        analysis: analysisMap.get(response.id),
      }));

      return res.json({
        success: true,
        count: enrichedResponses.length,
        responses: enrichedResponses,
      });
    } catch (error: any) {
      console.error("Error fetching survey responses:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch survey responses",
        error: error.message,
      });
    }
  });
}

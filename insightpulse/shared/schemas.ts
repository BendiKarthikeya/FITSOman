// Zod validation schemas for insert operations
// These are derived from database tables but are not database tables themselves

import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import {
  users,
  surveys,
  responses,
  notifications,
  feedbackAnalytics,
  structuredOutputs,
  analyticsSurveys,
  surveyQuestions,
  surveyResponses,
  surveyMetrics,
  reports,
  reportSchedules,
  reportArchives,
  exportJobs,
  benchmarks,
  benchmarkComparisons,
  surveyTemplates,
} from "./schema";

// Validation schemas for score normalization
export const scoreNormalizationSchema = z.object({
  originalScore: z.number().min(0),
  maxScale: z.number().min(1).max(100),
});

export const submitResponseSchema = z.object({
  surveyId: z.number().int().positive(),
  questionId: z.number().int().positive(),
  respondentId: z.string().min(1),
  score: z.number().min(0),
  maxScale: z.number().min(1).max(100).default(10),
  sessionId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

// Core table schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertSurveySchema = createInsertSchema(surveys).omit({
  id: true,
  createdAt: true,
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
  submittedAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertFeedbackAnalyticsSchema = createInsertSchema(feedbackAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertStructuredOutputSchema = createInsertSchema(structuredOutputs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalyticsSurveySchema = createInsertSchema(analyticsSurveys).omit({
  createdDate: true,
  updatedDate: true,
});

export const insertSurveyQuestionSchema = createInsertSchema(surveyQuestions).omit({
  createdDate: true,
});

export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({
  responseDate: true,
});

export const insertSurveyMetricSchema = createInsertSchema(surveyMetrics).omit({
  calculationDate: true,
});

// Report table schemas
export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportScheduleSchema = createInsertSchema(reportSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportArchiveSchema = createInsertSchema(reportArchives).omit({
  id: true,
  generatedAt: true,
});

export const insertExportJobSchema = createInsertSchema(exportJobs).omit({
  id: true,
  createdAt: true,
});

export const insertBenchmarkSchema = createInsertSchema(benchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBenchmarkComparisonSchema = createInsertSchema(
  benchmarkComparisons
).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertSurvey = z.infer<typeof insertSurveySchema>;
export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertFeedbackAnalytics = z.infer<typeof insertFeedbackAnalyticsSchema>;
export type InsertStructuredOutput = z.infer<typeof insertStructuredOutputSchema>;
export type InsertAnalyticsSurvey = z.infer<typeof insertAnalyticsSurveySchema>;
export type InsertSurveyQuestion = z.infer<typeof insertSurveyQuestionSchema>;
export type InsertSurveyResponse = z.infer<typeof insertSurveyResponseSchema>;
export type InsertSurveyMetric = z.infer<typeof insertSurveyMetricSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type InsertReportSchedule = z.infer<typeof insertReportScheduleSchema>;
export type InsertReportArchive = z.infer<typeof insertReportArchiveSchema>;
export type InsertExportJob = z.infer<typeof insertExportJobSchema>;
export type InsertBenchmark = z.infer<typeof insertBenchmarkSchema>;
export type InsertBenchmarkComparison = z.infer<typeof insertBenchmarkComparisonSchema>;


export const insertSurveyTemplateSchema = createInsertSchema(surveyTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
});

export type InsertSurveyTemplate = z.infer<typeof insertSurveyTemplateSchema>;

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric, date } from "drizzle-orm/pg-core";
import { z } from "zod";

// Organizations and Departments
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  plan: varchar("plan", { length: 50 }).default("professional"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }).notNull(),
  role: text("role").notNull(),
  departmentId: varchar("department_id").references(() => departments.id),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("user"), // "user" | "admin" | "superuser" | "culture_admin"
  organizationId: varchar("organization_id").references(() => organizations.id),
  departmentId: varchar("department_id").references(() => departments.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const surveys = pgTable("surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(), // Array of question objects
  isActive: boolean("is_active").default(true),
  surveyType: varchar("survey_type", { length: 20 }).default("web"), // 'web' | 'mobile' | 'voice' | 'email'
  sharedWith: varchar("shared_with", { length: 20 }).default("employee"), // 'employee' | 'customer'
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`),
  sentCount: integer("sent_count").default(0), // total recipients survey has been sent to
  targetDepartmentId: varchar("target_department_id").references(() => departments.id, { onDelete: "set null" }),
  targetSegment: varchar("target_segment", { length: 32 }), // 'finance' | 'hr' | 'it' | 'governance' | 'strategy' | 'customer'
});

export const responses = pgTable("responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id),
  respondentEmail: text("respondent_email"),
  respondentPhone: varchar("respondent_phone", { length: 30 }), // Phone number for WhatsApp/voice respondents
  answers: jsonb("answers").notNull(), // Object with questionId: answer mapping
  eviScore: integer("evi_score"), // Emotional Value Index score (LLM-extracted)
  npsScore: integer("nps_score"), // Net Promoter Score (LLM-extracted)
  csatScore: integer("csat_score"), // Customer Satisfaction score (LLM-extracted)
  cesScore: integer("ces_score"), // Customer Effort Score (LLM-extracted)

  // VAPI Analysis fields
  analysisSummary: text("analysis_summary"), // 2-3 sentence overview of the call
  surveyCompleted: boolean("survey_completed"), // Whether customer completed the survey
  totalQuestionsAsked: integer("total_questions_asked"), // Number of questions asked
  overallSentiment: varchar("overall_sentiment", { length: 20 }), // positive/negative/neutral
  detailedResponses: jsonb("detailed_responses"), // Array of detailed question responses with ratings, types, etc.

  // Risk Detection fields
  hasRisks: boolean("has_risks").default(false), // Whether high-risk indicators were detected
  riskLevel: varchar("risk_level", { length: 20 }).default("none"), // "critical" | "high" | "medium" | "low" | "none"
  riskScore: integer("risk_score").default(0), // 0-100 risk score
  riskCategories: jsonb("risk_categories"), // Array of detected risk categories
  riskIndicators: jsonb("risk_indicators"), // Detailed risk indicators with triggers and confidence
  riskAnalysis: text("risk_analysis"), // Summary of detected risks
  riskRecommendations: jsonb("risk_recommendations"), // Action recommendations
  requiresManualReview: boolean("requires_manual_review").default(false), // Flag for manual review needed
  riskReviewedAt: timestamp("risk_reviewed_at"), // When risk was reviewed
  riskReviewedBy: varchar("risk_reviewed_by").references(() => users.id), // Who reviewed the risk
  riskReviewNotes: text("risk_review_notes"), // Reviewer notes

  submittedAt: timestamp("submitted_at").default(sql`now()`),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // "alert" | "success" | "warning" | "info"
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  userId: varchar("user_id").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Feedback analytics table for storing detailed analysis results
export const feedbackAnalytics = pgTable("feedback_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id),
  responseId: varchar("response_id").references(() => responses.id),
  feedbackText: text("feedback_text").notNull(),
  sentiment: varchar("sentiment", { length: 20 }).notNull(), // "positive", "negative", "neutral"
  eviScore: integer("evi_score"),
  npsScore: integer("nps_score"),
  csatScore: integer("csat_score"),
  emotions: jsonb("emotions"), // Object with emotion percentages
  insights: jsonb("insights"), // Array of key insights
  recommendations: jsonb("recommendations"), // Array of action recommendations
  aiAnalysis: text("ai_analysis"), // Full AI analysis text
  category: varchar("category", { length: 50 }), // "Product Quality", "User Experience", etc.
  urgency: varchar("urgency", { length: 20 }), // "low", "medium", "high", "critical"
  customerEmail: text("customer_email"),
  customerName: varchar("customer_name"), // Full name for logged-in users
  userId: varchar("user_id").references(() => users.id), // Reference to logged-in user
  userType: varchar("user_type", { length: 20 }).default("guest"), // "guest", "registered"
  source: varchar("source", { length: 30 }).default("feedback_analyzer"), // "feedback_analyzer", "survey", "chat", "email"
  createdAt: timestamp("created_at").default(sql`now()`),
  resolvedAt: timestamp("resolved_at"),
  assignedTo: varchar("assigned_to").references(() => users.id), // User ID of assigned support agent
  status: varchar("status", { length: 20 }).default("open"), // "open", "in_progress", "resolved", "closed"
  tags: jsonb("tags"), // Array of custom tags
});

// Structured outputs from VAPI calls
export const structuredOutputs = pgTable("structured_outputs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }),
  callId: varchar("call_id"), // VAPI call ID

  // Structured Output 1: Supervisor Review Needed (Boolean)
  supervisorReviewNeeded: boolean("supervisor_review_needed").default(false),
  supervisorReviewReason: text("supervisor_review_reason"),

  // Structured Output 2: Customer Frustrated (Boolean)
  customerFrustrated: boolean("customer_frustrated").default(false),
  frustrationIndicators: text("frustration_indicators"),

  // Structured Output 3: Customer Sentiment (String)
  customerSentiment: varchar("customer_sentiment", { length: 50 }), // "positive", "negative", "neutral", "mixed"
  sentimentConfidence: numeric("sentiment_confidence", { precision: 5, scale: 2 }), // 0-100
  sentimentKeywords: text("sentiment_keywords"),

  // Structured Output 4: CSAT (Number 1-10)
  csatScore: integer("csat_score"),
  csatSource: varchar("csat_source", { length: 50 }), // "explicit", "inferred", "question_response"

  // Structured Output 5: NPS Score (Integer 0-10)
  npsScore: integer("nps_score"),

  // Structured Output 6: CES / Ease of resolution (Number 1-5)
  cesScore: integer("ces_score"),

  // Structured Output 7: EVI (Number 0-100, if agent provides it)
  eviScore: integer("evi_score"),

  // Raw data from VAPI
  rawAnalysis: jsonb("raw_analysis"),

  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// WATI WhatsApp Survey Sessions - Track active conversations
export const watiSessions = pgTable("wati_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id),
  phoneNumber: varchar("phone_number").notNull(),
  currentQuestionIndex: integer("current_question_index").default(0),
  status: varchar("status").default("active"), // "active", "completed", "abandoned"
  answers: jsonb("answers"), // { questionId: answer, ... }
  language: varchar("language").default("en"),
  lastMessageAt: timestamp("last_message_at").default(sql`now()`),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Survey Analytics Tables
export const analyticsSurveys = pgTable("analytics_surveys", {
  surveyId: integer("survey_id").primaryKey().generatedAlwaysAsIdentity(),
  surveyName: varchar("survey_name", { length: 255 }).notNull(),
  description: text("description"),
  totalRespondents: integer("total_respondents").default(0).notNull(),
  createdDate: timestamp("created_date", { mode: 'date' }).default(sql`now()`),
  updatedDate: timestamp("updated_date", { mode: 'date' }).default(sql`now()`),
  isActive: boolean("is_active").default(true),
});

export const surveyQuestions = pgTable("analytics_questions", {
  questionId: integer("question_id").primaryKey().generatedAlwaysAsIdentity(),
  surveyId: integer("survey_id").notNull().references(() => analyticsSurveys.surveyId, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  questionOrder: integer("question_order").notNull(),
  createdDate: timestamp("created_date", { mode: 'date' }).default(sql`now()`),
});

export const surveyResponses = pgTable("analytics_responses", {
  responseId: integer("response_id").primaryKey().generatedAlwaysAsIdentity(),
  surveyId: integer("survey_id").notNull().references(() => analyticsSurveys.surveyId, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => surveyQuestions.questionId, { onDelete: "cascade" }),
  respondentId: varchar("respondent_id", { length: 255 }).notNull(),
  originalScore: numeric("original_score", { precision: 10, scale: 2 }).notNull(),
  normalizedScore5: integer("normalized_score_5").notNull(), // 0-5 scale for CSAT
  normalizedScore10: integer("normalized_score_10").notNull(), // 0-10 scale for NPS
  responseDate: timestamp("response_date", { mode: 'date' }).default(sql`now()`),
  sessionId: varchar("session_id", { length: 255 }),
  location: varchar("location", { length: 100 }),
  source: varchar("source", { length: 50 }),
  gender: varchar("gender", { length: 20 }),
  clarity: integer("clarity"),
  satisfaction: integer("satisfaction"),
  metadata: jsonb("metadata"),
});

export const surveyMetrics = pgTable("analytics_metrics", {
  metricId: integer("metric_id").primaryKey().generatedAlwaysAsIdentity(),
  surveyId: integer("survey_id").notNull().references(() => analyticsSurveys.surveyId, { onDelete: "cascade" }),
  questionId: integer("question_id").references(() => surveyQuestions.questionId, { onDelete: "cascade" }), // NULL for overall metrics

  // CSAT Metrics
  csatScore: numeric("csat_score", { precision: 5, scale: 2 }), // Percentage (0-100)
  satisfiedCount: integer("satisfied_count").default(0).notNull(),
  totalResponses: integer("total_responses").default(0).notNull(),

  // NPS Metrics
  npsScore: numeric("nps_score", { precision: 5, scale: 2 }), // Score (-100 to 100)
  promotersCount: integer("promoters_count").default(0).notNull(),
  passivesCount: integer("passives_count").default(0).notNull(),
  detractorsCount: integer("detractors_count").default(0).notNull(),

  // Response Distribution (0-5 scale)
  score5Count: integer("score_5_count").default(0).notNull(),
  score4Count: integer("score_4_count").default(0).notNull(),
  score3Count: integer("score_3_count").default(0).notNull(),
  score2Count: integer("score_2_count").default(0).notNull(),
  score1Count: integer("score_1_count").default(0).notNull(),
  score0Count: integer("score_0_count").default(0).notNull(),

  // Performance Ratings
  csatPerformance: varchar("csat_performance", { length: 50 }), // EXCELLENT, GOOD, AVERAGE, POOR
  npsPerformance: varchar("nps_performance", { length: 50 }), // EXCELLENT, GOOD, AVERAGE, POOR

  // Metadata
  calculationDate: timestamp("calculation_date", { mode: 'date' }).default(sql`now()`),
  dateRangeStart: timestamp("date_range_start", { mode: 'date' }),
  dateRangeEnd: timestamp("date_range_end", { mode: 'date' }),
});

// Types moved to end of file to prevent circular dependencies during introspection

// Question types for surveys
const questionTypes = [
  "evi-slider",
  "nps",
  "csat",
  "multiple-choice",
  "text-input",
  "long_text",
  "rating",
  "yes-no"
] as const;

export type QuestionType = typeof questionTypes[number];

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: string[]; // For multiple choice
  minValue?: number; // For sliders/ratings
  maxValue?: number; // For sliders/ratings
}

// Survey Analytics Types
export type PerformanceLevel = "EXCELLENT" | "GOOD" | "AVERAGE" | "POOR";

export interface ScoreNormalization {
  originalScore: number;
  normalizedScore5: number; // 0-5 scale
  normalizedScore10: number; // 0-10 scale
  maxScale: number; // Original scale (e.g., 100, 10, 5)
}

export interface CSATMetrics {
  csatScore: number; // Percentage (0-100)
  satisfiedCount: number; // Ratings 4-5
  totalResponses: number;
  performance: PerformanceLevel;
  distribution: {
    score5: number; // Very Satisfied
    score4: number; // Satisfied
    score3: number; // Neutral
    score2: number; // Dissatisfied
    score1: number; // Very Dissatisfied
    score0: number; // Not Rated
  };
}

export interface NPSMetrics {
  npsScore: number; // Score (-100 to 100)
  promotersCount: number; // Ratings 9-10
  passivesCount: number; // Ratings 7-8
  detractorsCount: number; // Ratings 0-6
  totalResponses: number;
  performance: PerformanceLevel;
  percentages: {
    promoters: number;
    passives: number;
    detractors: number;
  };
}

export interface QuestionMetrics {
  questionId: number;
  questionText: string;
  questionOrder: number;
  csat: CSATMetrics;
  nps: NPSMetrics;
}

export interface SurveyAnalytics {
  surveyId: number;
  surveyName: string;
  totalRespondents: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  overall: {
    csat: CSATMetrics;
    nps: NPSMetrics;
  };
  questions: QuestionMetrics[];
  calculatedAt: Date;
}

// CRM Integration table
export const crmConfigs = pgTable("crm_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  crmType: varchar("crm_type", { length: 50 }).notNull(), // "zoho", "salesforce", "hubspot"
  authType: varchar("auth_type", { length: 50 }).notNull(), // "OAuth2", "JWT", "Self Client", etc.
  credentials: jsonb("credentials").notNull(), // Encrypted credentials stored as JSON
  isActive: boolean("is_active").default(true),
  lastTestedAt: timestamp("last_tested_at"),
  lastTestedStatus: varchar("last_tested_status", { length: 20 }), // "success", "failed"
  errorMessage: text("error_message"), // Store error if last test failed
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// CRM Sync logs for tracking operations
export const crmSyncLogs = pgTable("crm_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  configId: varchar("config_id").references(() => crmConfigs.id, { onDelete: "cascade" }),
  operation: varchar("operation", { length: 100 }).notNull(), // "sync_contacts", "sync_deals", etc.
  status: varchar("status", { length: 20 }).notNull(), // "pending", "running", "success", "failed"
  recordsProcessed: integer("records_processed").default(0),
  recordsSuccessful: integer("records_successful").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

// CRM Tags for categorizing contacts
export const crmTags = pgTable("crm_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crmConfigId: varchar("crm_config_id").references(() => crmConfigs.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#3b82f6"), // Hex color code for UI display
  category: varchar("category", { length: 50 }).default("general"), // "department", "location", "general"
  categoryValue: varchar("category_value", { length: 100 }), // Actual department/location name
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// CRM Contact Tags - Junction table to associate contacts with tags
export const crmContactTags = pgTable("crm_contact_tags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  crmConfigId: varchar("crm_config_id").references(() => crmConfigs.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id").references(() => crmTags.id, { onDelete: "cascade" }),
  contactId: varchar("contact_id"), // CRM's internal contact ID (nullable - can have phone/email instead)
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  metadata: jsonb("metadata"), // Store additional contact info for quick access
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Admin/audit support tables
export const userInvites = pgTable("user_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: varchar("token").notNull().unique(),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "set null" }),
  departmentId: varchar("department_id").references(() => departments.id, { onDelete: "set null" }),
  role: varchar("role", { length: 50 }).default("user"),
  invitedBy: varchar("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at"),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  targetType: varchar("target_type", { length: 50 }).notNull(),
  targetId: varchar("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-023: Permission System Foundation - Roles and Permissions
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isBuiltIn: boolean("is_built_in").default(false), // Built-in roles cannot be deleted
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// UM-023: Permission System Foundation - Permissions
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 100 }).notNull().unique(), // e.g., "survey.create", "user.delete"
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // e.g., "survey", "user", "organization"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-023: Role-Permission Association
export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-025: Permission Validation - User Roles
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-026: Permission Inheritance - Department Roles
export const departmentRoles = pgTable("department_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  departmentId: varchar("department_id").references(() => departments.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-027: Permission Violation Logging
export const permissionViolations = pgTable("permission_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  permissionCode: varchar("permission_code", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: varchar("resource_id"),
  violationType: varchar("violation_type", { length: 50 }).notNull(), // "access_denied", "permission_revoked"
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-028: Temporary Elevated Permissions
export const elevatedPermissions = pgTable("elevated_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").references(() => roles.id, { onDelete: "cascade" }),
  grantedBy: varchar("granted_by").references(() => users.id),
  grantReason: text("grant_reason"),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-034: Enhanced Activity Logging System
export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  organizationId: varchar("organization_id").references(() => organizations.id),
  departmentId: varchar("department_id").references(() => departments.id),
  action: varchar("action", { length: 100 }).notNull(), // e.g., "survey.created", "user.updated"
  actionType: varchar("action_type", { length: 50 }).notNull(), // "create", "read", "update", "delete", "export"
  resourceType: varchar("resource_type", { length: 50 }).notNull(), // "survey", "user", "organization"
  resourceId: varchar("resource_id"),
  resourceName: varchar("resource_name"),
  details: jsonb("details"), // Additional context and changes
  status: varchar("status", { length: 20 }).default("success"), // "success", "failed"
  errorMessage: text("error_message"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-035: Authentication Event Logging
export const authenticationEvents = pgTable("authentication_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  username: varchar("username", { length: 100 }),
  eventType: varchar("event_type", { length: 50 }).notNull(), // "login", "logout", "login_failed", "password_reset", "mfa_challenge"
  status: varchar("status", { length: 20 }).notNull(), // "success", "failed", "pending"
  failureReason: varchar("failure_reason", { length: 100 }), // e.g., "invalid_password", "account_locked"
  authMethod: varchar("auth_method", { length: 50 }).default("password"), // "password", "mfa", "sso", "api_key"
  sessionId: varchar("session_id"),
  ipAddress: varchar("ip_address", { length: 50 }).notNull(),
  userAgent: text("user_agent"),
  location: varchar("location", { length: 200 }), // Geo-location info
  deviceInfo: jsonb("device_info"), // Device details from user agent parsing
  mfaUsed: boolean("mfa_used").default(false),
  riskLevel: varchar("risk_level", { length: 20 }).default("low"), // "low", "medium", "high", "critical"
  createdAt: timestamp("created_at").default(sql`now()`),
});

// UM-021: Bulk User Import
export const userImportBatches = pgTable("user_import_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  importedBy: varchar("imported_by").references(() => users.id),
  totalRecords: integer("total_records").notNull(),
  successfulRecords: integer("successful_records").default(0),
  failedRecords: integer("failed_records").default(0),
  status: varchar("status", { length: 20 }).default("pending"), // "pending", "processing", "completed", "failed"
  fileUrl: varchar("file_url"), // S3 or storage URL
  errorLog: jsonb("error_log"), // Array of errors for failed records
  createdAt: timestamp("created_at").default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

// UM-022: Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  ipAddress: varchar("ip_address", { length: 50 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export interface AnalyticsFilter {
  surveyId: number;
  questionId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  respondentId?: string;
}
// SSO Providers table (UM-035 to UM-038)
export const ssoProviders = pgTable("sso_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'oauth2', 'saml', 'ldap'
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret"),
  endpoint: text("endpoint"),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Permission Groups table (UM-039 to UM-043)
export const permissionGroups = pgTable("permission_groups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  permissions: jsonb("permissions").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Role Hierarchy table (UM-039 to UM-043)
export const roleHierarchy = pgTable("role_hierarchy", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  parentRoleId: varchar("parent_role_id").references(() => roleHierarchy.id, { onDelete: "set null" }),
  level: integer("level").default(1),
  permissions: jsonb("permissions").default(sql`'[]'::jsonb`),
  delegatedRoles: jsonb("delegated_roles").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Onboarding Progress table (UM-051 to UM-053)
export const onboardingProgress = pgTable("onboarding_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  stepId: varchar("step_id", { length: 50 }).notNull(),
  isCompleted: boolean("is_completed").default(false),
  isSkipped: boolean("is_skipped").default(false),
  completedAt: timestamp("completed_at"),
  skippedAt: timestamp("skipped_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Data Transfer Jobs table (UM-048 to UM-050)
export const dataTransferJobs = pgTable("data_transfer_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  type: varchar("type", { length: 50 }).notNull(), // 'import' | 'export'
  filename: text("filename").notNull(),
  format: varchar("format", { length: 50 }).default("csv"),
  status: varchar("status", { length: 50 }).default("pending"), // 'pending', 'processing', 'completed', 'failed'
  totalRows: integer("total_rows").default(0),
  processedRows: integer("processed_rows").default(0),
  failedRows: integer("failed_rows").default(0),
  errorMessage: text("error_message"),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").default(sql`now()`),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Sessions table
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  device: varchar("device", { length: 100 }),
  lastActivity: timestamp("last_activity").default(sql`now()`),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
  expiresAt: timestamp("expires_at"),
});

// Reports table (AN-033)
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  surveyId: integer("survey_id").references(() => analyticsSurveys.surveyId, { onDelete: "set null" }), // Link to analytics survey
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  chartConfigs: jsonb("chart_configs").default(sql`'[]'::jsonb`), // Array of selected charts
  filterConfigs: jsonb("filter_configs").default(sql`'[]'::jsonb`), // Array of filters
  layout: varchar("layout", { length: 50 }).default("grid"),
  isTemplate: boolean("is_template").default(false),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  archivedAt: timestamp("archived_at"),
});

// Report Schedules (AN-034, AN-035)
export const reportSchedules = pgTable("report_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  frequency: varchar("frequency", { length: 50 }).notNull(), // 'daily', 'weekly', 'monthly', 'quarterly'
  dayOfWeek: integer("day_of_week"), // 0-6 for weekly
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly
  timeOfDay: varchar("time_of_day").default("09:00:00"),
  recipients: jsonb("recipients").default(sql`'[]'::jsonb`), // Array of emails
  isEnabled: boolean("is_enabled").default(true),
  lastSentAt: timestamp("last_sent_at"),
  nextSendAt: timestamp("next_send_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Report Archives (AN-036)
export const reportArchives = pgTable("report_archives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  scheduleId: varchar("schedule_id").references(() => reportSchedules.id, { onDelete: "set null" }),
  generatedBy: varchar("generated_by").references(() => users.id, { onDelete: "set null" }),
  fileUrl: text("file_url").notNull(),
  fileFormat: varchar("file_format", { length: 50 }).default("pdf"),
  fileSizeBytes: integer("file_size_bytes"),
  generatedAt: timestamp("generated_at").default(sql`now()`),
  expiresAt: timestamp("expires_at").default(sql`now() + INTERVAL '365 days'`),
  downloadCount: integer("download_count").default(0),
  lastDownloadedAt: timestamp("last_downloaded_at"),
});

// Export Jobs (AN-040, AN-041)
export const exportJobs = pgTable("export_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  exportType: varchar("export_type", { length: 50 }).notNull(), // 'survey_data', 'responses', 'analytics'
  format: varchar("format", { length: 50 }).notNull(), // 'csv', 'excel', 'json'
  includeHeaders: boolean("include_headers").default(true),
  filters: jsonb("filters"),
  status: varchar("status", { length: 20 }).default("pending"), // 'pending', 'processing', 'completed', 'failed'
  fileUrl: text("file_url"),
  fileSizeBytes: integer("file_size_bytes"),
  totalRecords: integer("total_records").default(0),
  processedRecords: integer("processed_records").default(0),
  errorMessage: text("error_message"),
  progressPercentage: integer("progress_percentage").default(0),
  createdAt: timestamp("created_at").default(sql`now()`),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at").default(sql`now() + INTERVAL '30 days'`),
  downloadCount: integer("download_count").default(0),
  lastDownloadedAt: timestamp("last_downloaded_at"),
});

// Benchmarks (AN-042, AN-043)
export const benchmarks = pgTable("benchmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  benchmarkType: varchar("benchmark_type", { length: 50 }).notNull(), // 'industry', 'department', 'custom'
  metricName: varchar("metric_name", { length: 255 }).notNull(),
  industrySegment: varchar("industry_segment", { length: 100 }),
  companySize: varchar("company_size", { length: 50 }), // 'small', 'medium', 'enterprise'
  percentile25: numeric("percentile_25", { precision: 5, scale: 2 }),
  percentile50: numeric("percentile_50", { precision: 5, scale: 2 }),
  percentile75: numeric("percentile_75", { precision: 5, scale: 2 }),
  percentile90: numeric("percentile_90", { precision: 5, scale: 2 }),
  meanValue: numeric("mean_value", { precision: 10, scale: 2 }),
  stdDeviation: numeric("std_deviation", { precision: 10, scale: 2 }),
  minValue: numeric("min_value", { precision: 10, scale: 2 }),
  maxValue: numeric("max_value", { precision: 10, scale: 2 }),
  sampleSize: integer("sample_size"),
  dataSource: varchar("data_source", { length: 100 }),
  lastUpdatedAt: timestamp("last_updated_at"),
  validFrom: timestamp("valid_from").default(sql`now()`),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Benchmark Comparisons (AN-043)
export const benchmarkComparisons = pgTable("benchmark_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  benchmarkId: varchar("benchmark_id").references(() => benchmarks.id, { onDelete: "set null" }),
  metricName: varchar("metric_name", { length: 255 }).notNull(),
  organizationValue: numeric("organization_value", { precision: 10, scale: 2 }),
  benchmarkValue: numeric("benchmark_value", { precision: 10, scale: 2 }),
  percentileRank: integer("percentile_rank"),
  comparisonDate: timestamp("comparison_date").default(sql`now()`),
  trendDirection: varchar("trend_direction", { length: 20 }), // 'up', 'down', 'stable'
  improvementPotential: numeric("improvement_potential", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// ============================================================
// DASHBOARD ANALYSIS TABLES - AI-Generated Insights
// ============================================================// ============================================================
// DASHBOARD ANALYSIS TABLES - AI-Generated Insights
// ============================================================

// 1. Trends Analysis Table
export const trendsAnalysis = pgTable("trends_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }),

  // Metric details
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }),
  previousValue: numeric("previous_value", { precision: 10, scale: 2 }),
  changePercentage: numeric("change_percentage", { precision: 10, scale: 2 }),
  trendDirection: varchar("trend_direction", { length: 20 }), // "increasing", "decreasing", "stable"

  // Analysis
  summary: text("summary"), // AI-generated summary of the trend
  keyInsights: jsonb("key_insights"), // Array of key insights
  predictions: jsonb("predictions"), // Future predictions

  // Time period
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// 2. Executive Summary Table
export const executiveSummary = pgTable("executive_summary", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }),

  // Summary Scores
  overallScore: numeric("overall_score", { precision: 5, scale: 2 }),
  performanceRating: varchar("performance_rating", { length: 50 }), // "Excellent", "Good", etc.
  csatScore: numeric("csat_score", { precision: 5, scale: 2 }), // Customer Satisfaction
  npsScore: numeric("nps_score", { precision: 5, scale: 2 }), // Net Promoter Score
  eviScore: numeric("evi_score", { precision: 5, scale: 2 }), // Employee Value Index or similar

  // Executive Summary Text
  executiveSummaryText: text("executive_summary_text"), // High-level summary for executives

  // Key Points
  topStrengths: jsonb("top_strengths"), // Array of top strengths
  mainChallenges: jsonb("main_challenges"), // Array of main challenges
  recommendations: jsonb("recommendations"), // Array of recommendations

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// 3. Action Plans Table
export const actionPlans = pgTable("action_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  // responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }),

  // Action details
  actionTitle: varchar("action_title", { length: 255 }).notNull(),
  actionDescription: text("action_description"),
  priority: varchar("priority", { length: 20 }), // "Critical", "High", "Medium", "Low"
  category: varchar("category", { length: 100 }), // Type of action
  owner: varchar("owner", { length: 100 }), // Who is responsible
  dueDate: date("due_date"),

  // Impact
  estimatedImpact: varchar("estimated_impact", { length: 50 }), // "High", "Medium", "Low"
  status: varchar("status", { length: 50 }), // "Not Started", "In Progress", "Completed"
  successMetrics: jsonb("success_metrics"), // How to measure success

  // Implementation
  relatedInsights: jsonb("related_insights"), // Linked insights from analysis
  implementationSteps: jsonb("implementation_steps"), // Array of steps to implement

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// 4. Leadership Dashboard Table
export const leadershipInsights = pgTable("leadership_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  // responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }),

  // Insight details
  insight: text("insight").notNull(), // The strategic insight
  businessImpact: text("business_impact"), // How this impacts business
  strategyAlignment: varchar("strategy_alignment", { length: 100 }), // Alignment with company strategy
  affectedCount: integer("affected_count"), // Number of people/processes affected
  potentialRevenue: numeric("potential_revenue", { precision: 15, scale: 2 }), // Revenue impact
  riskLevel: varchar("risk_level", { length: 50 }), // "Critical", "High", "Medium", "Low"

  // Recommendations
  leadershipRecommendations: jsonb("leadership_recommendations"), // Array of recommendations
  successFactors: jsonb("success_factors"), // Key success factors
  stakeholders: jsonb("stakeholders"), // Key stakeholders involved
  teamMetrics: jsonb("team_metrics"), // Engagement, response rate, etc.
  mainChallenges: jsonb("main_challenges"), // Array of challenges
  teamBuildingActivities: jsonb("team_building_activities"), // Recommended activities

  // New fields for enhanced features
  coaching: jsonb("coaching"), // Array of coaching recommendations
  recognitionOpportunities: jsonb("recognition_opportunities"), // Array of recognition suggestions
  performanceHabits: jsonb("performance_habits"), // Top performing habits
  cultureIndicators: jsonb("culture_indicators"), // Culture health indicators
  trends: jsonb("trends"), // Trends analysis over time
  departmentId: varchar("department_id").references(() => departments.id), // Team/department this insight belongs to

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Action Items - Track recommendations and their status
export const actionItems = pgTable("action_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }),
  insightId: varchar("insight_id").references(() => leadershipInsights.id, { onDelete: "cascade" }),

  // Action details
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull(), // "coaching", "recognition", "performance", "culture"
  priority: varchar("priority", { length: 20 }).notNull(), // "low", "medium", "high", "critical"

  // Assignment and tracking
  assignedTo: varchar("assigned_to").references(() => users.id),
  departmentId: varchar("department_id").references(() => departments.id),
  status: varchar("status", { length: 20 }).default("pending"), // "pending", "in_progress", "completed", "cancelled"

  // Timeline
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),

  // Evidence and impact
  evidenceCount: integer("evidence_count"), // Number of responses supporting this action
  expectedImpact: text("expected_impact"),
  actualImpact: text("actual_impact"), // Filled in after completion

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Recognition Templates - Pre-written templates for different recognition scenarios
export const recognitionTemplates = pgTable("recognition_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Template details
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }).notNull(), // "peer", "manager", "milestone", "values", "performance"
  template: text("template").notNull(), // Template text with {{placeholders}}

  // Usage and effectiveness
  usageCount: integer("usage_count").default(0),
  averageRating: numeric("average_rating", { precision: 3, scale: 2 }),

  isPublic: boolean("is_public").default(true),
  createdBy: varchar("created_by").references(() => users.id),

  createdAt: timestamp("created_at").default(sql`now()`),
});

// HR Interventions - Track organization-wide interventions and their ROI
export const interventions = pgTable("interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Intervention details
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // "training", "policy_change", "team_building", "process_improvement"

  // Scope
  scope: varchar("scope", { length: 20 }).notNull(), // "organization", "department", "team"
  targetDepartments: jsonb("target_departments"), // Array of department IDs

  // Priority and impact
  priority: varchar("priority", { length: 20 }).notNull(), // "low", "medium", "high", "critical"
  urgency: varchar("urgency", { length: 20 }).notNull(), // "low", "medium", "high", "immediate"
  expectedImpact: varchar("expected_impact", { length: 20 }), // "low", "medium", "high", "transformational"

  // Evidence
  basedOnSurveys: jsonb("based_on_surveys"), // Array of survey IDs
  evidenceCount: integer("evidence_count"), // Number of responses supporting this
  affectedEmployees: integer("affected_employees"), // Number of employees impacted

  // Ownership and status
  ownedBy: varchar("owned_by").references(() => users.id), // HR/Culture team member
  status: varchar("status", { length: 20 }).default("planned"), // "planned", "in_progress", "completed", "on_hold"

  // Timeline and budget
  startDate: timestamp("start_date"),
  completedAt: timestamp("completed_at"),
  estimatedCost: numeric("estimated_cost", { precision: 15, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 15, scale: 2 }),

  // ROI tracking
  baselineMetrics: jsonb("baseline_metrics"), // Metrics before intervention
  followUpMetrics: jsonb("follow_up_metrics"), // Metrics after intervention
  roi: numeric("roi", { precision: 10, scale: 2 }), // Return on investment percentage

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Standalone Action Planning - For manual action plan creation and tracking
export const actionPlannings = pgTable("action_planning", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Basic info
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  
  // Assignment and tracking
  assignedTo: varchar("assigned_to").references(() => employees.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  
  // Status tracking
  status: varchar("status", { length: 50 }).default("todo"), // 'todo', 'in_progress', 'completed', 'review'
  priority: varchar("priority", { length: 50 }).default("medium"), // 'low', 'medium', 'high', 'critical'
  
  // Timeline
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
  
  // Organization context
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // Metadata
  tags: jsonb("tags"), // Array of tags for filtering
  commentsCount: integer("comments_count").default(0),
  attachmentsCount: integer("attachments_count").default(0),
});

// Action Plan Comments Table
export const actionPlanComments = pgTable("action_plan_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionPlanId: varchar("action_plan_id").references(() => actionPlannings.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Action Plan Attachments Table
export const actionPlanAttachments = pgTable("action_plan_attachments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actionPlanId: varchar("action_plan_id").references(() => actionPlannings.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  fileType: varchar("file_type", { length: 100 }),
  displayName: varchar("display_name", { length: 255 }),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Department NPS Tracking Table
export const departmentNps = pgTable("department_nps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Department reference
  departmentId: varchar("department_id").references(() => departments.id, { onDelete: "cascade" }),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  
  // NPS metrics
  npsScore: numeric("nps_score", { precision: 5, scale: 2 }), // Net Promoter Score (-100 to 100)
  promoters: integer("promoters").default(0), // Count of promoters (9-10)
  passives: integer("passives").default(0), // Count of passives (7-8)
  detractors: integer("detractors").default(0), // Count of detractors (0-6)
  totalResponses: integer("total_responses").default(0), // Total responses
  
  // Period tracking
  periodMonth: integer("period_month"), // Month (1-12)
  periodYear: integer("period_year"), // Year
  
  // Timestamps
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// 5. Monitoring Metrics Table
export const monitoringMetrics = pgTable("monitoring_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }),

  // Monitored Metric
  metricName: varchar("metric_name", { length: 100 }).notNull(),
  currentValue: numeric("current_value", { precision: 10, scale: 2 }),
  targetValue: numeric("target_value", { precision: 10, scale: 2 }),
  thresholdMin: numeric("threshold_min", { precision: 10, scale: 2 }),
  thresholdMax: numeric("threshold_max", { precision: 10, scale: 2 }),

  // Alert System
  alertStatus: varchar("alert_status", { length: 50 }), // "ok", "warning", "critical"
  isAnomalous: boolean("is_anomalous").default(false),
  anomalyType: varchar("anomaly_type", { length: 100 }), // Type of anomaly detected

  // Health Check
  healthScore: numeric("health_score", { precision: 5, scale: 2 }),
  trendIndicator: varchar("trend_indicator", { length: 20 }), // "improving", "declining", "stable"

  // Recommendations
  recommendedActions: jsonb("recommended_actions"), // Array of actions to take
  historicalData: jsonb("historical_data"), // Historical values for charting

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// 6. Segmentation Analysis Table
export const segmentationAnalysis = pgTable("segmentation_analysis", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }),

  // Segment details
  segmentName: varchar("segment_name", { length: 100 }).notNull(),
  segmentDescription: text("segment_description"),
  segmentSize: integer("segment_size"), // Number of customers in segment
  percentageOfTotal: numeric("percentage_of_total", { precision: 5, scale: 2 }),

  // Segment Characteristics
  demographics: jsonb("demographics"), // Age, location, etc.
  behaviors: jsonb("behaviors"), // Purchase patterns, usage, etc.
  preferences: jsonb("preferences"), // What this segment prefers

  // Performance
  segmentScore: numeric("segment_score", { precision: 5, scale: 2 }),
  satisfaction: varchar("satisfaction", { length: 50 }), // High/Medium/Low
  engagement: varchar("engagement", { length: 50 }), // High/Medium/Low

  // Recommendations
  tailoredRecommendations: jsonb("tailored_recommendations"), // Segment-specific recommendations
  marketingStrategy: jsonb("marketing_strategy"), // How to market to this segment
  retentionRisk: varchar("retention_risk", { length: 50 }), // Risk of losing segment

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Template Surveys Table (USER REQUESTED)
export const surveyTemplates = pgTable("survey_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull().default(sql`'[]'::jsonb`),
  category: varchar("category", { length: 50 }), // e.g., "HR", "Customer", "Product"
  isPublic: boolean("is_public").default(false), // If we want shared templates later
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Survey Schedules Table
export const surveySchedules = pgTable("survey_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),

  // CRM Configuration
  crmConfigId: varchar("crm_config_id").references(() => crmConfigs.id, { onDelete: "set null" }),
  crmTableName: varchar("crm_table_name", { length: 255 }),
  crmColumnName: varchar("crm_column_name", { length: 255 }),

  // Contact Methods (multi-select: whatsapp, voiceagent, email)
  contactMethods: jsonb("contact_methods").notNull().default(sql`'[]'::jsonb`), // Array: ["whatsapp", "voiceagent", "email"]

  // Schedule Details
  scheduleStartDate: timestamp("schedule_start_date").notNull(), // When to start sending
  scheduleEndDate: timestamp("schedule_end_date").notNull(), // When to stop sending
  scheduledAt: timestamp("scheduled_at").notNull(), // Specific time to execute (for backward compatibility)
  timezone: varchar("timezone", { length: 10 }).notNull().default("UTC"), // "UTC" or "IST"

  // Day-Based Scheduling (NEW)
  scheduleType: varchar("schedule_type", { length: 20 }).default("absolute_date"), // "absolute_date" | "days_after_event"
  referenceDateColumn: varchar("reference_date_column", { length: 255 }), // CRM column with reference date (e.g., "joining_date")
  daysAfterReference: integer("days_after_reference"), // Days after reference date (e.g., 1, 30, 60, 90)
  isRecurring: boolean("is_recurring").default(false), // Whether this schedule repeats
  recurrencePattern: jsonb("recurrence_pattern").default(sql`'[]'::jsonb`), // Array of day intervals: [1, 30, 60, 90]

  // Status
  status: varchar("status", { length: 20 }).default("pending"), // "pending" | "processing" | "completed" | "failed" | "cancelled"

  // Execution
  executedAt: timestamp("executed_at"),
  recipientCount: integer("recipient_count").default(0),
  successCount: integer("success_count").default(0),
  failureCount: integer("failure_count").default(0),
  errorMessage: text("error_message"),

  // Metadata
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// High-Risk Indicator Detection Batches
export const riskDetectionBatches = pgTable("risk_detection_batches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // "pending" | "processing" | "completed" | "failed"
  totalResponses: integer("total_responses").notNull(), // Total responses to process
  processedResponses: integer("processed_responses").default(0), // Number of responses processed so far
  riskDetectedCount: integer("risk_detected_count").default(0), // Count of responses with risks detected
  criticalRiskCount: integer("critical_risk_count").default(0), // Count of critical risks
  highRiskCount: integer("high_risk_count").default(0), // Count of high risks
  mediumRiskCount: integer("medium_risk_count").default(0), // Count of medium risks
  lowRiskCount: integer("low_risk_count").default(0), // Count of low risks

  // Batch configuration
  batchSize: integer("batch_size").default(50), // Process 50 responses at a time
  currentBatchNumber: integer("current_batch_number").default(0), // Which batch we're on

  // Results and Summary
  summary: jsonb("summary"), // Overall findings: {categories: [], topIndicators: [], recommendations: []}
  errorMessage: text("error_message"),

  // Tracking
  startedAt: timestamp("started_at").default(sql`now()`),
  completedAt: timestamp("completed_at"),
  createdBy: varchar("created_by").references(() => users.id),

  // UI flags
  hasBeenReviewed: boolean("has_been_reviewed").default(false),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
});

// Risk Detection Results for individual responses
export const riskDetectionResults = pgTable("risk_detection_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  batchId: varchar("batch_id").references(() => riskDetectionBatches.id, { onDelete: "cascade" }).notNull(),
  responseId: varchar("response_id").references(() => responses.id, { onDelete: "cascade" }).notNull(),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }).notNull(),

  // Risk Analysis
  hasRisks: boolean("has_risks").notNull().default(false),
  riskLevel: varchar("risk_level", { length: 20 }).notNull().default("none"), // "critical" | "high" | "medium" | "low" | "none"
  riskScore: integer("risk_score").notNull().default(0), // 0-100

  // Detailed Detection Results
  riskCategories: jsonb("risk_categories"), // Array: ["depression", "anxiety", "financial_stress", "relationship_issues", "health_concerns", "other"]
  riskIndicators: jsonb("risk_indicators"), // Array of {indicator, confidence (0-100), quote: ""}
  riskAnalysis: text("risk_analysis"), // Summary of findings
  recommendations: jsonb("recommendations"), // Array of recommended actions

  // OpenText fields analyzed
  analyzedComments: jsonb("analyzed_comments"), // Which comment fields were analyzed

  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Types (Moved from line 213)
export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Department = typeof departments.$inferSelect;
export type Survey = typeof surveys.$inferSelect;
export type Response = typeof responses.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type FeedbackAnalytics = typeof feedbackAnalytics.$inferSelect;
export type StructuredOutput = typeof structuredOutputs.$inferSelect;
export type AnalyticsSurvey = typeof analyticsSurveys.$inferSelect;
export type SurveyQuestion = typeof surveyQuestions.$inferSelect;
export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type SurveyMetric = typeof surveyMetrics.$inferSelect;
export type WatiSession = typeof watiSessions.$inferSelect;
export type UserInvite = typeof userInvites.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Permission = typeof permissions.$inferSelect;
export type RolePermission = typeof rolePermissions.$inferSelect;
export type UserRole = typeof userRoles.$inferSelect;
export type DepartmentRole = typeof departmentRoles.$inferSelect;
export type PermissionViolation = typeof permissionViolations.$inferSelect;
export type ElevatedPermission = typeof elevatedPermissions.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type AuthenticationEvent = typeof authenticationEvents.$inferSelect;
export type UserImportBatch = typeof userImportBatches.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type ReportSchedule = typeof reportSchedules.$inferSelect;
export type ReportArchive = typeof reportArchives.$inferSelect;
export type ExportJob = typeof exportJobs.$inferSelect;
export type Benchmark = typeof benchmarks.$inferSelect;
export type BenchmarkComparison = typeof benchmarkComparisons.$inferSelect;
export type SurveyTemplate = typeof surveyTemplates.$inferSelect;
export type SurveySchedule = typeof surveySchedules.$inferSelect;
export type RiskDetectionBatch = typeof riskDetectionBatches.$inferSelect;
export type RiskDetectionResult = typeof riskDetectionResults.$inferSelect;
export type ActionPlanning = typeof actionPlannings.$inferSelect;

// Insert Types
export type InsertUser = typeof users.$inferInsert;
export type InsertOrganization = typeof organizations.$inferInsert;
export type InsertDepartment = typeof departments.$inferInsert;
export type InsertSurvey = typeof surveys.$inferInsert;
export type InsertResponse = typeof responses.$inferInsert;
export type InsertNotification = typeof notifications.$inferInsert;
export type InsertFeedbackAnalytics = typeof feedbackAnalytics.$inferInsert;
export type InsertStructuredOutput = typeof structuredOutputs.$inferInsert;
export type InsertAnalyticsSurvey = typeof analyticsSurveys.$inferInsert;
export type InsertSurveyQuestion = typeof surveyQuestions.$inferInsert;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;
export type InsertSurveyMetric = typeof surveyMetrics.$inferInsert;
export type InsertWatiSession = typeof watiSessions.$inferInsert;
export type InsertUserInvite = typeof userInvites.$inferInsert;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type InsertRole = typeof roles.$inferInsert;
export type InsertPermission = typeof permissions.$inferInsert;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
export type InsertUserRole = typeof userRoles.$inferInsert;
export type InsertDepartmentRole = typeof departmentRoles.$inferInsert;
export type InsertPermissionViolation = typeof permissionViolations.$inferInsert;
export type InsertElevatedPermission = typeof elevatedPermissions.$inferInsert;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type InsertAuthenticationEvent = typeof authenticationEvents.$inferInsert;
export type InsertUserImportBatch = typeof userImportBatches.$inferInsert;
export type InsertReport = typeof reports.$inferInsert;
export type InsertReportSchedule = typeof reportSchedules.$inferInsert;
export type InsertReportArchive = typeof reportArchives.$inferInsert;
export type InsertExportJob = typeof exportJobs.$inferInsert;
export type InsertBenchmark = typeof benchmarks.$inferInsert;
export type InsertBenchmarkComparison = typeof benchmarkComparisons.$inferInsert;
export type InsertSurveyTemplate = typeof surveyTemplates.$inferInsert;
export type InsertSurveySchedule = typeof surveySchedules.$inferInsert;
export type InsertRiskDetectionBatch = typeof riskDetectionBatches.$inferInsert;
export type InsertRiskDetectionResult = typeof riskDetectionResults.$inferInsert;
export type InsertActionPlanning = typeof actionPlannings.$inferInsert;
export type ActionPlanComment = typeof actionPlanComments.$inferSelect;
export type InsertActionPlanComment = typeof actionPlanComments.$inferInsert;
export type ActionPlanAttachment = typeof actionPlanAttachments.$inferSelect;
export type InsertActionPlanAttachment = typeof actionPlanAttachments.$inferInsert;
export type InsertActionItem = typeof actionItems.$inferInsert;
export type InsertRecognitionTemplate = typeof recognitionTemplates.$inferInsert;
export type InsertIntervention = typeof interventions.$inferInsert;

// Anonymous Feedback — survey responses with zero respondent identity
export const anonymousFeedback = pgTable("anonymous_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => surveys.id, { onDelete: "cascade" }),
  tagId: varchar("tag_id"),          // CRM tag used for distribution
  tagName: varchar("tag_name", { length: 100 }), // snapshot at send time
  answers: jsonb("answers").notNull(), // { questionId: answer } — same format as responses table
  channel: varchar("channel", { length: 20 }).default("email"), // "email" | "whatsapp" | "voice"
  submittedAt: timestamp("submitted_at").default(sql`now()`),
  // Intentionally NO email, NO name, NO userId, NO IP address
});

export type AnonymousFeedback = typeof anonymousFeedback.$inferSelect;
export type InsertAnonymousFeedback = typeof anonymousFeedback.$inferInsert;

// Assessment Periods - mid-year and end-year assessment window configuration
export const assessmentPeriods = pgTable("assessment_periods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // "mid_year" | "end_year" | "custom"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { length: 20 }).default("upcoming"), // "upcoming", "active", "completed", "closed"
  config: jsonb("config").default(sql`'{}'::jsonb`),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export type AssessmentPeriod = typeof assessmentPeriods.$inferSelect;
export type InsertAssessmentPeriod = typeof assessmentPeriods.$inferInsert;

// EVI Assessment — standalone Emotional Value Index submissions
export const eviAssessments = pgTable("evi_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  responses: jsonb("responses").notNull(), // { question: string, answer: string }[]
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const eviResults = pgTable("evi_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assessmentId: varchar("assessment_id").notNull().unique(),
  userId: text("user_id").notNull(),
  eviScore: numeric("evi_score", { precision: 4, scale: 1 }).notNull(), // 0.0–10.0
  zoneLabel: text("zone_label").notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export type EviAssessment = typeof eviAssessments.$inferSelect;
export type InsertEviAssessment = typeof eviAssessments.$inferInsert;
export type EviResult = typeof eviResults.$inferSelect;
export type InsertEviResult = typeof eviResults.$inferInsert;

// Daily LLM-synthesised insights — one row per org per day
export const dailyInsights = pgTable("daily_insights", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // "YYYY-MM-DD"
  topInsights: jsonb("top_insights").notNull().default(sql`'[]'::jsonb`), // { text: string }[]
  topRecommendations: jsonb("top_recommendations").notNull().default(sql`'[]'::jsonb`), // { text: string }[]
  responseCount: integer("response_count").default(0),
  processedAt: timestamp("processed_at").default(sql`now()`),
});

export type DailyInsight = typeof dailyInsights.$inferSelect;
export type InsertDailyInsight = typeof dailyInsights.$inferInsert;

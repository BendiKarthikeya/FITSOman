CREATE TABLE "activity_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"organization_id" varchar,
	"department_id" varchar,
	"action" varchar(100) NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar,
	"resource_name" varchar,
	"details" jsonb,
	"status" varchar(20) DEFAULT 'success',
	"error_message" text,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_surveys" (
	"survey_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analytics_surveys_survey_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_name" varchar(255) NOT NULL,
	"description" text,
	"total_respondents" integer DEFAULT 0 NOT NULL,
	"created_date" timestamp DEFAULT now(),
	"updated_date" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" varchar,
	"action" varchar(100) NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_id" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "authentication_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"username" varchar(100),
	"event_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"failure_reason" varchar(100),
	"auth_method" varchar(50) DEFAULT 'password',
	"session_id" varchar,
	"ip_address" varchar(50) NOT NULL,
	"user_agent" text,
	"location" varchar(200),
	"device_info" jsonb,
	"mfa_used" boolean DEFAULT false,
	"risk_level" varchar(20) DEFAULT 'low',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"crm_type" varchar(50) NOT NULL,
	"auth_type" varchar(50) NOT NULL,
	"credentials" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"last_tested_at" timestamp,
	"last_tested_status" varchar(20),
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_sync_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_id" varchar,
	"operation" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_successful" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "data_transfer_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"created_by" varchar,
	"type" varchar(50) NOT NULL,
	"filename" text NOT NULL,
	"format" varchar(50) DEFAULT 'csv',
	"status" varchar(50) DEFAULT 'pending',
	"total_rows" integer DEFAULT 0,
	"processed_rows" integer DEFAULT 0,
	"failed_rows" integer DEFAULT 0,
	"error_message" text,
	"file_url" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "department_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department_id" varchar,
	"role_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "elevated_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"role_id" varchar,
	"granted_by" varchar,
	"grant_reason" text,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "feedback_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" varchar,
	"response_id" varchar,
	"feedback_text" text NOT NULL,
	"sentiment" varchar(20) NOT NULL,
	"evi_score" integer NOT NULL,
	"nps_score" integer NOT NULL,
	"csat_score" integer NOT NULL,
	"emotions" jsonb NOT NULL,
	"insights" jsonb NOT NULL,
	"recommendations" jsonb NOT NULL,
	"ai_analysis" text,
	"category" varchar(50),
	"urgency" varchar(20),
	"customer_email" text,
	"customer_name" varchar,
	"user_id" varchar,
	"user_type" varchar(20) DEFAULT 'guest',
	"source" varchar(30) DEFAULT 'feedback_analyzer',
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"assigned_to" varchar,
	"status" varchar(20) DEFAULT 'open',
	"tags" jsonb
);
--> statement-breakpoint
CREATE TABLE "mfa_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"mfa_enabled" boolean DEFAULT false,
	"strict_password_policy" boolean DEFAULT false,
	"password_min_length" integer DEFAULT 8,
	"password_require_numbers" boolean DEFAULT true,
	"password_require_symbols" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "mfa_settings_organization_id_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"step_id" varchar(50) NOT NULL,
	"is_completed" boolean DEFAULT false,
	"is_skipped" boolean DEFAULT false,
	"completed_at" timestamp,
	"skipped_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"plan" varchar(50) DEFAULT 'professional',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "organizations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "permission_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permission_violations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"permission_code" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" varchar,
	"violation_type" varchar(50) NOT NULL,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" varchar,
	"respondent_email" text,
	"answers" jsonb NOT NULL,
	"evi_score" integer,
	"nps_score" integer,
	"csat_score" integer,
	"analysis_summary" text,
	"survey_completed" boolean,
	"total_questions_asked" integer,
	"overall_sentiment" varchar(20),
	"detailed_responses" jsonb,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_hierarchy" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" text NOT NULL,
	"parent_role_id" varchar,
	"level" integer DEFAULT 1,
	"permissions" jsonb DEFAULT '[]'::jsonb,
	"delegated_roles" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" varchar,
	"permission_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_built_in" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"organization_id" varchar NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device" varchar(100),
	"last_activity" timestamp DEFAULT now(),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "sso_providers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text,
	"endpoint" text,
	"enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "structured_outputs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"response_id" varchar,
	"call_id" varchar,
	"supervisor_review_needed" boolean DEFAULT false,
	"supervisor_review_reason" text,
	"customer_frustrated" boolean DEFAULT false,
	"frustration_indicators" text,
	"customer_sentiment" varchar(50),
	"sentiment_confidence" numeric(5, 2),
	"sentiment_keywords" text,
	"csat_score" integer,
	"csat_source" varchar(50),
	"raw_analysis" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_metrics" (
	"metric_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analytics_metrics_metric_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_id" integer NOT NULL,
	"question_id" integer,
	"csat_score" numeric(5, 2),
	"satisfied_count" integer DEFAULT 0 NOT NULL,
	"total_responses" integer DEFAULT 0 NOT NULL,
	"nps_score" numeric(5, 2),
	"promoters_count" integer DEFAULT 0 NOT NULL,
	"passives_count" integer DEFAULT 0 NOT NULL,
	"detractors_count" integer DEFAULT 0 NOT NULL,
	"score_5_count" integer DEFAULT 0 NOT NULL,
	"score_4_count" integer DEFAULT 0 NOT NULL,
	"score_3_count" integer DEFAULT 0 NOT NULL,
	"score_2_count" integer DEFAULT 0 NOT NULL,
	"score_1_count" integer DEFAULT 0 NOT NULL,
	"score_0_count" integer DEFAULT 0 NOT NULL,
	"csat_performance" varchar(50),
	"nps_performance" varchar(50),
	"calculation_date" timestamp DEFAULT now(),
	"date_range_start" timestamp,
	"date_range_end" timestamp
);
--> statement-breakpoint
CREATE TABLE "analytics_questions" (
	"question_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analytics_questions_question_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_id" integer NOT NULL,
	"question_text" text NOT NULL,
	"question_order" integer NOT NULL,
	"created_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics_responses" (
	"response_id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "analytics_responses_response_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"survey_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"respondent_id" varchar(255) NOT NULL,
	"original_score" numeric(10, 2) NOT NULL,
	"normalized_score_5" integer NOT NULL,
	"normalized_score_10" integer NOT NULL,
	"response_date" timestamp DEFAULT now(),
	"session_id" varchar(255),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"questions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_import_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar,
	"imported_by" varchar,
	"total_records" integer NOT NULL,
	"successful_records" integer DEFAULT 0,
	"failed_records" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'pending',
	"file_url" varchar,
	"error_log" jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_invites" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"token" varchar NOT NULL,
	"organization_id" varchar,
	"department_id" varchar,
	"role" varchar(50) DEFAULT 'user',
	"invited_by" varchar,
	"expires_at" timestamp,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"role_id" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"organization_id" varchar,
	"department_id" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wati_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" varchar,
	"phone_number" varchar NOT NULL,
	"current_question_index" integer DEFAULT 0,
	"status" varchar DEFAULT 'active',
	"answers" jsonb,
	"language" varchar DEFAULT 'en',
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authentication_events" ADD CONSTRAINT "authentication_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_configs" ADD CONSTRAINT "crm_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_sync_logs" ADD CONSTRAINT "crm_sync_logs_config_id_crm_configs_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."crm_configs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_transfer_jobs" ADD CONSTRAINT "data_transfer_jobs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_transfer_jobs" ADD CONSTRAINT "data_transfer_jobs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_roles" ADD CONSTRAINT "department_roles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_roles" ADD CONSTRAINT "department_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevated_permissions" ADD CONSTRAINT "elevated_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevated_permissions" ADD CONSTRAINT "elevated_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "elevated_permissions" ADD CONSTRAINT "elevated_permissions_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_analytics" ADD CONSTRAINT "feedback_analytics_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_analytics" ADD CONSTRAINT "feedback_analytics_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_analytics" ADD CONSTRAINT "feedback_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_analytics" ADD CONSTRAINT "feedback_analytics_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mfa_settings" ADD CONSTRAINT "mfa_settings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_groups" ADD CONSTRAINT "permission_groups_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_violations" ADD CONSTRAINT "permission_violations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_hierarchy" ADD CONSTRAINT "role_hierarchy_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_hierarchy" ADD CONSTRAINT "role_hierarchy_parent_role_id_role_hierarchy_id_fk" FOREIGN KEY ("parent_role_id") REFERENCES "public"."role_hierarchy"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sso_providers" ADD CONSTRAINT "sso_providers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "structured_outputs" ADD CONSTRAINT "structured_outputs_response_id_responses_id_fk" FOREIGN KEY ("response_id") REFERENCES "public"."responses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_metrics" ADD CONSTRAINT "analytics_metrics_survey_id_analytics_surveys_survey_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."analytics_surveys"("survey_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_metrics" ADD CONSTRAINT "analytics_metrics_question_id_analytics_questions_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."analytics_questions"("question_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_questions" ADD CONSTRAINT "analytics_questions_survey_id_analytics_surveys_survey_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."analytics_surveys"("survey_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_responses" ADD CONSTRAINT "analytics_responses_survey_id_analytics_surveys_survey_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."analytics_surveys"("survey_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_responses" ADD CONSTRAINT "analytics_responses_question_id_analytics_questions_question_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."analytics_questions"("question_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_import_batches" ADD CONSTRAINT "user_import_batches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_import_batches" ADD CONSTRAINT "user_import_batches_imported_by_users_id_fk" FOREIGN KEY ("imported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wati_sessions" ADD CONSTRAINT "wati_sessions_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE no action ON UPDATE no action;
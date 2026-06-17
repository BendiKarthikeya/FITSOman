-- Advanced Analytics Features Migration
-- Adds tables for trend analysis, sentiment tracking, segmentation, executive summaries,
-- action plans, leadership enablement, and monitoring

-- ==========================================
-- TREND ANALYSIS & SENTIMENT TRACKING
-- ==========================================

-- Store trend analysis results over time
CREATE TABLE IF NOT EXISTS analytics_trends (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR,
  metric_type VARCHAR(50) NOT NULL, -- 'csat', 'nps', 'engagement', 'sentiment'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  
  -- Trend metrics
  current_value NUMERIC(10,2) NOT NULL,
  previous_value NUMERIC(10,2),
  change_value NUMERIC(10,2),
  change_percentage NUMERIC(10,2),
  trend_direction VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
  
  -- Statistical significance
  is_significant BOOLEAN DEFAULT false,
  confidence_level NUMERIC(5,2),
  
  -- Segmentation
  segment_type VARCHAR(50), -- 'department', 'location', 'role', 'overall'
  segment_value VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_analytics_trends_survey ON analytics_trends(survey_id);
CREATE INDEX idx_analytics_trends_period ON analytics_trends(period_start, period_end);
CREATE INDEX idx_analytics_trends_segment ON analytics_trends(segment_type, segment_value);

-- ==========================================
-- SENTIMENT ANALYSIS
-- ==========================================

CREATE TABLE IF NOT EXISTS sentiment_analysis (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR,
  response_id VARCHAR,
  question_id VARCHAR,
  
  -- Sentiment scores
  sentiment_label VARCHAR(20) NOT NULL, -- 'positive', 'negative', 'neutral', 'mixed'
  sentiment_score NUMERIC(5,4), -- -1 to 1
  confidence NUMERIC(5,4), -- 0 to 1
  
  -- Emotional analysis
  emotions JSONB, -- {joy: 0.8, anger: 0.1, sadness: 0.05, etc.}
  key_phrases JSONB, -- Array of important phrases
  topics JSONB, -- Detected topics/themes
  
  -- Text analysis
  text_analyzed TEXT,
  word_count INTEGER,
  
  -- Segmentation
  department_id VARCHAR,
  location VARCHAR(200),
  user_role VARCHAR(50),
  
  analyzed_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sentiment_survey ON sentiment_analysis(survey_id);
CREATE INDEX idx_sentiment_response ON sentiment_analysis(response_id);
CREATE INDEX idx_sentiment_label ON sentiment_analysis(sentiment_label);
CREATE INDEX idx_sentiment_department ON sentiment_analysis(department_id);

-- ==========================================
-- ENGAGEMENT DRIVERS
-- ==========================================

CREATE TABLE IF NOT EXISTS engagement_drivers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Driver identification
  driver_name VARCHAR(255) NOT NULL,
  driver_category VARCHAR(100) NOT NULL, -- 'leadership', 'culture', 'compensation', 'growth', etc.
  impact_score NUMERIC(5,2), -- 0 to 100
  correlation_coefficient NUMERIC(5,4), -- -1 to 1
  
  -- Statistical analysis
  sample_size INTEGER,
  statistical_significance NUMERIC(5,4),
  
  -- Related metrics
  related_questions JSONB, -- Array of question IDs
  affected_segments JSONB, -- Departments/roles most affected
  
  -- Insights
  description TEXT,
  recommendation TEXT,
  
  -- Segmentation
  segment_type VARCHAR(50),
  segment_value VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_engagement_drivers_survey ON engagement_drivers(survey_id);
CREATE INDEX idx_engagement_drivers_impact ON engagement_drivers(impact_score DESC);

-- ==========================================
-- EXECUTIVE SUMMARIES
-- ==========================================

CREATE TABLE IF NOT EXISTS executive_summaries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Summary metadata
  title VARCHAR(500) NOT NULL,
  generated_for VARCHAR(100), -- 'overall', 'department', 'location', etc.
  segment_value VARCHAR(255),
  
  -- Key findings
  key_findings JSONB, -- Array of key insights
  strengths JSONB, -- Areas performing well
  improvement_areas JSONB, -- Areas needing attention
  critical_issues JSONB, -- Urgent concerns
  
  -- Metrics overview
  overall_score NUMERIC(10,2),
  participation_rate NUMERIC(5,2),
  response_count INTEGER,
  
  -- Trend summary
  trend_summary TEXT,
  major_changes JSONB,
  
  -- Recommendations snapshot
  top_recommendations JSONB,
  
  -- Engagement
  generated_by VARCHAR, -- user_id
  viewed_by JSONB, -- Array of user IDs who viewed
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_executive_summaries_survey ON executive_summaries(survey_id);
CREATE INDEX idx_executive_summaries_period ON executive_summaries(period_start, period_end);
CREATE INDEX idx_executive_summaries_segment ON executive_summaries(generated_for, segment_value);

-- ==========================================
-- ACTION PLANS & RECOMMENDATIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS action_plans (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR,
  executive_summary_id VARCHAR,
  
  -- Plan details
  plan_title VARCHAR(500) NOT NULL,
  plan_category VARCHAR(100) NOT NULL, -- 'engagement', 'culture', 'retention', 'leadership', etc.
  priority VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  
  -- Target audience
  target_segment_type VARCHAR(50), -- 'department', 'location', 'role', 'overall'
  target_segment_value VARCHAR(255),
  affected_employees INTEGER,
  
  -- Action details
  description TEXT NOT NULL,
  objectives JSONB, -- Array of objectives
  action_steps JSONB, -- Detailed steps
  initiatives JSONB, -- Specific initiatives to implement
  
  -- Resources & ownership
  owner_id VARCHAR, -- user_id responsible
  stakeholders JSONB, -- Array of user IDs
  required_resources JSONB,
  estimated_budget NUMERIC(12,2),
  
  -- Timeline
  start_date DATE,
  target_completion_date DATE,
  actual_completion_date DATE,
  
  -- Progress tracking
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'approved', 'in_progress', 'completed', 'cancelled'
  completion_percentage INTEGER DEFAULT 0,
  milestones JSONB,
  
  -- Communication strategy
  communication_plan JSONB,
  change_management_notes TEXT,
  
  -- Results
  expected_impact TEXT,
  actual_impact JSONB,
  success_metrics JSONB,
  
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_action_plans_survey ON action_plans(survey_id);
CREATE INDEX idx_action_plans_priority ON action_plans(priority);
CREATE INDEX idx_action_plans_status ON action_plans(status);
CREATE INDEX idx_action_plans_owner ON action_plans(owner_id);
CREATE INDEX idx_action_plans_target ON action_plans(target_segment_type, target_segment_value);

-- ==========================================
-- LEADERSHIP INSIGHTS & ENABLEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS leadership_insights (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_id VARCHAR NOT NULL, -- user_id of the leader
  survey_id VARCHAR,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Team scope
  team_type VARCHAR(50), -- 'department', 'direct_reports', 'organization'
  team_identifier VARCHAR(255),
  team_size INTEGER,
  response_count INTEGER,
  participation_rate NUMERIC(5,2),
  
  -- Team metrics
  team_engagement_score NUMERIC(10,2),
  team_sentiment_score NUMERIC(5,2),
  team_nps NUMERIC(10,2),
  team_csat NUMERIC(10,2),
  
  -- Comparative analysis
  company_avg_engagement NUMERIC(10,2),
  peer_avg_engagement NUMERIC(10,2),
  percentile_rank INTEGER, -- 1-100
  
  -- Team strengths
  top_strengths JSONB,
  celebration_areas JSONB,
  
  -- Development areas
  development_areas JSONB,
  risk_indicators JSONB,
  
  -- Recommendations for leader
  coaching_recommendations JSONB,
  recognition_suggestions JSONB,
  team_building_activities JSONB,
  performance_improvement_tips JSONB,
  
  -- Individual concerns (anonymized)
  high_risk_signals INTEGER, -- Count of employees showing risk
  attention_needed JSONB, -- Anonymous patterns needing attention
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_leadership_insights_leader ON leadership_insights(leader_id);
CREATE INDEX idx_leadership_insights_survey ON leadership_insights(survey_id);
CREATE INDEX idx_leadership_insights_period ON leadership_insights(period_start, period_end);

-- ==========================================
-- TEAM ENABLEMENT RESOURCES
-- ==========================================

CREATE TABLE IF NOT EXISTS team_enablement_resources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Resource details
  resource_type VARCHAR(50) NOT NULL, -- 'coaching_guide', 'recognition_template', 'activity', 'training', 'policy'
  title VARCHAR(500) NOT NULL,
  description TEXT,
  content JSONB, -- Structured content
  
  -- Applicability
  applicable_scenarios JSONB, -- When to use this resource
  target_issues JSONB, -- What issues it addresses
  effectiveness_rating NUMERIC(3,2), -- 0 to 5
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  avg_satisfaction NUMERIC(3,2),
  
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_enablement_resources_type ON team_enablement_resources(resource_type);

-- ==========================================
-- MONITORING & EARLY WARNING SYSTEM
-- ==========================================

CREATE TABLE IF NOT EXISTS monitoring_alerts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Alert classification
  alert_type VARCHAR(50) NOT NULL, -- 'disengagement', 'sentiment_drop', 'participation_drop', 'critical_score'
  severity VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed'
  
  -- Alert details
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  alert_message TEXT,
  
  -- Context
  survey_id VARCHAR,
  affected_segment_type VARCHAR(50),
  affected_segment_value VARCHAR(255),
  affected_count INTEGER,
  
  -- Metrics
  current_value NUMERIC(10,2),
  threshold_value NUMERIC(10,2),
  previous_value NUMERIC(10,2),
  change_percentage NUMERIC(10,2),
  
  -- Evidence
  supporting_data JSONB,
  trend_data JSONB,
  
  -- Actions
  recommended_actions JSONB,
  assigned_to VARCHAR, -- user_id
  action_taken TEXT,
  
  -- Timeline
  detected_at TIMESTAMP DEFAULT now(),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_monitoring_alerts_type ON monitoring_alerts(alert_type);
CREATE INDEX idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX idx_monitoring_alerts_assigned ON monitoring_alerts(assigned_to);
CREATE INDEX idx_monitoring_alerts_segment ON monitoring_alerts(affected_segment_type, affected_segment_value);

-- ==========================================
-- PERIODIC REPORTS
-- ==========================================

CREATE TABLE IF NOT EXISTS periodic_reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Report configuration
  report_name VARCHAR(255) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly', 'custom'
  frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly'
  
  -- Content configuration
  included_surveys JSONB, -- Array of survey IDs
  included_segments JSONB, -- Segments to include
  included_metrics JSONB, -- Which metrics to track
  
  -- Recipients
  recipients JSONB, -- Array of user IDs or email addresses
  distribution_list VARCHAR(100),
  
  -- Report content
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMP DEFAULT now(),
  
  -- Report data
  summary_data JSONB,
  trends_data JSONB,
  alerts_data JSONB,
  recommendations_data JSONB,
  
  -- Delivery
  delivery_method VARCHAR(50) DEFAULT 'email', -- 'email', 'dashboard', 'both'
  delivered_at TIMESTAMP,
  delivery_status VARCHAR(20), -- 'pending', 'sent', 'failed'
  
  -- Engagement
  opened_by JSONB, -- Array of user IDs who opened
  open_count INTEGER DEFAULT 0,
  
  created_by VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_periodic_reports_type ON periodic_reports(report_type);
CREATE INDEX idx_periodic_reports_period ON periodic_reports(period_start, period_end);
CREATE INDEX idx_periodic_reports_generated ON periodic_reports(generated_at);

-- ==========================================
-- REPORT SUBSCRIPTIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS report_subscriptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  
  -- Subscription details
  report_type VARCHAR(50) NOT NULL,
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly'
  
  -- Filters
  survey_filters JSONB,
  segment_filters JSONB,
  metric_filters JSONB,
  
  -- Delivery preferences
  delivery_method VARCHAR(50) DEFAULT 'email',
  delivery_time TIME,
  delivery_day_of_week INTEGER, -- 0-6 for weekly
  delivery_day_of_month INTEGER, -- 1-31 for monthly
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP,
  next_scheduled_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_report_subscriptions_user ON report_subscriptions(user_id);
CREATE INDEX idx_report_subscriptions_active ON report_subscriptions(is_active);
CREATE INDEX idx_report_subscriptions_next ON report_subscriptions(next_scheduled_at);

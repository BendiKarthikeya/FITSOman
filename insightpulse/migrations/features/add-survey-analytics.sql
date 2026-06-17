-- Survey Analytics System: CSAT and NPS Calculations
-- This migration creates the complete schema for survey analytics
-- Uses prefixed table names to avoid conflicts with existing tables

-- Drop existing tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS analytics_metrics CASCADE;
DROP TABLE IF EXISTS analytics_responses CASCADE;
DROP TABLE IF EXISTS analytics_questions CASCADE;
DROP TABLE IF EXISTS analytics_surveys CASCADE;

-- Create analytics_surveys table
CREATE TABLE analytics_surveys (
  survey_id SERIAL PRIMARY KEY,
  survey_name VARCHAR(255) NOT NULL,
  description TEXT,
  total_respondents INTEGER DEFAULT 0,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- Create analytics_questions table
CREATE TABLE analytics_questions (
  question_id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES analytics_surveys(survey_id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_order INTEGER NOT NULL,
  created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(survey_id, question_order)
);

-- Create analytics_responses table with dual normalization
CREATE TABLE analytics_responses (
  response_id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES analytics_surveys(survey_id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES analytics_questions(question_id) ON DELETE CASCADE,
  respondent_id VARCHAR(255) NOT NULL,
  original_score NUMERIC(10, 2) NOT NULL, -- User's actual input (any scale)
  normalized_score_5 INTEGER NOT NULL CHECK (normalized_score_5 >= 0 AND normalized_score_5 <= 5), -- 0-5 scale for CSAT
  normalized_score_10 INTEGER NOT NULL CHECK (normalized_score_10 >= 0 AND normalized_score_10 <= 10), -- 0-10 scale for NPS
  response_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_id VARCHAR(255),
  metadata JSONB, -- For additional response data
  CONSTRAINT valid_scores CHECK (
    normalized_score_5 >= 0 AND normalized_score_5 <= 5 AND
    normalized_score_10 >= 0 AND normalized_score_10 <= 10
  )
);

-- Create analytics_metrics table for calculated analytics
CREATE TABLE analytics_metrics (
  metric_id SERIAL PRIMARY KEY,
  survey_id INTEGER NOT NULL REFERENCES analytics_surveys(survey_id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES analytics_questions(question_id) ON DELETE CASCADE, -- NULL for overall survey metrics
  
  -- CSAT Metrics
  csat_score NUMERIC(5, 2), -- Percentage (0-100)
  satisfied_count INTEGER DEFAULT 0, -- Ratings 4-5
  total_responses INTEGER DEFAULT 0,
  
  -- NPS Metrics
  nps_score NUMERIC(5, 2), -- Score (-100 to 100)
  promoters_count INTEGER DEFAULT 0, -- Ratings 9-10
  passives_count INTEGER DEFAULT 0, -- Ratings 7-8
  detractors_count INTEGER DEFAULT 0, -- Ratings 0-6
  
  -- Response Distribution (0-5 scale)
  score_5_count INTEGER DEFAULT 0, -- Very Satisfied
  score_4_count INTEGER DEFAULT 0, -- Satisfied
  score_3_count INTEGER DEFAULT 0, -- Neutral
  score_2_count INTEGER DEFAULT 0, -- Dissatisfied
  score_1_count INTEGER DEFAULT 0, -- Very Dissatisfied
  score_0_count INTEGER DEFAULT 0, -- Not Rated
  
  -- Performance Ratings
  csat_performance VARCHAR(50), -- EXCELLENT, GOOD, AVERAGE, POOR
  nps_performance VARCHAR(50), -- EXCELLENT, GOOD, AVERAGE, POOR
  
  -- Metadata
  calculation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  date_range_start TIMESTAMP,
  date_range_end TIMESTAMP,
  
  UNIQUE(survey_id, question_id, calculation_date)
);

-- Create indexes for performance
CREATE INDEX idx_analytics_responses_survey_id ON analytics_responses(survey_id);
CREATE INDEX idx_analytics_responses_question_id ON analytics_responses(question_id);
CREATE INDEX idx_analytics_responses_respondent_id ON analytics_responses(respondent_id);
CREATE INDEX idx_analytics_responses_date ON analytics_responses(response_date);
CREATE INDEX idx_analytics_metrics_survey_id ON analytics_metrics(survey_id);
CREATE INDEX idx_analytics_metrics_question_id ON analytics_metrics(question_id);
CREATE INDEX idx_analytics_metrics_date ON analytics_metrics(calculation_date);
CREATE INDEX idx_analytics_questions_survey_id ON analytics_questions(survey_id);

-- Function to normalize scores from any scale to 0-5
CREATE OR REPLACE FUNCTION normalize_to_5_scale(original_score NUMERIC, max_scale NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  -- Convert any scale to 0-5
  RETURN ROUND((original_score / max_scale) * 5)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to normalize scores from any scale to 0-10
CREATE OR REPLACE FUNCTION normalize_to_10_scale(original_score NUMERIC, max_scale NUMERIC)
RETURNS INTEGER AS $$
BEGIN
  -- Convert any scale to 0-10
  RETURN ROUND((original_score / max_scale) * 10)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine CSAT performance level
CREATE OR REPLACE FUNCTION get_csat_performance(csat_score NUMERIC)
RETURNS VARCHAR(50) AS $$
BEGIN
  IF csat_score >= 80 THEN RETURN 'EXCELLENT';
  ELSIF csat_score >= 70 THEN RETURN 'GOOD';
  ELSIF csat_score >= 60 THEN RETURN 'AVERAGE';
  ELSE RETURN 'POOR';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine NPS performance level
CREATE OR REPLACE FUNCTION get_nps_performance(nps_score NUMERIC)
RETURNS VARCHAR(50) AS $$
BEGIN
  IF nps_score > 50 THEN RETURN 'EXCELLENT';
  ELSIF nps_score >= 30 THEN RETURN 'GOOD';
  ELSIF nps_score >= 0 THEN RETURN 'AVERAGE';
  ELSE RETURN 'POOR';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate CSAT for a survey/question
CREATE OR REPLACE FUNCTION calculate_csat(p_survey_id INTEGER, p_question_id INTEGER DEFAULT NULL)
RETURNS TABLE(
  csat_score NUMERIC,
  satisfied_count INTEGER,
  total_responses INTEGER,
  performance VARCHAR(50)
) AS $$
DECLARE
  v_satisfied INTEGER;
  v_total INTEGER;
  v_csat NUMERIC;
  v_performance VARCHAR(50);
BEGIN
  -- Count satisfied responses (normalized_score_5 >= 4)
  SELECT COUNT(*)
  INTO v_satisfied
  FROM analytics_responses
  WHERE survey_id = p_survey_id
    AND (p_question_id IS NULL OR question_id = p_question_id)
    AND normalized_score_5 >= 4;

  -- Count total responses
  SELECT COUNT(*)
  INTO v_total
  FROM analytics_responses
  WHERE survey_id = p_survey_id
    AND (p_question_id IS NULL OR question_id = p_question_id);

  -- Calculate CSAT percentage
  IF v_total > 0 THEN
    v_csat := (v_satisfied::NUMERIC / v_total::NUMERIC) * 100;
  ELSE
    v_csat := 0;
  END IF;

  -- Get performance level
  v_performance := get_csat_performance(v_csat);

  RETURN QUERY SELECT v_csat, v_satisfied, v_total, v_performance;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate NPS for a survey/question
CREATE OR REPLACE FUNCTION calculate_nps(p_survey_id INTEGER, p_question_id INTEGER DEFAULT NULL)
RETURNS TABLE(
  nps_score NUMERIC,
  promoters_count INTEGER,
  passives_count INTEGER,
  detractors_count INTEGER,
  performance VARCHAR(50)
) AS $$
DECLARE
  v_promoters INTEGER;
  v_passives INTEGER;
  v_detractors INTEGER;
  v_total INTEGER;
  v_nps NUMERIC;
  v_performance VARCHAR(50);
BEGIN
  -- Count promoters (normalized_score_10 >= 9)
  SELECT COUNT(*)
  INTO v_promoters
  FROM analytics_responses
  WHERE survey_id = p_survey_id
    AND (p_question_id IS NULL OR question_id = p_question_id)
    AND normalized_score_10 >= 9;

  -- Count passives (normalized_score_10 = 7 or 8)
  SELECT COUNT(*)
  INTO v_passives
  FROM analytics_responses
  WHERE survey_id = p_survey_id
    AND (p_question_id IS NULL OR question_id = p_question_id)
    AND normalized_score_10 >= 7
    AND normalized_score_10 <= 8;

  -- Count detractors (normalized_score_10 <= 6)
  SELECT COUNT(*)
  INTO v_detractors
  FROM analytics_responses
  WHERE survey_id = p_survey_id
    AND (p_question_id IS NULL OR question_id = p_question_id)
    AND normalized_score_10 <= 6;

  -- Calculate total
  v_total := v_promoters + v_passives + v_detractors;

  -- Calculate NPS
  IF v_total > 0 THEN
    v_nps := ((v_promoters::NUMERIC / v_total::NUMERIC) - (v_detractors::NUMERIC / v_total::NUMERIC)) * 100;
  ELSE
    v_nps := 0;
  END IF;

  -- Get performance level
  v_performance := get_nps_performance(v_nps);

  RETURN QUERY SELECT v_nps, v_promoters, v_passives, v_detractors, v_performance;
END;
$$ LANGUAGE plpgsql;

-- Function to update survey metrics
CREATE OR REPLACE FUNCTION update_survey_metrics(p_survey_id INTEGER, p_question_id INTEGER DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  v_csat RECORD;
  v_nps RECORD;
  v_score_counts RECORD;
  v_date_range RECORD;
BEGIN
  -- Calculate CSAT
  SELECT * INTO v_csat FROM calculate_csat(p_survey_id, p_question_id);
  
  -- Calculate NPS
  SELECT * INTO v_nps FROM calculate_nps(p_survey_id, p_question_id);
  
  -- Get score distribution (0-5 scale)
  SELECT 
    COUNT(*) FILTER (WHERE normalized_score_5 = 5) as score_5,
    COUNT(*) FILTER (WHERE normalized_score_5 = 4) as score_4,
    COUNT(*) FILTER (WHERE normalized_score_5 = 3) as score_3,
    COUNT(*) FILTER (WHERE normalized_score_5 = 2) as score_2,
    COUNT(*) FILTER (WHERE normalized_score_5 = 1) as score_1,
    COUNT(*) FILTER (WHERE normalized_score_5 = 0) as score_0
  INTO v_score_counts
  FROM analytics_responses
  WHERE survey_id = p_survey_id
    AND (p_question_id IS NULL OR question_id = p_question_id);
  
  -- Get date range
  SELECT MIN(response_date) as start_date, MAX(response_date) as end_date
  INTO v_date_range
  FROM analytics_responses
  WHERE survey_id = p_survey_id
    AND (p_question_id IS NULL OR question_id = p_question_id);
  
  -- Insert or update metrics
  INSERT INTO analytics_metrics (
    survey_id,
    question_id,
    csat_score,
    satisfied_count,
    total_responses,
    nps_score,
    promoters_count,
    passives_count,
    detractors_count,
    score_5_count,
    score_4_count,
    score_3_count,
    score_2_count,
    score_1_count,
    score_0_count,
    csat_performance,
    nps_performance,
    date_range_start,
    date_range_end
  ) VALUES (
    p_survey_id,
    p_question_id,
    v_csat.csat_score,
    v_csat.satisfied_count,
    v_csat.total_responses,
    v_nps.nps_score,
    v_nps.promoters_count,
    v_nps.passives_count,
    v_nps.detractors_count,
    v_score_counts.score_5,
    v_score_counts.score_4,
    v_score_counts.score_3,
    v_score_counts.score_2,
    v_score_counts.score_1,
    v_score_counts.score_0,
    v_csat.performance,
    v_nps.performance,
    v_date_range.start_date,
    v_date_range.end_date
  )
  ON CONFLICT (survey_id, question_id, calculation_date)
  DO UPDATE SET
    csat_score = EXCLUDED.csat_score,
    satisfied_count = EXCLUDED.satisfied_count,
    total_responses = EXCLUDED.total_responses,
    nps_score = EXCLUDED.nps_score,
    promoters_count = EXCLUDED.promoters_count,
    passives_count = EXCLUDED.passives_count,
    detractors_count = EXCLUDED.detractors_count,
    score_5_count = EXCLUDED.score_5_count,
    score_4_count = EXCLUDED.score_4_count,
    score_3_count = EXCLUDED.score_3_count,
    score_2_count = EXCLUDED.score_2_count,
    score_1_count = EXCLUDED.score_1_count,
    score_0_count = EXCLUDED.score_0_count,
    csat_performance = EXCLUDED.csat_performance,
    nps_performance = EXCLUDED.nps_performance,
    date_range_start = EXCLUDED.date_range_start,
    date_range_end = EXCLUDED.date_range_end;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update survey total_respondents
CREATE OR REPLACE FUNCTION update_survey_respondent_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE analytics_surveys
  SET total_respondents = (
    SELECT COUNT(DISTINCT respondent_id)
    FROM analytics_responses
    WHERE survey_id = NEW.survey_id
  ),
  updated_date = CURRENT_TIMESTAMP
  WHERE survey_id = NEW.survey_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_respondent_count
AFTER INSERT ON analytics_responses
FOR EACH ROW
EXECUTE FUNCTION update_survey_respondent_count();

-- Comments for documentation
COMMENT ON TABLE analytics_surveys IS 'Main surveys table storing survey metadata';
COMMENT ON TABLE analytics_questions IS 'Questions belonging to each survey';
COMMENT ON TABLE analytics_responses IS 'Individual responses with dual normalization (0-5 and 0-10 scales)';
COMMENT ON TABLE analytics_metrics IS 'Calculated CSAT and NPS metrics for surveys and questions';
COMMENT ON COLUMN analytics_responses.normalized_score_5 IS 'Score normalized to 0-5 scale for CSAT calculations';
COMMENT ON COLUMN analytics_responses.normalized_score_10 IS 'Score normalized to 0-10 scale for NPS calculations';
COMMENT ON FUNCTION calculate_csat IS 'Calculates CSAT score: (Satisfied + Very Satisfied) / Total × 100';
COMMENT ON FUNCTION calculate_nps IS 'Calculates NPS score: (% Promoters) - (% Detractors)';

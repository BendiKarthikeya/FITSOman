-- Add High-Risk Indicator Detection Tables
-- This migration adds support for batch risk detection on survey responses

-- Create risk detection batches table
CREATE TABLE IF NOT EXISTS risk_detection_batches (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'failed'
  total_responses INTEGER NOT NULL,
  processed_responses INTEGER NOT NULL DEFAULT 0,
  risk_detected_count INTEGER NOT NULL DEFAULT 0,
  critical_risk_count INTEGER NOT NULL DEFAULT 0,
  high_risk_count INTEGER NOT NULL DEFAULT 0,
  medium_risk_count INTEGER NOT NULL DEFAULT 0,
  low_risk_count INTEGER NOT NULL DEFAULT 0,
  
  batch_size INTEGER NOT NULL DEFAULT 50,
  current_batch_number INTEGER NOT NULL DEFAULT 0,
  
  summary JSONB,
  error_message TEXT,
  
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  created_by VARCHAR REFERENCES users(id),
  
  has_been_reviewed BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR REFERENCES users(id),
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create risk detection results table
CREATE TABLE IF NOT EXISTS risk_detection_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id VARCHAR NOT NULL REFERENCES risk_detection_batches(id) ON DELETE CASCADE,
  response_id VARCHAR NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  survey_id VARCHAR NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  
  has_risks BOOLEAN NOT NULL DEFAULT false,
  risk_level VARCHAR(20) NOT NULL DEFAULT 'none', -- 'critical' | 'high' | 'medium' | 'low' | 'none'
  risk_score INTEGER NOT NULL DEFAULT 0,
  
  risk_categories JSONB,
  risk_indicators JSONB,
  risk_analysis TEXT,
  recommendations JSONB,
  
  analyzed_comments JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_risk_batches_survey_id ON risk_detection_batches(survey_id);
CREATE INDEX IF NOT EXISTS idx_risk_batches_status ON risk_detection_batches(status);
CREATE INDEX IF NOT EXISTS idx_risk_results_batch_id ON risk_detection_results(batch_id);
CREATE INDEX IF NOT EXISTS idx_risk_results_response_id ON risk_detection_results(response_id);
CREATE INDEX IF NOT EXISTS idx_risk_results_survey_id ON risk_detection_results(survey_id);
CREATE INDEX IF NOT EXISTS idx_risk_results_risk_level ON risk_detection_results(risk_level);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  user_id VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Create feedback_analytics table
CREATE TABLE IF NOT EXISTS feedback_analytics (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR REFERENCES surveys(id),
  response_id VARCHAR REFERENCES responses(id),
  feedback_text TEXT NOT NULL,
  sentiment VARCHAR(20) NOT NULL,
  evi_score INTEGER NOT NULL,
  nps_score INTEGER NOT NULL,
  csat_score INTEGER NOT NULL,
  emotions JSONB NOT NULL,
  insights JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  ai_analysis TEXT,
  category VARCHAR(50),
  urgency VARCHAR(20),
  customer_email TEXT,
  customer_name VARCHAR,
  user_id VARCHAR REFERENCES users(id),
  user_type VARCHAR(20) DEFAULT 'guest',
  source VARCHAR(30) DEFAULT 'feedback_analyzer',
  created_at TIMESTAMP DEFAULT now(),
  resolved_at TIMESTAMP,
  assigned_to VARCHAR REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'open',
  tags JSONB
);

-- Update surveys table to match main schema
ALTER TABLE surveys 
  DROP COLUMN IF EXISTS question_id,
  ADD COLUMN IF NOT EXISTS questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by VARCHAR REFERENCES users(id);

-- Update responses table to match main schema
ALTER TABLE responses 
  RENAME COLUMN response_id TO id;
  
ALTER TABLE responses
  RENAME COLUMN question_id TO survey_id;
  
ALTER TABLE responses
  DROP COLUMN IF EXISTS survey_id,
  ADD COLUMN IF NOT EXISTS survey_id VARCHAR REFERENCES surveys(id),
  ADD COLUMN IF NOT EXISTS respondent_email TEXT,
  ADD COLUMN IF NOT EXISTS answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS evi_score INTEGER,
  ADD COLUMN IF NOT EXISTS nps_score INTEGER,
  ADD COLUMN IF NOT EXISTS csat_score INTEGER;

ALTER TABLE responses
  RENAME COLUMN submitted_at TO submitted_at;

-- Drop questions table as it's not needed in main schema
-- Questions are stored as JSONB in surveys table
-- DROP TABLE IF EXISTS questions;

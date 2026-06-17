-- Add WATI WhatsApp Survey Sessions table for tracking sequential conversations
CREATE TABLE IF NOT EXISTS wati_sessions (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  survey_id VARCHAR(255) REFERENCES surveys(id),
  phone_number VARCHAR(255) NOT NULL,
  current_question_index INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  answers JSONB, -- { questionId: answer, ... }
  language VARCHAR(10) DEFAULT 'en',
  last_message_at TIMESTAMP DEFAULT now(),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Index for quick lookups by phone number
CREATE INDEX IF NOT EXISTS idx_wati_sessions_phone ON wati_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_wati_sessions_survey_id ON wati_sessions(survey_id);
CREATE INDEX IF NOT EXISTS idx_wati_sessions_status ON wati_sessions(status);

-- Migration: Add structured_outputs table for VAPI call analysis
-- This table stores the 4 structured outputs from VAPI calls:
-- 1. Supervisor Review Needed (Boolean)
-- 2. Customer Frustrated (Boolean)
-- 3. Customer Sentiment (String)
-- 4. CSAT (Number)

CREATE TABLE IF NOT EXISTS structured_outputs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Link to the survey response
  response_id VARCHAR REFERENCES responses(id) ON DELETE CASCADE,
  
  -- Link to the original call
  call_id VARCHAR, -- VAPI call ID
  
  -- Structured Output 1: Supervisor Review Needed (Boolean)
  supervisor_review_needed BOOLEAN DEFAULT false,
  supervisor_review_reason TEXT, -- Optional: why supervisor review is needed
  
  -- Structured Output 2: Customer Frustrated (Boolean)
  customer_frustrated BOOLEAN DEFAULT false,
  frustration_indicators TEXT, -- Optional: what indicated frustration
  
  -- Structured Output 3: Customer Sentiment (String)
  customer_sentiment VARCHAR(50), -- e.g., "positive", "negative", "neutral", "mixed"
  sentiment_confidence NUMERIC(5,2), -- Optional: confidence score 0-100
  sentiment_keywords TEXT, -- Optional: keywords that indicated sentiment
  
  -- Structured Output 4: CSAT (Number 1-10)
  csat_score INTEGER CHECK (csat_score >= 1 AND csat_score <= 10),
  csat_source VARCHAR(50), -- e.g., "explicit", "inferred", "question_response"
  
  -- Additional metadata
  raw_analysis JSONB, -- Store the full raw analysis from VAPI
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_structured_outputs_response_id ON structured_outputs(response_id);
CREATE INDEX IF NOT EXISTS idx_structured_outputs_call_id ON structured_outputs(call_id);
CREATE INDEX IF NOT EXISTS idx_structured_outputs_supervisor_review ON structured_outputs(supervisor_review_needed);
CREATE INDEX IF NOT EXISTS idx_structured_outputs_customer_frustrated ON structured_outputs(customer_frustrated);
CREATE INDEX IF NOT EXISTS idx_structured_outputs_sentiment ON structured_outputs(customer_sentiment);
CREATE INDEX IF NOT EXISTS idx_structured_outputs_csat ON structured_outputs(csat_score);
CREATE INDEX IF NOT EXISTS idx_structured_outputs_created_at ON structured_outputs(created_at);

-- Add comment for documentation
COMMENT ON TABLE structured_outputs IS 'Stores structured analysis outputs from VAPI voice survey calls including supervisor review flags, customer frustration detection, sentiment analysis, and CSAT scores';

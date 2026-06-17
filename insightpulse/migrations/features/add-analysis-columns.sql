-- Add analysis columns to responses table for storing VAPI analysis data
-- Migration: add-analysis-columns.sql
-- Date: 2025-11-19

-- Add analysis_summary column (text) to store VAPI's 2-3 sentence summary
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS analysis_summary TEXT;

-- Add survey_completed column (boolean) to indicate if survey was completed
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS survey_completed BOOLEAN;

-- Add total_questions_asked column (integer) to store number of questions asked
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS total_questions_asked INTEGER;

-- Add overall_sentiment column (varchar) to store overall sentiment (positive/negative/neutral)
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS overall_sentiment VARCHAR(20);

-- Add detailed_responses column (jsonb) to store the responses array with detailed question data
ALTER TABLE responses 
ADD COLUMN IF NOT EXISTS detailed_responses JSONB;

-- Add comments for documentation
COMMENT ON COLUMN responses.analysis_summary IS 'VAPI analysis summary: 2-3 sentence overview of the call including completion status, sentiment, and critical feedback';
COMMENT ON COLUMN responses.survey_completed IS 'Whether the customer completed the survey';
COMMENT ON COLUMN responses.total_questions_asked IS 'Number of survey questions asked during the call';
COMMENT ON COLUMN responses.overall_sentiment IS 'Overall sentiment of the call: positive, negative, or neutral';
COMMENT ON COLUMN responses.detailed_responses IS 'Array of detailed question responses with question_number, question_text, question_type, rating, numeric_rating, etc.';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'responses'
AND column_name IN ('analysis_summary', 'survey_completed', 'total_questions_asked', 'overall_sentiment', 'detailed_responses');

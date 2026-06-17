-- Migration: Add survey_id column to reports table to link with analytics_surveys
-- This connects reports to the leadership survey and other analytics surveys

ALTER TABLE reports
ADD COLUMN survey_id INTEGER REFERENCES analytics_surveys(survey_id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_reports_survey_id ON reports(survey_id);

-- Update existing reports to link with the Leadership & Team Enablement Survey if it exists
UPDATE reports
SET survey_id = (
  SELECT survey_id FROM analytics_surveys 
  WHERE survey_name ILIKE '%Leadership%' 
  LIMIT 1
)
WHERE name ILIKE '%Leadership%' AND survey_id IS NULL;

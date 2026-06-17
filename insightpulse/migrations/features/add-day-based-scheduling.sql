-- Add Day-Based Scheduling Support
-- Allows scheduling surveys based on days after a reference date (e.g., 30th day, 60th day, 90th day after joining)

-- Add new columns to survey_schedules table
ALTER TABLE survey_schedules 
ADD COLUMN IF NOT EXISTS schedule_type VARCHAR(20) DEFAULT 'absolute_date', -- 'absolute_date' | 'days_after_event'
ADD COLUMN IF NOT EXISTS reference_date_column VARCHAR(255), -- CRM column containing the reference date (e.g., 'joining_date', 'onboarding_date')
ADD COLUMN IF NOT EXISTS days_after_reference INTEGER, -- Number of days after reference date to send survey (e.g., 1, 30, 60, 90)
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false, -- Whether this schedule repeats
ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB DEFAULT '[]'::jsonb; -- Array of day intervals: [1, 30, 60, 90, 120]

-- Add index for efficient querying of day-based schedules
CREATE INDEX IF NOT EXISTS idx_survey_schedules_schedule_type ON survey_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_days_after_reference ON survey_schedules(days_after_reference);

-- Add comments for documentation
COMMENT ON COLUMN survey_schedules.schedule_type IS 'Type of schedule: "absolute_date" for fixed dates, "days_after_event" for relative scheduling';
COMMENT ON COLUMN survey_schedules.reference_date_column IS 'CRM column name containing the reference date (e.g., joining_date, onboarding_date, purchase_date)';
COMMENT ON COLUMN survey_schedules.days_after_reference IS 'Number of days after the reference date to send the survey (e.g., 1, 30, 60, 90)';
COMMENT ON COLUMN survey_schedules.is_recurring IS 'If true, survey will be sent at multiple intervals defined in recurrence_pattern';
COMMENT ON COLUMN survey_schedules.recurrence_pattern IS 'Array of day intervals for recurring schedules: [1, 30, 60, 90, 120] means send on 30th, 60th, 90th, and 120th day';

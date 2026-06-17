-- Add respondent_phone to responses (was missing, phone was being dropped)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS respondent_phone VARCHAR(30);

-- Make feedback_analytics score columns nullable (they were NOT NULL but inserts can have nulls)
ALTER TABLE feedback_analytics ALTER COLUMN evi_score DROP NOT NULL;
ALTER TABLE feedback_analytics ALTER COLUMN nps_score DROP NOT NULL;
ALTER TABLE feedback_analytics ALTER COLUMN csat_score DROP NOT NULL;
ALTER TABLE feedback_analytics ALTER COLUMN emotions DROP NOT NULL;
ALTER TABLE feedback_analytics ALTER COLUMN insights DROP NOT NULL;
ALTER TABLE feedback_analytics ALTER COLUMN recommendations DROP NOT NULL;

-- Add NPS, CES, EVI to structured_outputs (VAPI sends these but they were never persisted)
ALTER TABLE structured_outputs ADD COLUMN IF NOT EXISTS nps_score INTEGER;
ALTER TABLE structured_outputs ADD COLUMN IF NOT EXISTS ces_score INTEGER;
ALTER TABLE structured_outputs ADD COLUMN IF NOT EXISTS evi_score INTEGER;

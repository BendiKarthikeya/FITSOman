-- Survey Schedules Table
-- Allows users to schedule surveys to be sent via CRM at specific times

CREATE TABLE IF NOT EXISTS survey_schedules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id VARCHAR NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- CRM Configuration
  crm_config_id VARCHAR REFERENCES crm_configs(id) ON DELETE SET NULL,
  crm_table_name VARCHAR(255),
  crm_column_name VARCHAR(255),
  
  -- Contact Methods (multi-select: phone, email)
  contact_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Schedule Details
  schedule_start_date TIMESTAMP NOT NULL,
  schedule_end_date TIMESTAMP NOT NULL,
  scheduled_at TIMESTAMP NOT NULL,
  timezone VARCHAR(10) NOT NULL DEFAULT 'UTC',
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Execution
  executed_at TIMESTAMP,
  recipient_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_survey_schedules_survey_id ON survey_schedules(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_user_id ON survey_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_status ON survey_schedules(status);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_schedule_start_date ON survey_schedules(schedule_start_date);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_schedule_end_date ON survey_schedules(schedule_end_date);
CREATE INDEX IF NOT EXISTS idx_survey_schedules_crm_config_id ON survey_schedules(crm_config_id);

-- Comments for documentation
COMMENT ON TABLE survey_schedules IS 'Stores scheduled survey distribution via CRM systems';
COMMENT ON COLUMN survey_schedules.contact_methods IS 'Array of contact methods: ["whatsapp", "voiceagent", "email"]';
COMMENT ON COLUMN survey_schedules.timezone IS 'Timezone for scheduling: "UTC" or "IST"';
COMMENT ON COLUMN survey_schedules.status IS 'Status: pending, processing, completed, failed, cancelled';

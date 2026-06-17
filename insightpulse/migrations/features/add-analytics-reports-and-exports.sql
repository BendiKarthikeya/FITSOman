-- Add Reports Table (AN-033, AN-034, AN-036)
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR REFERENCES organizations(id) ON DELETE CASCADE,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  chart_configs JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of selected charts with config
  filter_configs JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of applied filters
  layout VARCHAR(50) DEFAULT 'grid', -- 'grid', 'list', 'carousel'
  is_template BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  archived_at TIMESTAMP
);

-- Add Report Schedules (AN-034, AN-035)
CREATE TABLE IF NOT EXISTS report_schedules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id VARCHAR NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  frequency VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  day_of_week INTEGER, -- 0-6 for weekly (0=Sunday)
  day_of_month INTEGER, -- 1-31 for monthly
  time_of_day TIME DEFAULT '09:00:00',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of email addresses
  is_enabled BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMP,
  next_send_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add Report Archive (AN-036)
CREATE TABLE IF NOT EXISTS report_archives (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id VARCHAR NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  schedule_id VARCHAR REFERENCES report_schedules(id) ON DELETE SET NULL,
  generated_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_format VARCHAR(50) DEFAULT 'pdf', -- 'pdf', 'excel', 'csv'
  file_size_bytes INTEGER,
  generated_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT (now() + INTERVAL '365 days'),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP
);

-- Add Export Jobs (AN-040, AN-041)
CREATE TABLE IF NOT EXISTS export_jobs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR REFERENCES organizations(id) ON DELETE CASCADE,
  created_by VARCHAR REFERENCES users(id) ON DELETE SET NULL,
  export_type VARCHAR(50) NOT NULL, -- 'survey_data', 'responses', 'analytics', 'reports'
  format VARCHAR(50) NOT NULL, -- 'csv', 'excel', 'json'
  include_headers BOOLEAN DEFAULT true,
  filters JSONB, -- Applied filters
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  file_url TEXT, -- S3 or storage URL
  file_size_bytes INTEGER,
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  error_message TEXT,
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (now() + INTERVAL '30 days'),
  download_count INTEGER DEFAULT 0,
  last_downloaded_at TIMESTAMP
);

-- Add Benchmarks (AN-042, AN-043)
CREATE TABLE IF NOT EXISTS benchmarks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  benchmark_type VARCHAR(50) NOT NULL, -- 'industry', 'department', 'custom'
  metric_name VARCHAR(255) NOT NULL,
  industry_segment VARCHAR(100),
  company_size VARCHAR(50), -- 'small', 'medium', 'enterprise'
  
  -- Percentile Distribution
  percentile_25 NUMERIC(5,2),
  percentile_50 NUMERIC(5,2),
  percentile_75 NUMERIC(5,2),
  percentile_90 NUMERIC(5,2),
  
  -- Distribution Statistics
  mean_value NUMERIC(10,2),
  std_deviation NUMERIC(10,2),
  min_value NUMERIC(10,2),
  max_value NUMERIC(10,2),
  
  -- Metadata
  sample_size INTEGER,
  data_source VARCHAR(100),
  last_updated_at TIMESTAMP,
  valid_from TIMESTAMP DEFAULT now(),
  valid_until TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Add Benchmark Comparisons
CREATE TABLE IF NOT EXISTS benchmark_comparisons (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR REFERENCES organizations(id) ON DELETE CASCADE,
  benchmark_id VARCHAR REFERENCES benchmarks(id) ON DELETE SET NULL,
  metric_name VARCHAR(255) NOT NULL,
  organization_value NUMERIC(10,2),
  benchmark_value NUMERIC(10,2),
  percentile_rank INTEGER, -- 0-100
  comparison_date TIMESTAMP DEFAULT now(),
  trend_direction VARCHAR(20), -- 'up', 'down', 'stable'
  improvement_potential NUMERIC(5,2), -- Percentage improvement possible
  
  created_at TIMESTAMP DEFAULT now()
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_reports_org_id ON reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_archived ON reports(archived_at);

CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_send ON report_schedules(next_send_at);

CREATE INDEX IF NOT EXISTS idx_report_archives_report_id ON report_archives(report_id);
CREATE INDEX IF NOT EXISTS idx_report_archives_expires ON report_archives(expires_at);

CREATE INDEX IF NOT EXISTS idx_export_jobs_org_id ON export_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_by ON export_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_export_jobs_expires ON export_jobs(expires_at);

CREATE INDEX IF NOT EXISTS idx_benchmarks_type ON benchmarks(benchmark_type);
CREATE INDEX IF NOT EXISTS idx_benchmarks_metric ON benchmarks(metric_name);
CREATE INDEX IF NOT EXISTS idx_benchmarks_segment ON benchmarks(industry_segment);

CREATE INDEX IF NOT EXISTS idx_benchmark_comparisons_org_id ON benchmark_comparisons(organization_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_comparisons_benchmark_id ON benchmark_comparisons(benchmark_id);

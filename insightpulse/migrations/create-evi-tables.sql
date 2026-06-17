CREATE TABLE IF NOT EXISTS evi_assessments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  responses JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS evi_results (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id VARCHAR NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  evi_score NUMERIC(4,1) NOT NULL,
  zone_label TEXT NOT NULL,
  summary TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

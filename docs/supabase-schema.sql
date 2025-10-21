-- Supabase Database Schema for Total Report
-- Created: 2025-10-01
-- Description: Schema for storing synced Google Sheets data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Trial Class Attendance (體驗課上課記錄)
CREATE TABLE IF NOT EXISTS trial_class_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_spreadsheet_id TEXT NOT NULL,
  source_worksheet_id TEXT,
  origin_row_index INTEGER,
  student_name TEXT,
  student_email TEXT,
  teacher_name TEXT,
  class_date TIMESTAMPTZ,
  course_type TEXT,
  status TEXT,
  intent_score NUMERIC,
  satisfaction NUMERIC,
  attended BOOLEAN,
  raw_data JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_trial_attendance_spreadsheet
  ON trial_class_attendance(source_spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_worksheet
  ON trial_class_attendance(source_worksheet_id);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_class_date
  ON trial_class_attendance(class_date);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_student_email
  ON trial_class_attendance(student_email);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_synced_at
  ON trial_class_attendance(synced_at);

-- 2. Trial Class Purchase (體驗課購買記錄)
CREATE TABLE IF NOT EXISTS trial_class_purchase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_spreadsheet_id TEXT NOT NULL,
  source_worksheet_id TEXT,
  origin_row_index INTEGER,
  student_name TEXT,
  student_email TEXT,
  teacher_name TEXT,
  purchase_date TIMESTAMPTZ,
  class_date TIMESTAMPTZ,
  course_type TEXT,
  plan TEXT,
  status TEXT,
  intent_score NUMERIC,
  raw_data JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_trial_purchase_spreadsheet
  ON trial_class_purchase(source_spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_worksheet
  ON trial_class_purchase(source_worksheet_id);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_purchase_date
  ON trial_class_purchase(purchase_date);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_class_date
  ON trial_class_purchase(class_date);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_student_email
  ON trial_class_purchase(student_email);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_synced_at
  ON trial_class_purchase(synced_at);

-- 3. EODs for Closers (升高階學員/成交記錄)
CREATE TABLE IF NOT EXISTS eods_for_closers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_spreadsheet_id TEXT NOT NULL,
  source_worksheet_id TEXT,
  origin_row_index INTEGER,
  student_name TEXT,
  student_email TEXT,
  teacher_name TEXT,
  closer_name TEXT,
  setter_name TEXT,
  deal_date TIMESTAMPTZ,
  class_date TIMESTAMPTZ,
  course_type TEXT,
  deal_amount NUMERIC,
  status TEXT,
  intent_score NUMERIC,
  raw_data JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_eods_spreadsheet
  ON eods_for_closers(source_spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_eods_worksheet
  ON eods_for_closers(source_worksheet_id);
CREATE INDEX IF NOT EXISTS idx_eods_deal_date
  ON eods_for_closers(deal_date);
CREATE INDEX IF NOT EXISTS idx_eods_student_email
  ON eods_for_closers(student_email);
CREATE INDEX IF NOT EXISTS idx_eods_synced_at
  ON eods_for_closers(synced_at);

-- Row Level Security (RLS) - Basic setup
-- Note: Adjust these policies based on your authentication setup

ALTER TABLE trial_class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_class_purchase ENABLE ROW LEVEL SECURITY;
ALTER TABLE eods_for_closers ENABLE ROW LEVEL SECURITY;

-- Allow service role to do anything (for backend sync)
CREATE POLICY "Allow service role full access to trial_class_attendance"
  ON trial_class_attendance
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to trial_class_purchase"
  ON trial_class_purchase
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow service role full access to eods_for_closers"
  ON eods_for_closers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Optional: Add policies for authenticated users (read-only)
-- CREATE POLICY "Allow authenticated users read access to trial_class_attendance"
--   ON trial_class_attendance
--   FOR SELECT
--   USING (auth.role() = 'authenticated');

-- Functions for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_trial_class_attendance_updated_at
  BEFORE UPDATE ON trial_class_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trial_class_purchase_updated_at
  BEFORE UPDATE ON trial_class_purchase
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_eods_for_closers_updated_at
  BEFORE UPDATE ON eods_for_closers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View: Aggregated metrics (for AI/reporting)
CREATE OR REPLACE VIEW report_aggregate_metrics AS
SELECT
  'trial_class_attendance' AS source_table,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT student_email) AS unique_students,
  COUNT(DISTINCT teacher_name) AS unique_teachers,
  MIN(class_date) AS earliest_date,
  MAX(class_date) AS latest_date,
  MAX(synced_at) AS last_sync
FROM trial_class_attendance
UNION ALL
SELECT
  'trial_class_purchase' AS source_table,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT student_email) AS unique_students,
  COUNT(DISTINCT teacher_name) AS unique_teachers,
  MIN(COALESCE(purchase_date, class_date)) AS earliest_date,
  MAX(COALESCE(purchase_date, class_date)) AS latest_date,
  MAX(synced_at) AS last_sync
FROM trial_class_purchase
UNION ALL
SELECT
  'eods_for_closers' AS source_table,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT student_email) AS unique_students,
  COUNT(DISTINCT teacher_name) AS unique_teachers,
  MIN(deal_date) AS earliest_date,
  MAX(deal_date) AS latest_date,
  MAX(synced_at) AS last_sync
FROM eods_for_closers;

-- Grant permissions on view
GRANT SELECT ON report_aggregate_metrics TO authenticated, service_role;

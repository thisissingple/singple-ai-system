-- ============================================================================
-- Migration 075: Create consultant AI reports cache table
-- ============================================================================
-- Purpose: Store AI-generated consultant reports to avoid redundant API calls
-- When same period is requested on the same day, return cached report
-- ============================================================================

-- Create the cache table
CREATE TABLE IF NOT EXISTS consultant_ai_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Report identification keys
  period VARCHAR(20) NOT NULL,           -- 'today', 'yesterday', 'week', 'month', 'all', 'custom'
  start_date DATE NOT NULL,              -- Period start date
  end_date DATE NOT NULL,                -- Period end date
  cache_date DATE NOT NULL DEFAULT CURRENT_DATE, -- The date when report was cached

  -- Report content (JSON)
  summary TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]',

  -- Metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: one report per period per day
  CONSTRAINT unique_report_per_day UNIQUE (period, start_date, end_date, cache_date)
);

-- Create index for efficient lookups
CREATE INDEX idx_consultant_ai_reports_lookup
  ON consultant_ai_reports (period, start_date, end_date, cache_date);

-- Create index for cleanup of old cache entries
CREATE INDEX idx_consultant_ai_reports_cache_date
  ON consultant_ai_reports (cache_date);

-- Add comment
COMMENT ON TABLE consultant_ai_reports IS 'AI 分析報告快取表 - 同一天同期間只生成一次';
COMMENT ON COLUMN consultant_ai_reports.cache_date IS '快取日期 - 用於判斷當天是否已生成過';
COMMENT ON COLUMN consultant_ai_reports.period IS '期間類型: today, yesterday, week, month, all, custom';

-- Create function to clean old cache entries (keep only last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_ai_reports()
RETURNS void AS $$
BEGIN
  DELETE FROM consultant_ai_reports
  WHERE cache_date < CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 075: Created consultant_ai_reports cache table';
END $$;

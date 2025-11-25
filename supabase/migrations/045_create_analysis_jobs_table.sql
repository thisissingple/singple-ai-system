-- Migration 041: Create Analysis Jobs Table
-- Purpose: Track background analysis jobs for teaching quality re-analysis
-- Allows users to leave the page while analysis runs in background

-- Create analysis_jobs table
CREATE TABLE IF NOT EXISTS analysis_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES teaching_quality_analysis(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL DEFAULT 'reanalysis', -- 'reanalysis', 'initial_analysis'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0, -- 0-100
  error_message TEXT,
  result JSONB, -- Store analysis result temporarily
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID -- Optional: track which user initiated the job
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_analysis_id ON analysis_jobs(analysis_id);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_status ON analysis_jobs(status);
CREATE INDEX IF NOT EXISTS idx_analysis_jobs_created_at ON analysis_jobs(created_at DESC);

-- Add comments
COMMENT ON TABLE analysis_jobs IS 'Tracks background analysis jobs for teaching quality analysis';
COMMENT ON COLUMN analysis_jobs.status IS 'Job status: pending, processing, completed, failed';
COMMENT ON COLUMN analysis_jobs.progress IS 'Job progress percentage (0-100)';
COMMENT ON COLUMN analysis_jobs.result IS 'Temporary storage for analysis result before writing to main table';

-- Create function to clean up old completed/failed jobs (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_analysis_jobs()
RETURNS void AS $$
BEGIN
  DELETE FROM analysis_jobs
  WHERE (status = 'completed' OR status = 'failed')
    AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean up old records (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-analysis-jobs', '0 2 * * *', 'SELECT cleanup_old_analysis_jobs()');

RAISE NOTICE '✅ Migration 041 complete: analysis_jobs table created';

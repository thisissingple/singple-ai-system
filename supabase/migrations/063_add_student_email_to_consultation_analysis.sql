-- Migration: Add student_email to consultation_quality_analysis
-- Purpose: Enable multi-condition JOIN instead of eod_id foreign key
-- Reason: eods_for_closers table is deleted and recreated daily during Google Sheets sync,
--         making eod_id (UUID) unreliable as a foreign key.
-- New JOIN strategy: student_email + consultation_date + closer_name

-- Add student_email column if not exists
ALTER TABLE consultation_quality_analysis
ADD COLUMN IF NOT EXISTS student_email VARCHAR(255);

-- Create index for efficient JOIN queries
CREATE INDEX IF NOT EXISTS idx_consultation_quality_analysis_multi_key
ON consultation_quality_analysis (student_email, consultation_date, closer_name);

-- Backfill existing records from eods_for_closers (one-time operation)
UPDATE consultation_quality_analysis cqa
SET student_email = e.student_email
FROM eods_for_closers e
WHERE cqa.eod_id = e.id
  AND cqa.student_email IS NULL
  AND e.student_email IS NOT NULL;

-- Add comment explaining the new JOIN strategy
COMMENT ON COLUMN consultation_quality_analysis.student_email IS 'Student email for multi-condition JOIN with eods_for_closers. Used with consultation_date + closer_name.';
COMMENT ON COLUMN consultation_quality_analysis.eod_id IS 'DEPRECATED: No longer used for JOINs due to daily data refresh. Kept for backwards compatibility.';

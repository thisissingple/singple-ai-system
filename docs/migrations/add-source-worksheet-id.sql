-- Migration: Add source_worksheet_id column
-- Date: 2025-10-03
-- Purpose: Fix sync error - add missing source_worksheet_id column to track which worksheet data comes from

-- Add source_worksheet_id column to all tables
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS source_worksheet_id TEXT;

ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS source_worksheet_id TEXT;

ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS source_worksheet_id TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trial_attendance_worksheet
  ON trial_class_attendance(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_worksheet
  ON trial_class_purchase(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_eods_worksheet
  ON eods_for_closers(source_worksheet_id);

-- Update comments
COMMENT ON COLUMN trial_class_attendance.source_worksheet_id IS 'ID of the source worksheet (gid from Google Sheets)';
COMMENT ON COLUMN trial_class_purchase.source_worksheet_id IS 'ID of the source worksheet (gid from Google Sheets)';
COMMENT ON COLUMN eods_for_closers.source_worksheet_id IS 'ID of the source worksheet (gid from Google Sheets)';

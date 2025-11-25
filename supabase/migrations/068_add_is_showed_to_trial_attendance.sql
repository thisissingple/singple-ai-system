-- Migration 063: Add is_showed column to trial_class_attendance
-- Purpose: Track whether students showed up online for their trial class
-- Date: 2025-11-20

-- Add is_showed column to trial_class_attendance table
ALTER TABLE trial_class_attendance
ADD COLUMN IF NOT EXISTS is_showed BOOLEAN DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN trial_class_attendance.is_showed IS '學員是否上線出席體驗課 (true=有上線, false=未上線, null=未記錄)';

-- Create index for efficient filtering by attendance status
CREATE INDEX IF NOT EXISTS idx_trial_attendance_is_showed
ON trial_class_attendance(is_showed)
WHERE is_showed IS NOT NULL;

-- Note: This column follows the same pattern as eods_for_closers.is_show
-- but uses past tense "is_showed" to match the table name "attendance"

-- Migration 052: Drop deprecated current_status column from trial_class_purchases
-- 此欄位已廢棄，狀態現在由前端動態計算
-- Created: 2025-11-14

-- Drop the deprecated current_status column
ALTER TABLE trial_class_purchases
DROP COLUMN IF EXISTS current_status;

-- Add comment explaining the change
COMMENT ON TABLE trial_class_purchases IS
'Trial class purchase records. Student status is now calculated dynamically based on attendance and deals data, not stored in this table.';

-- ============================================
-- Migration 094: 修復時間戳記時區問題
-- 目標：將 timestamp without time zone 改為 timestamp with time zone
-- 執行日期：2025-12-04
-- ============================================

-- ========================================
-- 1. 修復 teacher_course_progress 表的時間欄位
-- ========================================

-- 轉換 last_synced_at 為 timestamp with time zone
ALTER TABLE teacher_course_progress
ALTER COLUMN last_synced_at TYPE timestamp with time zone
USING last_synced_at AT TIME ZONE 'UTC';

-- 轉換 track_completed_at 為 timestamp with time zone
ALTER TABLE teacher_course_progress
ALTER COLUMN track_completed_at TYPE timestamp with time zone
USING track_completed_at AT TIME ZONE 'UTC';

-- 轉換 pivot_completed_at 為 timestamp with time zone
ALTER TABLE teacher_course_progress
ALTER COLUMN pivot_completed_at TYPE timestamp with time zone
USING pivot_completed_at AT TIME ZONE 'UTC';

-- 轉換 breath_completed_at 為 timestamp with time zone
ALTER TABLE teacher_course_progress
ALTER COLUMN breath_completed_at TYPE timestamp with time zone
USING breath_completed_at AT TIME ZONE 'UTC';

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 094 完成：已修復時間戳記時區問題' as status;

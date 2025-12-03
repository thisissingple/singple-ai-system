-- ============================================
-- Migration 092: 新增方案類型欄位到課程進度表
-- 目標：支援老師手動標記學員的方案類型（軌道/支點/氣息）
-- 執行日期：2025-12-03
-- ============================================

-- ========================================
-- 1. 新增方案類型欄位（使用 TEXT[] 支援多選）
-- ========================================

ALTER TABLE teacher_course_progress
ADD COLUMN IF NOT EXISTS plan_type TEXT[] DEFAULT '{}';

-- ========================================
-- 2. 欄位註解
-- ========================================

COMMENT ON COLUMN teacher_course_progress.plan_type IS '學員方案類型（多選）: track(軌道), pivot(支點), breath(氣息)';

-- ========================================
-- 3. 建立索引（方便按方案類型篩選）
-- ========================================

CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_plan_type
ON teacher_course_progress USING GIN (plan_type);

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 092 完成：已新增 plan_type 欄位' as status;

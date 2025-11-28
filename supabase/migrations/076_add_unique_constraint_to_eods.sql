-- Migration 076: 為 eods_for_closers 新增唯一鍵約束
-- 建立日期: 2025-11-28
-- 目的: 解決 Google Sheets 同步時的資料重複問題
--
-- 問題: 每次同步執行 DELETE + INSERT，若 DELETE 失敗但 INSERT 成功會導致資料翻倍
-- 解決方案:
--   1. 新增唯一鍵約束，讓資料庫層面阻止重複
--   2. 同步改用 UPSERT (ON CONFLICT ... DO UPDATE)
--
-- 唯一鍵: (student_email, consultation_date, closer_name)
-- 理由: 與 consultation_quality_analysis 表的 JOIN 條件一致 (migration 069)

-- ============================================================================
-- Step 1: 先清除現有重複資料（保留最新的一筆）
-- ============================================================================

-- 建立暫存表存放要保留的記錄 ID
CREATE TEMP TABLE eods_to_keep AS
SELECT DISTINCT ON (student_email, consultation_date, closer_name) id
FROM eods_for_closers
WHERE student_email IS NOT NULL
  AND consultation_date IS NOT NULL
ORDER BY student_email, consultation_date, closer_name, created_at DESC;

-- 刪除重複記錄（保留 eods_to_keep 中的記錄和 NULL 值記錄）
DELETE FROM eods_for_closers
WHERE id NOT IN (SELECT id FROM eods_to_keep)
  AND student_email IS NOT NULL
  AND consultation_date IS NOT NULL;

-- 清除暫存表
DROP TABLE eods_to_keep;

-- ============================================================================
-- Step 2: 新增唯一鍵約束
-- ============================================================================

-- 建立唯一索引（允許 NULL 值，NULL 不參與唯一性檢查）
CREATE UNIQUE INDEX IF NOT EXISTS idx_eods_unique_consultation
ON eods_for_closers (student_email, consultation_date, closer_name)
WHERE student_email IS NOT NULL
  AND consultation_date IS NOT NULL
  AND closer_name IS NOT NULL;

-- 新增約束說明
COMMENT ON INDEX idx_eods_unique_consultation IS
  '唯一索引: 防止同一學生、同一日期、同一諮詢師的重複記錄。用於 UPSERT 同步。';

-- ============================================================================
-- Step 3: 記錄 Migration 完成
-- ============================================================================

-- 輸出訊息（在 psql 執行時會顯示）
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 076 完成: eods_for_closers 已新增唯一鍵約束';
  RAISE NOTICE '   唯一鍵: (student_email, consultation_date, closer_name)';
END $$;

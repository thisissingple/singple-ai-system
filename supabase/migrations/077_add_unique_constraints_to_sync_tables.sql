-- Migration 077: 為 Google Sheets 同步表新增唯一約束
-- 建立日期: 2025-11-28
-- 目的: 為適合使用 UPSERT 的同步表新增唯一約束，防止資料重複
--
-- 已有唯一約束的表:
--   - eods_for_closers: (student_email, consultation_date, closer_name) [Migration 076]
--
-- 本次新增:
--   - trial_class_purchases: (student_email, package_name, purchase_date)
--
-- 不使用 UPSERT 的表（使用 DELETE + INSERT）:
--   - income_expense_records: 沒有明確的業務唯一鍵，大量欄位為 NULL

-- ============================================================================
-- Step 1: trial_class_purchases 唯一約束
-- ============================================================================

-- 1.1 檢查並清除重複資料
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT student_email, package_name, purchase_date
    FROM trial_class_purchases
    WHERE student_email IS NOT NULL
      AND package_name IS NOT NULL
      AND purchase_date IS NOT NULL
    GROUP BY student_email, package_name, purchase_date
    HAVING COUNT(*) > 1
  ) duplicates;

  IF duplicate_count > 0 THEN
    RAISE NOTICE '📊 trial_class_purchases: 發現 % 組重複資料', duplicate_count;
  ELSE
    RAISE NOTICE '✅ trial_class_purchases: 沒有重複資料';
  END IF;
END $$;

-- 1.2 刪除重複記錄（保留最新的一筆）
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY student_email, package_name, purchase_date
           ORDER BY created_at DESC NULLS LAST, id DESC
         ) as rn
  FROM trial_class_purchases
  WHERE student_email IS NOT NULL
    AND package_name IS NOT NULL
    AND purchase_date IS NOT NULL
)
DELETE FROM trial_class_purchases
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- 1.3 建立 partial unique index（只適用於所有 key 都不為 NULL 的記錄）
CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_purchases_unique_record
ON trial_class_purchases (student_email, package_name, purchase_date)
WHERE student_email IS NOT NULL
  AND package_name IS NOT NULL
  AND purchase_date IS NOT NULL;

COMMENT ON INDEX idx_trial_purchases_unique_record IS
  '唯一索引: 防止同一學生、課程包、購買日期的重複記錄。用於 UPSERT 同步。';

-- ============================================================================
-- Step 2: 驗證結果
-- ============================================================================

DO $$
DECLARE
  purchase_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO purchase_count FROM trial_class_purchases;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 077 完成!';
  RAISE NOTICE '   - trial_class_purchases: % 筆記錄', purchase_count;
  RAISE NOTICE '';
  RAISE NOTICE '📋 已建立的唯一索引:';
  RAISE NOTICE '   - idx_trial_purchases_unique_record';
END $$;

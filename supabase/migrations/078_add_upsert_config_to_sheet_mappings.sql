-- Migration 078: 為 sheet_mappings 新增 UPSERT 配置欄位
-- 建立日期: 2025-11-28
-- 目的: 讓每個 Google Sheets 同步映射可以透過 UI 設定唯一鍵，實現全自動 UPSERT

-- ============================================================================
-- Step 1: 新增 upsert_config 欄位
-- ============================================================================

ALTER TABLE sheet_mappings
ADD COLUMN IF NOT EXISTS upsert_config JSONB DEFAULT NULL;

COMMENT ON COLUMN sheet_mappings.upsert_config IS
  'UPSERT 配置：{ uniqueKeys: string[], allowNullKeys: boolean }。如果為 NULL，使用 DELETE + INSERT 策略。';

-- ============================================================================
-- Step 2: 遷移現有配置（從程式碼中的 UPSERT_CONFIGS 轉移到資料庫）
-- ============================================================================

-- eods_for_closers
UPDATE sheet_mappings
SET upsert_config = '{"uniqueKeys": ["student_email", "consultation_date", "closer_name"], "allowNullKeys": false}'::jsonb
WHERE target_table = 'eods_for_closers';

-- trial_class_purchases
UPDATE sheet_mappings
SET upsert_config = '{"uniqueKeys": ["student_email", "package_name", "purchase_date"], "allowNullKeys": false}'::jsonb
WHERE target_table = 'trial_class_purchases';

-- income_expense_records 保持 NULL（使用 DELETE + INSERT）

-- ============================================================================
-- Step 3: 驗證
-- ============================================================================

DO $$
DECLARE
  config_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO config_count
  FROM sheet_mappings
  WHERE upsert_config IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration 078 完成!';
  RAISE NOTICE '   - 已設定 UPSERT 配置的映射: % 個', config_count;
END $$;

-- ============================================
-- Migration 083: 修正 income_expense_records UNIQUE INDEX
-- 目的：讓 sync-service 的 ON CONFLICT 語法可以正常運作
-- 執行日期：2025-12-01
-- ============================================

-- ========================================
-- 1. 刪除舊的 COALESCE index
-- ========================================

DROP INDEX IF EXISTS idx_income_expense_unique_key;

-- ========================================
-- 2. 建立 Partial Unique Index（匹配 sync-service 的 ON CONFLICT 語法）
-- sync-service 會產生：ON CONFLICT (keys) WHERE keys IS NOT NULL
-- ========================================

CREATE UNIQUE INDEX idx_income_expense_unique_key
ON income_expense_records (transaction_date, customer_email, amount_twd, income_item)
WHERE transaction_date IS NOT NULL
  AND customer_email IS NOT NULL
  AND amount_twd IS NOT NULL
  AND income_item IS NOT NULL;

-- ========================================
-- 3. 添加註釋
-- ========================================

COMMENT ON INDEX idx_income_expense_unique_key IS 'UPSERT 唯一鍵（partial index）：只對所有 key 都非 NULL 的記錄生效';

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 083 完成：UNIQUE INDEX 已修正' as status;

-- ============================================
-- Migration 084: 修正 income_expense_records UNIQUE INDEX v2
-- 目的：使用 customer_name 替代 customer_email（減少 NULL 值問題）
-- 執行日期：2025-12-01
-- ============================================

-- ========================================
-- 1. 刪除舊的 index
-- ========================================

DROP INDEX IF EXISTS idx_income_expense_unique_key;

-- ========================================
-- 2. 清理可能的重複資料（使用新的唯一鍵組合）
-- ========================================

DELETE FROM income_expense_records
WHERE id NOT IN (
  SELECT DISTINCT ON (transaction_date, customer_name, amount_twd, income_item) id
  FROM income_expense_records
  ORDER BY transaction_date, customer_name, amount_twd, income_item, created_at DESC
);

-- ========================================
-- 3. 建立新的 Partial Unique Index
-- 使用 customer_name 替代 customer_email
-- ========================================

CREATE UNIQUE INDEX idx_income_expense_unique_key
ON income_expense_records (transaction_date, customer_name, amount_twd, income_item)
WHERE transaction_date IS NOT NULL
  AND customer_name IS NOT NULL
  AND amount_twd IS NOT NULL
  AND income_item IS NOT NULL;

-- ========================================
-- 4. 添加註釋
-- ========================================

COMMENT ON INDEX idx_income_expense_unique_key IS 'UPSERT 唯一鍵 v2（partial index）：transaction_date + customer_name + amount_twd + income_item';

-- ========================================
-- 完成
-- ========================================

SELECT
  '✅ Migration 084 完成：UNIQUE INDEX 已更新為使用 customer_name' as status,
  (SELECT COUNT(*) FROM income_expense_records) as remaining_records;

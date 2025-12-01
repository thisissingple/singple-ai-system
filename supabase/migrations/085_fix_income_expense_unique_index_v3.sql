-- ============================================
-- Migration 085: 修正 income_expense_records UNIQUE INDEX v3
-- 目的：使用 COALESCE(income_item, expense_item) 處理收入/支出項目互斥的情況
-- 執行日期：2025-12-01
-- ============================================

-- ========================================
-- 1. 刪除舊的 index
-- ========================================

DROP INDEX IF EXISTS idx_income_expense_unique_key;

-- ========================================
-- 2. 清理可能的重複資料（使用新的唯一鍵組合）
-- 使用 COALESCE 將 income_item 和 expense_item 合併
-- ========================================

DELETE FROM income_expense_records
WHERE id NOT IN (
  SELECT DISTINCT ON (
    transaction_date,
    customer_name,
    amount_twd,
    COALESCE(income_item, expense_item, '')
  ) id
  FROM income_expense_records
  ORDER BY
    transaction_date,
    customer_name,
    amount_twd,
    COALESCE(income_item, expense_item, ''),
    created_at DESC
);

-- ========================================
-- 3. 建立新的 UNIQUE INDEX（使用表達式）
-- ========================================

CREATE UNIQUE INDEX idx_income_expense_unique_key
ON income_expense_records (
  transaction_date,
  customer_name,
  amount_twd,
  COALESCE(income_item, expense_item, '')
)
WHERE transaction_date IS NOT NULL
  AND customer_name IS NOT NULL
  AND amount_twd IS NOT NULL;

-- ========================================
-- 4. 添加註釋
-- ========================================

COMMENT ON INDEX idx_income_expense_unique_key IS 'UPSERT 唯一鍵 v3：transaction_date + customer_name + amount_twd + COALESCE(income_item, expense_item)';

-- ========================================
-- 完成
-- ========================================

SELECT
  '✅ Migration 085 完成：UNIQUE INDEX 已更新為使用 COALESCE(income_item, expense_item)' as status,
  (SELECT COUNT(*) FROM income_expense_records) as remaining_records;

-- ============================================
-- Migration 085: 新增 item_key 計算欄位
-- 目的：作為 UPSERT 唯一鍵，合併 income_item 和 expense_item
-- 執行日期：2025-12-01
-- ============================================

-- ========================================
-- 1. 新增 item_key 欄位
-- ========================================

ALTER TABLE income_expense_records
ADD COLUMN IF NOT EXISTS item_key TEXT;

-- ========================================
-- 2. 填入現有資料的 item_key
-- ========================================

UPDATE income_expense_records
SET item_key = COALESCE(income_item, expense_item, '');

-- ========================================
-- 3. 刪除舊的 unique index
-- ========================================

DROP INDEX IF EXISTS idx_income_expense_unique_key;

-- ========================================
-- 4. 清理可能的重複資料
-- ========================================

DELETE FROM income_expense_records
WHERE id NOT IN (
  SELECT DISTINCT ON (transaction_date, customer_name, amount_twd, item_key) id
  FROM income_expense_records
  ORDER BY transaction_date, customer_name, amount_twd, item_key, created_at DESC
);

-- ========================================
-- 5. 建立新的 UNIQUE INDEX
-- ========================================

CREATE UNIQUE INDEX idx_income_expense_unique_key
ON income_expense_records (transaction_date, customer_name, amount_twd, item_key)
WHERE transaction_date IS NOT NULL
  AND customer_name IS NOT NULL
  AND amount_twd IS NOT NULL
  AND item_key IS NOT NULL;

-- ========================================
-- 6. 添加註釋
-- ========================================

COMMENT ON COLUMN income_expense_records.item_key IS '唯一鍵欄位：COALESCE(income_item, expense_item, '''')';
COMMENT ON INDEX idx_income_expense_unique_key IS 'UPSERT 唯一鍵：transaction_date + customer_name + amount_twd + item_key';

-- ========================================
-- 完成
-- ========================================

SELECT
  '✅ Migration 085 完成：新增 item_key 欄位' as status,
  (SELECT COUNT(*) FROM income_expense_records) as remaining_records;

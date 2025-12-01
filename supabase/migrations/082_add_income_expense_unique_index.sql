-- ============================================
-- Migration 082: 為 income_expense_records 新增 UNIQUE INDEX
-- 目的：支援 UPSERT 防止重複資料
-- 執行日期：2025-12-01
-- ============================================

-- ========================================
-- 1. 先清理現有重複資料（保留最新的一筆）
-- ========================================

-- 刪除重複資料，只保留每組中 created_at 最新的一筆
DELETE FROM income_expense_records
WHERE id NOT IN (
  SELECT DISTINCT ON (transaction_date, customer_email, amount_twd, income_item) id
  FROM income_expense_records
  ORDER BY transaction_date, customer_email, amount_twd, income_item, created_at DESC
);

-- ========================================
-- 2. 建立 Partial Unique Index
-- 使用 COALESCE 處理 NULL 值
-- ========================================

-- 先刪除舊的 index（如果存在）
DROP INDEX IF EXISTS idx_income_expense_unique_key;

-- 建立新的 unique index
-- 注意：使用 COALESCE 將 NULL 轉換為空字串，確保可以正確比對
CREATE UNIQUE INDEX idx_income_expense_unique_key
ON income_expense_records (
  transaction_date,
  COALESCE(customer_email, ''),
  COALESCE(amount_twd, 0),
  COALESCE(income_item, '')
);

-- ========================================
-- 3. 添加註釋
-- ========================================

COMMENT ON INDEX idx_income_expense_unique_key IS 'UPSERT 唯一鍵：transaction_date + customer_email + amount_twd + income_item';

-- ========================================
-- 完成
-- ========================================

SELECT
  '✅ Migration 082 完成' as status,
  (SELECT COUNT(*) FROM income_expense_records) as remaining_records;

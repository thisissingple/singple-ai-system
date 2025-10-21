-- ============================================
-- Migration 030: 優化收支記錄表欄位
-- 目標：新增 Email/電話欄位，重命名欄位使其更通用
-- 執行日期：2025-10-16
-- ============================================

-- 新增欄位
ALTER TABLE income_expense_records
  ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(50);

-- 欄位重命名（使用 ALTER TABLE ... RENAME COLUMN）
-- 注意：如果欄位已經改名，這些語句會失敗，使用 IF EXISTS 處理
DO $$
BEGIN
  -- 重命名 student_id 為 customer_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_records'
    AND column_name = 'student_id'
  ) THEN
    ALTER TABLE income_expense_records RENAME COLUMN student_id TO customer_id;
  END IF;

  -- 重命名 student_name 為 customer_name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'income_expense_records'
    AND column_name = 'student_name'
  ) THEN
    ALTER TABLE income_expense_records RENAME COLUMN student_name TO customer_name;
  END IF;
END $$;

-- 新增索引（提升 Email 查詢效能）
CREATE INDEX IF NOT EXISTS idx_income_expense_email
  ON income_expense_records(customer_email)
  WHERE customer_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_income_expense_phone
  ON income_expense_records(customer_phone)
  WHERE customer_phone IS NOT NULL;

-- 新增欄位註釋
COMMENT ON COLUMN income_expense_records.customer_email IS '客戶 Email 地址';
COMMENT ON COLUMN income_expense_records.customer_phone IS '客戶電話（選填）';
COMMENT ON COLUMN income_expense_records.customer_name IS '商家/學生名稱（通用客戶名稱）';
COMMENT ON COLUMN income_expense_records.customer_id IS '客戶 ID（可關聯學生表或其他客戶表）';

-- 驗證查詢（檢查欄位是否成功建立）
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'income_expense_records'
-- AND column_name IN ('customer_email', 'customer_phone', 'customer_name', 'customer_id')
-- ORDER BY column_name;

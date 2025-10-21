-- ============================================
-- Migration 030: 新增學生姓名和 Email 欄位
-- 目標：修正收支記錄表，新增 student_name 和 student_email 欄位
-- 執行方式：在 Supabase SQL Editor 貼上執行
-- ============================================

-- 新增欄位
ALTER TABLE income_expense_records
ADD COLUMN IF NOT EXISTS student_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS student_email VARCHAR(255);

-- 新增註釋
COMMENT ON COLUMN income_expense_records.student_name IS '學生或商家名稱（顯示用）';
COMMENT ON COLUMN income_expense_records.student_email IS '學生或商家 Email';

-- 驗證
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'income_expense_records'
AND column_name IN ('student_id', 'student_name', 'student_email')
ORDER BY column_name;

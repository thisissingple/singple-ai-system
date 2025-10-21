-- ============================================
-- Migration 030: 將 sales_person 改名為 setter（電訪人員）
-- 目標：統一使用公司內部用語
-- 執行方式：在 Supabase SQL Editor 貼上執行
-- ============================================

-- 確認連到正確的資料庫（檢查是否有 income_expense_records 表）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'income_expense_records') THEN
    RAISE EXCEPTION '❌ 錯誤：連到錯誤的資料庫！找不到 income_expense_records 表';
  END IF;
END $$;

-- 1. 重新命名 income_expense_records 表中的欄位
ALTER TABLE income_expense_records
RENAME COLUMN sales_person_id TO setter_id;

-- 2. 重新命名索引
ALTER INDEX IF EXISTS idx_income_expense_sales
RENAME TO idx_income_expense_setter;

-- 3. 顯示結果
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'income_expense_records'
  AND column_name IN ('setter_id', 'teacher_id', 'consultant_id')
ORDER BY column_name;

-- 完成
SELECT '✅ Migration 030 完成：sales_person_id 已改名為 setter_id' as status;

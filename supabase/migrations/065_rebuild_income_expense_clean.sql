-- ============================================
-- Migration 065: 重建收支表（簡化版，完全對應 Google Sheets）
-- 目標：刪除舊表，建立乾淨的新表，只保留需要的欄位
-- 執行日期：2025-11-25
-- ============================================

-- ========================================
-- 1. 刪除舊表
-- ========================================

DROP TABLE IF EXISTS income_expense_records CASCADE;

-- ========================================
-- 2. 建立新的收支記錄表（簡化版）
-- ========================================

CREATE TABLE income_expense_records (
  -- 系統主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Sheets 對應欄位（按使用者指定順序）
  transaction_date DATE NOT NULL,                    -- Date
  payment_method VARCHAR(100),                        -- 付款方式
  income_item VARCHAR(255),                          -- 收入項目
  expense_item VARCHAR(255),                         -- 支出項目（新增）
  quantity INTEGER DEFAULT 1,                        -- 數量
  transaction_category VARCHAR(100),                 -- 收支類別
  customer_type VARCHAR(50),                         -- 商家類別
  teacher_name VARCHAR(100),                         -- 授課教練
  customer_name VARCHAR(255),                        -- 商家姓名/顧客姓名
  customer_email VARCHAR(255),                       -- 顧客Email
  notes TEXT,                                        -- 備註
  amount_twd DECIMAL(15,2),                         -- 金額（換算台幣）
  closer VARCHAR(100),                               -- 業績歸屬人 1（諮詢師）
  setter VARCHAR(100),                               -- 業績歸屬人 2（電訪）
  form_filler VARCHAR(100),                          -- 填表人
  deal_method VARCHAR(100),                          -- 成交方式
  consultation_source VARCHAR(100),                  -- 諮詢來源
  submitted_at TIMESTAMP,                            -- 表單提交時間

  -- 系統管理欄位
  data_source VARCHAR(20) DEFAULT 'google_sheets',  -- 資料來源標記
  created_at TIMESTAMP DEFAULT NOW(),                -- 記錄建立時間
  updated_at TIMESTAMP DEFAULT NOW()                 -- 記錄更新時間
);

-- ========================================
-- 3. 建立索引（查詢效能優化）
-- ========================================

CREATE INDEX idx_income_expense_date ON income_expense_records(transaction_date);
CREATE INDEX idx_income_expense_category ON income_expense_records(transaction_category);
CREATE INDEX idx_income_expense_customer_email ON income_expense_records(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX idx_income_expense_teacher ON income_expense_records(teacher_name) WHERE teacher_name IS NOT NULL;
CREATE INDEX idx_income_expense_closer ON income_expense_records(closer) WHERE closer IS NOT NULL;

-- ========================================
-- 4. 添加註釋
-- ========================================

COMMENT ON TABLE income_expense_records IS '收支記錄表：完全對應 Google Sheets 收支表單';

COMMENT ON COLUMN income_expense_records.transaction_date IS '交易日期';
COMMENT ON COLUMN income_expense_records.payment_method IS '付款方式（現金、信用卡、轉帳等）';
COMMENT ON COLUMN income_expense_records.income_item IS '收入項目描述';
COMMENT ON COLUMN income_expense_records.expense_item IS '支出項目描述';
COMMENT ON COLUMN income_expense_records.quantity IS '數量（預設 1）';
COMMENT ON COLUMN income_expense_records.transaction_category IS '收支類別（收入、支出、退款等）';
COMMENT ON COLUMN income_expense_records.customer_type IS '商家類別（學生、商家、其他）';
COMMENT ON COLUMN income_expense_records.teacher_name IS '授課教練姓名';
COMMENT ON COLUMN income_expense_records.customer_name IS '商家姓名或顧客姓名';
COMMENT ON COLUMN income_expense_records.customer_email IS '顧客 Email 地址';
COMMENT ON COLUMN income_expense_records.notes IS '備註';
COMMENT ON COLUMN income_expense_records.amount_twd IS '金額（換算後台幣金額）';
COMMENT ON COLUMN income_expense_records.closer IS '業績歸屬人 1（諮詢師）';
COMMENT ON COLUMN income_expense_records.setter IS '業績歸屬人 2（電訪人員）';
COMMENT ON COLUMN income_expense_records.form_filler IS '填表人姓名';
COMMENT ON COLUMN income_expense_records.deal_method IS '成交方式';
COMMENT ON COLUMN income_expense_records.consultation_source IS '諮詢來源';
COMMENT ON COLUMN income_expense_records.submitted_at IS 'Google Sheets 表單提交時間';
COMMENT ON COLUMN income_expense_records.data_source IS '資料來源標記：google_sheets=Google Sheets 同步, manual=手動輸入';

-- ========================================
-- 5. 建立更新時間觸發器
-- ========================================

CREATE OR REPLACE FUNCTION update_income_expense_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_income_expense_records_updated_at
  BEFORE UPDATE ON income_expense_records
  FOR EACH ROW
  EXECUTE FUNCTION update_income_expense_updated_at();

-- ========================================
-- 6. 啟用 RLS（Row Level Security）
-- ========================================

ALTER TABLE income_expense_records ENABLE ROW LEVEL SECURITY;

-- 允許 service_role 完全存取
CREATE POLICY "Enable all access for service_role" ON income_expense_records
  FOR ALL USING (true);

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 065 完成：收支表已重建（簡化版，完全對應 Google Sheets）' as status;

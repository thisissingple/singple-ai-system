-- ============================================
-- Migration 064: 重建收支表（對應 Google Sheets 欄位）
-- 目標：刪除舊的收支表系統，建立新的收支表完全對應 Google Sheets
-- 執行日期：2025-11-25
-- ============================================

-- ========================================
-- 1. 刪除舊的收支表系統
-- ========================================

-- 刪除所有相關表（CASCADE 會自動刪除所有依賴的觸發器和約束）
DROP TABLE IF EXISTS salary_calculations CASCADE;
DROP TABLE IF EXISTS consultant_bonus_rules CASCADE;
DROP TABLE IF EXISTS salary_rules CASCADE;
DROP TABLE IF EXISTS income_expense_records CASCADE;

-- ========================================
-- 2. 建立新的收支記錄表
-- ========================================

CREATE TABLE income_expense_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本交易資訊（對應 Google Sheets 欄位）
  transaction_date DATE NOT NULL,                       -- Date
  payment_method VARCHAR(100),                          -- 付款方式
  income_item VARCHAR(255),                             -- 收入項目
  quantity INTEGER DEFAULT 1,                           -- 數量
  transaction_category VARCHAR(100),                    -- 收支類別（收入/支出）
  course_category VARCHAR(100),                         -- 課程類別

  -- 金額資訊
  amount_twd DECIMAL(15,2) NOT NULL,                   -- 金額（台幣）
  amount_converted DECIMAL(15,2),                      -- 金額（換算台幣）
  currency VARCHAR(3) DEFAULT 'TWD',                   -- 幣別（TWD/USD/RMB等）

  -- 客戶資訊
  customer_name VARCHAR(255),                          -- 商家姓名/顧客姓名
  customer_email VARCHAR(255),                         -- 顧客Email
  customer_type VARCHAR(50),                           -- 姓名類別（學生/商家等）

  -- 人員資訊（使用專案統一命名）
  teacher_id UUID REFERENCES users(id),               -- 授課教練
  closer_id UUID REFERENCES users(id),                -- 諮詢師（closer）
  setter_id UUID REFERENCES users(id),                -- 電訪人員（setter）
  form_filler_id UUID REFERENCES users(id),           -- 填表人員

  -- 業務資訊
  deal_method VARCHAR(100),                            -- 成交方式
  consultation_source VARCHAR(100),                    -- 諮詢來源

  -- 輔助資訊
  notes TEXT,                                          -- 備註
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'google_sheets', 'system')),

  -- 狀態與審核
  is_confirmed BOOLEAN DEFAULT false,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP,

  -- 軟刪除
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  deleted_by UUID REFERENCES users(id),

  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- ========================================
-- 3. 建立索引（查詢效能優化）
-- ========================================

CREATE INDEX idx_income_expense_date ON income_expense_records(transaction_date);
CREATE INDEX idx_income_expense_category ON income_expense_records(transaction_category);
CREATE INDEX idx_income_expense_course_category ON income_expense_records(course_category);
CREATE INDEX idx_income_expense_customer_email ON income_expense_records(customer_email) WHERE customer_email IS NOT NULL;
CREATE INDEX idx_income_expense_teacher ON income_expense_records(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX idx_income_expense_closer ON income_expense_records(closer_id) WHERE closer_id IS NOT NULL;
CREATE INDEX idx_income_expense_setter ON income_expense_records(setter_id) WHERE setter_id IS NOT NULL;
CREATE INDEX idx_income_expense_confirmed ON income_expense_records(is_confirmed);
CREATE INDEX idx_income_expense_deleted ON income_expense_records(is_deleted) WHERE is_deleted = false;

-- ========================================
-- 4. 添加註釋
-- ========================================

COMMENT ON TABLE income_expense_records IS '收支記錄表：對應 Google Sheets 收支表，記錄所有收入與支出交易';

COMMENT ON COLUMN income_expense_records.transaction_date IS '交易日期';
COMMENT ON COLUMN income_expense_records.payment_method IS '付款方式（現金、信用卡、轉帳等）';
COMMENT ON COLUMN income_expense_records.income_item IS '收入項目描述';
COMMENT ON COLUMN income_expense_records.quantity IS '數量';
COMMENT ON COLUMN income_expense_records.transaction_category IS '收支類別（收入、支出、退款等）';
COMMENT ON COLUMN income_expense_records.course_category IS '課程類別';
COMMENT ON COLUMN income_expense_records.amount_twd IS '金額（台幣原始金額）';
COMMENT ON COLUMN income_expense_records.amount_converted IS '金額（換算後台幣金額）';
COMMENT ON COLUMN income_expense_records.customer_name IS '商家姓名或顧客姓名';
COMMENT ON COLUMN income_expense_records.customer_email IS '顧客 Email 地址';
COMMENT ON COLUMN income_expense_records.customer_type IS '姓名類別（學生、商家、其他）';
COMMENT ON COLUMN income_expense_records.teacher_id IS '授課教練（關聯 users 表）';
COMMENT ON COLUMN income_expense_records.closer_id IS '諮詢師（關聯 users 表）';
COMMENT ON COLUMN income_expense_records.setter_id IS '電訪人員（關聯 users 表）';
COMMENT ON COLUMN income_expense_records.form_filler_id IS '填表人員（關聯 users 表）';
COMMENT ON COLUMN income_expense_records.deal_method IS '成交方式';
COMMENT ON COLUMN income_expense_records.consultation_source IS '諮詢來源';
COMMENT ON COLUMN income_expense_records.notes IS '備註';
COMMENT ON COLUMN income_expense_records.source IS '資料來源：manual=手動輸入, google_sheets=Google Sheets 同步, system=系統自動';

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

SELECT '✅ Migration 064 完成：收支表已重建（對應 Google Sheets 欄位）' as status;

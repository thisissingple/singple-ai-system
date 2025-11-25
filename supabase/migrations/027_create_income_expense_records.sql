-- ============================================
-- Migration 029: 建立收支紀錄表系統
-- 目標：統一管理所有金流，支援薪資計算與成本獲利整合
-- 執行方式：在 Supabase SQL Editor 貼上執行
-- ============================================

-- 先清除舊表（如果存在）
DROP TABLE IF EXISTS salary_calculations CASCADE;
DROP TABLE IF EXISTS consultant_bonus_rules CASCADE;
DROP TABLE IF EXISTS salary_rules CASCADE;
DROP TABLE IF EXISTS income_expense_records CASCADE;

-- ========================================
-- 1. 收支紀錄主表
-- ========================================

CREATE TABLE income_expense_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  transaction_date DATE NOT NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('income', 'expense', 'refund')),
  category VARCHAR(100) NOT NULL,        -- 大分類（課程收入、薪資成本、廣告費用等）
  item_name VARCHAR(255) NOT NULL,       -- 項目名稱（具體描述）

  -- 金額資訊（使用匯率鎖定模式）
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TWD' CHECK (currency IN ('TWD', 'USD', 'RMB')),
  exchange_rate_used DECIMAL(10,4),      -- 鎖定匯率（記錄時的匯率）
  amount_in_twd DECIMAL(15,2),           -- TWD 金額（鎖定值）

  -- 關聯人員（外鍵，允許 NULL）
  student_id VARCHAR,                        -- 關聯學生 ID（如果是學生相關，暫不加外鍵）
  student_name VARCHAR(255),                 -- 學生/商家名稱（顯示用）
  student_email VARCHAR(255),                -- 學生/商家 Email
  teacher_id UUID REFERENCES users(id),  -- 關聯教師
  setter_id UUID REFERENCES users(id),  -- 關聯電訪人員 (Setter)
  consultant_id UUID REFERENCES users(id),    -- 關聯顧問

  -- 業務資訊
  course_code VARCHAR(100),              -- 課程編號
  course_type VARCHAR(100),              -- 課程類型（用於薪資計算差異）
  payment_method VARCHAR(50),            -- 付款方式（信用卡、轉帳、現金等）

  -- 成交類型（用於顧問獎金計算）
  deal_type VARCHAR(20) CHECK (deal_type IN ('self_deal', 'assisted_deal', null)),
  -- self_deal: 自己成交, assisted_deal: 協助成交

  -- 關聯其他系統記錄
  cost_profit_record_id UUID REFERENCES cost_profit(id),      -- 關聯成本獲利表
  trial_purchase_id UUID,                -- 關聯購課記錄（暫不加外鍵，避免循環依賴）

  -- 輔助資訊
  notes TEXT,                            -- 備註
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'ai', 'system_sync', 'imported')),

  -- 狀態與審核
  is_confirmed BOOLEAN DEFAULT false,    -- 是否已確認
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP,

  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- 建立索引（查詢效能優化）
CREATE INDEX idx_income_expense_date ON income_expense_records(transaction_date);
CREATE INDEX idx_income_expense_type ON income_expense_records(transaction_type);
CREATE INDEX idx_income_expense_category ON income_expense_records(category);
CREATE INDEX idx_income_expense_student ON income_expense_records(student_id) WHERE student_id IS NOT NULL;
CREATE INDEX idx_income_expense_teacher ON income_expense_records(teacher_id) WHERE teacher_id IS NOT NULL;
CREATE INDEX idx_income_expense_setter ON income_expense_records(setter_id) WHERE setter_id IS NOT NULL;
CREATE INDEX idx_income_expense_consultant ON income_expense_records(consultant_id) WHERE consultant_id IS NOT NULL;
CREATE INDEX idx_income_expense_confirmed ON income_expense_records(is_confirmed);

-- 註：月份查詢可使用 transaction_date 索引搭配 DATE_TRUNC 函數

-- 添加註釋
COMMENT ON TABLE income_expense_records IS '收支紀錄表：統一記錄所有金流交易，支援薪資計算與成本獲利管理整合';
COMMENT ON COLUMN income_expense_records.deal_type IS '成交類型：self_deal=自己成交, assisted_deal=協助成交（影響顧問獎金計算）';
COMMENT ON COLUMN income_expense_records.exchange_rate_used IS '鎖定匯率：記錄時的匯率，避免歷史資料被匯率變動影響';

-- ========================================
-- 2. 薪資計算規則表（支援彈性配置）
-- ========================================

CREATE TABLE salary_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 適用對象
  role VARCHAR(50) NOT NULL,             -- 角色：teacher, consultant, sales
  user_id UUID REFERENCES users(id),     -- 特定用戶（NULL = 適用所有該角色）

  -- 基本薪資
  base_salary DECIMAL(15,2) DEFAULT 0,

  -- 規則類型
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('fixed', 'tiered', 'course_based')),
  -- fixed: 固定抽成, tiered: 階梯式, course_based: 課程類型差異

  -- 規則配置（JSONB 格式，支援複雜規則）
  rule_config JSONB NOT NULL,

  -- 生效時間
  effective_from DATE NOT NULL,
  effective_to DATE,                     -- NULL = 永久有效

  -- 優先級（數字越大優先級越高）
  priority INTEGER DEFAULT 0,

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_salary_rules_role ON salary_rules(role);
CREATE INDEX idx_salary_rules_user ON salary_rules(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_salary_rules_active ON salary_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_salary_rules_effective ON salary_rules(effective_from, effective_to);

COMMENT ON TABLE salary_rules IS '薪資計算規則表：支援固定抽成、階梯式、課程類型差異等多種規則';

-- ========================================
-- 3. 顧問獎金規則表
-- ========================================

CREATE TABLE consultant_bonus_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 適用對象
  consultant_id UUID REFERENCES users(id),  -- NULL = 適用所有顧問

  -- 業績門檻
  performance_threshold DECIMAL(15,2) NOT NULL,  -- 例如：700000 (70萬)

  -- 抽成比例配置（JSONB）
  rate_config JSONB NOT NULL,
  /* 範例結構：
  {
    "selfDeal": {
      "belowThreshold": 0.08,
      "aboveThreshold": 0.12
    },
    "assistedDeal": {
      "belowThreshold": 0.05,
      "aboveThreshold": 0.08
    }
  }
  */

  -- 生效時間
  effective_from DATE NOT NULL,
  effective_to DATE,

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consultant_bonus_rules_consultant ON consultant_bonus_rules(consultant_id);
CREATE INDEX idx_consultant_bonus_rules_active ON consultant_bonus_rules(is_active) WHERE is_active = true;

COMMENT ON TABLE consultant_bonus_rules IS '顧問獎金規則表：支援業績門檻與成交類型差異';

-- ========================================
-- 4. 薪資計算記錄表（歷史記錄）
-- ========================================

CREATE TABLE salary_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 計算對象
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL,

  -- 計算期間
  calculation_month DATE NOT NULL,       -- 月份（YYYY-MM-01）

  -- 薪資組成
  base_salary DECIMAL(15,2) DEFAULT 0,
  commission DECIMAL(15,2) DEFAULT 0,
  bonus DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  total_salary DECIMAL(15,2) NOT NULL,

  -- 計算依據（關聯的收支記錄）
  income_record_ids UUID[],              -- 參與計算的收入記錄 ID 陣列

  -- 計算詳情（JSONB，記錄完整計算過程）
  calculation_details JSONB,

  -- 狀態
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),

  -- 審核資訊
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,

  -- 時間戳
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  calculated_by UUID REFERENCES users(id)
);

CREATE INDEX idx_salary_calculations_user ON salary_calculations(user_id);
CREATE INDEX idx_salary_calculations_month ON salary_calculations(calculation_month);
CREATE INDEX idx_salary_calculations_status ON salary_calculations(status);

COMMENT ON TABLE salary_calculations IS '薪資計算記錄表：保存每月薪資計算結果與詳細過程';

-- ========================================
-- 5. 預設薪資規則（範例）
-- ========================================

-- 教師固定抽成規則（10%）
INSERT INTO salary_rules (role, rule_type, base_salary, rule_config, effective_from)
VALUES (
  'teacher',
  'fixed',
  50000,
  '{"rate": 0.10}'::jsonb,
  '2025-01-01'
) ON CONFLICT DO NOTHING;

-- 顧問獎金規則（70萬門檻）
INSERT INTO consultant_bonus_rules (
  performance_threshold,
  rate_config,
  effective_from
)
VALUES (
  700000,
  '{
    "selfDeal": {
      "belowThreshold": 0.08,
      "aboveThreshold": 0.12
    },
    "assistedDeal": {
      "belowThreshold": 0.05,
      "aboveThreshold": 0.08
    }
  }'::jsonb,
  '2025-01-01'
) ON CONFLICT DO NOTHING;

-- ========================================
-- 6. 更新時間觸發器
-- ========================================

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_income_expense_records_updated_at
  BEFORE UPDATE ON income_expense_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_rules_updated_at
  BEFORE UPDATE ON salary_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_calculations_updated_at
  BEFORE UPDATE ON salary_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 完成
-- ========================================

-- 顯示建立的表
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN (
  'income_expense_records',
  'salary_rules',
  'consultant_bonus_rules',
  'salary_calculations'
)
ORDER BY tablename;

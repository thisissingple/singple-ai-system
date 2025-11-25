-- ============================================
-- Migration 066: 薪資計算器 (簡化版)
-- 目標：快速建立薪資自動計算功能
-- 執行日期：2025-11-25
-- ============================================

-- ========================================
-- 1. 員工薪資設定表
-- ========================================

CREATE TABLE IF NOT EXISTS employee_salary_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name VARCHAR(255) NOT NULL UNIQUE,  -- 員工姓名 (唯一)
  role_type VARCHAR(50) NOT NULL,               -- 角色類型: 'teacher', 'closer', 'setter'
  base_salary DECIMAL(15,2) DEFAULT 0,          -- 底薪

  -- 抽成設定
  commission_rate DECIMAL(5,2) DEFAULT 0,       -- 業績抽成比例 (%)
  point_commission_rate DECIMAL(15,2) DEFAULT 0,-- 點貢抽成金額

  -- 績效設定
  performance_bonus DECIMAL(15,2) DEFAULT 0,    -- 固定績效獎金
  phone_bonus_rate DECIMAL(15,2) DEFAULT 0,     -- 電話獎金 (Setter 專用)

  -- 其他設定
  original_bonus DECIMAL(15,2) DEFAULT 0,       -- 原獎金
  online_course_rate DECIMAL(5,2) DEFAULT 0,    -- 線上課程分潤比例

  -- 扣除項設定
  labor_insurance DECIMAL(15,2) DEFAULT 0,      -- 勞保
  health_insurance DECIMAL(15,2) DEFAULT 0,     -- 健保
  retirement_fund DECIMAL(15,2) DEFAULT 0,      -- 退休金提撥
  service_fee DECIMAL(15,2) DEFAULT 0,          -- 手續費

  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 2. 薪資計算記錄表
-- ========================================

CREATE TABLE IF NOT EXISTS salary_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- 基本薪資
  base_salary DECIMAL(15,2) DEFAULT 0,
  original_bonus DECIMAL(15,2) DEFAULT 0,

  -- 業績相關 (自動計算)
  total_revenue DECIMAL(15,2) DEFAULT 0,        -- 個人總業績
  commission_amount DECIMAL(15,2) DEFAULT 0,    -- 總應獲抽成
  point_contribution DECIMAL(15,2) DEFAULT 0,   -- 總應點貢
  online_course_revenue DECIMAL(15,2) DEFAULT 0,-- 線上課程分潤
  other_income DECIMAL(15,2) DEFAULT 0,         -- 其他

  -- 績效相關
  performance_type VARCHAR(50),                 -- 績效類型
  performance_combo VARCHAR(50),                -- 績效 combo
  performance_percentage DECIMAL(5,2),          -- 績效百分比
  total_commission_adjusted DECIMAL(15,2),      -- 總應獲抽成 (調整後)
  phone_performance_bonus DECIMAL(15,2),        -- 電話績效獎金
  performance_bonus DECIMAL(15,2),              -- 績效獎金
  leave_deduction DECIMAL(15,2),                -- 請假扣款

  -- 小計
  subtotal_before_deductions DECIMAL(15,2),     -- 未加保薪資

  -- 扣除項
  labor_insurance DECIMAL(15,2) DEFAULT 0,
  health_insurance DECIMAL(15,2) DEFAULT 0,
  retirement_fund DECIMAL(15,2) DEFAULT 0,
  service_fee DECIMAL(15,2) DEFAULT 0,

  -- 最終薪資
  total_salary DECIMAL(15,2),                   -- 實付薪資

  -- 狀態
  status VARCHAR(50) DEFAULT 'draft',           -- 'draft', 'confirmed', 'paid'
  calculation_details JSONB,                    -- 詳細計算過程 (JSON)
  notes TEXT,

  confirmed_by VARCHAR(255),
  confirmed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 3. 建立索引
-- ========================================

CREATE INDEX idx_employee_salary_settings_name ON employee_salary_settings(employee_name);
CREATE INDEX idx_salary_calculations_employee ON salary_calculations(employee_name);
CREATE INDEX idx_salary_calculations_period ON salary_calculations(period_start, period_end);
CREATE INDEX idx_salary_calculations_status ON salary_calculations(status);

-- ========================================
-- 4. 建立更新時間觸發器
-- ========================================

CREATE OR REPLACE FUNCTION update_salary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_salary_settings_updated_at
  BEFORE UPDATE ON employee_salary_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_salary_updated_at();

CREATE TRIGGER update_salary_calculations_updated_at
  BEFORE UPDATE ON salary_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_salary_updated_at();

-- ========================================
-- 5. 啟用 RLS
-- ========================================

ALTER TABLE employee_salary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_calculations ENABLE ROW LEVEL SECURITY;

-- 允許 service_role 完全存取
CREATE POLICY "Enable all access for service_role" ON employee_salary_settings
  FOR ALL USING (true);

CREATE POLICY "Enable all access for service_role" ON salary_calculations
  FOR ALL USING (true);

-- ========================================
-- 6. 插入預設員工設定 (基於現有資料)
-- ========================================

INSERT INTO employee_salary_settings (employee_name, role_type, base_salary, commission_rate, notes)
VALUES
  ('Orange', 'teacher', 0, 0, '教練 - 主要授課'),
  ('Elena', 'teacher', 0, 0, '教練'),
  ('Vicky', 'teacher', 0, 0, '教練'),
  ('Karen', 'teacher', 36000, 17.8, '教練 - 範例設定: 底薪 $36,000, 抽成 17.8%'),
  ('47', 'closer', 35000, 8, '業績人員 - Closer'),
  ('文軒', 'closer', 35000, 8, '業績人員 - Closer'),
  ('Vivi', 'setter', 32000, 0, '電訪人員 - Setter'),
  ('Wendy', 'setter', 32000, 0, '電訪人員 - Setter')
ON CONFLICT (employee_name) DO NOTHING;

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 066 完成：薪資計算器資料表已建立' as status;

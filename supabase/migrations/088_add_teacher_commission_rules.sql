-- ============================================
-- Migration 088: 老師抽成規則欄位
-- 目標：支援不同老師的抽成計算規則
-- 執行日期：2025-12-02
-- ============================================

-- ========================================
-- 1. 新增抽成類型欄位
-- ========================================

-- 抽成類型: 'fixed_rate' (固定比例), 'tiered' (階梯式)
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS commission_type VARCHAR(50) DEFAULT 'fixed_rate';

COMMENT ON COLUMN employee_salary_settings.commission_type IS '抽成類型: fixed_rate (固定比例), tiered (階梯式)';

-- ========================================
-- 2. 新增階梯式抽成欄位
-- ========================================

-- 第一階上限金額
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS tier1_max_revenue DECIMAL(15,2);

COMMENT ON COLUMN employee_salary_settings.tier1_max_revenue IS '階梯式抽成：第一階業績上限（如 105000）';

-- 第一階抽成金額（固定金額，非比例）
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS tier1_commission_amount DECIMAL(15,2);

COMMENT ON COLUMN employee_salary_settings.tier1_commission_amount IS '階梯式抽成：第一階抽成金額（如 33000）';

-- 第二階上限金額
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS tier2_max_revenue DECIMAL(15,2);

COMMENT ON COLUMN employee_salary_settings.tier2_max_revenue IS '階梯式抽成：第二階業績上限（如 150000）';

-- 第二階抽成金額（固定金額，非比例）
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS tier2_commission_amount DECIMAL(15,2);

COMMENT ON COLUMN employee_salary_settings.tier2_commission_amount IS '階梯式抽成：第二階抽成金額（如 7500）';

-- ========================================
-- 3. 新增其他業績抽成比例
-- ========================================

ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS other_revenue_rate DECIMAL(5,2) DEFAULT 8;

COMMENT ON COLUMN employee_salary_settings.other_revenue_rate IS '其他業績（體驗課、初學專案）抽成比例，預設 8%';

-- ========================================
-- 4. 設定現有老師的抽成規則
-- ========================================

-- Vicky：階梯式抽成
UPDATE employee_salary_settings
SET
  commission_type = 'tiered',
  tier1_max_revenue = 105000,
  tier1_commission_amount = 33000,
  tier2_max_revenue = 150000,
  tier2_commission_amount = 7500,
  other_revenue_rate = 8,
  commission_rate = 0  -- 清除舊的比例設定
WHERE nickname = 'Vicky' OR employee_name ILIKE '%Vicky%';

-- Elena：階梯式抽成（同 Vicky）
UPDATE employee_salary_settings
SET
  commission_type = 'tiered',
  tier1_max_revenue = 105000,
  tier1_commission_amount = 33000,
  tier2_max_revenue = 150000,
  tier2_commission_amount = 7500,
  other_revenue_rate = 8,
  commission_rate = 0
WHERE nickname = 'Elena' OR employee_name ILIKE '%Elena%';

-- Karen：固定比例 18%
UPDATE employee_salary_settings
SET
  commission_type = 'fixed_rate',
  commission_rate = 18,
  other_revenue_rate = 8,
  tier1_max_revenue = NULL,
  tier1_commission_amount = NULL,
  tier2_max_revenue = NULL,
  tier2_commission_amount = NULL
WHERE nickname = 'Karen' OR employee_name ILIKE '%Karen%';

-- Orange：固定比例 18%（預設）
UPDATE employee_salary_settings
SET
  commission_type = 'fixed_rate',
  commission_rate = 18,
  other_revenue_rate = 8
WHERE employee_name = 'Orange';

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 088 完成：老師抽成規則欄位已新增' as status;

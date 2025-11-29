-- ============================================
-- Migration 074: 績效獎金系統
-- 目標：支援績效獎金計算與連續滿分追蹤
-- 執行日期：2025-11-28
-- ============================================

-- ========================================
-- 1. 在 employee_salary_settings 新增績效獎金設定
-- ========================================

-- 是否有績效獎金資格
ALTER TABLE employee_salary_settings
ADD COLUMN IF NOT EXISTS has_performance_bonus BOOLEAN DEFAULT false;

COMMENT ON COLUMN employee_salary_settings.has_performance_bonus IS '是否有績效獎金資格';

-- ========================================
-- 2. 在 salary_calculations 新增績效追蹤欄位
-- ========================================

-- 績效分數 (每月從10分開始)
ALTER TABLE salary_calculations
ADD COLUMN IF NOT EXISTS performance_score INTEGER DEFAULT 10;

-- 連續滿分次數
ALTER TABLE salary_calculations
ADD COLUMN IF NOT EXISTS consecutive_full_score_count INTEGER DEFAULT 0;

-- 連續滿分加成金額
ALTER TABLE salary_calculations
ADD COLUMN IF NOT EXISTS consecutive_bonus DECIMAL(15,2) DEFAULT 0;

-- 抽成扣減百分比 (因績效不佳)
ALTER TABLE salary_calculations
ADD COLUMN IF NOT EXISTS commission_deduction_rate DECIMAL(5,2) DEFAULT 0;

COMMENT ON COLUMN salary_calculations.performance_score IS '當月績效分數 (1-10分)';
COMMENT ON COLUMN salary_calculations.consecutive_full_score_count IS '連續滿分次數 (用於計算連續滿分加成)';
COMMENT ON COLUMN salary_calculations.consecutive_bonus IS '連續滿分加成金額';
COMMENT ON COLUMN salary_calculations.commission_deduction_rate IS '抽成扣減百分比 (因績效不佳，如 1 或 2)';

-- ========================================
-- 3. 設定預設有績效獎金的員工
-- ========================================

-- 根據現有設定，將有抽成的員工設為有績效獎金資格
UPDATE employee_salary_settings
SET has_performance_bonus = true
WHERE commission_rate > 0 OR role_type IN ('closer', 'teacher');

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 074 完成：績效獎金系統欄位已新增' as status;

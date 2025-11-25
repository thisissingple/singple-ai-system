-- ============================================
-- Migration 067: 新增兼職人員支援
-- 目標：支援兼職員工的時薪計算
-- 執行日期：2025-11-25
-- ============================================

-- 新增兼職相關欄位到 employee_salary_settings
ALTER TABLE employee_salary_settings
ADD COLUMN employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time')),
ADD COLUMN hourly_rate DECIMAL(15,2) DEFAULT 0;

-- 新增註釋
COMMENT ON COLUMN employee_salary_settings.employment_type IS '員工類型: full_time(正職) 或 part_time(兼職)';
COMMENT ON COLUMN employee_salary_settings.hourly_rate IS '時薪(兼職員工使用)';

-- 將 Gladys 黃芷若 設定為兼職員工，並設定時薪為 $250
UPDATE employee_salary_settings
SET
  employment_type = 'part_time',
  hourly_rate = 250,
  base_salary = 0,  -- 兼職不使用底薪
  role_type = 'setter',  -- 假設是 setter 角色
  is_active = true
WHERE employee_name = 'Gladys 黃芷若';

-- 如果 Gladys 不存在，則新增
INSERT INTO employee_salary_settings (
  employee_name,
  role_type,
  employment_type,
  hourly_rate,
  base_salary,
  commission_rate,
  point_commission_rate,
  is_active,
  notes
)
SELECT
  'Gladys 黃芷若',
  'setter',
  'part_time',
  250,
  0,
  0,
  0,
  true,
  '兼職員工 - 時薪制'
WHERE NOT EXISTS (
  SELECT 1 FROM employee_salary_settings WHERE employee_name = 'Gladys 黃芷若'
);

-- 新增兼職工時欄位到 salary_calculations (用於儲存每月工時)
ALTER TABLE salary_calculations
ADD COLUMN monthly_hours DECIMAL(10,2) DEFAULT 0,
ADD COLUMN hourly_wage_subtotal DECIMAL(15,2) DEFAULT 0;

COMMENT ON COLUMN salary_calculations.monthly_hours IS '當月工作時數(兼職員工使用)';
COMMENT ON COLUMN salary_calculations.hourly_wage_subtotal IS '時薪小計 = 時薪 × 工時';

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 067 完成：兼職人員支援已新增' as status;

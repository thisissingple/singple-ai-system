-- ============================================
-- Migration 087: 薪資記錄新增職位和合約欄位
-- 目標：支援職位顯示和未來合約切換功能
-- 執行日期：2025-12-01
-- ============================================

-- ========================================
-- 1. 在 salary_calculations 新增職位欄位
-- ========================================

ALTER TABLE salary_calculations
ADD COLUMN IF NOT EXISTS role_type VARCHAR(50);

COMMENT ON COLUMN salary_calculations.role_type IS '員工職位類型: teacher, closer, setter';

-- ========================================
-- 2. 在 salary_calculations 新增合約欄位
-- ========================================

ALTER TABLE salary_calculations
ADD COLUMN IF NOT EXISTS contract_id UUID;

ALTER TABLE salary_calculations
ADD COLUMN IF NOT EXISTS contract_name VARCHAR(255);

COMMENT ON COLUMN salary_calculations.contract_id IS '所屬合約 ID (預留給未來合約系統)';
COMMENT ON COLUMN salary_calculations.contract_name IS '合約名稱 (如: 2024合約, 2025新合約)';

-- ========================================
-- 3. 回填現有資料的 role_type
-- ========================================

UPDATE salary_calculations sc
SET role_type = es.role_type
FROM employee_salary_settings es
WHERE sc.employee_name = es.employee_name
  AND sc.role_type IS NULL;

-- ========================================
-- 4. 建立索引
-- ========================================

CREATE INDEX IF NOT EXISTS idx_salary_calculations_role_type ON salary_calculations(role_type);
CREATE INDEX IF NOT EXISTS idx_salary_calculations_contract ON salary_calculations(contract_id);

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 087 完成：薪資記錄已新增職位和合約欄位' as status;

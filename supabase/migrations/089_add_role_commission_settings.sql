-- ============================================
-- Migration 089: 按角色區分的抽成設定
-- 目標：支援同一員工不同角色有不同抽成規則
-- 執行日期：2025-12-02
-- ============================================

-- ========================================
-- 1. 建立角色抽成設定表
-- ========================================

CREATE TABLE IF NOT EXISTS employee_role_commission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 角色類型: 'teacher', 'consultant', 'setter'
  role_type VARCHAR(50) NOT NULL,

  -- 抽成類型: 'fixed_rate' (固定比例), 'tiered' (階梯式)
  commission_type VARCHAR(50) NOT NULL DEFAULT 'fixed_rate',

  -- 固定比例抽成（支援小數點後兩位，如 18.50%）
  commission_rate DECIMAL(5,2),

  -- 其他業績抽成比例（支援小數點後兩位）
  other_revenue_rate DECIMAL(5,2) DEFAULT 8.00,

  -- 階梯式抽成欄位
  tier1_max_revenue DECIMAL(15,2),
  tier1_commission_amount DECIMAL(15,2),
  tier2_max_revenue DECIMAL(15,2),
  tier2_commission_amount DECIMAL(15,2),

  -- 備註
  notes TEXT,

  -- 生效日期
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,

  -- 是否啟用
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- 唯一約束：同一員工同一角色只能有一個啟用的抽成設定
  CONSTRAINT unique_active_role_commission UNIQUE (user_id, role_type, is_active)
    WHERE is_active = true
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_role_commission_user_id ON employee_role_commission(user_id);
CREATE INDEX IF NOT EXISTS idx_role_commission_role_type ON employee_role_commission(role_type);
CREATE INDEX IF NOT EXISTS idx_role_commission_active ON employee_role_commission(is_active);

-- 欄位註解
COMMENT ON TABLE employee_role_commission IS '員工按角色區分的抽成設定表';
COMMENT ON COLUMN employee_role_commission.role_type IS '角色類型: teacher (教師), consultant (諮詢師), setter (電訪人員)';
COMMENT ON COLUMN employee_role_commission.commission_type IS '抽成類型: fixed_rate (固定比例), tiered (階梯式)';
COMMENT ON COLUMN employee_role_commission.commission_rate IS '固定比例抽成率（支援小數點後兩位，如 18.50 代表 18.50%）';
COMMENT ON COLUMN employee_role_commission.other_revenue_rate IS '其他業績抽成比例（支援小數點後兩位）';

-- ========================================
-- 2. 更新 employee_compensation 表支援小數點
-- ========================================

-- 修改 commission_rate 欄位精度
ALTER TABLE employee_compensation
ALTER COLUMN commission_rate TYPE DECIMAL(5,2);

-- 新增 other_revenue_rate 欄位（如果不存在）
ALTER TABLE employee_compensation
ADD COLUMN IF NOT EXISTS other_revenue_rate DECIMAL(5,2) DEFAULT 8.00;

-- ========================================
-- 3. 更新 employee_salary_settings 表支援小數點
-- ========================================

-- 修改 commission_rate 欄位精度
ALTER TABLE employee_salary_settings
ALTER COLUMN commission_rate TYPE DECIMAL(5,2);

-- 修改 other_revenue_rate 欄位精度（確保支援小數點後兩位）
ALTER TABLE employee_salary_settings
ALTER COLUMN other_revenue_rate TYPE DECIMAL(5,2);

-- ========================================
-- 4. 初始化現有員工的角色抽成設定
-- ========================================

-- 從 business_identities 和 employee_salary_settings 匯入現有資料

-- 教師角色 - 從 employee_salary_settings 複製
INSERT INTO employee_role_commission (user_id, role_type, commission_type, commission_rate, other_revenue_rate,
  tier1_max_revenue, tier1_commission_amount, tier2_max_revenue, tier2_commission_amount, effective_from)
SELECT DISTINCT
  bi.user_id,
  'teacher' as role_type,
  COALESCE(ess.commission_type, 'fixed_rate') as commission_type,
  COALESCE(ess.commission_rate, 18.00) as commission_rate,
  COALESCE(ess.other_revenue_rate, 8.00) as other_revenue_rate,
  ess.tier1_max_revenue,
  ess.tier1_commission_amount,
  ess.tier2_max_revenue,
  ess.tier2_commission_amount,
  COALESCE(bi.effective_from, CURRENT_DATE) as effective_from
FROM business_identities bi
LEFT JOIN users u ON bi.user_id = u.id
LEFT JOIN employee_salary_settings ess ON (
  ess.employee_name = CONCAT(u.first_name, ' ', u.last_name)
  OR ess.nickname = u.nickname
  OR ess.employee_name ILIKE '%' || u.nickname || '%'
)
WHERE bi.identity_type = 'teacher' AND bi.is_active = true
ON CONFLICT DO NOTHING;

-- 諮詢師角色 - 預設 15% 一般業績, 8% 其他業績
INSERT INTO employee_role_commission (user_id, role_type, commission_type, commission_rate, other_revenue_rate, effective_from)
SELECT DISTINCT
  bi.user_id,
  'consultant' as role_type,
  'fixed_rate' as commission_type,
  15.00 as commission_rate,
  8.00 as other_revenue_rate,
  COALESCE(bi.effective_from, CURRENT_DATE) as effective_from
FROM business_identities bi
WHERE bi.identity_type = 'consultant' AND bi.is_active = true
ON CONFLICT DO NOTHING;

-- 電訪人員角色 - 預設 10% 一般業績, 8% 其他業績
INSERT INTO employee_role_commission (user_id, role_type, commission_type, commission_rate, other_revenue_rate, effective_from)
SELECT DISTINCT
  bi.user_id,
  'setter' as role_type,
  'fixed_rate' as commission_type,
  10.00 as commission_rate,
  8.00 as other_revenue_rate,
  COALESCE(bi.effective_from, CURRENT_DATE) as effective_from
FROM business_identities bi
WHERE bi.identity_type = 'setter' AND bi.is_active = true
ON CONFLICT DO NOTHING;

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 089 完成：按角色區分的抽成設定表已建立' as status;

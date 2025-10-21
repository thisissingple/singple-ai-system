-- ============================================
-- Migration 031: 建立完整人資管理系統
-- 目標：整合員工資料、薪資結構、勞健保、業務身份對應
-- 執行方式：使用 psql "$SUPABASE_DB_URL" -f 此檔案
-- ============================================

-- ⚠️ 驗證：確保連到正確的資料庫（必須有 income_expense_records 表）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'income_expense_records') THEN
    RAISE EXCEPTION '錯誤：找不到 income_expense_records 表。請確認連到正確的 Supabase 資料庫，而非 Neondb！';
  END IF;
  RAISE NOTICE '✅ 資料庫驗證通過：已找到 income_expense_records 表';
END $$;

-- ========================================
-- 1. 員工基本資料表
-- ========================================

CREATE TABLE employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 身份證件
  national_id VARCHAR(10) UNIQUE,              -- 身分證字號
  national_id_file_url VARCHAR,                -- 身分證掃描檔 URL

  -- 地址資訊
  residential_address TEXT,                    -- 戶籍地址
  mailing_address TEXT,                        -- 通訊地址

  -- 緊急聯絡人
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(50),

  -- 聘用資訊
  employee_number VARCHAR(20) UNIQUE,          -- 員工編號（自動生成 E001, E002...）
  hire_date DATE,                              -- 到職日
  resign_date DATE,                            -- 離職日
  employment_type VARCHAR(20) DEFAULT 'full_time' CHECK (
    employment_type IN ('full_time', 'part_time', 'contract', 'intern')
  ),

  -- 合約文件
  contract_file_url VARCHAR,                   -- 合約掃描檔 URL
  contract_start_date DATE,
  contract_end_date DATE,

  -- 銀行資訊（薪資轉帳用）
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(50),
  bank_branch VARCHAR(100),

  -- 備註
  hr_notes TEXT,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT unique_user_profile UNIQUE(user_id)
);

CREATE INDEX idx_employee_profiles_user_id ON employee_profiles(user_id);
CREATE INDEX idx_employee_profiles_national_id ON employee_profiles(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX idx_employee_profiles_employee_number ON employee_profiles(employee_number) WHERE employee_number IS NOT NULL;

COMMENT ON TABLE employee_profiles IS '員工基本資料表：包含身份證件、地址、緊急聯絡人、聘用資訊等';
COMMENT ON COLUMN employee_profiles.employee_number IS '員工編號（自動生成 E001, E002...）';

-- ========================================
-- 2. 員工薪資結構表（支援歷史記錄）
-- ========================================

CREATE TABLE employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 薪資結構
  base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,       -- 底薪
  commission_type VARCHAR(20) CHECK (
    commission_type IN ('none', 'fixed', 'tiered', 'performance', 'course_based')
  ),
  commission_config JSONB,                            -- 抽成規則（JSON 格式）

  /* commission_config 範例：

  1. 固定抽成：
  {
    "type": "fixed",
    "rate": 0.10,
    "description": "所有課程統一抽成 10%"
  }

  2. 階梯式抽成（顧問）：
  {
    "type": "tiered",
    "threshold": 700000,
    "rates": {
      "selfDeal": {
        "belowThreshold": 0.08,
        "aboveThreshold": 0.12
      },
      "assistedDeal": {
        "belowThreshold": 0.05,
        "aboveThreshold": 0.08
      }
    }
  }

  3. 課程類型差異：
  {
    "type": "course_based",
    "rates": {
      "regular": 0.10,
      "premium": 0.15,
      "vip": 0.20
    }
  }
  */

  -- 其他津貼
  allowances JSONB,
  /* allowances 範例：
  {
    "transportation": 2000,
    "meal": 3000,
    "phone": 1000
  }
  */

  -- 生效期間（支援歷史記錄）
  effective_from DATE NOT NULL,
  effective_to DATE,                                  -- NULL = 目前有效

  -- 調薪資訊
  adjustment_reason TEXT,                             -- 調薪原因
  approved_by UUID REFERENCES users(id),           -- 審核人
  approved_at TIMESTAMPTZ,                            -- 審核時間

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_compensation_user_id ON employee_compensation(user_id);
CREATE INDEX idx_compensation_active ON employee_compensation(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_compensation_effective ON employee_compensation(effective_from, effective_to);

COMMENT ON TABLE employee_compensation IS '員工薪資結構表：支援底薪、抽成、津貼，並記錄歷史調薪記錄';
COMMENT ON COLUMN employee_compensation.commission_config IS '抽成規則（JSONB）：支援固定抽成、階梯式、課程類型差異等';

-- ========================================
-- 3. 員工勞健保資料表（支援歷史記錄）
-- ========================================

CREATE TABLE employee_insurance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 勞保
  labor_insurance_grade INTEGER,                      -- 勞保投保級距
  labor_insurance_amount DECIMAL(10,2),               -- 勞保費用（個人負擔部分）
  labor_insurance_employer_amount DECIMAL(10,2),      -- 勞保費用（雇主負擔部分）

  -- 健保
  health_insurance_grade INTEGER,                     -- 健保投保級距
  health_insurance_amount DECIMAL(10,2),              -- 健保費用（個人負擔部分）
  health_insurance_employer_amount DECIMAL(10,2),     -- 健保費用（雇主負擔部分）

  -- 退休金
  pension_salary_base DECIMAL(15,2),                  -- 退休金提撥薪資基數
  pension_employer_rate DECIMAL(5,4) DEFAULT 0.06,    -- 雇主提撥比例（預設 6%）
  pension_employee_rate DECIMAL(5,4) DEFAULT 0.00,    -- 員工自提比例（預設 0%）
  pension_employer_amount DECIMAL(10,2),              -- 雇主提撥金額
  pension_employee_amount DECIMAL(10,2),              -- 員工自提金額

  -- 生效期間
  effective_from DATE NOT NULL,
  effective_to DATE,                                  -- NULL = 目前有效

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 備註
  notes TEXT,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_insurance_user_id ON employee_insurance(user_id);
CREATE INDEX idx_insurance_active ON employee_insurance(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_insurance_effective ON employee_insurance(effective_from, effective_to);

COMMENT ON TABLE employee_insurance IS '員工勞健保資料表：記錄勞保、健保、退休金投保級距與扣除額';

-- ========================================
-- 4. 業務身份對應表（支援多重身份）
-- ========================================

CREATE TABLE business_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 身份類型
  identity_type VARCHAR(20) NOT NULL CHECK (
    identity_type IN ('teacher', 'consultant', 'sales', 'telemarketing')
  ),

  -- 業務編號（自動生成）
  identity_code VARCHAR(20) NOT NULL UNIQUE,          -- T001, C001, S001, TM001

  -- 顯示名稱（用於顯示和匹配歷史資料）
  display_name VARCHAR(100),                          -- Karen, 鄭文軒, 47 等

  -- 生效期間
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,                                  -- NULL = 目前有效

  -- 狀態
  is_active BOOLEAN DEFAULT true,

  -- 備註
  notes TEXT,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT unique_user_identity_active UNIQUE(user_id, identity_type, is_active)
);

CREATE INDEX idx_business_identities_user ON business_identities(user_id);
CREATE INDEX idx_business_identities_type ON business_identities(identity_type);
CREATE INDEX idx_business_identities_code ON business_identities(identity_code);
CREATE INDEX idx_business_identities_active ON business_identities(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_business_identities_display_name ON business_identities(display_name) WHERE display_name IS NOT NULL;

COMMENT ON TABLE business_identities IS '業務身份對應表：支援一個使用者擁有多個業務身份（如同時是教師和諮詢師）';
COMMENT ON COLUMN business_identities.identity_code IS '業務編號（自動生成）：T001=教師, C001=諮詢師, S001=銷售, TM001=電訪';
COMMENT ON COLUMN business_identities.display_name IS '顯示名稱：用於匹配歷史資料中的名稱（如 CSV 中的「授課教練：Karen」）';

-- ========================================
-- 5. 部門資料表（可選）
-- ========================================

CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) NOT NULL UNIQUE,                  -- 部門代碼 DEPT-001
  name VARCHAR(100) NOT NULL,                        -- 部門名稱（業務部、教學部）
  description TEXT,
  manager_id UUID REFERENCES users(id),           -- 部門主管
  parent_department_id UUID REFERENCES departments(id), -- 上層部門（支援階層）
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_departments_code ON departments(code);
CREATE INDEX idx_departments_manager ON departments(manager_id) WHERE manager_id IS NOT NULL;

COMMENT ON TABLE departments IS '部門資料表：管理組織架構，支援階層式部門';

-- ========================================
-- 6. 自動生成業務編號的函數
-- ========================================

-- 自動生成 employee_number (E001, E002, ...)
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TRIGGER AS $$
DECLARE
  max_number INTEGER;
  new_number VARCHAR(20);
BEGIN
  IF NEW.employee_number IS NULL THEN
    -- 取得目前最大編號
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(employee_number FROM 2) AS INTEGER)),
      0
    ) INTO max_number
    FROM employee_profiles
    WHERE employee_number ~ '^E[0-9]+$';

    -- 生成新編號
    new_number := 'E' || LPAD((max_number + 1)::TEXT, 3, '0');
    NEW.employee_number := new_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_employee_number
  BEFORE INSERT ON employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_number();

-- 自動生成 identity_code (T001, C001, S001, TM001)
CREATE OR REPLACE FUNCTION generate_identity_code()
RETURNS TRIGGER AS $$
DECLARE
  max_number INTEGER;
  new_code VARCHAR(20);
  prefix VARCHAR(5);
BEGIN
  IF NEW.identity_code IS NULL OR NEW.identity_code = '' THEN
    -- 根據身份類型決定前綴
    CASE NEW.identity_type
      WHEN 'teacher' THEN prefix := 'T';
      WHEN 'consultant' THEN prefix := 'C';
      WHEN 'sales' THEN prefix := 'S';
      WHEN 'telemarketing' THEN prefix := 'TM';
      ELSE prefix := 'X';
    END CASE;

    -- 取得該類型目前最大編號
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(identity_code FROM LENGTH(prefix) + 1) AS INTEGER)),
      0
    ) INTO max_number
    FROM business_identities
    WHERE identity_type = NEW.identity_type
      AND identity_code ~ ('^' || prefix || '[0-9]+$');

    -- 生成新編號
    new_code := prefix || LPAD((max_number + 1)::TEXT, 3, '0');
    NEW.identity_code := new_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_identity_code
  BEFORE INSERT ON business_identities
  FOR EACH ROW
  EXECUTE FUNCTION generate_identity_code();

-- ========================================
-- 7. 自動更新 updated_at 觸發器
-- ========================================

CREATE TRIGGER update_employee_profiles_updated_at
  BEFORE UPDATE ON employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_compensation_updated_at
  BEFORE UPDATE ON employee_compensation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_insurance_updated_at
  BEFORE UPDATE ON employee_insurance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_identities_updated_at
  BEFORE UPDATE ON business_identities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 8. 修改現有資料表（新增業務編號欄位）
-- ========================================

-- trial_class_attendance 新增 teacher_code
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS teacher_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS consultant_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS sales_code VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_trial_attendance_teacher_code
  ON trial_class_attendance(teacher_code) WHERE teacher_code IS NOT NULL;

COMMENT ON COLUMN trial_class_attendance.teacher_code IS '教師業務編號（對應 business_identities.identity_code）';

-- income_expense_records 已經有 UUID 外鍵，保持不變
-- 檢查表是否存在後再新增業務編號欄位
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'income_expense_records') THEN
    ALTER TABLE income_expense_records
      ADD COLUMN IF NOT EXISTS teacher_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS consultant_code VARCHAR(20),
      ADD COLUMN IF NOT EXISTS sales_code VARCHAR(20);

    CREATE INDEX IF NOT EXISTS idx_income_expense_teacher_code
      ON income_expense_records(teacher_code) WHERE teacher_code IS NOT NULL;

    RAISE NOTICE '✅ 已為 income_expense_records 新增業務編號欄位';
  ELSE
    RAISE NOTICE '⚠️ 跳過：income_expense_records 表不存在';
  END IF;
END $$;

COMMENT ON COLUMN income_expense_records.teacher_code IS '教師業務編號（補充欄位，主要還是用 teacher_id UUID）';

-- ========================================
-- 9. 輔助查詢函數
-- ========================================

-- 取得使用者的所有業務身份編號
CREATE OR REPLACE FUNCTION get_user_identity_codes(p_user_id UUID, p_identity_type VARCHAR DEFAULT NULL)
RETURNS TEXT[] AS $$
BEGIN
  IF p_identity_type IS NULL THEN
    RETURN ARRAY(
      SELECT identity_code
      FROM business_identities
      WHERE user_id = p_user_id
        AND is_active = true
    );
  ELSE
    RETURN ARRAY(
      SELECT identity_code
      FROM business_identities
      WHERE user_id = p_user_id
        AND identity_type = p_identity_type
        AND is_active = true
    );
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_user_identity_codes IS '取得使用者的所有業務身份編號（可指定類型）';

-- 根據業務編號查詢使用者 ID
CREATE OR REPLACE FUNCTION get_user_by_identity_code(p_identity_code VARCHAR)
RETURNS UUID AS $$
DECLARE
  result_user_id UUID;
BEGIN
  SELECT user_id INTO result_user_id
  FROM business_identities
  WHERE identity_code = p_identity_code
    AND is_active = true
  LIMIT 1;

  RETURN result_user_id;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_user_by_identity_code IS '根據業務編號查詢使用者 UUID';

-- ========================================
-- 10. 插入預設部門（範例）
-- ========================================

INSERT INTO departments (code, name, description, is_active) VALUES
  ('DEPT-001', '業務部', '負責課程銷售與學員諮詢', true),
  ('DEPT-002', '教學部', '負責課程教學與教學品質管理', true),
  ('DEPT-003', '行政部', '負責人事、財務、總務等行政業務', true),
  ('DEPT-004', '營運部', '負責整體營運規劃與管理', true)
ON CONFLICT (code) DO NOTHING;

-- ========================================
-- 11. 資料驗證檢查
-- ========================================

-- 檢查是否有員工資料但沒有對應的 user
DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM employee_profiles ep
  LEFT JOIN users u ON u.id = ep.user_id
  WHERE u.id IS NULL;

  IF orphan_count > 0 THEN
    RAISE WARNING '發現 % 筆員工資料沒有對應的使用者帳號', orphan_count;
  END IF;
END $$;

-- ========================================
-- 完成
-- ========================================

-- 顯示建立的表
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN (
  'employee_profiles',
  'employee_compensation',
  'employee_insurance',
  'business_identities',
  'departments'
)
ORDER BY tablename;

-- 顯示建立的函數
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'generate_employee_number',
  'generate_identity_code',
  'get_user_identity_codes',
  'get_user_by_identity_code'
)
ORDER BY routine_name;

-- ============================================
-- Migration 032: 建立休假記錄系統
-- 目標：記錄員工請假、特休、病假等資料
-- 執行方式：使用 ./scripts/run-migration-safely.sh
-- ============================================

-- ⚠️ 驗證：確保連到正確的資料庫
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'income_expense_records') THEN
    RAISE EXCEPTION '錯誤：找不到 income_expense_records 表。請確認連到正確的 Supabase 資料庫！';
  END IF;
  RAISE NOTICE '✅ 資料庫驗證通過：已找到 income_expense_records 表';
END $$;

-- ========================================
-- 1. 休假記錄表
-- ========================================

CREATE TABLE leave_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 員工資訊
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_code VARCHAR(20),                      -- 員工編號（對應 employee_profiles.employee_number）

  -- 休假類型
  leave_type VARCHAR(20) NOT NULL CHECK (
    leave_type IN (
      'annual',           -- 特休
      'sick',             -- 病假
      'personal',         --事假
      'marriage',         -- 婚假
      'maternity',        -- 產假
      'paternity',        -- 陪產假
      'bereavement',      -- 喪假
      'menstrual',        -- 生理假
      'unpaid',           -- 無薪假
      'compensatory',     -- 補休
      'other'             -- 其他
    )
  ),

  -- 休假時間
  leave_start_date DATE NOT NULL,
  leave_end_date DATE NOT NULL,
  leave_hours DECIMAL(5,2),                       -- 休假時數（半天=4, 全天=8）
  leave_days DECIMAL(5,2),                        -- 休假天數

  -- 申請資訊
  reason TEXT,                                    -- 請假事由
  attachment_url VARCHAR,                         -- 證明文件 URL（如醫生證明）

  -- 審核狀態
  status VARCHAR(20) DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  ),
  approved_by UUID REFERENCES users(id),          -- 審核人
  approved_at TIMESTAMPTZ,                        -- 審核時間
  rejection_reason TEXT,                          -- 拒絕原因

  -- 代理人
  substitute_user_id UUID REFERENCES users(id),   -- 職務代理人

  -- 備註
  notes TEXT,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- 約束：結束日期不能早於開始日期
  CONSTRAINT leave_end_after_start CHECK (leave_end_date >= leave_start_date),
  -- 約束：休假時數和天數必須大於 0
  CONSTRAINT leave_positive_duration CHECK (
    (leave_hours IS NULL OR leave_hours > 0) AND
    (leave_days IS NULL OR leave_days > 0)
  )
);

-- 建立索引
CREATE INDEX idx_leave_records_user_id ON leave_records(user_id);
CREATE INDEX idx_leave_records_employee_code ON leave_records(employee_code) WHERE employee_code IS NOT NULL;
CREATE INDEX idx_leave_records_leave_type ON leave_records(leave_type);
CREATE INDEX idx_leave_records_status ON leave_records(status);
CREATE INDEX idx_leave_records_date_range ON leave_records(leave_start_date, leave_end_date);
CREATE INDEX idx_leave_records_created_at ON leave_records(created_at DESC);

COMMENT ON TABLE leave_records IS '休假記錄表：記錄員工各類型請假資料，支援審核流程';
COMMENT ON COLUMN leave_records.leave_type IS '休假類型：annual=特休, sick=病假, personal=事假, marriage=婚假, maternity=產假, paternity=陪產假, bereavement=喪假, menstrual=生理假, unpaid=無薪假, compensatory=補休, other=其他';
COMMENT ON COLUMN leave_records.status IS '審核狀態：pending=待審核, approved=已核准, rejected=已拒絕, cancelled=已取消';

-- ========================================
-- 2. 休假額度表（年度可用額度）
-- ========================================

CREATE TABLE leave_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 員工資訊
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- 年度與類型
  year INTEGER NOT NULL,                          -- 年度（例如 2025）
  leave_type VARCHAR(20) NOT NULL CHECK (
    leave_type IN ('annual', 'sick', 'personal', 'compensatory', 'other')
  ),

  -- 額度資訊
  total_quota DECIMAL(5,2) NOT NULL DEFAULT 0,    -- 年度總額度（天數）
  used_quota DECIMAL(5,2) NOT NULL DEFAULT 0,     -- 已使用額度
  remaining_quota DECIMAL(5,2) GENERATED ALWAYS AS (total_quota - used_quota) STORED,

  -- 有效期限
  valid_from DATE NOT NULL,
  valid_until DATE NOT NULL,

  -- 備註
  notes TEXT,

  -- 時間戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 唯一約束：每個員工每年每種類型只能有一筆額度
  CONSTRAINT unique_user_year_type UNIQUE(user_id, year, leave_type)
);

CREATE INDEX idx_leave_quotas_user_id ON leave_quotas(user_id);
CREATE INDEX idx_leave_quotas_year ON leave_quotas(year);
CREATE INDEX idx_leave_quotas_type ON leave_quotas(leave_type);

COMMENT ON TABLE leave_quotas IS '休假額度表：記錄員工年度各類型休假的可用額度';
COMMENT ON COLUMN leave_quotas.remaining_quota IS '剩餘額度（自動計算）= 總額度 - 已使用額度';

-- ========================================
-- 3. 自動更新 updated_at 觸發器
-- ========================================

CREATE TRIGGER update_leave_records_updated_at
  BEFORE UPDATE ON leave_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leave_quotas_updated_at
  BEFORE UPDATE ON leave_quotas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 4. 輔助函數：計算休假天數
-- ========================================

CREATE OR REPLACE FUNCTION calculate_leave_days(
  p_start_date DATE,
  p_end_date DATE,
  p_include_weekends BOOLEAN DEFAULT false
)
RETURNS DECIMAL AS $$
DECLARE
  total_days INTEGER;
  working_days INTEGER := 0;
  curr_date DATE;
BEGIN
  -- 如果包含週末，直接計算總天數
  IF p_include_weekends THEN
    RETURN (p_end_date - p_start_date + 1);
  END IF;

  -- 計算工作日（排除週末）
  curr_date := p_start_date;
  WHILE curr_date <= p_end_date LOOP
    -- 0 = Sunday, 6 = Saturday
    IF EXTRACT(DOW FROM curr_date) NOT IN (0, 6) THEN
      working_days := working_days + 1;
    END IF;
    curr_date := curr_date + 1;
  END LOOP;

  RETURN working_days;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_leave_days IS '計算兩個日期之間的天數（可選擇是否包含週末）';

-- ========================================
-- 5. 輔助函數：取得員工剩餘休假額度
-- ========================================

CREATE OR REPLACE FUNCTION get_remaining_leave_quota(
  p_user_id UUID,
  p_leave_type VARCHAR,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS DECIMAL AS $$
DECLARE
  remaining DECIMAL;
BEGIN
  SELECT remaining_quota INTO remaining
  FROM leave_quotas
  WHERE user_id = p_user_id
    AND year = p_year
    AND leave_type = p_leave_type;

  RETURN COALESCE(remaining, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_remaining_leave_quota IS '取得員工指定年度、指定類型的剩餘休假額度';

-- ========================================
-- 6. 預設休假額度（範例）
-- ========================================

-- 為 Karen 建立 2025 年度特休額度（假設 10 天）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM users WHERE id = '2e259b11-5906-4647-b19a-ec43a3bbe537') THEN
    INSERT INTO leave_quotas (user_id, year, leave_type, total_quota, valid_from, valid_until)
    VALUES
      ('2e259b11-5906-4647-b19a-ec43a3bbe537', 2025, 'annual', 10, '2025-01-01', '2025-12-31'),
      ('2e259b11-5906-4647-b19a-ec43a3bbe537', 2025, 'sick', 30, '2025-01-01', '2025-12-31'),
      ('2e259b11-5906-4647-b19a-ec43a3bbe537', 2025, 'personal', 14, '2025-01-01', '2025-12-31')
    ON CONFLICT (user_id, year, leave_type) DO NOTHING;

    RAISE NOTICE '✅ 已為 Karen 建立 2025 年度休假額度';
  END IF;
END $$;

-- ========================================
-- 7. 建立測試資料（可選）
-- ========================================

-- 範例：Karen 請一天特休
-- INSERT INTO leave_records (
--   user_id,
--   leave_type,
--   leave_start_date,
--   leave_end_date,
--   leave_days,
--   reason,
--   status
-- )
-- VALUES (
--   '2e259b11-5906-4647-b19a-ec43a3bbe537',
--   'annual',
--   '2025-10-20',
--   '2025-10-20',
--   1,
--   '個人事務',
--   'approved'
-- );

-- ========================================
-- 完成
-- ========================================

-- 顯示建立的表
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN ('leave_records', 'leave_quotas')
ORDER BY tablename;

-- 顯示建立的函數
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN ('calculate_leave_days', 'get_remaining_leave_quota')
ORDER BY routine_name;

-- ============================================
-- Migration 010: Minimal Sync Schema
-- 目標：穩定同步三張表，只包含必要欄位
-- 日期: 2025-10-04
-- ============================================

-- ============================================
-- 1. trial_class_attendance (體驗課上課記錄)
-- ============================================

-- 必填欄位
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS class_date DATE,
  ADD COLUMN IF NOT EXISTS teacher_name TEXT;

-- 業務欄位
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS no_conversion_reason TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 追蹤欄位
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- 時間戳記
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 必要索引
CREATE INDEX IF NOT EXISTS idx_trial_attendance_email ON trial_class_attendance(student_email);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_class_date ON trial_class_attendance(class_date);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_worksheet ON trial_class_attendance(source_worksheet_id);

-- ============================================
-- 2. trial_class_purchase (體驗課購買記錄)
-- ============================================

-- 必填欄位
ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date DATE;

-- 業務欄位
ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS package_price INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS occupation TEXT;

-- 追蹤欄位
ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- 時間戳記
ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 必要索引
CREATE INDEX IF NOT EXISTS idx_trial_purchase_email ON trial_class_purchase(student_email);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_purchase_date ON trial_class_purchase(purchase_date);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_worksheet ON trial_class_purchase(source_worksheet_id);

-- ============================================
-- 3. eods_for_closers (咨詢師業績記錄)
-- ============================================

-- 必填欄位
ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS closer_name TEXT;

-- 業務欄位
ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS deal_date DATE,
  ADD COLUMN IF NOT EXISTS consultation_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS caller_name TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consultation_result TEXT,
  ADD COLUMN IF NOT EXISTS actual_amount INTEGER,
  ADD COLUMN IF NOT EXISTS package_price INTEGER;

-- 追蹤欄位
ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- 時間戳記
ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 必要索引
CREATE INDEX IF NOT EXISTS idx_eods_email ON eods_for_closers(student_email);
CREATE INDEX IF NOT EXISTS idx_eods_deal_date ON eods_for_closers(deal_date);
CREATE INDEX IF NOT EXISTS idx_eods_worksheet ON eods_for_closers(source_worksheet_id);
CREATE INDEX IF NOT EXISTS idx_eods_closer_name ON eods_for_closers(closer_name);

-- ============================================
-- 4. Row Level Security (RLS)
-- ============================================

-- 啟用 RLS
ALTER TABLE trial_class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_class_purchase ENABLE ROW LEVEL SECURITY;
ALTER TABLE eods_for_closers ENABLE ROW LEVEL SECURITY;

-- service_role 完全存取（用於同步服務）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trial_class_attendance'
    AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access"
      ON trial_class_attendance
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trial_class_purchase'
    AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access"
      ON trial_class_purchase
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'eods_for_closers'
    AND policyname = 'Service role has full access'
  ) THEN
    CREATE POLICY "Service role has full access"
      ON eods_for_closers
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- authenticated users 讀取（用於前端查詢）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trial_class_attendance'
    AND policyname = 'Authenticated users can read'
  ) THEN
    CREATE POLICY "Authenticated users can read"
      ON trial_class_attendance
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'trial_class_purchase'
    AND policyname = 'Authenticated users can read'
  ) THEN
    CREATE POLICY "Authenticated users can read"
      ON trial_class_purchase
      FOR SELECT TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'eods_for_closers'
    AND policyname = 'Authenticated users can read'
  ) THEN
    CREATE POLICY "Authenticated users can read"
      ON eods_for_closers
      FOR SELECT TO authenticated
      USING (true);
  END IF;
END $$;

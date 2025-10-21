-- ============================================
-- Migration 007: Schema Authority - Final Fix
-- 根據 configs/supabase-schema-authority.ts 的定義
-- 確保所有欄位都存在且型別正確
-- 日期: 2025-10-04
-- ============================================

-- ============================================
-- 1. trial_class_attendance
-- ============================================

-- 確保所有必要欄位存在
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS class_date DATE,
  ADD COLUMN IF NOT EXISTS teacher_name TEXT,
  ADD COLUMN IF NOT EXISTS teacher_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 2. trial_class_purchase
-- ============================================

ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS teacher_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS package_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 3. eods_for_closers
-- ============================================

ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS closer_name TEXT,
  ADD COLUMN IF NOT EXISTS deal_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS closer_id TEXT,
  ADD COLUMN IF NOT EXISTS setter_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS report_date DATE,
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 4. 索引優化
-- ============================================

-- trial_class_attendance
CREATE INDEX IF NOT EXISTS idx_trial_attendance_email ON trial_class_attendance(student_email);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_worksheet ON trial_class_attendance(source_worksheet_id);
CREATE INDEX IF NOT EXISTS idx_trial_attendance_synced ON trial_class_attendance(synced_at);

-- trial_class_purchase
CREATE INDEX IF NOT EXISTS idx_trial_purchase_email ON trial_class_purchase(student_email);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_worksheet ON trial_class_purchase(source_worksheet_id);
CREATE INDEX IF NOT EXISTS idx_trial_purchase_synced ON trial_class_purchase(synced_at);

-- eods_for_closers
CREATE INDEX IF NOT EXISTS idx_eods_email ON eods_for_closers(student_email);
CREATE INDEX IF NOT EXISTS idx_eods_worksheet ON eods_for_closers(source_worksheet_id);
CREATE INDEX IF NOT EXISTS idx_eods_synced ON eods_for_closers(synced_at);

-- ============================================
-- 5. 註解說明
-- ============================================

COMMENT ON COLUMN trial_class_attendance.raw_data IS '儲存 Google Sheets 所有原始資料的 JSONB 欄位';
COMMENT ON COLUMN trial_class_attendance.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN trial_class_attendance.origin_row_index IS 'Google Sheets 的原始列號（從 0 開始）';
COMMENT ON COLUMN trial_class_attendance.synced_at IS '最後同步時間';

COMMENT ON COLUMN trial_class_purchase.raw_data IS '儲存 Google Sheets 所有原始資料的 JSONB 欄位';
COMMENT ON COLUMN trial_class_purchase.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN trial_class_purchase.origin_row_index IS 'Google Sheets 的原始列號（從 0 開始）';
COMMENT ON COLUMN trial_class_purchase.synced_at IS '最後同步時間';

COMMENT ON COLUMN eods_for_closers.raw_data IS '儲存 Google Sheets 所有原始資料的 JSONB 欄位';
COMMENT ON COLUMN eods_for_closers.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN eods_for_closers.origin_row_index IS 'Google Sheets 的原始列號（從 0 開始）';
COMMENT ON COLUMN eods_for_closers.synced_at IS '最後同步時間';

-- ============================================
-- 6. 強制重新載入 PostgREST schema cache
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- Migration 006: Complete Schema Upgrade
-- 根據 Google Sheets 實際欄位完整重建 schema
-- 日期: 2025-10-04
-- ============================================

-- ============================================
-- 1. trial_class_attendance (體驗課上課記錄表)
-- ============================================

-- 新增核心追蹤欄位
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- 新增業務邏輯欄位
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS no_conversion_reason TEXT,
  ADD COLUMN IF NOT EXISTS class_transcript TEXT;

-- 移除不再使用的欄位
ALTER TABLE trial_class_attendance
  DROP COLUMN IF EXISTS attendance_status,
  DROP COLUMN IF EXISTS class_type;

-- ============================================
-- 2. trial_class_purchase (體驗課購買記錄表)
-- ============================================

-- 新增核心追蹤欄位
ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- 新增業務邏輯欄位
ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS trial_classes_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_classes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_status TEXT,
  ADD COLUMN IF NOT EXISTS updated_date DATE,
  ADD COLUMN IF NOT EXISTS last_class_date DATE;

-- 移除不再使用的欄位
ALTER TABLE trial_class_purchase
  DROP COLUMN IF EXISTS payment_status,
  DROP COLUMN IF EXISTS sales_person;

-- ============================================
-- 3. eods_for_closers (EODs for Closers)
-- ============================================

-- 新增核心追蹤欄位
ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW();

-- 新增業務邏輯欄位
ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS caller_name TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS consultation_result TEXT,
  ADD COLUMN IF NOT EXISTS deal_package TEXT,
  ADD COLUMN IF NOT EXISTS package_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS installment_periods INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS package_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS actual_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS consultation_date DATE,
  ADD COLUMN IF NOT EXISTS deal_date DATE,
  ADD COLUMN IF NOT EXISTS form_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS month INTEGER,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS week_number INTEGER;

-- 移除不再使用的欄位
ALTER TABLE eods_for_closers
  DROP COLUMN IF EXISTS calls_made,
  DROP COLUMN IF EXISTS appointments_set,
  DROP COLUMN IF EXISTS deals_closed,
  DROP COLUMN IF EXISTS revenue,
  DROP COLUMN IF EXISTS setter_name;

-- ============================================
-- 4. 建立索引 (加速查詢)
-- ============================================

-- student_email 索引（跨表 JOIN 用）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_email
  ON trial_class_attendance(student_email);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_email
  ON trial_class_purchase(student_email);

CREATE INDEX IF NOT EXISTS idx_eods_email
  ON eods_for_closers(student_email);

-- source_worksheet_id 索引（同步追蹤用）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_worksheet
  ON trial_class_attendance(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_worksheet
  ON trial_class_purchase(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_eods_worksheet
  ON eods_for_closers(source_worksheet_id);

-- 日期索引（時間範圍查詢用）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_class_date
  ON trial_class_attendance(class_date);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_purchase_date
  ON trial_class_purchase(purchase_date);

CREATE INDEX IF NOT EXISTS idx_eods_deal_date
  ON eods_for_closers(deal_date);

-- synced_at 索引（同步狀態追蹤用）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_synced
  ON trial_class_attendance(synced_at);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_synced
  ON trial_class_purchase(synced_at);

CREATE INDEX IF NOT EXISTS idx_eods_synced
  ON eods_for_closers(synced_at);

-- ============================================
-- 5. 註解說明
-- ============================================

COMMENT ON COLUMN trial_class_attendance.student_email IS 'KEY VALUE - 用於跨表串接的關鍵欄位';
COMMENT ON COLUMN trial_class_attendance.raw_data IS '儲存 Google Sheets 原始資料的 JSONB 欄位';
COMMENT ON COLUMN trial_class_attendance.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN trial_class_attendance.origin_row_index IS 'Google Sheets 的原始列號';

COMMENT ON COLUMN trial_class_purchase.student_email IS 'KEY VALUE - 用於跨表串接的關鍵欄位';
COMMENT ON COLUMN trial_class_purchase.raw_data IS '儲存 Google Sheets 原始資料的 JSONB 欄位';
COMMENT ON COLUMN trial_class_purchase.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN trial_class_purchase.origin_row_index IS 'Google Sheets 的原始列號';

COMMENT ON COLUMN eods_for_closers.student_email IS 'KEY VALUE - 用於跨表串接的關鍵欄位';
COMMENT ON COLUMN eods_for_closers.raw_data IS '儲存 Google Sheets 原始資料的 JSONB 欄位';
COMMENT ON COLUMN eods_for_closers.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN eods_for_closers.origin_row_index IS 'Google Sheets 的原始列號';

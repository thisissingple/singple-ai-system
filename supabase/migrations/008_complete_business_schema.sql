-- ============================================
-- Migration 008: Complete Business Schema
-- 完整業務 Schema - 包含所有業務欄位
--
-- 目的：
-- 1. 補齊所有 Google Sheets 欄位的對應欄位
-- 2. 確保 schema 與 field mapping 100% 一致
-- 3. 建立必要索引以優化查詢效能
-- 4. 新增 table comments 說明業務用途
--
-- 日期: 2025-10-04
-- 參考文件: docs/FIELD_MAPPING_COMPLETE.md
-- ============================================

-- ============================================
-- 1. trial_class_attendance (體驗課上課記錄表)
-- ============================================

COMMENT ON TABLE trial_class_attendance IS '體驗課上課記錄表 - 追蹤學員體驗課上課情況、老師評價、轉換情況';

-- 確保所有欄位都存在（冪等性 - 可重複執行）
ALTER TABLE trial_class_attendance
  -- 必填欄位
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS class_date DATE,
  ADD COLUMN IF NOT EXISTS teacher_name TEXT,

  -- 業務欄位
  ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS no_conversion_reason TEXT,
  ADD COLUMN IF NOT EXISTS class_transcript TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,

  -- 系統欄位
  ADD COLUMN IF NOT EXISTS teacher_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,

  -- 追蹤欄位
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- 時間戳記
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 欄位註解
COMMENT ON COLUMN trial_class_attendance.student_email IS 'KEY VALUE - 用於跨表串接的關鍵欄位（JOIN key）';
COMMENT ON COLUMN trial_class_attendance.student_name IS '學生姓名';
COMMENT ON COLUMN trial_class_attendance.class_date IS '體驗課上課日期';
COMMENT ON COLUMN trial_class_attendance.teacher_name IS '授課老師姓名';
COMMENT ON COLUMN trial_class_attendance.is_reviewed IS '是否已完成課後審核';
COMMENT ON COLUMN trial_class_attendance.no_conversion_reason IS '未成功購買的原因';
COMMENT ON COLUMN trial_class_attendance.class_transcript IS '課程內容摘要或記錄';
COMMENT ON COLUMN trial_class_attendance.notes IS '額外備註說明';
COMMENT ON COLUMN trial_class_attendance.raw_data IS '儲存所有 Google Sheets 原始資料的 JSONB 欄位';
COMMENT ON COLUMN trial_class_attendance.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN trial_class_attendance.origin_row_index IS 'Google Sheets 的原始列號';
COMMENT ON COLUMN trial_class_attendance.synced_at IS '資料同步時間';

-- ============================================
-- 2. trial_class_purchase (體驗課購買記錄表)
-- ============================================

COMMENT ON TABLE trial_class_purchase IS '體驗課購買記錄表 - 追蹤學員購買方案、付款資訊、課程進度';

ALTER TABLE trial_class_purchase
  -- 必填欄位
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS package_name TEXT,
  ADD COLUMN IF NOT EXISTS purchase_date DATE,

  -- 業務欄位
  ADD COLUMN IF NOT EXISTS package_price INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS age INTEGER,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS trial_classes_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_classes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_status TEXT,
  ADD COLUMN IF NOT EXISTS updated_date DATE,
  ADD COLUMN IF NOT EXISTS last_class_date DATE,

  -- 系統欄位
  ADD COLUMN IF NOT EXISTS teacher_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,

  -- 追蹤欄位
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- 時間戳記
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 欄位註解
COMMENT ON COLUMN trial_class_purchase.student_email IS 'KEY VALUE - 用於跨表串接的關鍵欄位（JOIN key）';
COMMENT ON COLUMN trial_class_purchase.student_name IS '學生姓名';
COMMENT ON COLUMN trial_class_purchase.package_name IS '購買的方案名稱';
COMMENT ON COLUMN trial_class_purchase.purchase_date IS '購買日期';
COMMENT ON COLUMN trial_class_purchase.package_price IS '方案價格（新台幣）';
COMMENT ON COLUMN trial_class_purchase.age IS '學生年齡';
COMMENT ON COLUMN trial_class_purchase.occupation IS '學生職業';
COMMENT ON COLUMN trial_class_purchase.trial_classes_total IS '已上體驗課總數';
COMMENT ON COLUMN trial_class_purchase.remaining_classes IS '剩餘堂數';
COMMENT ON COLUMN trial_class_purchase.current_status IS '學員目前狀態（例如：進行中、已完成、已暫停）';
COMMENT ON COLUMN trial_class_purchase.updated_date IS '狀態更新日期';
COMMENT ON COLUMN trial_class_purchase.last_class_date IS '最後一次上課日期';
COMMENT ON COLUMN trial_class_purchase.raw_data IS '儲存所有 Google Sheets 原始資料的 JSONB 欄位';
COMMENT ON COLUMN trial_class_purchase.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN trial_class_purchase.origin_row_index IS 'Google Sheets 的原始列號';
COMMENT ON COLUMN trial_class_purchase.synced_at IS '資料同步時間';

-- ============================================
-- 3. eods_for_closers (EODs for Closers 咨詢師業績表)
-- ============================================

COMMENT ON TABLE eods_for_closers IS 'EODs for Closers - 追蹤諮詢師業績、電訪轉換、成交資訊';

ALTER TABLE eods_for_closers
  -- 必填欄位
  ADD COLUMN IF NOT EXISTS student_name TEXT,
  ADD COLUMN IF NOT EXISTS student_email TEXT,
  ADD COLUMN IF NOT EXISTS closer_name TEXT,

  -- 日期欄位
  ADD COLUMN IF NOT EXISTS deal_date DATE,
  ADD COLUMN IF NOT EXISTS consultation_date DATE,
  ADD COLUMN IF NOT EXISTS form_submitted_at TIMESTAMPTZ,

  -- 業務欄位
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS caller_name TEXT,
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lead_source TEXT,
  ADD COLUMN IF NOT EXISTS consultation_result TEXT,
  ADD COLUMN IF NOT EXISTS deal_package TEXT,
  ADD COLUMN IF NOT EXISTS package_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS installment_periods INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS package_price INTEGER,
  ADD COLUMN IF NOT EXISTS actual_amount INTEGER,

  -- 統計維度欄位
  ADD COLUMN IF NOT EXISTS month INTEGER,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS week_number INTEGER,

  -- 系統欄位
  ADD COLUMN IF NOT EXISTS closer_id TEXT,
  ADD COLUMN IF NOT EXISTS setter_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS report_date DATE,

  -- 追蹤欄位
  ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS origin_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ DEFAULT NOW(),

  -- 時間戳記
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 欄位註解
COMMENT ON COLUMN eods_for_closers.student_email IS 'KEY VALUE - 用於跨表串接的關鍵欄位（JOIN key）';
COMMENT ON COLUMN eods_for_closers.student_name IS '學生姓名';
COMMENT ON COLUMN eods_for_closers.closer_name IS '諮詢師姓名（closer）';
COMMENT ON COLUMN eods_for_closers.deal_date IS '成交日期';
COMMENT ON COLUMN eods_for_closers.consultation_date IS '諮詢日期';
COMMENT ON COLUMN eods_for_closers.form_submitted_at IS 'Google Form 提交時間';
COMMENT ON COLUMN eods_for_closers.caller_name IS '電訪人員姓名';
COMMENT ON COLUMN eods_for_closers.is_online IS '是否為線上諮詢';
COMMENT ON COLUMN eods_for_closers.lead_source IS '潛在客戶來源';
COMMENT ON COLUMN eods_for_closers.consultation_result IS '諮詢結果（成交/未成交/待追蹤等）';
COMMENT ON COLUMN eods_for_closers.deal_package IS '成交的方案名稱';
COMMENT ON COLUMN eods_for_closers.package_quantity IS '購買方案數量';
COMMENT ON COLUMN eods_for_closers.payment_method IS '付款方式（一次付清/分期付款等）';
COMMENT ON COLUMN eods_for_closers.installment_periods IS '分期期數';
COMMENT ON COLUMN eods_for_closers.package_price IS '方案原價（新台幣）';
COMMENT ON COLUMN eods_for_closers.actual_amount IS '實際成交金額（新台幣）';
COMMENT ON COLUMN eods_for_closers.month IS '成交月份 (1-12)';
COMMENT ON COLUMN eods_for_closers.year IS '成交年份 (YYYY)';
COMMENT ON COLUMN eods_for_closers.week_number IS '成交週數 (1-53)';
COMMENT ON COLUMN eods_for_closers.raw_data IS '儲存所有 Google Sheets 原始資料的 JSONB 欄位';
COMMENT ON COLUMN eods_for_closers.source_worksheet_id IS '追蹤資料來源的工作表 ID';
COMMENT ON COLUMN eods_for_closers.origin_row_index IS 'Google Sheets 的原始列號';
COMMENT ON COLUMN eods_for_closers.synced_at IS '資料同步時間';

-- ============================================
-- 4. 索引 - JOIN 鍵（必須有，用於跨表查詢）
-- ============================================

-- student_email 索引（用於跨表 JOIN）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_email
  ON trial_class_attendance(student_email);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_email
  ON trial_class_purchase(student_email);

CREATE INDEX IF NOT EXISTS idx_eods_email
  ON eods_for_closers(student_email);

-- ============================================
-- 5. 索引 - 日期範圍查詢（報表常用）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trial_attendance_class_date
  ON trial_class_attendance(class_date);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_purchase_date
  ON trial_class_purchase(purchase_date);

CREATE INDEX IF NOT EXISTS idx_eods_deal_date
  ON eods_for_closers(deal_date);

CREATE INDEX IF NOT EXISTS idx_eods_consultation_date
  ON eods_for_closers(consultation_date);

-- ============================================
-- 6. 索引 - 同步追蹤（用於增量同步和資料溯源）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trial_attendance_worksheet
  ON trial_class_attendance(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_worksheet
  ON trial_class_purchase(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_eods_worksheet
  ON eods_for_closers(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_trial_attendance_synced
  ON trial_class_attendance(synced_at);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_synced
  ON trial_class_purchase(synced_at);

CREATE INDEX IF NOT EXISTS idx_eods_synced
  ON eods_for_closers(synced_at);

-- ============================================
-- 7. 索引 - 業務查詢（用於報表和 API）
-- ============================================

-- 老師名稱索引（用於 getTeacherStudents API）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_teacher
  ON trial_class_attendance(teacher_name);

-- 諮詢師名稱索引（用於 getCloserPerformance API）
CREATE INDEX IF NOT EXISTS idx_eods_closer
  ON eods_for_closers(closer_name);

-- 電訪人員索引（用於 getCallerPerformance API）
CREATE INDEX IF NOT EXISTS idx_eods_caller
  ON eods_for_closers(caller_name);

-- 複合索引（優化多條件查詢）
CREATE INDEX IF NOT EXISTS idx_eods_closer_date
  ON eods_for_closers(closer_name, deal_date DESC);

CREATE INDEX IF NOT EXISTS idx_trial_attendance_teacher_date
  ON trial_class_attendance(teacher_name, class_date DESC);

-- 審核狀態索引（用於查詢待審核的課程）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_reviewed
  ON trial_class_attendance(is_reviewed)
  WHERE is_reviewed = FALSE;

-- 學員狀態索引（用於查詢活躍學員）
CREATE INDEX IF NOT EXISTS idx_trial_purchase_status
  ON trial_class_purchase(current_status);

-- 成交結果索引（用於統計轉換率）
CREATE INDEX IF NOT EXISTS idx_eods_result
  ON eods_for_closers(consultation_result);

-- ============================================
-- 8. JSONB 索引（用於查詢 raw_data 中的特定欄位）
-- ============================================

-- GIN 索引（用於 raw_data JSONB 查詢）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_raw_data_gin
  ON trial_class_attendance USING gin(raw_data);

CREATE INDEX IF NOT EXISTS idx_trial_purchase_raw_data_gin
  ON trial_class_purchase USING gin(raw_data);

CREATE INDEX IF NOT EXISTS idx_eods_raw_data_gin
  ON eods_for_closers USING gin(raw_data);

-- ============================================
-- 9. 觸發器 - 自動更新 updated_at
-- ============================================

-- 建立觸發器函數（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為每個表建立觸發器
DROP TRIGGER IF EXISTS update_trial_class_attendance_updated_at ON trial_class_attendance;
CREATE TRIGGER update_trial_class_attendance_updated_at
  BEFORE UPDATE ON trial_class_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trial_class_purchase_updated_at ON trial_class_purchase;
CREATE TRIGGER update_trial_class_purchase_updated_at
  BEFORE UPDATE ON trial_class_purchase
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_eods_for_closers_updated_at ON eods_for_closers;
CREATE TRIGGER update_eods_for_closers_updated_at
  BEFORE UPDATE ON eods_for_closers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. Row Level Security (RLS) - 資料權限控制
-- ============================================

-- 啟用 RLS
ALTER TABLE trial_class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_class_purchase ENABLE ROW LEVEL SECURITY;
ALTER TABLE eods_for_closers ENABLE ROW LEVEL SECURITY;

-- 允許 service_role 完全存取（用於同步服務）
CREATE POLICY IF NOT EXISTS "Service role has full access to trial_class_attendance"
  ON trial_class_attendance
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role has full access to trial_class_purchase"
  ON trial_class_purchase
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Service role has full access to eods_for_closers"
  ON eods_for_closers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 允許認證使用者讀取（用於前端查詢）
CREATE POLICY IF NOT EXISTS "Authenticated users can read trial_class_attendance"
  ON trial_class_attendance
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can read trial_class_purchase"
  ON trial_class_purchase
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Authenticated users can read eods_for_closers"
  ON eods_for_closers
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 11. 重新載入 PostgREST Schema Cache
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- 完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 008 completed successfully!';
  RAISE NOTICE '📊 All business columns added to:';
  RAISE NOTICE '   - trial_class_attendance';
  RAISE NOTICE '   - trial_class_purchase';
  RAISE NOTICE '   - eods_for_closers';
  RAISE NOTICE '🔍 Indexes created for optimal query performance';
  RAISE NOTICE '🔒 Row Level Security (RLS) enabled';
  RAISE NOTICE '🔄 PostgREST schema cache reload triggered';
END $$;

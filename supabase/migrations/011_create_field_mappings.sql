-- ============================================
-- Migration 011: AI Field Mapping System
-- 動態欄位對應系統
--
-- 目的：
-- 1. 儲存 Google Sheets 到 Supabase 的欄位對應
-- 2. 記錄 AI 建議的信心分數
-- 3. 支援使用者手動調整對應
-- 4. 保留對應歷史記錄
--
-- 日期: 2025-10-05
-- ============================================

-- ============================================
-- 1. field_mappings (欄位對應主表)
-- ============================================

CREATE TABLE IF NOT EXISTS field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,

  -- 欄位對應
  google_column TEXT NOT NULL,           -- Google Sheets 欄位名稱
  supabase_column TEXT NOT NULL,         -- 對應的 Supabase 欄位名稱

  -- 資料型別與轉換
  data_type TEXT NOT NULL,               -- text, number, date, boolean, decimal, integer
  transform_function TEXT,               -- 轉換函數名稱 (cleanText, toDate, toInteger 等)

  -- 欄位屬性
  is_required BOOLEAN DEFAULT false,     -- 是否為必填欄位
  default_value TEXT,                    -- 預設值

  -- AI 相關
  ai_confidence DECIMAL(3,2),            -- AI 信心分數 (0.00-1.00)
  ai_suggested_at TIMESTAMPTZ,           -- AI 建議時間
  ai_reasoning TEXT,                     -- AI 選擇原因

  -- 使用者確認
  is_confirmed BOOLEAN DEFAULT false,    -- 使用者是否確認
  confirmed_by TEXT,                     -- 確認者
  confirmed_at TIMESTAMPTZ,              -- 確認時間

  -- 狀態
  is_active BOOLEAN DEFAULT true,        -- 是否啟用

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 欄位註解
COMMENT ON TABLE field_mappings IS 'AI 動態欄位對應設定 - 儲存 Google Sheets 到 Supabase 的欄位映射';
COMMENT ON COLUMN field_mappings.google_column IS 'Google Sheets 原始欄位名稱';
COMMENT ON COLUMN field_mappings.supabase_column IS '對應到的 Supabase 欄位名稱';
COMMENT ON COLUMN field_mappings.ai_confidence IS 'AI 建議的信心分數 (0-1)，越高表示越有信心';
COMMENT ON COLUMN field_mappings.transform_function IS '資料轉換函數名稱，對應 Transforms 物件的方法';

-- 索引
CREATE INDEX IF NOT EXISTS idx_field_mappings_worksheet
  ON field_mappings(worksheet_id);

CREATE INDEX IF NOT EXISTS idx_field_mappings_active
  ON field_mappings(worksheet_id, is_active)
  WHERE is_active = true;

-- 唯一索引：同一個 worksheet 的同一個 Google 欄位只能有一個 active 對應
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_mapping
  ON field_mappings(worksheet_id, google_column)
  WHERE is_active = true;

-- ============================================
-- 2. mapping_history (對應歷史記錄)
-- ============================================

CREATE TABLE IF NOT EXISTS mapping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  field_mapping_id UUID NOT NULL REFERENCES field_mappings(id) ON DELETE CASCADE,
  worksheet_id UUID NOT NULL REFERENCES worksheets(id) ON DELETE CASCADE,

  -- 變更內容
  action TEXT NOT NULL,                  -- created, updated, confirmed, deactivated
  old_values JSONB,                      -- 舊值
  new_values JSONB,                      -- 新值

  -- 變更原因
  changed_by TEXT,                       -- 變更者 (AI, user, system)
  change_reason TEXT,                    -- 變更原因

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 欄位註解
COMMENT ON TABLE mapping_history IS '欄位對應變更歷史 - 記錄所有對應的修改記錄';
COMMENT ON COLUMN mapping_history.action IS '操作類型：created, updated, confirmed, deactivated';
COMMENT ON COLUMN mapping_history.changed_by IS '變更者：AI, user:{email}, system';

-- 索引
CREATE INDEX IF NOT EXISTS idx_mapping_history_field_mapping
  ON mapping_history(field_mapping_id);

CREATE INDEX IF NOT EXISTS idx_mapping_history_worksheet
  ON mapping_history(worksheet_id);

CREATE INDEX IF NOT EXISTS idx_mapping_history_created_at
  ON mapping_history(created_at DESC);

-- ============================================
-- 3. 自動更新 updated_at 觸發器
-- ============================================

DROP TRIGGER IF EXISTS update_field_mappings_updated_at ON field_mappings;
CREATE TRIGGER update_field_mappings_updated_at
  BEFORE UPDATE ON field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. 自動記錄歷史觸發器
-- ============================================

CREATE OR REPLACE FUNCTION record_mapping_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO mapping_history (
      field_mapping_id,
      worksheet_id,
      action,
      new_values,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.worksheet_id,
      'created',
      row_to_json(NEW)::jsonb,
      COALESCE(NEW.confirmed_by, 'AI'),
      'Initial mapping created'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO mapping_history (
      field_mapping_id,
      worksheet_id,
      action,
      old_values,
      new_values,
      changed_by,
      change_reason
    ) VALUES (
      NEW.id,
      NEW.worksheet_id,
      'updated',
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb,
      COALESCE(NEW.confirmed_by, 'system'),
      'Mapping updated'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS field_mappings_history_trigger ON field_mappings;
CREATE TRIGGER field_mappings_history_trigger
  AFTER INSERT OR UPDATE ON field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION record_mapping_history();

-- ============================================
-- 5. Row Level Security (RLS)
-- ============================================

ALTER TABLE field_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mapping_history ENABLE ROW LEVEL SECURITY;

-- 刪除舊的 policies (如果存在)
DROP POLICY IF EXISTS "Service role has full access to field_mappings" ON field_mappings;
DROP POLICY IF EXISTS "Service role has full access to mapping_history" ON mapping_history;
DROP POLICY IF EXISTS "Authenticated users can read field_mappings" ON field_mappings;
DROP POLICY IF EXISTS "Authenticated users can read mapping_history" ON mapping_history;

-- Service role 完全存取
CREATE POLICY "Service role has full access to field_mappings"
  ON field_mappings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to mapping_history"
  ON mapping_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 認證使用者可讀取
CREATE POLICY "Authenticated users can read field_mappings"
  ON field_mappings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read mapping_history"
  ON mapping_history
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- 6. 重新載入 PostgREST Schema Cache
-- ============================================

NOTIFY pgrst, 'reload schema';

-- ============================================
-- 完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 011 completed successfully!';
  RAISE NOTICE '📊 Created tables:';
  RAISE NOTICE '   - field_mappings (欄位對應主表)';
  RAISE NOTICE '   - mapping_history (歷史記錄)';
  RAISE NOTICE '🤖 AI Field Mapping System ready!';
END $$;

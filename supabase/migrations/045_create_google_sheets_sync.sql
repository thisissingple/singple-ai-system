-- ===================================
-- Phase 39: Google Sheets 同步系統
-- 建立日期: 2025-11-02
-- ===================================

-- 移除舊表（如果存在）
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS sheet_mappings CASCADE;
DROP TABLE IF EXISTS google_sheets_sources CASCADE;

-- ===================================
-- 1. Google Sheets 資料來源
-- ===================================
CREATE TABLE google_sheets_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sheet_url TEXT NOT NULL,
  sheet_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE google_sheets_sources IS 'Google Sheets 資料來源管理';
COMMENT ON COLUMN google_sheets_sources.sheet_id IS '從 URL 解析出的 Sheet ID';

-- ===================================
-- 2. 工作表映射設定
-- ===================================
CREATE TABLE sheet_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES google_sheets_sources(id) ON DELETE CASCADE,
  worksheet_name TEXT NOT NULL,
  target_table TEXT NOT NULL,
  field_mappings JSONB NOT NULL DEFAULT '[]',
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(source_id, worksheet_name)
);

COMMENT ON TABLE sheet_mappings IS '工作表到 Supabase 表的映射設定';
COMMENT ON COLUMN sheet_mappings.field_mappings IS '欄位映射 JSON: [{ googleColumn: "姓名", supabaseColumn: "student_name" }]';
COMMENT ON COLUMN sheet_mappings.is_enabled IS '是否啟用自動同步';

-- ===================================
-- 3. 同步歷史記錄
-- ===================================
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mapping_id UUID REFERENCES sheet_mappings(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE sync_logs IS '同步執行歷史記錄';

-- ===================================
-- 索引
-- ===================================
CREATE INDEX idx_sheet_mappings_source ON sheet_mappings(source_id);
CREATE INDEX idx_sheet_mappings_enabled ON sheet_mappings(is_enabled);
CREATE INDEX idx_sync_logs_mapping ON sync_logs(mapping_id);
CREATE INDEX idx_sync_logs_time ON sync_logs(synced_at DESC);

-- ===================================
-- 權限設定
-- ===================================
GRANT ALL ON google_sheets_sources TO authenticated;
GRANT ALL ON sheet_mappings TO authenticated;
GRANT ALL ON sync_logs TO authenticated;

-- ===================================
-- 完成
-- ===================================

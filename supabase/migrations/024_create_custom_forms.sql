-- ================================================
-- Custom Forms System
-- 自訂表單系統資料表
-- ================================================

-- 1. 自訂表單定義表
CREATE TABLE IF NOT EXISTS custom_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,

  -- 顯示位置設定
  display_locations JSONB NOT NULL DEFAULT '{"tabs": [], "sidebar": false}',
  -- 範例: {
  --   "tabs": ["teacher", "telemarketing", "consultant"],
  --   "sidebar": true,
  --   "sidebar_section": "tools"
  -- }

  -- 資料存放設定
  storage_type TEXT NOT NULL DEFAULT 'form_submissions',  -- 'form_submissions' 或 'custom_table'
  target_table TEXT,                                       -- 如果是 custom_table，對應的表名
  field_mappings JSONB DEFAULT '{}',                      -- 欄位映射設定
  -- 範例: {
  --   "field_1": "student_name",
  --   "field_2": "email"
  -- }

  -- 表單欄位配置
  fields JSONB NOT NULL DEFAULT '[]',
  -- 範例: [
  --   {
  --     "id": "field_1",
  --     "type": "text",
  --     "label": "學員姓名",
  --     "placeholder": "請輸入姓名",
  --     "required": true,
  --     "order": 1
  --   }
  -- ]

  -- 狀態
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' 或 'archived'

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  -- 約束
  CONSTRAINT valid_storage_type CHECK (storage_type IN ('form_submissions', 'custom_table')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'archived'))
);

-- 2. 表單提交資料表（統一存放）
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  submitted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- 索引優化
-- ================================================

-- custom_forms 索引
CREATE INDEX IF NOT EXISTS idx_custom_forms_status ON custom_forms(status);
CREATE INDEX IF NOT EXISTS idx_custom_forms_created_at ON custom_forms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_custom_forms_display_locations ON custom_forms USING gin(display_locations);

-- form_submissions 索引
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_data ON form_submissions USING gin(data);

-- ================================================
-- 觸發器：自動更新 updated_at
-- ================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_forms_updated_at
  BEFORE UPDATE ON custom_forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_submissions_updated_at
  BEFORE UPDATE ON form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 註解說明
-- ================================================

COMMENT ON TABLE custom_forms IS '自訂表單定義表';
COMMENT ON COLUMN custom_forms.name IS '表單名稱';
COMMENT ON COLUMN custom_forms.description IS '表單說明';
COMMENT ON COLUMN custom_forms.display_locations IS '顯示位置設定 (JSON)';
COMMENT ON COLUMN custom_forms.storage_type IS '資料存放方式：form_submissions(統一表) 或 custom_table(對應現有表)';
COMMENT ON COLUMN custom_forms.target_table IS '當 storage_type=custom_table 時，對應的表名';
COMMENT ON COLUMN custom_forms.field_mappings IS '表單欄位 ID 對應到資料表欄位名的映射 (JSON)';
COMMENT ON COLUMN custom_forms.fields IS '表單欄位配置 (JSON)';
COMMENT ON COLUMN custom_forms.status IS '表單狀態：active(啟用) 或 archived(封存)';

COMMENT ON TABLE form_submissions IS '表單提交資料表（統一存放所有 storage_type=form_submissions 的表單資料）';
COMMENT ON COLUMN form_submissions.form_id IS '對應的表單 ID';
COMMENT ON COLUMN form_submissions.data IS '提交的表單資料 (JSON)';
COMMENT ON COLUMN form_submissions.submitted_by IS '提交人';

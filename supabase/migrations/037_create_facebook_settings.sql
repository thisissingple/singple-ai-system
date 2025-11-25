-- ========================================
-- Facebook 整合設定表
-- ========================================
-- 用途：儲存 Facebook OAuth token 和同步設定
-- 功能：讓使用者在系統內登入 FB，選擇專頁和表單

CREATE TABLE IF NOT EXISTS facebook_settings (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Facebook OAuth 資訊
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  facebook_user_id TEXT,
  facebook_user_name TEXT,

  -- 選擇的粉絲專頁
  page_id TEXT NOT NULL,
  page_name TEXT,
  page_access_token TEXT,  -- Page token（永久有效）

  -- 選擇的 Lead Ads 表單（陣列，可多選）
  form_ids TEXT[] DEFAULT '{}',
  form_names JSONB DEFAULT '{}',  -- {form_id: form_name}

  -- 同步狀態
  sync_enabled BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 5,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'pending',  -- 'pending', 'success', 'error'
  last_sync_count INTEGER DEFAULT 0,
  last_sync_error TEXT,
  last_sync_new_leads INTEGER DEFAULT 0,

  -- 系統欄位
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- ========================================
-- 索引
-- ========================================

-- 只允許一筆設定記錄（Singleton Pattern）
CREATE UNIQUE INDEX idx_facebook_settings_singleton ON facebook_settings ((true));

-- 快速查詢
CREATE INDEX idx_facebook_settings_page_id ON facebook_settings(page_id);
CREATE INDEX idx_facebook_settings_sync_enabled ON facebook_settings(sync_enabled);
CREATE INDEX idx_facebook_settings_last_sync_at ON facebook_settings(last_sync_at);

-- ========================================
-- 更新時間戳記觸發器
-- ========================================

CREATE OR REPLACE FUNCTION update_facebook_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_facebook_settings_updated_at
  BEFORE UPDATE ON facebook_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_settings_updated_at();

-- ========================================
-- 權限設定
-- ========================================

GRANT ALL ON facebook_settings TO authenticated;
GRANT SELECT ON facebook_settings TO anon;

-- ========================================
-- 註解
-- ========================================

COMMENT ON TABLE facebook_settings IS 'Facebook 整合設定 - OAuth token 和同步設定（Singleton）';
COMMENT ON COLUMN facebook_settings.access_token IS 'Facebook User Access Token（60天有效）';
COMMENT ON COLUMN facebook_settings.page_access_token IS 'Facebook Page Access Token（永久有效）';
COMMENT ON COLUMN facebook_settings.form_ids IS 'Lead Ads 表單 ID 陣列';
COMMENT ON COLUMN facebook_settings.sync_enabled IS '是否啟用自動同步';
COMMENT ON COLUMN facebook_settings.sync_interval_minutes IS '同步間隔（分鐘），預設 5 分鐘';
COMMENT ON COLUMN facebook_settings.last_sync_status IS '最後同步狀態：pending, success, error';
COMMENT ON COLUMN facebook_settings.last_sync_new_leads IS '最後一次同步新增的名單數';

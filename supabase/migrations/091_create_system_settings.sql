-- 建立系統設定表
-- 用於儲存各種系統層級的設定值（如同步耗時等）

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- 插入預設值
INSERT INTO system_settings (key, value, description)
VALUES ('trello_last_sync_duration', NULL, 'Trello 同步耗時（秒）')
ON CONFLICT (key) DO NOTHING;

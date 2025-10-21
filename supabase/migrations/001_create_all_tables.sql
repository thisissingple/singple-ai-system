-- ============================================
-- Migration 001: 建立所有表（Supabase 完整架構）
-- 執行方式：在 Supabase SQL Editor 貼上執行
-- 或使用: psql "$SUPABASE_DB_URL" -f supabase/migrations/001_create_all_tables.sql
-- ============================================

-- 啟用 UUID 與加密擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================
-- 1. 使用者與認證
-- ========================================

-- Users 表（Replit Auth 整合）
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  role VARCHAR DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'manager', 'teacher', 'sales', 'user')),
  department VARCHAR,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_approval')),

  -- 權限關聯欄位
  teacher_id TEXT,
  sales_id TEXT,
  department_id UUID,

  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id);
CREATE INDEX IF NOT EXISTS idx_users_sales_id ON users(sales_id);

-- Sessions 表（Replit Auth 必要）
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

-- Roles 表
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  spreadsheet_access JSONB NOT NULL DEFAULT '[]'::jsonb,
  can_manage_users BOOLEAN DEFAULT false,
  can_view_all_data BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入預設角色
INSERT INTO roles (name, display_name, permissions, can_view_all_data) VALUES
  ('super_admin', '超級管理員', '["*"]'::jsonb, true),
  ('teacher', '老師', '["view_own_students", "edit_own_students"]'::jsonb, false),
  ('sales', '電銷人員', '["view_own_customers", "edit_own_customers"]'::jsonb, false),
  ('manager', '部門主管', '["view_department_data", "manage_team"]'::jsonb, false)
ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 2. Google OAuth Token 管理
-- ========================================

CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL DEFAULT 'https://www.googleapis.com/auth/spreadsheets.readonly',
  is_valid BOOLEAN DEFAULT true,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_token UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON google_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON google_oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_is_valid ON google_oauth_tokens(is_valid) WHERE is_valid = false;

-- ========================================
-- 3. Spreadsheet 管理
-- ========================================

CREATE TABLE IF NOT EXISTS spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  spreadsheet_id TEXT NOT NULL UNIQUE,
  spreadsheet_url TEXT,
  range TEXT DEFAULT 'A1:Z1000',
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  headers JSONB,
  row_count INTEGER DEFAULT 0,

  -- 同步設定
  sync_frequency_minutes INTEGER DEFAULT 60,
  is_auto_sync_enabled BOOLEAN DEFAULT true,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'failed')),
  last_sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spreadsheets_owner ON spreadsheets(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_spreadsheets_sync_status ON spreadsheets(sync_status);
CREATE INDEX IF NOT EXISTS idx_spreadsheets_spreadsheet_id ON spreadsheets(spreadsheet_id);

-- User - Spreadsheet 權限關聯
CREATE TABLE IF NOT EXISTS user_spreadsheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  permission TEXT NOT NULL CHECK (permission IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_spreadsheet UNIQUE(user_id, spreadsheet_id)
);

CREATE INDEX IF NOT EXISTS idx_user_spreadsheets_user_id ON user_spreadsheets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_spreadsheets_spreadsheet_id ON user_spreadsheets(spreadsheet_id);

-- Worksheets 表
CREATE TABLE IF NOT EXISTS worksheets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  worksheet_name TEXT NOT NULL,
  gid TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  range TEXT DEFAULT 'A1:Z1000',
  headers JSONB,
  row_count INTEGER DEFAULT 0,
  supabase_table TEXT CHECK (supabase_table IN ('trial_class_attendance', 'trial_class_purchase', 'eods_for_closers')),
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_spreadsheet_worksheet UNIQUE(spreadsheet_id, gid)
);

CREATE INDEX IF NOT EXISTS idx_worksheets_spreadsheet ON worksheets(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_worksheets_supabase_table ON worksheets(supabase_table);

-- Sheet Data 表（暫存 Google Sheets 原始資料）
CREATE TABLE IF NOT EXISTS sheet_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID NOT NULL REFERENCES spreadsheets(id) ON DELETE CASCADE,
  worksheet_id UUID REFERENCES worksheets(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  data JSONB NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sheet_data_spreadsheet ON sheet_data(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_data_worksheet ON sheet_data(worksheet_id);

-- ========================================
-- 4. 同步歷史與鎖機制
-- ========================================

CREATE TABLE IF NOT EXISTS sync_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spreadsheet_id UUID REFERENCES spreadsheets(id) ON DELETE CASCADE,
  worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL,
  triggered_by TEXT NOT NULL CHECK (triggered_by IN ('schedule', 'manual')),
  triggered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental')),
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  rows_synced INTEGER DEFAULT 0,
  rows_failed INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- 同步鎖
  is_locked BOOLEAN DEFAULT false,
  lock_acquired_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_history_spreadsheet ON sync_history(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_started_at ON sync_history(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_history_locked ON sync_history(is_locked) WHERE is_locked = true;

-- ========================================
-- 5. 課程資料表（已存在，補充權限欄位）
-- ========================================

-- Trial Class Attendance
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS teacher_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID;

CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON trial_class_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sales ON trial_class_attendance(sales_id);
CREATE INDEX IF NOT EXISTS idx_attendance_department ON trial_class_attendance(department_id);

-- Trial Class Purchase
ALTER TABLE trial_class_purchase
  ADD COLUMN IF NOT EXISTS teacher_id TEXT,
  ADD COLUMN IF NOT EXISTS sales_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID;

CREATE INDEX IF NOT EXISTS idx_purchase_teacher ON trial_class_purchase(teacher_id);
CREATE INDEX IF NOT EXISTS idx_purchase_sales ON trial_class_purchase(sales_id);
CREATE INDEX IF NOT EXISTS idx_purchase_department ON trial_class_purchase(department_id);

-- EODs for Closers
ALTER TABLE eods_for_closers
  ADD COLUMN IF NOT EXISTS closer_id TEXT,
  ADD COLUMN IF NOT EXISTS setter_id TEXT,
  ADD COLUMN IF NOT EXISTS department_id UUID;

CREATE INDEX IF NOT EXISTS idx_eods_closer ON eods_for_closers(closer_id);
CREATE INDEX IF NOT EXISTS idx_eods_setter ON eods_for_closers(setter_id);
CREATE INDEX IF NOT EXISTS idx_eods_department ON eods_for_closers(department_id);

-- ========================================
-- 6. 其他表（Dashboard 等）
-- ========================================

CREATE TABLE IF NOT EXISTS dashboard_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  type VARCHAR NOT NULL,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_dashboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES dashboard_templates(id),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 7. 觸發器：自動更新 updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_google_oauth_tokens_updated_at BEFORE UPDATE ON google_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spreadsheets_updated_at BEFORE UPDATE ON spreadsheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksheets_updated_at BEFORE UPDATE ON worksheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_dashboards_updated_at BEFORE UPDATE ON custom_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 8. 註解
-- ========================================

COMMENT ON TABLE users IS '使用者表（Replit Auth 整合）';
COMMENT ON TABLE google_oauth_tokens IS 'Google OAuth 2.0 憑證，用於存取 Google Sheets API';
COMMENT ON TABLE user_spreadsheets IS '使用者與試算表的權限關聯';
COMMENT ON TABLE sync_history IS '同步歷史記錄，用於追蹤與除錯';
COMMENT ON COLUMN sync_history.is_locked IS '同步鎖，防止併發同步造成資料衝突';
COMMENT ON COLUMN google_oauth_tokens.refresh_token IS '⚠️ 需要加密儲存（使用 pgcrypto）';

-- ========================================
-- 完成！
-- ========================================
SELECT '✅ Supabase 架構建立完成！' AS status;

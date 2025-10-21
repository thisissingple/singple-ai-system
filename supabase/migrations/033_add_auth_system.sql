-- Migration 033: Add Authentication System
-- 新增認證系統欄位，支援密碼登入與 OAuth（Google、Slack）

-- ============================================
-- 資料庫驗證（防止連到錯誤資料庫）
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'users') THEN
    RAISE EXCEPTION '錯誤：連到錯誤的資料庫！找不到 users 表';
  END IF;
END $$;

-- ============================================
-- 新增認證相關欄位到 users 表
-- ============================================

-- 密碼認證欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMPTZ;

-- OAuth 綁定欄位（預留未來擴充）
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slack_team_id TEXT;

-- 認證方式追蹤（可多選：password, google, slack）
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_methods TEXT[] DEFAULT ARRAY['password']::TEXT[];

-- 帳號鎖定相關
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- ============================================
-- 建立唯一索引（防止重複綁定）
-- ============================================

-- Google ID 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique
ON users(google_id)
WHERE google_id IS NOT NULL;

-- Slack ID 唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS users_slack_id_unique
ON users(slack_id)
WHERE slack_id IS NOT NULL;

-- ============================================
-- 建立索引（提升查詢效能）
-- ============================================

-- Email 索引（登入查詢用）
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Status 索引（過濾在職員工）
CREATE INDEX IF NOT EXISTS users_status_idx ON users(status);

-- ============================================
-- 註解說明
-- ============================================

COMMENT ON COLUMN users.password_hash IS '密碼雜湊值（bcrypt）';
COMMENT ON COLUMN users.must_change_password IS '是否需要強制修改密碼（首次登入）';
COMMENT ON COLUMN users.last_password_change_at IS '上次修改密碼時間';
COMMENT ON COLUMN users.google_id IS 'Google OAuth ID（綁定用）';
COMMENT ON COLUMN users.google_email IS 'Google 帳號 Email';
COMMENT ON COLUMN users.slack_id IS 'Slack User ID（綁定用）';
COMMENT ON COLUMN users.slack_team_id IS 'Slack Team ID';
COMMENT ON COLUMN users.auth_methods IS '啟用的認證方式清單（password, google, slack）';
COMMENT ON COLUMN users.failed_login_attempts IS '連續登入失敗次數';
COMMENT ON COLUMN users.locked_until IS '帳號鎖定到期時間';

-- ============================================
-- 完成訊息
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 033 完成：認證系統欄位已新增';
  RAISE NOTICE '📝 支援功能：';
  RAISE NOTICE '   - 帳號密碼登入';
  RAISE NOTICE '   - Google OAuth（預留）';
  RAISE NOTICE '   - Slack OAuth（預留）';
  RAISE NOTICE '   - 帳號鎖定機制';
END $$;

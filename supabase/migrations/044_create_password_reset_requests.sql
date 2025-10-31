-- Migration: 建立密碼重設請求表
-- Purpose: 記錄使用者的密碼重設請求，供管理員處理
-- Created: 2025-10-31

-- 建立密碼重設請求表
CREATE TABLE IF NOT EXISTS password_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES users(id),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id ON password_reset_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_requested_at ON password_reset_requests(requested_at DESC);

-- 加入註解
COMMENT ON TABLE password_reset_requests IS '密碼重設請求記錄表';
COMMENT ON COLUMN password_reset_requests.id IS '請求 ID';
COMMENT ON COLUMN password_reset_requests.user_id IS '請求使用者 ID';
COMMENT ON COLUMN password_reset_requests.email IS '使用者 Email';
COMMENT ON COLUMN password_reset_requests.status IS '請求狀態：pending（待處理）、completed（已完成）、rejected（已拒絕）';
COMMENT ON COLUMN password_reset_requests.requested_at IS '請求時間';
COMMENT ON COLUMN password_reset_requests.processed_at IS '處理時間';
COMMENT ON COLUMN password_reset_requests.processed_by IS '處理者（管理員）';
COMMENT ON COLUMN password_reset_requests.admin_notes IS '管理員備註';

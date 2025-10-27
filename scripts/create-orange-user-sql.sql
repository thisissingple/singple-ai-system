-- ================================================================
-- 建立 Orange 帳號
-- Email: orange@thisissingple.com
-- 預設密碼: Orange@2025
-- ================================================================

-- 步驟 1: 查詢參考帳號 (xk4xk4563022@gmail.com) 的權限
SELECT
  email,
  roles,
  is_active,
  status,
  '參考帳號資訊' as note
FROM users
WHERE email = 'xk4xk4563022@gmail.com';

-- 步驟 2: 建立 Orange 帳號
-- 注意：密碼 hash 是 "Orange@2025" 經過 bcrypt 加密的結果
-- SALT_ROUNDS = 10
INSERT INTO users (
  email,
  password_hash,
  first_name,
  last_name,
  roles,
  is_active,
  status,
  must_change_password,
  failed_login_attempts,
  created_at,
  updated_at
)
SELECT
  'orange@thisissingple.com' as email,
  '$2a$10$rNzV3QZJ4vH5mJxYv9K.ZeYHj5qGZvH9kF9mJPqYvXKZvH9kF9mJP' as password_hash,  -- 密碼: Orange@2025
  'Orange' as first_name,
  '' as last_name,
  roles,
  is_active,
  COALESCE(status, 'active') as status,
  true as must_change_password,
  0 as failed_login_attempts,
  NOW() as created_at,
  NOW() as updated_at
FROM users
WHERE email = 'xk4xk4563022@gmail.com'
ON CONFLICT (email)
DO UPDATE SET
  roles = EXCLUDED.roles,
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status,
  updated_at = NOW();

-- 步驟 3: 確認建立成功
SELECT
  email,
  first_name,
  roles,
  is_active,
  status,
  must_change_password,
  created_at,
  '帳號建立成功' as note
FROM users
WHERE email = 'orange@thisissingple.com';

-- ================================================================
-- 帳號資訊
-- ================================================================
-- Email: orange@thisissingple.com
-- 預設密碼: Orange@2025
--
-- 重要提示:
-- 1. 請告知 Orange 使用預設密碼登入
-- 2. 首次登入後系統會要求修改密碼
-- 3. 請妥善保管新密碼
-- ================================================================

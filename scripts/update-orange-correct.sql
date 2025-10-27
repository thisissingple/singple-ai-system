-- ================================================================
-- 更新 Orange 帳號
-- Email: orange@thisissingple.com
-- 密碼: orange@thisissingple.com
-- 權限與 xk4xk4563022@gmail.com 相同
-- ================================================================

-- 步驟 1: 查詢你的帳號權限
SELECT
  email,
  roles,
  is_active,
  status
FROM users
WHERE email = 'xk4xk4563022@gmail.com';

-- 步驟 2: 更新 Orange 的帳號
UPDATE users
SET
  email = 'orange@thisissingple.com',
  password_hash = '$2b$10$MbVH1/9e9UhiiPYVZu4ydO09WkjhpLXojgadNoZ5Ih/qFWsHFg5eu',
  roles = (SELECT roles FROM users WHERE email = 'xk4xk4563022@gmail.com'),
  is_active = (SELECT is_active FROM users WHERE email = 'xk4xk4563022@gmail.com'),
  status = (SELECT COALESCE(status, 'active') FROM users WHERE email = 'xk4xk4563022@gmail.com'),
  must_change_password = false,
  failed_login_attempts = 0,
  locked_until = NULL,
  updated_at = NOW()
WHERE first_name = 'Orange' OR email LIKE '%orange%';

-- 步驟 3: 確認更新成功
SELECT
  email,
  first_name,
  roles,
  is_active,
  status,
  '✅ 更新成功' as note
FROM users
WHERE email = 'orange@thisissingple.com';

-- ================================================================
-- 帳號資訊
-- ================================================================
-- Email: orange@thisissingple.com
-- 密碼: orange@thisissingple.com
-- 權限: 與 xk4xk4563022@gmail.com 相同
-- ================================================================

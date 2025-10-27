-- ================================================================
-- 更新現有的 Orange 帳號
-- 更新 Email 為: orange@thisissingple.com
-- 設定密碼為: Orange@2025
-- 權限與 xk4xk4563022@gmail.com 相同
-- ================================================================

-- 步驟 1: 查詢你的帳號權限
SELECT
  email,
  roles,
  is_active,
  status,
  '你的帳號權限（參考用）' as note
FROM users
WHERE email = 'xk4xk4563022@gmail.com';

-- 步驟 2: 查詢目前 Orange 的帳號資料
SELECT
  id,
  email,
  first_name,
  last_name,
  roles,
  is_active,
  status,
  '更新前的 Orange 帳號資料' as note
FROM users
WHERE first_name = 'Orange' OR email LIKE '%orange%';

-- 步驟 3: 更新 Orange 的帳號
-- 密碼設為: Orange@2025
-- Email 設為: orange@thisissingple.com
-- 權限複製自 xk4xk4563022@gmail.com
UPDATE users
SET
  email = 'orange@thisissingple.com',
  password_hash = '$2b$10$vnaa.ZMJFvqQhoOhWIjnLOl.AydEnccKya7PLda9tIdAKfMXN7fTy',
  roles = (SELECT roles FROM users WHERE email = 'xk4xk4563022@gmail.com'),
  is_active = (SELECT is_active FROM users WHERE email = 'xk4xk4563022@gmail.com'),
  status = (SELECT COALESCE(status, 'active') FROM users WHERE email = 'xk4xk4563022@gmail.com'),
  must_change_password = true,
  failed_login_attempts = 0,
  locked_until = NULL,
  updated_at = NOW()
WHERE first_name = 'Orange' OR email LIKE '%orange%';

-- 步驟 4: 確認更新成功
SELECT
  email,
  first_name,
  last_name,
  roles,
  is_active,
  status,
  must_change_password,
  updated_at,
  '✅ 更新成功' as note
FROM users
WHERE email = 'orange@thisissingple.com';

-- ================================================================
-- 📧 更新後的帳號資訊
-- ================================================================
-- Email: orange@thisissingple.com
-- 🔑 密碼: Orange@2025
-- 👥 權限: 與 xk4xk4563022@gmail.com 相同
--
-- ⚠️ 重要提示:
-- 1. 請告知 Orange 使用新密碼登入
-- 2. 首次登入後系統會要求修改密碼
-- ================================================================

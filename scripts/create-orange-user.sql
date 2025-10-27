-- 查詢 xk4xk4563022@gmail.com 的權限（用於參考）
SELECT email, roles, is_active, created_at
FROM users
WHERE email = 'xk4xk4563022@gmail.com';

-- 建立 Orange 的帳號
-- 預設密碼：Orange@2025 (請建議 Orange 登入後立即修改密碼)
INSERT INTO users (
  email,
  password_hash,
  roles,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'orange@thisissingple.com',
  -- 密碼：Orange@2025 的 bcrypt hash
  '$2b$10$rX3qZ8YvJH4KJ5N9WzGzLOXx8QGZvH.9kF9mJPqYvXKZvH9kF9mJP',
  -- 請執行上面的查詢後，將 xk4xk4563022@gmail.com 的 roles 複製到這裡
  ARRAY['admin']::text[],  -- 暫時設為 admin，請根據查詢結果調整
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE
SET
  roles = EXCLUDED.roles,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 確認建立成功
SELECT email, roles, is_active, created_at
FROM users
WHERE email = 'orange@thisissingple.com';

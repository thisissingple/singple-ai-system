-- 查詢 users 表的欄位結構
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- 查詢你的帳號資料（查看實際欄位）
SELECT *
FROM users
WHERE email = 'xk4xk4563022@gmail.com';

-- 查詢 Orange 的帳號資料
SELECT *
FROM users
WHERE first_name = 'Orange' OR email LIKE '%orange%';

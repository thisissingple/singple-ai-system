-- ============================================
-- 🔐 密碼更新 SQL 腳本
-- ============================================
-- 請在 Supabase Dashboard 的 SQL Editor 執行此腳本
--
-- 帳號: xk4kx4563022@gmail.com
-- 新密碼: Fff1359746!
-- ============================================

-- 步驟 1: 安裝 pgcrypto 擴充（如果尚未安裝）
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 步驟 2: 查詢當前使用者狀態
SELECT
  '=== 更新前 ===' as step,
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  CASE
    WHEN password_hash IS NOT NULL THEN '✅ 已設定'
    ELSE '❌ 未設定'
  END as password_status,
  failed_login_attempts,
  locked_until
FROM users
WHERE email ILIKE 'xk4kx4563022@gmail.com';

-- 步驟 3: 更新密碼
-- 注意：這裡使用 PostgreSQL 的 crypt 函數生成 bcrypt hash
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_password TEXT := 'Fff1359746!';
  v_hash TEXT;
BEGIN
  -- 查詢使用者
  SELECT id, email INTO v_user_id, v_email
  FROM users
  WHERE email ILIKE 'xk4kx4563022@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '❌ 找不到使用者: xk4kx4563022@gmail.com';
  END IF;

  RAISE NOTICE '✅ 找到使用者: %', v_email;

  -- 生成 bcrypt hash (cost factor = 10)
  v_hash := crypt(v_password, gen_salt('bf', 10));

  RAISE NOTICE '✅ 已生成密碼雜湊值';

  -- 更新密碼
  UPDATE users
  SET
    password_hash = v_hash,
    must_change_password = false,
    failed_login_attempts = 0,
    locked_until = NULL,
    last_password_change_at = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  RAISE NOTICE '✅ 密碼更新成功！';
  RAISE NOTICE '📋 登入資訊:';
  RAISE NOTICE '   Email: %', v_email;
  RAISE NOTICE '   密碼: %', v_password;
END $$;

-- 步驟 4: 驗證更新結果
SELECT
  '=== 更新後 ===' as step,
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  CASE
    WHEN password_hash IS NOT NULL THEN '✅ 已設定'
    ELSE '❌ 未設定'
  END as password_status,
  last_password_change_at,
  failed_login_attempts,
  locked_until,
  substring(password_hash, 1, 20) || '...' as password_hash_preview
FROM users
WHERE email ILIKE 'xk4kx4563022@gmail.com';

-- ============================================
-- 🎉 完成！
-- ============================================
--
-- 現在可以使用以下資訊登入：
--   Email: xk4kx4563022@gmail.com
--   密碼: Fff1359746!
--
-- ============================================

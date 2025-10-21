/**
 * Migration: Add Multiple Roles Support
 * 支援使用者擁有多個角色
 *
 * 變更：
 * 1. 移除舊的 role 欄位 CHECK 約束
 * 2. 新增 roles 陣列欄位（可以有多個角色）
 * 3. 保留舊的 role 欄位作為主要角色（向後相容）
 * 4. 遷移現有資料：將 role 複製到 roles 陣列中
 */

-- 1. 移除舊的 role CHECK 約束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. 新增 roles 陣列欄位
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY[]::text[];

-- 3. 建立 CHECK 約束，確保 roles 陣列中的值都是有效的角色
ALTER TABLE users ADD CONSTRAINT users_roles_check
  CHECK (
    roles <@ ARRAY['super_admin', 'admin', 'manager', 'teacher', 'sales', 'consultant', 'user']::text[]
  );

-- 4. 遷移現有資料：將 role 複製到 roles 陣列中
UPDATE users
SET roles = ARRAY[role]::text[]
WHERE role IS NOT NULL AND (roles IS NULL OR array_length(roles, 1) IS NULL);

-- 5. 重新建立 role 欄位的 CHECK 約束（保留向後相容）
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (
    role IN ('super_admin', 'admin', 'manager', 'teacher', 'sales', 'consultant', 'user')
  );

-- 6. 建立索引以加速角色查詢
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

-- 7. 新增註解
COMMENT ON COLUMN users.role IS '主要角色（向後相容，單一值）';
COMMENT ON COLUMN users.roles IS '所有角色（陣列，支援多重角色）。例如：{"teacher", "consultant"}';

-- 8. 建立輔助函數：檢查使用者是否擁有特定角色
CREATE OR REPLACE FUNCTION user_has_role(user_roles text[], check_role text)
RETURNS boolean AS $$
BEGIN
  RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION user_has_role IS '檢查使用者的 roles 陣列中是否包含指定角色';

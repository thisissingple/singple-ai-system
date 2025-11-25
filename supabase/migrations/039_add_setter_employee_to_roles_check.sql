/**
 * Migration 037: Add 'setter' and 'employee' to users.roles CHECK constraint
 * 新增 setter（電訪）和 employee（真工）到 roles 允許清單
 *
 * 問題：Migration 025 的 users_roles_check 約束不包含 setter 和 employee
 * 解決：移除舊約束，建立包含所有角色的新約束
 */

-- 1. 移除舊的 users_roles_check 約束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_roles_check;

-- 2. 建立新的 CHECK 約束，包含 setter 和 employee
ALTER TABLE users ADD CONSTRAINT users_roles_check
  CHECK (
    roles <@ ARRAY['super_admin', 'admin', 'manager', 'teacher', 'consultant', 'setter', 'employee', 'sales', 'user']::text[]
  );

-- 3. 更新單一 role 欄位的 CHECK 約束
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (
    role IN ('super_admin', 'admin', 'manager', 'teacher', 'consultant', 'setter', 'employee', 'sales', 'user')
  );

-- 4. 新增註解
COMMENT ON CONSTRAINT users_roles_check ON users IS
  '確保 roles 陣列只包含有效角色：super_admin, admin, manager, teacher, consultant, setter, employee, sales, user';

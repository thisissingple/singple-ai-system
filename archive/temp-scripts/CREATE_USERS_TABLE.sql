-- ============================================
-- 建立 Users 表（統一使用者管理）
-- 在 Supabase SQL Editor 執行此腳本
-- ============================================

-- 啟用 UUID 擴充
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 建立 Users 表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  role VARCHAR DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'manager', 'teacher', 'sales', 'consultant', 'user')),
  department VARCHAR,
  status VARCHAR DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'pending_approval')),

  -- 權限關聯欄位
  teacher_id TEXT,
  sales_id TEXT,
  department_id UUID,

  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_teacher_id ON users(teacher_id);
CREATE INDEX IF NOT EXISTS idx_users_sales_id ON users(sales_id);

-- 從現有 teachers 表遷移資料
INSERT INTO users (first_name, email, role, status, created_at)
SELECT
  name as first_name,
  email,
  'teacher' as role,
  CASE WHEN is_active THEN 'active' ELSE 'inactive' END as status,
  created_at
FROM teachers
WHERE NOT EXISTS (SELECT 1 FROM users WHERE users.email = teachers.email)
ON CONFLICT (email) DO NOTHING;

-- 確認資料
SELECT
  id,
  first_name,
  last_name,
  email,
  role,
  status,
  created_at
FROM users
ORDER BY role, first_name;

-- 顯示統計
SELECT
  role,
  status,
  COUNT(*) as count
FROM users
GROUP BY role, status
ORDER BY role, status;

-- ======================================
-- 在 Supabase 建立 teachers 表
-- ======================================
--
-- 請到 Supabase Dashboard 執行此 SQL：
-- 1. 前往 https://supabase.com/dashboard
-- 2. 選擇專案 vqkkqkjaywkjtraepqbg
-- 3. 左側選單 → SQL Editor
-- 4. 貼上下面的 SQL → 點擊 Run
-- ======================================

-- 建立老師資料表
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(name);
CREATE INDEX IF NOT EXISTS idx_teachers_is_active ON teachers(is_active);

-- 插入老師資料
INSERT INTO teachers (name, is_active) VALUES
  ('老師A', true),
  ('老師B', true),
  ('老師C', true),
  ('老師D', true)
ON CONFLICT (name) DO NOTHING;

-- 確認資料
SELECT id, name, is_active, created_at FROM teachers ORDER BY name;

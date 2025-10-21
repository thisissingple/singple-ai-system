-- 老師資料表
-- 儲存所有授課老師的基本資料

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
CREATE INDEX idx_teachers_name ON teachers(name);
CREATE INDEX idx_teachers_is_active ON teachers(is_active);

-- 權限設定
GRANT ALL ON teachers TO authenticated;
GRANT ALL ON teachers TO anon;

-- 註解
COMMENT ON TABLE teachers IS '老師資料表 - 儲存授課老師基本資料';
COMMENT ON COLUMN teachers.is_active IS '是否為在職老師';

-- 插入初始資料（範例）
INSERT INTO teachers (name, is_active) VALUES
  ('老師A', true),
  ('老師B', true),
  ('老師C', true),
  ('老師D', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Migration 002: 建立業務資料表 (含 Supabase 權限)
-- 執行方式：在 Supabase SQL Editor 貼上執行
-- ============================================

-- 啟用 RLS (Row Level Security) 但設為 permissive
-- 這樣 service_role 可以存取所有資料

-- Trial Class Attendance (試聽課出席記錄)
CREATE TABLE IF NOT EXISTS trial_class_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name TEXT,
  class_date DATE,
  attendance_status TEXT CHECK (attendance_status IN ('attended', 'absent', 'cancelled')),
  teacher_name TEXT,
  class_type TEXT,
  notes TEXT,

  -- 權限欄位
  teacher_id TEXT,
  sales_id TEXT,
  department_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 授予權限
ALTER TABLE trial_class_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for service_role" ON trial_class_attendance
  FOR SELECT USING (true);
CREATE POLICY "Enable insert access for service_role" ON trial_class_attendance
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for service_role" ON trial_class_attendance
  FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for service_role" ON trial_class_attendance
  FOR DELETE USING (true);

-- 索引
CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON trial_class_attendance(class_date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON trial_class_attendance(attendance_status);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher ON trial_class_attendance(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sales ON trial_class_attendance(sales_id);
CREATE INDEX IF NOT EXISTS idx_attendance_department ON trial_class_attendance(department_id);

-- Trial Class Purchase (試聽課購課記錄)
CREATE TABLE IF NOT EXISTS trial_class_purchase (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_name TEXT,
  purchase_date DATE,
  package_name TEXT,
  package_price DECIMAL(10, 2),
  payment_status TEXT CHECK (payment_status IN ('paid', 'pending', 'cancelled')),
  sales_person TEXT,
  notes TEXT,

  -- 權限欄位
  teacher_id TEXT,
  sales_id TEXT,
  department_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 授予權限
ALTER TABLE trial_class_purchase ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for service_role" ON trial_class_purchase
  FOR SELECT USING (true);
CREATE POLICY "Enable insert access for service_role" ON trial_class_purchase
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for service_role" ON trial_class_purchase
  FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for service_role" ON trial_class_purchase
  FOR DELETE USING (true);

-- 索引
CREATE INDEX IF NOT EXISTS idx_purchase_date ON trial_class_purchase(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchase_status ON trial_class_purchase(payment_status);
CREATE INDEX IF NOT EXISTS idx_purchase_teacher ON trial_class_purchase(teacher_id);
CREATE INDEX IF NOT EXISTS idx_purchase_sales ON trial_class_purchase(sales_id);
CREATE INDEX IF NOT EXISTS idx_purchase_department ON trial_class_purchase(department_id);

-- EODs for Closers (業務日報)
CREATE TABLE IF NOT EXISTS eods_for_closers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_date DATE,
  closer_name TEXT,
  setter_name TEXT,
  calls_made INTEGER DEFAULT 0,
  appointments_set INTEGER DEFAULT 0,
  deals_closed INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,

  -- 權限欄位
  closer_id TEXT,
  setter_id TEXT,
  department_id UUID,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 授予權限
ALTER TABLE eods_for_closers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for service_role" ON eods_for_closers
  FOR SELECT USING (true);
CREATE POLICY "Enable insert access for service_role" ON eods_for_closers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for service_role" ON eods_for_closers
  FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for service_role" ON eods_for_closers
  FOR DELETE USING (true);

-- 索引
CREATE INDEX IF NOT EXISTS idx_eods_date ON eods_for_closers(report_date);
CREATE INDEX IF NOT EXISTS idx_eods_closer ON eods_for_closers(closer_id);
CREATE INDEX IF NOT EXISTS idx_eods_setter ON eods_for_closers(setter_id);
CREATE INDEX IF NOT EXISTS idx_eods_department ON eods_for_closers(department_id);

-- 插入測試資料
INSERT INTO trial_class_attendance (student_name, class_date, attendance_status, teacher_name, class_type) VALUES
  ('王小明', '2025-09-15', 'attended', '李老師', '英文'),
  ('陳小華', '2025-09-16', 'attended', '王老師', '數學'),
  ('張小美', '2025-09-17', 'absent', '李老師', '英文'),
  ('林小強', '2025-09-18', 'attended', '王老師', '數學'),
  ('黃小芳', '2025-09-19', 'attended', '李老師', '英文')
ON CONFLICT (id) DO NOTHING;

INSERT INTO trial_class_purchase (student_name, purchase_date, package_name, package_price, payment_status, sales_person) VALUES
  ('王小明', '2025-09-20', '基礎課程包', 15000.00, 'paid', '陳業務'),
  ('陳小華', '2025-09-21', '進階課程包', 25000.00, 'paid', '林業務'),
  ('林小強', '2025-09-22', '基礎課程包', 15000.00, 'pending', '陳業務')
ON CONFLICT (id) DO NOTHING;

INSERT INTO eods_for_closers (report_date, closer_name, setter_name, calls_made, appointments_set, deals_closed, revenue) VALUES
  ('2025-09-15', '陳業務', '王電銷', 20, 5, 2, 40000.00),
  ('2025-09-16', '林業務', '李電銷', 18, 4, 1, 25000.00),
  ('2025-09-17', '陳業務', '王電銷', 22, 6, 3, 60000.00),
  ('2025-09-18', '林業務', '李電銷', 15, 3, 1, 15000.00),
  ('2025-09-19', '陳業務', '王電銷', 25, 7, 2, 50000.00)
ON CONFLICT (id) DO NOTHING;

-- 驗證
SELECT
  (SELECT COUNT(*) FROM trial_class_attendance) as attendance_count,
  (SELECT COUNT(*) FROM trial_class_purchase) as purchase_count,
  (SELECT COUNT(*) FROM eods_for_closers) as deals_count;

SELECT '✅ 業務資料表與測試資料建立完成！' AS status;

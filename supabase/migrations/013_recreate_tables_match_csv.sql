-- 刪除舊表格並重新建立，欄位順序完全符合 CSV

-- ============================================
-- 1. 體驗課上課記錄表
-- CSV 順序：姓名,email,上課日期,授課老師,是否已評價,未轉單原因,體驗課文字檔
-- ============================================

DROP TABLE IF EXISTS trial_class_attendance CASCADE;

CREATE TABLE trial_class_attendance (
  -- CSV 欄位（照順序）
  姓名 TEXT,
  email TEXT,
  上課日期 DATE,
  授課老師 TEXT,
  是否已評價 TEXT,
  未轉單原因 TEXT,
  體驗課文字檔 TEXT,

  -- 系統欄位
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX idx_trial_attendance_email ON trial_class_attendance(email);
CREATE INDEX idx_trial_attendance_name ON trial_class_attendance(姓名);
CREATE INDEX idx_trial_attendance_date ON trial_class_attendance(上課日期);
CREATE INDEX idx_trial_attendance_teacher ON trial_class_attendance(授課老師);

-- ============================================
-- 2. 購課記錄表
-- CSV 順序：姓名,email,年齡,職業,方案名稱,體驗堂數,剩餘堂數（自動計算）,
--          體驗課購買日期,目前狀態（自動計算）,更新日期,最近一次上課日期,備註
-- ============================================

DROP TABLE IF EXISTS trial_class_purchase CASCADE;

CREATE TABLE trial_class_purchase (
  -- CSV 欄位（照順序）
  姓名 TEXT,
  email TEXT,
  年齡 INTEGER,
  職業 TEXT,
  方案名稱 TEXT,
  體驗堂數 INTEGER,
  剩餘堂數 INTEGER,
  體驗課購買日期 DATE,
  目前狀態 TEXT,
  更新日期 TIMESTAMPTZ,
  最近一次上課日期 DATE,
  備註 TEXT,

  -- 系統欄位
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX idx_trial_purchase_email ON trial_class_purchase(email);
CREATE INDEX idx_trial_purchase_name ON trial_class_purchase(姓名);
CREATE INDEX idx_trial_purchase_date ON trial_class_purchase(體驗課購買日期);
CREATE INDEX idx_trial_purchase_status ON trial_class_purchase(目前狀態);

-- ============================================
-- 3. EODs for Closers
-- CSV 順序：Name,Email,（諮詢）電話負責人,（諮詢）諮詢人員,（諮詢）是否上線,
--          （諮詢）名單來源,（諮詢）諮詢結果,（諮詢）成交方案,（諮詢）方案數量,
--          （諮詢）付款方式,（諮詢）分期期數,（諮詢）方案價格,（諮詢）實收金額,
--          （諮詢）諮詢日期,（諮詢）成交日期,（諮詢）備註,提交表單時間,月份,年份,週別
-- ============================================

DROP TABLE IF EXISTS eods_for_closers CASCADE;

CREATE TABLE eods_for_closers (
  -- CSV 欄位（照順序）
  "Name" TEXT,
  "Email" TEXT,
  電話負責人 TEXT,
  諮詢人員 TEXT,
  是否上線 TEXT,
  名單來源 TEXT,
  諮詢結果 TEXT,
  成交方案 TEXT,
  方案數量 NUMERIC,
  付款方式 TEXT,
  分期期數 INTEGER,
  方案價格 NUMERIC,
  實收金額 NUMERIC,
  諮詢日期 DATE,
  成交日期 DATE,
  備註 TEXT,
  提交表單時間 TIMESTAMPTZ,
  月份 INTEGER,
  年份 INTEGER,
  週別 INTEGER,

  -- 系統欄位
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 建立索引
CREATE INDEX idx_eods_email ON eods_for_closers("Email");
CREATE INDEX idx_eods_name ON eods_for_closers("Name");
CREATE INDEX idx_eods_closer ON eods_for_closers(諮詢人員);
CREATE INDEX idx_eods_result ON eods_for_closers(諮詢結果);
CREATE INDEX idx_eods_deal_date ON eods_for_closers(成交日期);
CREATE INDEX idx_eods_month_year ON eods_for_closers(年份, 月份);

-- 權限設定
GRANT ALL ON trial_class_attendance TO authenticated;
GRANT ALL ON trial_class_purchase TO authenticated;
GRANT ALL ON eods_for_closers TO authenticated;

GRANT ALL ON trial_class_attendance TO anon;
GRANT ALL ON trial_class_purchase TO anon;
GRANT ALL ON eods_for_closers TO anon;

-- 註解
COMMENT ON TABLE trial_class_attendance IS '體驗課上課記錄表（欄位順序符合 CSV）';
COMMENT ON TABLE trial_class_purchase IS '體驗課購買記錄表（欄位順序符合 CSV）';
COMMENT ON TABLE eods_for_closers IS 'EODs for Closers（欄位順序符合 CSV）';

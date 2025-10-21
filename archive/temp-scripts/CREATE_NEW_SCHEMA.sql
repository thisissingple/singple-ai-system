-- 建立新 Schema（方案 A - 中文欄位名）
-- 請在 Supabase Dashboard → SQL Editor 執行

-- 1. 體驗課購買記錄
CREATE TABLE trial_class_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  姓名 TEXT,
  email TEXT,
  年齡 INTEGER,
  職業 TEXT,
  方案名稱 TEXT,
  體驗堂數 INTEGER,
  剩餘堂數 TEXT,
  體驗課購買日期 DATE,
  目前狀態 TEXT,  -- 計算轉換率的關鍵：已轉高/未轉高/體驗中/未開始
  更新日期 TIMESTAMP,
  最近一次上課日期 DATE,
  備註 TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 體驗課上課記錄
CREATE TABLE trial_class_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  姓名 TEXT,
  email TEXT,
  上課日期 DATE,
  授課老師 TEXT,
  是否已評價 TEXT,
  未轉單原因 TEXT,
  體驗課文字檔 TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 成交記錄（EODs for Closers）
CREATE TABLE eods_for_closers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  電話負責人 TEXT,
  諮詢人員 TEXT,
  是否上線 TEXT,
  名單來源 TEXT,
  諮詢結果 TEXT,
  成交方案 TEXT,
  方案數量 TEXT,
  付款方式 TEXT,
  分期期數 TEXT,
  方案價格 TEXT,
  實收金額 TEXT,
  諮詢日期 DATE,
  成交日期 DATE,
  備註 TEXT,
  提交表單時間 TIMESTAMP,
  月份 TEXT,
  年份 TEXT,
  週別 TEXT,
  是否為首次填寫 TEXT,
  是否為首次成交 TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 建立索引（加速查詢）
CREATE INDEX idx_purchases_email ON trial_class_purchases(email);
CREATE INDEX idx_purchases_status ON trial_class_purchases(目前狀態);
CREATE INDEX idx_purchases_date ON trial_class_purchases(體驗課購買日期);

CREATE INDEX idx_attendance_email ON trial_class_attendance(email);
CREATE INDEX idx_attendance_date ON trial_class_attendance(上課日期);

CREATE INDEX idx_eods_email ON eods_for_closers(email);
CREATE INDEX idx_eods_deal_date ON eods_for_closers(成交日期);
CREATE INDEX idx_eods_consult_date ON eods_for_closers(諮詢日期);

-- 啟用 RLS（可選，看是否需要權限控制）
-- ALTER TABLE trial_class_purchases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trial_class_attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE eods_for_closers ENABLE ROW LEVEL SECURITY;

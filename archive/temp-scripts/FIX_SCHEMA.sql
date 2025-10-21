-- 修正欄位名稱
-- 請在 Supabase Dashboard → SQL Editor 執行

-- 刪除舊的購買記錄表
DROP TABLE IF EXISTS trial_class_purchases CASCADE;

-- 重新建立，使用正確的欄位名
CREATE TABLE trial_class_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  姓名 TEXT,
  email TEXT,
  年齡 INTEGER,
  職業 TEXT,
  方案名稱 TEXT,
  體驗堂數 INTEGER,
  "剩餘堂數（自動計算）" TEXT,  -- 加引號因為有括號
  體驗課購買日期 DATE,
  "目前狀態（自動計算）" TEXT,  -- 加引號因為有括號
  更新日期 TIMESTAMP,
  最近一次上課日期 DATE,
  備註 TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 重建索引
CREATE INDEX idx_purchases_email ON trial_class_purchases(email);
CREATE INDEX "idx_purchases_status" ON trial_class_purchases("目前狀態（自動計算）");
CREATE INDEX idx_purchases_date ON trial_class_purchases(體驗課購買日期);

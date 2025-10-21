-- Migration 028: 新增匯率鎖定欄位到 cost_profit 表
-- 目的：記錄每筆交易當時的匯率，避免歷史資料因匯率變動而改變
-- 日期：2025-10-16

-- 1. 新增幣別欄位（預設 TWD）
ALTER TABLE cost_profit
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TWD';

-- 2. 新增當時使用的匯率（預設 1.0 代表 TWD）
ALTER TABLE cost_profit
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(10, 4) DEFAULT 1.0;

-- 3. 新增換算後的 TWD 金額
ALTER TABLE cost_profit
ADD COLUMN IF NOT EXISTS amount_in_twd DECIMAL(15, 2);

-- 4. 為現有資料設定預設值
-- 對於沒有幣別資訊的舊資料，假設為 TWD
UPDATE cost_profit
SET
  currency = 'TWD',
  exchange_rate_used = 1.0,
  amount_in_twd = amount
WHERE currency IS NULL;

-- 5. 新增註解
COMMENT ON COLUMN cost_profit.currency IS '幣別：TWD, USD, RMB';
COMMENT ON COLUMN cost_profit.exchange_rate_used IS '儲存時使用的匯率（對 TWD 的匯率）';
COMMENT ON COLUMN cost_profit.amount_in_twd IS '換算為 TWD 的金額（鎖定值）';

-- 6. 建立索引以加快查詢
CREATE INDEX IF NOT EXISTS idx_cost_profit_currency ON cost_profit(currency);
CREATE INDEX IF NOT EXISTS idx_cost_profit_year_month_currency ON cost_profit(year, month, currency);

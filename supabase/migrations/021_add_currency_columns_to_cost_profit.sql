-- 新增幣別和匯率鎖定欄位到 cost_profit 表

-- 新增幣別欄位
ALTER TABLE cost_profit
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'TWD' CHECK (currency IN ('TWD', 'USD', 'RMB'));

-- 新增儲存時的匯率欄位
ALTER TABLE cost_profit
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(10,4);

-- 新增換算後的 TWD 金額欄位（鎖定值）
ALTER TABLE cost_profit
ADD COLUMN IF NOT EXISTS amount_in_twd DECIMAL(15,2);

-- 為現有資料填入預設值
UPDATE cost_profit
SET
  currency = 'TWD',
  exchange_rate_used = 1.0,
  amount_in_twd = amount
WHERE currency IS NULL;

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_cost_profit_currency ON cost_profit(currency);

-- 註解
COMMENT ON COLUMN cost_profit.currency IS '幣別 (TWD/USD/RMB)';
COMMENT ON COLUMN cost_profit.exchange_rate_used IS '儲存時的匯率（對 TWD）';
COMMENT ON COLUMN cost_profit.amount_in_twd IS '換算後的 TWD 金額（鎖定值，不受匯率變動影響）';

-- 成本獲利計算表
CREATE TABLE IF NOT EXISTS cost_profit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL,           -- 分類名稱 (收入金額、人力成本、廣告費用等)
  item_name TEXT NOT NULL,               -- 項目名稱
  amount DECIMAL(15,2),                  -- 費用金額
  notes TEXT,                            -- 備註
  month TEXT NOT NULL,                   -- 月份 (January, February, etc.)
  year INTEGER NOT NULL,                 -- 年份
  is_confirmed BOOLEAN DEFAULT FALSE,    -- 已確認
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_cost_profit_category ON cost_profit(category_name);
CREATE INDEX IF NOT EXISTS idx_cost_profit_month_year ON cost_profit(month, year);
CREATE INDEX IF NOT EXISTS idx_cost_profit_confirmed ON cost_profit(is_confirmed);

-- 建立更新時間觸發器
CREATE OR REPLACE FUNCTION update_cost_profit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cost_profit_updated_at
  BEFORE UPDATE ON cost_profit
  FOR EACH ROW
  EXECUTE FUNCTION update_cost_profit_updated_at();

-- 啟用 RLS
ALTER TABLE cost_profit ENABLE ROW LEVEL SECURITY;

-- RLS 政策：允許所有操作 (開發環境)
CREATE POLICY "Allow all operations" ON cost_profit
  FOR ALL USING (true) WITH CHECK (true);

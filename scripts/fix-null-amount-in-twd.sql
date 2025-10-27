-- 修復 amount_in_twd 為 null 的問題
-- 將所有 TWD 資料的 amount_in_twd 設定為 amount 的值

UPDATE cost_profit
SET amount_in_twd = amount
WHERE currency = 'TWD' AND amount_in_twd IS NULL;

-- 檢查修復結果
SELECT
  COUNT(*) as total_records,
  COUNT(CASE WHEN amount_in_twd IS NULL THEN 1 END) as null_amount_in_twd,
  COUNT(CASE WHEN amount_in_twd IS NOT NULL THEN 1 END) as fixed_amount_in_twd
FROM cost_profit;

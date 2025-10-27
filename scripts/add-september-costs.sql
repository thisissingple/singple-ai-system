-- 新增 2025 年 9 月成本資料到 cost_profit 表
-- 執行方式：在 Supabase SQL Editor 中執行此腳本

BEGIN;

-- 系統費用
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('系統費用', 'Google Workspace', 1588, '2025/08/01 – 2025/08/31 / 3 名使用者 (52.92 USD)', 'September', 2025, true);

-- 軟體服務
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('軟體服務', 'Manus Pro', 5970, '2025/09/02 – 2025/10/02 / 1 帳號 (199.00 USD)', 'September', 2025, true);

INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('軟體服務', 'ChatGPT Plus', 600, '2025/09/06 – 2025/10/05 / 個人 (20.00 USD)', 'September', 2025, true);

INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('軟體服務', 'Adobe Acrobat Premium', 404, '2025/09/06 – 2025/10/05 / 每月 (13.47 USD)', 'September', 2025, true);

INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('軟體服務', 'Anthropic Max plan', 3000, '2025/09/10 – 2025/10/10 / 5x Plan (100.00 USD)', 'September', 2025, true);

INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('軟體服務', 'Trello Premium', 2250, '2025/09/20 – 2025/10/20 / 6 名成員 (75.00 USD)', 'September', 2025, true);

INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('軟體服務', 'Replit Core', 660, '2025/09/24 – 2025/10/24 / 含折扣 (22.00 USD)', 'September', 2025, true);

-- 通訊費用
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('通訊費用', 'Slack Pro', 1181, '2025/09/05 – 2025/10/05 / 9 名成員 (39.38 USD)', 'September', 2025, true);

INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('通訊費用', 'Zoom Pro', 498, '2025/09/07 – 2025/10/06 / 月費 (16.61 USD)', 'September', 2025, true);

COMMIT;

-- 驗證資料
SELECT
  category_name,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM cost_profit
WHERE year = 2025 AND month = 'September'
GROUP BY category_name
ORDER BY category_name;

-- 顯示總計
SELECT
  COUNT(*) as total_records,
  SUM(amount) as total_cost
FROM cost_profit
WHERE year = 2025 AND month = 'September';

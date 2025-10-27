-- 新增 8 月缺少的成本項目到 cost_profit 表
-- 這些是系統費用、網站費用、軟體服務等項目

BEGIN;

-- 稅金費用
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES ('稅金費用', '稅金費用', 60059, '', 'August', 2025, true)
ON CONFLICT DO NOTHING;

-- 系統費用
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES
('系統費用', 'Rainmaker', 10000, '', 'August', 2025, true),
('系統費用', 'Zapier', 2670, '', 'August', 2025, true),
('系統費用', 'Manychat', 1200, '', 'August', 2025, true),
('系統費用', '智慧交易系統', 2000, '', 'August', 2025, true),
('系統費用', 'Google Suite', 1958, '', 'August', 2025, true)
ON CONFLICT DO NOTHING;

-- 網站費用
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES
('網站費用', '網站', 600, '', 'August', 2025, true),
('網站費用', 'Elementor', 300, '', 'August', 2025, true),
('網站費用', 'Godaddy', 200, '', 'August', 2025, true),
('網站費用', 'Yahoo商店費', 884, '', 'August', 2025, true)
ON CONFLICT DO NOTHING;

-- 軟體服務
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES
('軟體服務', 'filerev（drive cleaner）', 600, '20.00 USD', 'August', 2025, true),
('軟體服務', 'Trello', 2500, '', 'August', 2025, true),
('軟體服務', 'Canva', 250, '', 'August', 2025, true),
('軟體服務', '影片軟體 1', 1000, '', 'August', 2025, true),
('軟體服務', 'Taption', 360, '', 'August', 2025, true),
('軟體服務', 'SoundCloud', 250, '', 'August', 2025, true),
('軟體服務', 'Vidiq', 1000, '', 'August', 2025, true),
('軟體服務', 'Vimeo', 600, '', 'August', 2025, true),
('軟體服務', '大陸影音託管', 600, '', 'August', 2025, true),
('軟體服務', 'Learndash', 700, '', 'August', 2025, true),
('軟體服務', 'ChatGPT', 1600, '', 'August', 2025, true),
('軟體服務', 'adobe', 990, '', 'August', 2025, true),
('軟體服務', 'suno', 325, '', 'August', 2025, true),
('軟體服務', 'turboscribe', 651, '', 'August', 2025, true),
('軟體服務', 'Last Pass', 1200, '', 'August', 2025, true),
('軟體服務', 'Clickup', 2087, '', 'August', 2025, true),
('軟體服務', 'manus ai', 6097, '200.00 USD', 'August', 2025, true)
ON CONFLICT DO NOTHING;

-- 通訊費用
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES
('通訊費用', 'mailerlite', 750, '25.00 USD', 'August', 2025, true),
('通訊費用', '電話費', 10000, '', 'August', 2025, true),
('通訊費用', 'Zoom', 300, '', 'August', 2025, true),
('通訊費用', 'Line@', 170, '', 'August', 2025, true),
('通訊費用', '毅通電銷系統', 10000, '', 'August', 2025, true),
('通訊費用', 'slack', 1200, '39.38 USD', 'August', 2025, true)
ON CONFLICT DO NOTHING;

-- 金流費用
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES
('金流費用', '藍新手續費', 4149, '', 'August', 2025, true),
('金流費用', '統一手續費', 467, '', 'August', 2025, true),
('金流費用', 'Yahoo手續費', 498, '', 'August', 2025, true),
('金流費用', '和潤手續費', 21000, '', 'August', 2025, true),
('金流費用', 'PPA手續費', 15409, '', 'August', 2025, true)
ON CONFLICT DO NOTHING;

-- 顧問服務
INSERT INTO cost_profit (category_name, item_name, amount, notes, month, year, is_confirmed)
VALUES
('顧問服務', 'NLP顧問', 72233, '', 'August', 2025, true),
('顧問服務', '會計', 2500, '', 'August', 2025, true),
('顧問服務', '律師', 1666, '', 'August', 2025, true)
ON CONFLICT DO NOTHING;

COMMIT;

-- 驗證新增的資料
SELECT
  category_name,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM cost_profit
WHERE year = 2025 AND month = 'August' AND category_name NOT IN ('人力成本', '收入金額')
GROUP BY category_name
ORDER BY category_name;

-- 顯示 8 月總計
SELECT
  COUNT(*) as total_records,
  SUM(CASE WHEN category_name = '收入金額' THEN amount ELSE 0 END) as revenue,
  SUM(CASE WHEN category_name != '收入金額' THEN amount ELSE 0 END) as total_cost
FROM cost_profit
WHERE year = 2025 AND month = 'August';

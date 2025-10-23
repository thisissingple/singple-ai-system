/**
 * 檢查 trial_class_purchases 表的結構
 */

-- 方法 1: 查看所有欄位
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trial_class_purchases'
ORDER BY ordinal_position;

-- 方法 2: 簡單查詢看看有哪些欄位
SELECT *
FROM trial_class_purchases
LIMIT 1;

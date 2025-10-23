/**
 * 步驟 2: 檢查現有方案並補充缺少的資料
 *
 * 請在 Supabase Dashboard -> SQL Editor 執行此查詢
 */

-- ========================================
-- Part 1: 查看目前使用中的所有方案名稱
-- ========================================
SELECT
  package_name AS "方案名稱",
  COUNT(*) AS "學生數量",
  MIN(purchase_date) AS "首次使用日期"
FROM trial_class_purchases
WHERE package_name IS NOT NULL AND package_name != ''
GROUP BY package_name
ORDER BY COUNT(*) DESC;

-- ========================================
-- Part 2: 檢查哪些方案還沒有在 course_plans 中
-- ========================================
SELECT
  p.package_name AS "❌ 缺少的方案",
  COUNT(*) AS "影響的學生數"
FROM trial_class_purchases p
LEFT JOIN course_plans cp ON p.package_name = cp.plan_name
WHERE p.package_name IS NOT NULL
  AND p.package_name != ''
  AND cp.plan_name IS NULL
GROUP BY p.package_name
ORDER BY COUNT(*) DESC;

-- ========================================
-- Part 3: 查看已經存在的方案
-- ========================================
SELECT
  plan_name AS "✅ 已存在的方案",
  total_classes AS "總堂數",
  category AS "分類",
  is_active AS "啟用"
FROM course_plans
ORDER BY display_order;

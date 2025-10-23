/**
 * 步驟 2: 補充缺少的方案資料
 *
 * 使用方式：
 * 1. 先執行 check-existing-plans.sql 查看缺少哪些方案
 * 2. 根據查詢結果，修改下方的 INSERT 語句
 * 3. 在 Supabase Dashboard -> SQL Editor 執行此查詢
 */

-- ========================================
-- 補充您的方案資料
-- ========================================

-- 範例：如果查詢結果顯示缺少以下方案，請修改並執行：

INSERT INTO course_plans (plan_name, total_classes, category, description, is_active, display_order)
VALUES
  -- 請根據您的實際方案修改以下內容
  -- 格式：('方案名稱', 總堂數, '體驗課', '方案描述', TRUE, 顯示順序)

  ('初學專案', 4, '體驗課', '適合初學者的4堂體驗課程', TRUE, 1),
  ('進階專案', 6, '體驗課', '適合進階學員的6堂體驗課程', TRUE, 2),
  ('密集專案', 8, '體驗課', '密集訓練的8堂體驗課程', TRUE, 3)

  -- 如果有更多方案，請在上方繼續添加，例如：
  -- ,('VIP專案', 10, '體驗課', 'VIP專屬10堂課程', TRUE, 4)
  -- ,('快速入門', 2, '體驗課', '快速入門2堂課', TRUE, 5)

ON CONFLICT (plan_name) DO UPDATE SET
  total_classes = EXCLUDED.total_classes,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ========================================
-- 驗證：查看所有已建立的方案
-- ========================================
SELECT
  plan_name AS "方案名稱",
  total_classes AS "總堂數",
  category AS "分類",
  is_active AS "啟用",
  created_at AS "建立時間"
FROM course_plans
ORDER BY display_order, plan_name;

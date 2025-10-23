/**
 * Migration 039: 標記冗餘欄位為已棄用
 *
 * 背景：
 * - 現在 total_classes 由 course_plans 表統一管理
 * - remaining_classes 由系統自動計算（total - attended）
 * - trial_class_purchases 中的這些欄位變成冗餘資料
 *
 * 策略：
 * - 保留欄位但標記為 DEPRECATED（避免破壞現有資料）
 * - 新增註解說明不應再使用
 * - 後端代碼停止寫入這些欄位
 * - 未來確認無問題後可以完全刪除
 *
 * 作者：Claude Code
 * 日期：2025-10-23
 */

-- ==================== 標記欄位為已棄用 ====================

COMMENT ON COLUMN trial_class_purchases.trial_class_count IS
  '⚠️ DEPRECATED: 請使用 course_plans.total_classes 查詢總堂數。
   此欄位保留僅供歷史資料參考，不應再更新。';

COMMENT ON COLUMN trial_class_purchases.remaining_classes IS
  '⚠️ DEPRECATED: 剩餘堂數現由系統自動計算（course_plans.total_classes - attended）。
   此欄位保留僅供歷史資料參考，不應再更新。';

-- ==================== 新增計算視圖（選用）====================

/**
 * 建立視圖方便查詢學生的完整資訊
 * 包含自動計算的總堂數和剩餘堂數
 */
CREATE OR REPLACE VIEW student_class_summary AS
SELECT
  p.id,
  p.student_name,
  p.student_email,
  p.package_name,
  p.purchase_date,
  p.status,

  -- 從 course_plans 查詢總堂數
  COALESCE(cp.total_classes, p.trial_class_count, 0) AS total_classes,

  -- 計算已上堂數（從 attendance 表）
  COALESCE(
    (SELECT COUNT(*)
     FROM trial_class_attendance a
     WHERE a.student_email = p.student_email
       AND a.class_date >= p.purchase_date
    ), 0
  ) AS attended_classes,

  -- 自動計算剩餘堂數
  COALESCE(cp.total_classes, p.trial_class_count, 0) - COALESCE(
    (SELECT COUNT(*)
     FROM trial_class_attendance a
     WHERE a.student_email = p.student_email
       AND a.class_date >= p.purchase_date
    ), 0
  ) AS remaining_classes,

  -- 課程方案資訊
  cp.category AS plan_category,
  cp.description AS plan_description,
  cp.total_price AS plan_price

FROM trial_class_purchases p
LEFT JOIN course_plans cp ON p.package_name = cp.plan_name AND cp.is_active = TRUE
ORDER BY p.purchase_date DESC;

-- ==================== 視圖說明 ====================

COMMENT ON VIEW student_class_summary IS
  '學生課程摘要視圖：自動計算總堂數、已上堂數、剩餘堂數。
   使用此視圖可避免直接讀取已棄用的 trial_class_count 和 remaining_classes 欄位。';

-- ==================== 權限設定 ====================

-- 所有登入使用者都可以查詢視圖
-- GRANT SELECT ON student_class_summary TO authenticated;

-- ==================== 使用範例 ====================

/**
 * 查詢學生的課程狀態（推薦使用此視圖）
 *
 * SELECT
 *   student_name,
 *   package_name,
 *   total_classes,      -- 來自 course_plans
 *   attended_classes,   -- 自動計算
 *   remaining_classes   -- 自動計算
 * FROM student_class_summary
 * WHERE student_email = 'example@gmail.com';
 */

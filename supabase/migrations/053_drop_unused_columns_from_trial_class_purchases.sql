-- Migration 053: Drop unused columns from trial_class_purchases
-- 這些欄位在資料庫中全為 null，且程式碼中未實際使用
-- 由於此表採用「清除全部重新填入」同步策略，updated_at 和 last_class_date 也無意義
-- Created: 2025-11-14

-- Step 1: Drop the student_class_summary view (never used in code)
DROP VIEW IF EXISTS student_class_summary;

-- Step 2: 刪除完全未使用的欄位
ALTER TABLE trial_class_purchases
DROP COLUMN IF EXISTS age,
DROP COLUMN IF EXISTS occupation,
DROP COLUMN IF EXISTS notes,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS last_class_date;

-- Step 3: Recreate the view without updated_at (optional - for future use)
CREATE OR REPLACE VIEW student_class_summary AS
SELECT
  p.id,
  p.student_name,
  p.student_email,
  p.package_name,
  p.purchase_date,
  p.created_at,

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
  cp.plan_name AS plan_name_from_db,
  cp.category AS plan_category,
  cp.description AS plan_description,
  cp.total_price AS plan_price,
  cp.is_active AS plan_is_active

FROM trial_class_purchases p
LEFT JOIN course_plans cp ON p.package_name = cp.plan_name AND cp.is_active = TRUE
ORDER BY p.purchase_date DESC;

-- 更新表註解
COMMENT ON TABLE trial_class_purchases IS
'Trial class purchase records synced from Google Sheets.
Student status and remaining classes are calculated dynamically, not stored in this table.
This table is cleared and refilled during each sync.';

-- 更新欄位註解
COMMENT ON COLUMN trial_class_purchases.trial_class_count IS
'Trial class count from Google Sheets (used as fallback when course_plans lookup fails)';

COMMENT ON COLUMN trial_class_purchases.remaining_classes IS
'Remaining classes from Google Sheets (legacy field, should be calculated dynamically)';

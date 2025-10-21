-- ============================================
-- Migration 009: Create Report Views and Functions
-- 建立報表視圖和函數以支援前端查詢
--
-- 目的：
-- 1. 建立常用報表的視圖以簡化查詢
-- 2. 建立業務函數以支援複雜的報表邏輯
-- 3. 優化查詢效能
--
-- 日期: 2025-10-04
-- ============================================

-- ============================================
-- 1. Student Journey View (學生完整旅程視圖)
-- ============================================

CREATE OR REPLACE VIEW v_student_journey AS
SELECT
  a.student_email,
  a.student_name,
  -- 體驗課資訊
  COUNT(DISTINCT a.id) AS total_trial_classes,
  MIN(a.class_date) AS first_trial_class_date,
  MAX(a.class_date) AS last_trial_class_date,
  -- 購買資訊
  EXISTS(SELECT 1 FROM trial_class_purchase p WHERE p.student_email = a.student_email) AS has_purchased,
  (SELECT MIN(purchase_date) FROM trial_class_purchase p WHERE p.student_email = a.student_email) AS first_purchase_date,
  (SELECT SUM(package_price) FROM trial_class_purchase p WHERE p.student_email = a.student_email) AS total_purchase_amount,
  -- 諮詢資訊
  EXISTS(SELECT 1 FROM eods_for_closers e WHERE e.student_email = a.student_email) AS has_consultation,
  (SELECT COUNT(*) FROM eods_for_closers e WHERE e.student_email = a.student_email) AS total_consultations,
  (SELECT MAX(deal_date) FROM eods_for_closers e WHERE e.student_email = a.student_email) AS last_deal_date,
  -- 轉換狀態
  CASE
    WHEN EXISTS(SELECT 1 FROM trial_class_purchase p WHERE p.student_email = a.student_email)
      THEN 'converted'
    WHEN EXISTS(SELECT 1 FROM eods_for_closers e WHERE e.student_email = a.student_email)
      THEN 'in_consultation'
    ELSE 'trial_only'
  END AS conversion_status
FROM trial_class_attendance a
GROUP BY a.student_email, a.student_name;

COMMENT ON VIEW v_student_journey IS '學生完整旅程視圖 - 整合體驗課、購買、諮詢資訊';

-- ============================================
-- 2. Teacher Performance View (老師業績視圖)
-- ============================================

CREATE OR REPLACE VIEW v_teacher_performance AS
SELECT
  a.teacher_name,
  COUNT(DISTINCT a.student_email) AS total_students,
  COUNT(DISTINCT a.id) AS total_classes,
  COUNT(DISTINCT CASE WHEN a.is_reviewed = TRUE THEN a.id END) AS reviewed_classes,
  COUNT(DISTINCT CASE WHEN a.is_reviewed = FALSE THEN a.id END) AS pending_review_classes,
  -- 轉換率
  COUNT(DISTINCT CASE
    WHEN EXISTS(SELECT 1 FROM trial_class_purchase p WHERE p.student_email = a.student_email)
    THEN a.student_email
  END) AS converted_students,
  ROUND(
    100.0 * COUNT(DISTINCT CASE
      WHEN EXISTS(SELECT 1 FROM trial_class_purchase p WHERE p.student_email = a.student_email)
      THEN a.student_email
    END) / NULLIF(COUNT(DISTINCT a.student_email), 0),
    2
  ) AS conversion_rate,
  -- 日期範圍
  MIN(a.class_date) AS first_class_date,
  MAX(a.class_date) AS last_class_date
FROM trial_class_attendance a
WHERE a.teacher_name IS NOT NULL
GROUP BY a.teacher_name;

COMMENT ON VIEW v_teacher_performance IS '老師業績視圖 - 統計每位老師的學生數、課程數、轉換率';

-- ============================================
-- 3. Closer Performance View (咨詢師業績視圖)
-- ============================================

CREATE OR REPLACE VIEW v_closer_performance AS
SELECT
  e.closer_name,
  COUNT(*) AS total_consultations,
  COUNT(DISTINCT e.student_email) AS total_students,
  -- 成交統計
  COUNT(CASE WHEN e.consultation_result = '成交' THEN 1 END) AS total_deals,
  COUNT(CASE WHEN e.consultation_result != '成交' THEN 1 END) AS total_no_deals,
  ROUND(
    100.0 * COUNT(CASE WHEN e.consultation_result = '成交' THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS deal_rate,
  -- 金額統計
  SUM(e.actual_amount) AS total_revenue,
  AVG(e.actual_amount) AS average_deal_amount,
  MAX(e.actual_amount) AS max_deal_amount,
  -- 日期範圍
  MIN(e.consultation_date) AS first_consultation_date,
  MAX(e.deal_date) AS last_deal_date
FROM eods_for_closers e
WHERE e.closer_name IS NOT NULL
GROUP BY e.closer_name;

COMMENT ON VIEW v_closer_performance IS '咨詢師業績視圖 - 統計每位咨詢師的諮詢數、成交率、營收';

-- ============================================
-- 4. Caller Performance View (電訪人員業績視圖)
-- ============================================

CREATE OR REPLACE VIEW v_caller_performance AS
SELECT
  e.caller_name,
  COUNT(*) AS total_calls,
  COUNT(DISTINCT e.student_email) AS total_students,
  -- 轉換統計
  COUNT(CASE WHEN e.consultation_result = '成交' THEN 1 END) AS successful_conversions,
  ROUND(
    100.0 * COUNT(CASE WHEN e.consultation_result = '成交' THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS conversion_rate,
  -- 線上/線下統計
  COUNT(CASE WHEN e.is_online = TRUE THEN 1 END) AS online_consultations,
  COUNT(CASE WHEN e.is_online = FALSE THEN 1 END) AS offline_consultations,
  -- 日期範圍
  MIN(e.consultation_date) AS first_call_date,
  MAX(e.consultation_date) AS last_call_date
FROM eods_for_closers e
WHERE e.caller_name IS NOT NULL
GROUP BY e.caller_name;

COMMENT ON VIEW v_caller_performance IS '電訪人員業績視圖 - 統計每位電訪人員的通話數、轉換率';

-- ============================================
-- 5. Daily Statistics View (每日統計視圖)
-- ============================================

CREATE OR REPLACE VIEW v_daily_statistics AS
SELECT
  date_trunc('day', a.class_date)::date AS date,
  COUNT(DISTINCT a.student_email) AS trial_students,
  COUNT(DISTINCT a.id) AS trial_classes,
  COALESCE(p.purchases, 0) AS purchases,
  COALESCE(e.consultations, 0) AS consultations,
  COALESCE(e.deals, 0) AS deals,
  COALESCE(e.revenue, 0) AS revenue
FROM trial_class_attendance a
LEFT JOIN (
  SELECT
    purchase_date::date AS date,
    COUNT(*) AS purchases
  FROM trial_class_purchase
  WHERE purchase_date IS NOT NULL
  GROUP BY purchase_date::date
) p ON date_trunc('day', a.class_date)::date = p.date
LEFT JOIN (
  SELECT
    consultation_date::date AS date,
    COUNT(*) AS consultations,
    COUNT(CASE WHEN consultation_result = '成交' THEN 1 END) AS deals,
    SUM(actual_amount) AS revenue
  FROM eods_for_closers
  WHERE consultation_date IS NOT NULL
  GROUP BY consultation_date::date
) e ON date_trunc('day', a.class_date)::date = e.date
WHERE a.class_date IS NOT NULL
GROUP BY date_trunc('day', a.class_date)::date, p.purchases, e.consultations, e.deals, e.revenue
ORDER BY date DESC;

COMMENT ON VIEW v_daily_statistics IS '每日統計視圖 - 整合每日的體驗課、購買、諮詢數據';

-- ============================================
-- 6. Monthly Statistics View (每月統計視圖)
-- ============================================

CREATE OR REPLACE VIEW v_monthly_statistics AS
SELECT
  date_trunc('month', a.class_date)::date AS month,
  EXTRACT(YEAR FROM a.class_date)::integer AS year,
  EXTRACT(MONTH FROM a.class_date)::integer AS month_number,
  COUNT(DISTINCT a.student_email) AS trial_students,
  COUNT(DISTINCT a.id) AS trial_classes,
  COALESCE(p.purchases, 0) AS purchases,
  COALESCE(p.purchase_revenue, 0) AS purchase_revenue,
  COALESCE(e.consultations, 0) AS consultations,
  COALESCE(e.deals, 0) AS deals,
  COALESCE(e.deal_revenue, 0) AS deal_revenue
FROM trial_class_attendance a
LEFT JOIN (
  SELECT
    date_trunc('month', purchase_date)::date AS month,
    COUNT(*) AS purchases,
    SUM(package_price) AS purchase_revenue
  FROM trial_class_purchase
  WHERE purchase_date IS NOT NULL
  GROUP BY date_trunc('month', purchase_date)::date
) p ON date_trunc('month', a.class_date)::date = p.month
LEFT JOIN (
  SELECT
    date_trunc('month', consultation_date)::date AS month,
    COUNT(*) AS consultations,
    COUNT(CASE WHEN consultation_result = '成交' THEN 1 END) AS deals,
    SUM(actual_amount) AS deal_revenue
  FROM eods_for_closers
  WHERE consultation_date IS NOT NULL
  GROUP BY date_trunc('month', consultation_date)::date
) e ON date_trunc('month', a.class_date)::date = e.month
WHERE a.class_date IS NOT NULL
GROUP BY
  date_trunc('month', a.class_date)::date,
  EXTRACT(YEAR FROM a.class_date),
  EXTRACT(MONTH FROM a.class_date),
  p.purchases,
  p.purchase_revenue,
  e.consultations,
  e.deals,
  e.deal_revenue
ORDER BY month DESC;

COMMENT ON VIEW v_monthly_statistics IS '每月統計視圖 - 整合每月的體驗課、購買、諮詢數據';

-- ============================================
-- 7. Conversion Funnel View (轉換漏斗視圖)
-- ============================================

CREATE OR REPLACE VIEW v_conversion_funnel AS
WITH funnel_data AS (
  SELECT
    COUNT(DISTINCT a.student_email) AS stage_1_trial_class,
    COUNT(DISTINCT CASE
      WHEN EXISTS(SELECT 1 FROM eods_for_closers e WHERE e.student_email = a.student_email)
      THEN a.student_email
    END) AS stage_2_consultation,
    COUNT(DISTINCT CASE
      WHEN EXISTS(SELECT 1 FROM eods_for_closers e WHERE e.student_email = a.student_email AND e.consultation_result = '成交')
      THEN a.student_email
    END) AS stage_3_deal,
    COUNT(DISTINCT CASE
      WHEN EXISTS(SELECT 1 FROM trial_class_purchase p WHERE p.student_email = a.student_email)
      THEN a.student_email
    END) AS stage_4_purchase
  FROM trial_class_attendance a
)
SELECT
  'Trial Class' AS stage,
  1 AS stage_order,
  stage_1_trial_class AS student_count,
  100.0 AS percentage
FROM funnel_data
UNION ALL
SELECT
  'Consultation' AS stage,
  2 AS stage_order,
  stage_2_consultation AS student_count,
  ROUND(100.0 * stage_2_consultation / NULLIF(stage_1_trial_class, 0), 2) AS percentage
FROM funnel_data
UNION ALL
SELECT
  'Deal' AS stage,
  3 AS stage_order,
  stage_3_deal AS student_count,
  ROUND(100.0 * stage_3_deal / NULLIF(stage_1_trial_class, 0), 2) AS percentage
FROM funnel_data
UNION ALL
SELECT
  'Purchase' AS stage,
  4 AS stage_order,
  stage_4_purchase AS student_count,
  ROUND(100.0 * stage_4_purchase / NULLIF(stage_1_trial_class, 0), 2) AS percentage
FROM funnel_data
ORDER BY stage_order;

COMMENT ON VIEW v_conversion_funnel IS '轉換漏斗視圖 - 顯示從體驗課到購買的完整漏斗';

-- ============================================
-- 8. Functions for Report Queries
-- ============================================

-- Function: Get student journey by email
CREATE OR REPLACE FUNCTION get_student_journey(p_student_email TEXT)
RETURNS TABLE (
  student_email TEXT,
  student_name TEXT,
  trial_classes JSONB,
  purchases JSONB,
  consultations JSONB,
  conversion_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.student_email,
    v.student_name,
    (SELECT jsonb_agg(row_to_json(a.*))
     FROM trial_class_attendance a
     WHERE a.student_email = v.student_email
     ORDER BY a.class_date DESC) AS trial_classes,
    (SELECT jsonb_agg(row_to_json(p.*))
     FROM trial_class_purchase p
     WHERE p.student_email = v.student_email
     ORDER BY p.purchase_date DESC) AS purchases,
    (SELECT jsonb_agg(row_to_json(e.*))
     FROM eods_for_closers e
     WHERE e.student_email = v.student_email
     ORDER BY e.consultation_date DESC) AS consultations,
    v.conversion_status
  FROM v_student_journey v
  WHERE v.student_email = p_student_email;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_student_journey IS '取得學生完整旅程 - 包含所有體驗課、購買、諮詢記錄';

-- Function: Get teacher performance with date range
CREATE OR REPLACE FUNCTION get_teacher_performance(
  p_teacher_name TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  teacher_name TEXT,
  total_students BIGINT,
  total_classes BIGINT,
  reviewed_classes BIGINT,
  converted_students BIGINT,
  conversion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.teacher_name,
    COUNT(DISTINCT a.student_email) AS total_students,
    COUNT(DISTINCT a.id) AS total_classes,
    COUNT(DISTINCT CASE WHEN a.is_reviewed = TRUE THEN a.id END) AS reviewed_classes,
    COUNT(DISTINCT CASE
      WHEN EXISTS(SELECT 1 FROM trial_class_purchase p WHERE p.student_email = a.student_email)
      THEN a.student_email
    END) AS converted_students,
    ROUND(
      100.0 * COUNT(DISTINCT CASE
        WHEN EXISTS(SELECT 1 FROM trial_class_purchase p WHERE p.student_email = a.student_email)
        THEN a.student_email
      END) / NULLIF(COUNT(DISTINCT a.student_email), 0),
      2
    ) AS conversion_rate
  FROM trial_class_attendance a
  WHERE
    (p_teacher_name IS NULL OR a.teacher_name = p_teacher_name)
    AND (p_start_date IS NULL OR a.class_date >= p_start_date)
    AND (p_end_date IS NULL OR a.class_date <= p_end_date)
    AND a.teacher_name IS NOT NULL
  GROUP BY a.teacher_name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_teacher_performance IS '取得老師業績 - 支援日期範圍篩選';

-- Function: Get conversion statistics
CREATE OR REPLACE FUNCTION get_conversion_statistics(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_trial_students BIGINT,
  total_consultations BIGINT,
  total_deals BIGINT,
  total_purchases BIGINT,
  consultation_rate NUMERIC,
  deal_rate NUMERIC,
  purchase_rate NUMERIC,
  average_deal_amount NUMERIC,
  total_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT
      COUNT(DISTINCT a.student_email) AS trial_students,
      COUNT(DISTINCT e.student_email) AS consultation_students,
      COUNT(DISTINCT CASE WHEN e.consultation_result = '成交' THEN e.student_email END) AS deal_students,
      COUNT(DISTINCT p.student_email) AS purchase_students,
      AVG(e.actual_amount) AS avg_amount,
      SUM(e.actual_amount) AS total_amount
    FROM trial_class_attendance a
    LEFT JOIN eods_for_closers e ON a.student_email = e.student_email
      AND (p_start_date IS NULL OR e.consultation_date >= p_start_date)
      AND (p_end_date IS NULL OR e.consultation_date <= p_end_date)
    LEFT JOIN trial_class_purchase p ON a.student_email = p.student_email
      AND (p_start_date IS NULL OR p.purchase_date >= p_start_date)
      AND (p_end_date IS NULL OR p.purchase_date <= p_end_date)
    WHERE
      (p_start_date IS NULL OR a.class_date >= p_start_date)
      AND (p_end_date IS NULL OR a.class_date <= p_end_date)
  )
  SELECT
    trial_students,
    consultation_students,
    deal_students,
    purchase_students,
    ROUND(100.0 * consultation_students / NULLIF(trial_students, 0), 2) AS consultation_rate,
    ROUND(100.0 * deal_students / NULLIF(trial_students, 0), 2) AS deal_rate,
    ROUND(100.0 * purchase_students / NULLIF(trial_students, 0), 2) AS purchase_rate,
    ROUND(avg_amount, 2) AS average_deal_amount,
    ROUND(COALESCE(total_amount, 0), 2) AS total_revenue
  FROM stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_conversion_statistics IS '取得轉換統計 - 支援日期範圍篩選';

-- ============================================
-- 9. Grant Permissions
-- ============================================

-- Grant SELECT on views to authenticated users
GRANT SELECT ON v_student_journey TO authenticated;
GRANT SELECT ON v_teacher_performance TO authenticated;
GRANT SELECT ON v_closer_performance TO authenticated;
GRANT SELECT ON v_caller_performance TO authenticated;
GRANT SELECT ON v_daily_statistics TO authenticated;
GRANT SELECT ON v_monthly_statistics TO authenticated;
GRANT SELECT ON v_conversion_funnel TO authenticated;

-- Grant EXECUTE on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_student_journey TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_performance TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_statistics TO authenticated;

-- ============================================
-- 完成
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 009 completed successfully!';
  RAISE NOTICE '📊 Created 7 report views:';
  RAISE NOTICE '   - v_student_journey';
  RAISE NOTICE '   - v_teacher_performance';
  RAISE NOTICE '   - v_closer_performance';
  RAISE NOTICE '   - v_caller_performance';
  RAISE NOTICE '   - v_daily_statistics';
  RAISE NOTICE '   - v_monthly_statistics';
  RAISE NOTICE '   - v_conversion_funnel';
  RAISE NOTICE '🔧 Created 3 functions:';
  RAISE NOTICE '   - get_student_journey';
  RAISE NOTICE '   - get_teacher_performance';
  RAISE NOTICE '   - get_conversion_statistics';
END $$;

-- Migration 041: Add Performance Indexes
-- 目的：優化查詢效能，減少全表掃描
-- 影響：大幅提升資料庫查詢速度（從秒級降至毫秒級）

-- ========================================
-- 1. Trial Class Attendance 索引
-- ========================================

-- 為 class_date 建立索引（最常用的查詢條件）
CREATE INDEX IF NOT EXISTS idx_trial_class_attendance_class_date
ON trial_class_attendance(class_date);

-- 為 student_email 建立索引（用於學生資料關聯）
CREATE INDEX IF NOT EXISTS idx_trial_class_attendance_student_email
ON trial_class_attendance(student_email);

-- 為 teacher_name 建立索引（用於教師分析）
CREATE INDEX IF NOT EXISTS idx_trial_class_attendance_teacher_name
ON trial_class_attendance(teacher_name);

-- 複合索引：日期範圍 + 學生 email（常見查詢組合）
CREATE INDEX IF NOT EXISTS idx_trial_class_attendance_date_email
ON trial_class_attendance(class_date, student_email);

COMMENT ON INDEX idx_trial_class_attendance_class_date IS '優化日期範圍查詢 (getAttendance)';
COMMENT ON INDEX idx_trial_class_attendance_student_email IS '優化學生資料關聯查詢';
COMMENT ON INDEX idx_trial_class_attendance_teacher_name IS '優化教師分析查詢';
COMMENT ON INDEX idx_trial_class_attendance_date_email IS '優化複合條件查詢';

-- ========================================
-- 2. Trial Class Purchases 索引
-- ========================================

-- 為 purchase_date 建立索引
CREATE INDEX IF NOT EXISTS idx_trial_class_purchases_purchase_date
ON trial_class_purchases(purchase_date);

-- 為 student_email 建立索引
CREATE INDEX IF NOT EXISTS idx_trial_class_purchases_student_email
ON trial_class_purchases(student_email);

-- 為 status 建立索引（用於篩選不同狀態的學生）
CREATE INDEX IF NOT EXISTS idx_trial_class_purchases_status
ON trial_class_purchases(status);

-- 複合索引：購買日期 + 狀態（常見查詢組合）
CREATE INDEX IF NOT EXISTS idx_trial_class_purchases_date_status
ON trial_class_purchases(purchase_date, status);

COMMENT ON INDEX idx_trial_class_purchases_purchase_date IS '優化購買日期範圍查詢 (getPurchases)';
COMMENT ON INDEX idx_trial_class_purchases_student_email IS '優化學生資料關聯查詢';
COMMENT ON INDEX idx_trial_class_purchases_status IS '優化狀態篩選查詢';
COMMENT ON INDEX idx_trial_class_purchases_date_status IS '優化複合條件查詢';

-- ========================================
-- 3. EODs (Deals) 索引
-- ========================================

-- 為 deal_date 建立索引
CREATE INDEX IF NOT EXISTS idx_eods_for_closers_deal_date
ON eods_for_closers(deal_date);

-- 為 student_email 建立索引
CREATE INDEX IF NOT EXISTS idx_eods_for_closers_student_email
ON eods_for_closers(student_email);

-- 為 actual_amount 建立索引（用於營收分析）
CREATE INDEX IF NOT EXISTS idx_eods_for_closers_actual_amount
ON eods_for_closers(actual_amount);

-- 複合索引：成交日期 + email（常見查詢組合）
CREATE INDEX IF NOT EXISTS idx_eods_for_closers_date_email
ON eods_for_closers(deal_date, student_email);

COMMENT ON INDEX idx_eods_for_closers_deal_date IS '優化成交日期範圍查詢 (getDeals)';
COMMENT ON INDEX idx_eods_for_closers_student_email IS '優化學生資料關聯查詢';
COMMENT ON INDEX idx_eods_for_closers_actual_amount IS '優化營收分析查詢';
COMMENT ON INDEX idx_eods_for_closers_date_email IS '優化複合條件查詢';

-- ========================================
-- 4. 分析預估效能提升
-- ========================================

-- 執行前效能分析（可選，用於驗證）
-- EXPLAIN ANALYZE SELECT * FROM trial_class_attendance WHERE class_date >= '2024-01-01' AND class_date <= '2024-12-31';

-- 預期效能提升：
-- - 小型資料表 (<1000 筆): 5-10x 提升
-- - 中型資料表 (1000-10000 筆): 10-50x 提升
-- - 大型資料表 (>10000 筆): 50-200x 提升

-- ========================================
-- 5. 索引維護建議
-- ========================================

-- 定期分析表統計資訊（建議每週執行）
-- ANALYZE trial_class_attendance;
-- ANALYZE trial_class_purchases;
-- ANALYZE eods_for_closers;

-- 檢查索引使用情況（建議每月檢查）
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

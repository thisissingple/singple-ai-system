-- ============================================
-- Migration 000: 清理舊的 VARCHAR ID tables
-- 執行方式：在 Supabase SQL Editor 貼上執行
-- ============================================

-- 刪除所有舊表（包含依賴）
DROP TABLE IF EXISTS member_activity_log CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS custom_dashboards CASCADE;
DROP TABLE IF EXISTS dashboard_templates CASCADE;
DROP TABLE IF EXISTS sheet_data CASCADE;
DROP TABLE IF EXISTS worksheets CASCADE;
DROP TABLE IF EXISTS spreadsheets CASCADE;
DROP TABLE IF EXISTS google_oauth_tokens CASCADE;
DROP TABLE IF EXISTS user_spreadsheets CASCADE;
DROP TABLE IF EXISTS sync_history CASCADE;
DROP TABLE IF EXISTS trial_class_attendance CASCADE;
DROP TABLE IF EXISTS trial_class_purchase CASCADE;
DROP TABLE IF EXISTS eods_for_closers CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 確認清理完成
SELECT
  '✅ 舊表已清理完成！' as status,
  '下一步：執行 001_create_all_tables.sql' as next_step;

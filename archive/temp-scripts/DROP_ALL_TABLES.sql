-- 刪除所有 Supabase 表格（包含結構）
-- 請在 Supabase Dashboard → SQL Editor 執行

-- AI 相關表
DROP TABLE IF EXISTS ai_learning_query_fields CASCADE;
DROP TABLE IF EXISTS ai_learned_queries CASCADE;

-- Dashboard 相關表
DROP TABLE IF EXISTS custom_dashboards CASCADE;
DROP TABLE IF EXISTS dashboard_templates CASCADE;

-- Google Sheets 相關表
DROP TABLE IF EXISTS google_oauth_tokens CASCADE;
DROP TABLE IF EXISTS user_spreadsheets CASCADE;
DROP TABLE IF EXISTS field_mappings CASCADE;
DROP TABLE IF EXISTS worksheets CASCADE;
DROP TABLE IF EXISTS spreadsheets CASCADE;
DROP TABLE IF EXISTS worksheet_sync_logs CASCADE;

-- 歷史紀錄表
DROP TABLE IF EXISTS mapping_history CASCADE;
DROP TABLE IF EXISTS sync_history CASCADE;

-- 主要業務表
DROP TABLE IF EXISTS trial_class_purchase CASCADE;
DROP TABLE IF EXISTS trial_class_attendance CASCADE;
DROP TABLE IF EXISTS eods_for_closers CASCADE;
DROP TABLE IF EXISTS sheet_data CASCADE;

-- 用戶相關表
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS sales CASCADE;

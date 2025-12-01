-- ============================================
-- Migration 086: 擴展 sync_logs 記錄詳細同步資訊
-- 目的：記錄重複記錄、跳過記錄等詳細資訊
-- 執行日期：2025-12-01
-- ============================================

-- ========================================
-- 1. 新增統計欄位
-- ========================================

-- 來源記錄總數
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS source_records INTEGER DEFAULT 0;

-- 重複記錄數（在 Google Sheets 中重複）
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS duplicate_records INTEGER DEFAULT 0;

-- 跳過記錄數（因 NULL 唯一鍵等原因）
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS skipped_records INTEGER DEFAULT 0;

-- ========================================
-- 2. 新增詳細資訊欄位（JSONB）
-- ========================================

-- 重複記錄詳情：[{ key: "...", count: 2, rows: [1, 5] }]
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS duplicate_details JSONB DEFAULT '[]'::jsonb;

-- 跳過記錄詳情：[{ row: 5, reason: "NULL transaction_date" }]
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS skipped_details JSONB DEFAULT '[]'::jsonb;

-- ========================================
-- 3. 添加註釋
-- ========================================

COMMENT ON COLUMN sync_logs.source_records IS '來源 Google Sheets 記錄總數';
COMMENT ON COLUMN sync_logs.duplicate_records IS '重複記錄數（來源中重複）';
COMMENT ON COLUMN sync_logs.skipped_records IS '跳過記錄數（因 NULL 鍵等原因）';
COMMENT ON COLUMN sync_logs.duplicate_details IS '重複記錄詳情 JSON，包含 key、count、rows';
COMMENT ON COLUMN sync_logs.skipped_details IS '跳過記錄詳情 JSON，包含 row 和 reason';

-- ========================================
-- 完成
-- ========================================

SELECT '✅ Migration 086 完成：sync_logs 新增詳細同步資訊欄位' as status;

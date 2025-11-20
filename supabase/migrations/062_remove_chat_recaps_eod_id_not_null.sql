-- ============================================================================
-- Migration 062: Remove NOT NULL constraint from consultation_chat_recaps.eod_id
-- Created: 2025-11-20
-- Purpose:
--   修正 consultation_chat_recaps.eod_id 的 NOT NULL 約束問題
--
-- Problem:
--   Migration 060 將 FK 改為 ON DELETE SET NULL
--   但 eod_id 仍有 NOT NULL 約束（來自 Migration 051）
--   錯誤訊息: null value in column "eod_id" of relation "consultation_chat_recaps" violates not-null constraint
--
-- Solution:
--   移除 eod_id 的 NOT NULL 約束，允許其為 NULL
--   這樣當 eods_for_closers 被刪除時，eod_id 可以被設為 NULL
-- ============================================================================

-- Remove NOT NULL constraint from eod_id
ALTER TABLE consultation_chat_recaps
  ALTER COLUMN eod_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN consultation_chat_recaps.eod_id IS '關聯到 eods_for_closers 表的諮詢記錄 ID（可為 NULL，當原始記錄被刪除時）';

-- ============================================================================
-- Verification
-- ============================================================================
-- 現在當 eods_for_closers 被刪除時：
--   1. eod_id 可以被設為 NULL（不違反約束）
--   2. 對話摘要記錄會保留
--   3. 關鍵資訊可從 consultation_date_cached 及其他欄位取得
-- ============================================================================

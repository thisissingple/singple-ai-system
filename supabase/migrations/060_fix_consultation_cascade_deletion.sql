-- ============================================================================
-- Migration 060: Fix Consultation AI Records Cascade Deletion Issue
-- Created: 2025-11-19
-- Purpose:
--   修正諮詢 AI 記錄的級聯刪除問題，確保當 eods_for_closers 同步時
--   不會刪除已建立的 AI 分析和對話記錄
--
-- Background:
--   eods_for_closers 表會定期被 Google Sheets 同步刪除並重建
--   導致所有 AI 分析記錄和對話記錄被 CASCADE 刪除
--
-- Solution:
--   1. 修改 FK 為 ON DELETE SET NULL（保留記錄）
--   2. 新增冗餘欄位儲存關鍵資訊（student_email, consultation_date, consultant_name）
--   3. 建立複合唯一索引避免重複分析
-- ============================================================================

-- ============================================================================
-- Part 1: 修改 consultation_quality_analysis 表
-- ============================================================================

-- Step 1.1: 新增冗餘欄位（如果不存在）
ALTER TABLE consultation_quality_analysis
  ADD COLUMN IF NOT EXISTS student_email_cached VARCHAR(255),
  ADD COLUMN IF NOT EXISTS consultation_date_cached DATE,
  ADD COLUMN IF NOT EXISTS consultant_name_cached VARCHAR(255);

-- Step 1.2: 從現有 eod_id 回填資料（保留現有關聯）
UPDATE consultation_quality_analysis cqa
SET
  student_email_cached = e.student_email,
  consultation_date_cached = e.consultation_date,
  consultant_name_cached = e.closer_name
FROM eods_for_closers e
WHERE cqa.eod_id = e.id
  AND (cqa.student_email_cached IS NULL OR cqa.consultation_date_cached IS NULL OR cqa.consultant_name_cached IS NULL);

-- Step 1.3: 刪除舊的 FK 約束並建立新的（ON DELETE SET NULL）
ALTER TABLE consultation_quality_analysis
  DROP CONSTRAINT IF EXISTS consultation_quality_analysis_eod_id_fkey,
  ADD CONSTRAINT consultation_quality_analysis_eod_id_fkey
    FOREIGN KEY (eod_id)
    REFERENCES eods_for_closers(id)
    ON DELETE SET NULL;

-- Step 1.4: 移除 eod_id 的 UNIQUE 約束（因為可能會有 NULL）
ALTER TABLE consultation_quality_analysis
  DROP CONSTRAINT IF EXISTS consultation_quality_analysis_eod_id_key;

-- Step 1.5: 建立複合唯一索引（避免重複分析）
-- 只有當三個欄位都不為 NULL 時才檢查唯一性
CREATE UNIQUE INDEX IF NOT EXISTS idx_consultation_analysis_composite_unique
  ON consultation_quality_analysis (student_email_cached, consultation_date_cached, consultant_name_cached)
  WHERE student_email_cached IS NOT NULL
    AND consultation_date_cached IS NOT NULL
    AND consultant_name_cached IS NOT NULL;

-- Step 1.6: 新增欄位註解
COMMENT ON COLUMN consultation_quality_analysis.student_email_cached IS '學員 email（冗餘欄位，避免 CASCADE 刪除時資料遺失）';
COMMENT ON COLUMN consultation_quality_analysis.consultation_date_cached IS '諮詢日期（冗餘欄位）';
COMMENT ON COLUMN consultation_quality_analysis.consultant_name_cached IS '諮詢師姓名（冗餘欄位）';

-- ============================================================================
-- Part 2: 修改 consultation_chat_recaps 表
-- ============================================================================

-- Step 2.1: 新增冗餘欄位（consultation_date_cached）
ALTER TABLE consultation_chat_recaps
  ADD COLUMN IF NOT EXISTS consultation_date_cached DATE;

-- Step 2.2: 從現有 eod_id 回填資料
UPDATE consultation_chat_recaps ccr
SET consultation_date_cached = e.consultation_date
FROM eods_for_closers e
WHERE ccr.eod_id = e.id
  AND ccr.consultation_date_cached IS NULL;

-- Step 2.3: 修改 FK 為 ON DELETE SET NULL
ALTER TABLE consultation_chat_recaps
  DROP CONSTRAINT IF EXISTS consultation_chat_recaps_eod_id_fkey,
  ADD CONSTRAINT consultation_chat_recaps_eod_id_fkey
    FOREIGN KEY (eod_id)
    REFERENCES eods_for_closers(id)
    ON DELETE SET NULL;

-- Step 2.4: 修改 analysis_id FK（如果 analysis 被刪除，recap 也應保留）
ALTER TABLE consultation_chat_recaps
  DROP CONSTRAINT IF EXISTS consultation_chat_recaps_analysis_id_fkey,
  ADD CONSTRAINT consultation_chat_recaps_analysis_id_fkey
    FOREIGN KEY (analysis_id)
    REFERENCES consultation_quality_analysis(id)
    ON DELETE SET NULL;

-- Step 2.5: 新增欄位註解
COMMENT ON COLUMN consultation_chat_recaps.consultation_date_cached IS '諮詢日期（冗餘欄位，避免 CASCADE 刪除時資料遺失）';

-- ============================================================================
-- Part 3: 修改 consultant_ai_conversations 表
-- ============================================================================

-- Step 3.1: 新增冗餘欄位
ALTER TABLE consultant_ai_conversations
  ADD COLUMN IF NOT EXISTS consultation_date_cached DATE,
  ADD COLUMN IF NOT EXISTS student_name_cached VARCHAR(255),
  ADD COLUMN IF NOT EXISTS consultant_name_cached VARCHAR(255);

-- Step 3.2: 從現有 eod_id 回填資料
UPDATE consultant_ai_conversations cac
SET
  consultation_date_cached = e.consultation_date,
  student_name_cached = e.student_name,
  consultant_name_cached = e.closer_name
FROM eods_for_closers e
WHERE cac.eod_id = e.id
  AND (cac.consultation_date_cached IS NULL OR cac.student_name_cached IS NULL OR cac.consultant_name_cached IS NULL);

-- Step 3.3: 檢查並修改 FK（如果存在）
DO $$
BEGIN
  -- 檢查是否有 eod_id FK，如果有則修改
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'consultant_ai_conversations_eod_id_fkey'
      AND table_name = 'consultant_ai_conversations'
  ) THEN
    ALTER TABLE consultant_ai_conversations
      DROP CONSTRAINT consultant_ai_conversations_eod_id_fkey,
      ADD CONSTRAINT consultant_ai_conversations_eod_id_fkey
        FOREIGN KEY (eod_id)
        REFERENCES eods_for_closers(id)
        ON DELETE SET NULL;
  END IF;

  -- 檢查並修改 analysis_id FK
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'consultant_ai_conversations_analysis_id_fkey'
      AND table_name = 'consultant_ai_conversations'
  ) THEN
    ALTER TABLE consultant_ai_conversations
      DROP CONSTRAINT consultant_ai_conversations_analysis_id_fkey,
      ADD CONSTRAINT consultant_ai_conversations_analysis_id_fkey
        FOREIGN KEY (analysis_id)
        REFERENCES consultation_quality_analysis(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3.4: 新增欄位註解
COMMENT ON COLUMN consultant_ai_conversations.consultation_date_cached IS '諮詢日期（冗餘欄位）';
COMMENT ON COLUMN consultant_ai_conversations.student_name_cached IS '學員姓名（冗餘欄位）';
COMMENT ON COLUMN consultant_ai_conversations.consultant_name_cached IS '諮詢師姓名（冗餘欄位）';

-- ============================================================================
-- Part 4: 建立觸發器自動更新冗餘欄位（未來插入時自動填充）
-- ============================================================================

-- Function: 自動填充 consultation_quality_analysis 冗餘欄位
CREATE OR REPLACE FUNCTION fill_consultation_analysis_redundant_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果提供了 eod_id，自動填充冗餘欄位
  IF NEW.eod_id IS NOT NULL THEN
    SELECT
      e.student_email,
      e.consultation_date,
      e.closer_name
    INTO
      NEW.student_email_cached,
      NEW.consultation_date_cached,
      NEW.consultant_name_cached
    FROM eods_for_closers e
    WHERE e.id = NEW.eod_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: 在插入或更新時自動填充
DROP TRIGGER IF EXISTS trigger_fill_consultation_analysis_fields ON consultation_quality_analysis;
CREATE TRIGGER trigger_fill_consultation_analysis_fields
  BEFORE INSERT OR UPDATE ON consultation_quality_analysis
  FOR EACH ROW
  EXECUTE FUNCTION fill_consultation_analysis_redundant_fields();

-- Function: 自動填充 consultant_ai_conversations 冗餘欄位
CREATE OR REPLACE FUNCTION fill_consultant_conversation_redundant_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.eod_id IS NOT NULL THEN
    SELECT
      e.consultation_date,
      e.student_name,
      e.closer_name
    INTO
      NEW.consultation_date_cached,
      NEW.student_name_cached,
      NEW.consultant_name_cached
    FROM eods_for_closers e
    WHERE e.id = NEW.eod_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_fill_consultant_conversation_fields ON consultant_ai_conversations;
CREATE TRIGGER trigger_fill_consultant_conversation_fields
  BEFORE INSERT OR UPDATE ON consultant_ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION fill_consultant_conversation_redundant_fields();

-- ============================================================================
-- Completed
-- ============================================================================
-- 現在當 eods_for_closers 被刪除時：
--   1. AI 分析記錄會保留，eod_id 設為 NULL
--   2. 關鍵資訊（學員、日期、諮詢師）仍可查詢
--   3. 避免重複分析使用複合索引（學員 + 日期 + 諮詢師）
-- ============================================================================

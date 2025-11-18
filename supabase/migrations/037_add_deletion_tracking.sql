/**
 * Migration 037: Add Deletion Tracking to Student Knowledge Base
 * 新增刪除追蹤欄位，記錄學員原始記錄被刪除的狀態
 */

-- Add deletion tracking columns
ALTER TABLE student_knowledge_base
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN student_knowledge_base.is_deleted IS '標記學員原始記錄是否已被刪除（例如：Google Sheets 同步時被移除）';
COMMENT ON COLUMN student_knowledge_base.deleted_at IS '記錄學員原始記錄被刪除的時間';

-- Create index for querying active students
CREATE INDEX IF NOT EXISTS idx_student_kb_is_deleted
ON student_knowledge_base(is_deleted)
WHERE is_deleted = false;

-- Create index for querying deleted students
CREATE INDEX IF NOT EXISTS idx_student_kb_deleted_at
ON student_knowledge_base(deleted_at)
WHERE deleted_at IS NOT NULL;

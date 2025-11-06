-- ============================================================================
-- Migration 048: Add raw_markdown_output column
-- Purpose: Store the raw AI-generated Markdown output for display
-- ============================================================================

ALTER TABLE consultation_quality_analysis
ADD COLUMN IF NOT EXISTS raw_markdown_output TEXT;

COMMENT ON COLUMN consultation_quality_analysis.raw_markdown_output IS 'AI 生成的原始 Markdown 輸出（用於前端顯示）';

-- ============================================================================
-- Completed
-- ============================================================================

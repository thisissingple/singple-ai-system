-- ============================================================================
-- Migration 051: Create Consultation Chat Recaps Table
-- Purpose: Store AI-generated summaries of consultation chat conversations
-- ============================================================================

-- Create consultation_chat_recaps table
CREATE TABLE IF NOT EXISTS consultation_chat_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to consultation record
  eod_id UUID NOT NULL REFERENCES eods_for_closers(id) ON DELETE CASCADE,
  analysis_id UUID REFERENCES consultation_quality_analysis(id) ON DELETE CASCADE,

  -- Participant information
  student_email VARCHAR(255),
  student_name VARCHAR(255),
  consultant_email VARCHAR(255),
  consultant_name VARCHAR(255),

  -- Chat metadata
  chat_session_start TIMESTAMP NOT NULL,
  chat_session_end TIMESTAMP NOT NULL,
  total_messages INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 0,

  -- Recap content (AI-generated summary)
  recap_summary TEXT NOT NULL,
  key_questions TEXT[], -- Array of main questions asked
  key_findings TEXT[], -- Array of key findings
  recommendations TEXT[], -- Array of recommendations

  -- Full chat history (optional, for reference)
  full_chat_history JSONB, -- Store complete chat messages if needed

  -- Metadata
  generated_by VARCHAR(255), -- User who triggered recap generation
  generated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_consultation_chat_recaps_eod_id ON consultation_chat_recaps(eod_id);
CREATE INDEX idx_consultation_chat_recaps_analysis_id ON consultation_chat_recaps(analysis_id);
CREATE INDEX idx_consultation_chat_recaps_student_email ON consultation_chat_recaps(student_email);
CREATE INDEX idx_consultation_chat_recaps_consultant_email ON consultation_chat_recaps(consultant_email);
CREATE INDEX idx_consultation_chat_recaps_generated_at ON consultation_chat_recaps(generated_at DESC);

-- Add comments
COMMENT ON TABLE consultation_chat_recaps IS '諮詢對話摘要 - AI 生成的對話重點總結';
COMMENT ON COLUMN consultation_chat_recaps.eod_id IS '諮詢記錄 ID';
COMMENT ON COLUMN consultation_chat_recaps.analysis_id IS '諮詢分析 ID';
COMMENT ON COLUMN consultation_chat_recaps.recap_summary IS 'AI 生成的對話摘要（Markdown 格式）';
COMMENT ON COLUMN consultation_chat_recaps.key_questions IS '主要提問的問題陣列';
COMMENT ON COLUMN consultation_chat_recaps.key_findings IS '關鍵發現陣列';
COMMENT ON COLUMN consultation_chat_recaps.recommendations IS '建議事項陣列';
COMMENT ON COLUMN consultation_chat_recaps.full_chat_history IS '完整對話記錄（JSON 格式，選填）';

-- ============================================================================
-- Completed
-- ============================================================================

-- ============================================================================
-- Migration 059: Create Consultant AI Conversations Table
-- Purpose: Store AI-powered conversations between consultants and students
-- Similar to teacher_ai_conversations but for consultation context
-- ============================================================================

CREATE TABLE IF NOT EXISTS consultant_ai_conversations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  consultant_id TEXT NOT NULL, -- Consultant email or ID
  student_email TEXT NOT NULL,
  student_kb_id UUID REFERENCES student_knowledge_base(id),
  eod_id UUID REFERENCES eods_for_closers(id), -- Link to consultation record
  analysis_id UUID REFERENCES consultation_quality_analysis(id), -- Optional: if related to specific analysis

  -- Conversation content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('preset', 'custom')),

  -- Preset question types (for consultants)
  preset_question_key TEXT, -- 'painPointAnalysis', 'objectionHandling', 'closingStrategy', etc.

  -- AI information
  tokens_used INTEGER,
  model TEXT DEFAULT 'gpt-4o',
  response_time_ms INTEGER,
  api_cost_usd NUMERIC(10, 6),

  -- Cache information
  is_cached BOOLEAN DEFAULT FALSE,
  cache_expires_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_consultant_ai_conversations_consultant_id
  ON consultant_ai_conversations(consultant_id);

CREATE INDEX idx_consultant_ai_conversations_student_email
  ON consultant_ai_conversations(student_email);

CREATE INDEX idx_consultant_ai_conversations_eod_id
  ON consultant_ai_conversations(eod_id);

CREATE INDEX idx_consultant_ai_conversations_student_kb_id
  ON consultant_ai_conversations(student_kb_id);

CREATE INDEX idx_consultant_ai_conversations_created_at
  ON consultant_ai_conversations(created_at DESC);

-- Add comments
COMMENT ON TABLE consultant_ai_conversations IS '諮詢師 AI 對話記錄 - 儲存諮詢師與學員的 AI 問答';
COMMENT ON COLUMN consultant_ai_conversations.consultant_id IS '諮詢師 ID（email 或其他識別碼）';
COMMENT ON COLUMN consultant_ai_conversations.student_email IS '學員 email';
COMMENT ON COLUMN consultant_ai_conversations.eod_id IS '關聯的諮詢記錄 ID（EODS）';
COMMENT ON COLUMN consultant_ai_conversations.question IS '諮詢師的問題';
COMMENT ON COLUMN consultant_ai_conversations.answer IS 'AI 的回答';
COMMENT ON COLUMN consultant_ai_conversations.question_type IS '問題類型（preset: 預設問題, custom: 自訂問題）';
COMMENT ON COLUMN consultant_ai_conversations.preset_question_key IS '預設問題的鍵值（用於識別常用問題）';
COMMENT ON COLUMN consultant_ai_conversations.tokens_used IS '使用的 token 數量';
COMMENT ON COLUMN consultant_ai_conversations.api_cost_usd IS 'API 費用（美元）';
COMMENT ON COLUMN consultant_ai_conversations.is_cached IS '是否使用快取（節省成本）';

-- ============================================================================
-- Completed
-- ============================================================================

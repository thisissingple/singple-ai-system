-- Migration 028: Student Knowledge Base & AI Conversation System
-- Created: 2025-10-24
-- Purpose: Create intelligent student profile tracking and AI conversation system

-- ============================================================================
-- Table 1: student_knowledge_base
-- Stores accumulated student information from all sources (classes, consultations, purchases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Student identification
  student_email TEXT NOT NULL UNIQUE,
  student_name TEXT NOT NULL,

  -- Accumulated profile (automatically extracted and updated by AI)
  profile_summary JSONB DEFAULT '{
    "basicInfo": {},
    "painPoints": [],
    "goals": {},
    "psychologicalState": {},
    "purchaseHistory": [],
    "conversionBarriers": []
  }'::jsonb,

  -- Data source references
  data_sources JSONB DEFAULT '{
    "trial_classes": [],
    "eods_records": [],
    "ai_analyses": [],
    "purchases": []
  }'::jsonb,

  -- AI pre-generated insights (cached answers for common questions)
  ai_pregenerated_insights JSONB DEFAULT '{
    "painPointAnalysis": null,
    "conversionStrategy": null,
    "conversionProbability": null,
    "executionEvaluation": null,
    "nextSteps": null,
    "generatedAt": null
  }'::jsonb,

  -- Statistics
  total_classes INTEGER DEFAULT 0,
  total_consultations INTEGER DEFAULT 0,
  total_interactions INTEGER DEFAULT 0,
  first_contact_date DATE,
  last_interaction_date DATE,
  conversion_status TEXT CHECK (conversion_status IN ('not_converted', 'converted', 'in_progress')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_student_kb_email ON student_knowledge_base(student_email);
CREATE INDEX idx_student_kb_updated ON student_knowledge_base(updated_at DESC);
CREATE INDEX idx_student_kb_last_interaction ON student_knowledge_base(last_interaction_date DESC);
CREATE INDEX idx_student_kb_conversion_status ON student_knowledge_base(conversion_status);

-- ============================================================================
-- Table 2: teacher_ai_conversations
-- Stores teacher-AI conversation history for each student
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  teacher_id UUID NOT NULL REFERENCES users(id),
  student_email TEXT NOT NULL,
  student_kb_id UUID REFERENCES student_knowledge_base(id),
  analysis_id UUID REFERENCES teaching_quality_analysis(id), -- Optional: if related to specific analysis

  -- Conversation content
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('preset', 'custom')),

  -- Preset question types
  preset_question_key TEXT, -- 'painPointAnalysis', 'conversionStrategy', etc.

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

-- Indexes
CREATE INDEX idx_teacher_conv_teacher ON teacher_ai_conversations(teacher_id);
CREATE INDEX idx_teacher_conv_student ON teacher_ai_conversations(student_email);
CREATE INDEX idx_teacher_conv_student_kb ON teacher_ai_conversations(student_kb_id);
CREATE INDEX idx_teacher_conv_created ON teacher_ai_conversations(created_at DESC);
CREATE INDEX idx_teacher_conv_question_type ON teacher_ai_conversations(question_type);

-- ============================================================================
-- Table 3: Extend teaching_quality_analysis
-- Add columns for history-aware analysis
-- ============================================================================
ALTER TABLE teaching_quality_analysis
ADD COLUMN IF NOT EXISTS student_kb_id UUID REFERENCES student_knowledge_base(id),
ADD COLUMN IF NOT EXISTS previous_analysis_id UUID REFERENCES teaching_quality_analysis(id),
ADD COLUMN IF NOT EXISTS is_history_aware BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS execution_evaluation JSONB DEFAULT '[]'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tqa_student_kb ON teaching_quality_analysis(student_kb_id);
CREATE INDEX IF NOT EXISTS idx_tqa_previous ON teaching_quality_analysis(previous_analysis_id);
CREATE INDEX IF NOT EXISTS idx_tqa_history_aware ON teaching_quality_analysis(is_history_aware);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE student_knowledge_base IS 'Accumulated student profile from all interactions (classes, consultations, purchases)';
COMMENT ON TABLE teacher_ai_conversations IS 'Teacher-AI conversation history for student analysis';

COMMENT ON COLUMN student_knowledge_base.profile_summary IS 'AI-extracted student profile (basic info, pain points, goals, etc.)';
COMMENT ON COLUMN student_knowledge_base.data_sources IS 'References to source data (attendance IDs, EODS IDs, analysis IDs)';
COMMENT ON COLUMN student_knowledge_base.ai_pregenerated_insights IS 'Cached answers for common questions (updated after each analysis)';

COMMENT ON COLUMN teacher_ai_conversations.question_type IS 'preset = predefined question, custom = free-form question';
COMMENT ON COLUMN teacher_ai_conversations.preset_question_key IS 'Key for preset questions: painPointAnalysis, conversionStrategy, etc.';

COMMENT ON COLUMN teaching_quality_analysis.student_kb_id IS 'Link to student knowledge base';
COMMENT ON COLUMN teaching_quality_analysis.previous_analysis_id IS 'Link to previous analysis for the same student';
COMMENT ON COLUMN teaching_quality_analysis.is_history_aware IS 'Whether this analysis considered historical data';
COMMENT ON COLUMN teaching_quality_analysis.execution_evaluation IS 'Evaluation of previous suggestions execution';

-- ============================================================================
-- Sample queries (commented out)
-- ============================================================================

-- Get student complete profile
-- SELECT * FROM student_knowledge_base WHERE student_email = 'student@example.com';

-- Get all conversations for a student
-- SELECT * FROM teacher_ai_conversations WHERE student_email = 'student@example.com' ORDER BY created_at DESC;

-- Get teacher's recent AI conversations
-- SELECT tac.*, skb.student_name
-- FROM teacher_ai_conversations tac
-- JOIN student_knowledge_base skb ON tac.student_kb_id = skb.id
-- WHERE tac.teacher_id = 'teacher-uuid'
-- ORDER BY tac.created_at DESC LIMIT 20;

-- Get history-aware analyses
-- SELECT tqa.*, skb.student_name, skb.total_classes
-- FROM teaching_quality_analysis tqa
-- JOIN student_knowledge_base skb ON tqa.student_kb_id = skb.id
-- WHERE tqa.is_history_aware = TRUE
-- ORDER BY tqa.analyzed_at DESC;

-- Calculate total AI conversation costs
-- SELECT
--   teacher_id,
--   COUNT(*) as total_conversations,
--   SUM(tokens_used) as total_tokens,
--   SUM(api_cost_usd) as total_cost_usd
-- FROM teacher_ai_conversations
-- WHERE created_at >= NOW() - INTERVAL '30 days'
-- GROUP BY teacher_id;

-- ============================================================================
-- Migration 050: Create Consultant Knowledge Base
-- Purpose: Track consultant performance, growth, and insights
-- ============================================================================

-- Create consultant_knowledge_base table
CREATE TABLE IF NOT EXISTS consultant_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Consultant Identity
  consultant_email VARCHAR(255) UNIQUE NOT NULL,
  consultant_name VARCHAR(255) NOT NULL,

  -- Data Sources (reference to analyses)
  data_sources JSONB DEFAULT '{
    "consultation_analyses": []
  }'::jsonb NOT NULL,

  -- Statistics
  total_consultations INTEGER DEFAULT 0,
  total_analyzed INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,

  -- Strengths & Weaknesses Summary
  strengths_summary JSONB DEFAULT '[]'::jsonb,
  weaknesses_summary JSONB DEFAULT '[]'::jsonb,

  -- Timeline
  first_consultation_date TIMESTAMP,
  last_consultation_date TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_consultant_kb_email ON consultant_knowledge_base(consultant_email);
CREATE INDEX idx_consultant_kb_name ON consultant_knowledge_base(consultant_name);
CREATE INDEX idx_consultant_kb_updated ON consultant_knowledge_base(updated_at DESC);
CREATE INDEX idx_consultant_kb_avg_rating ON consultant_knowledge_base(average_rating DESC);

-- Add comments
COMMENT ON TABLE consultant_knowledge_base IS '諮詢師知識庫 - 追蹤諮詢師的成長與戰績';
COMMENT ON COLUMN consultant_knowledge_base.consultant_email IS '諮詢師 email (唯一識別)';
COMMENT ON COLUMN consultant_knowledge_base.consultant_name IS '諮詢師姓名';
COMMENT ON COLUMN consultant_knowledge_base.data_sources IS '資料來源參照 (consultation_analyses: 諮詢分析 ID 陣列)';
COMMENT ON COLUMN consultant_knowledge_base.total_consultations IS '總諮詢次數';
COMMENT ON COLUMN consultant_knowledge_base.total_analyzed IS '已分析的諮詢次數';
COMMENT ON COLUMN consultant_knowledge_base.average_rating IS '平均評分 (1-10)';
COMMENT ON COLUMN consultant_knowledge_base.strengths_summary IS '累積的強項統計 (JSON 陣列)';
COMMENT ON COLUMN consultant_knowledge_base.weaknesses_summary IS '累積的弱項統計 (JSON 陣列)';

-- ============================================================================
-- Completed
-- ============================================================================

-- Migration 027: Teaching Quality Analysis System
-- Created: 2025-10-13
-- Purpose: AI-powered teaching quality tracking and continuous improvement system

-- ============================================================================
-- Table 1: teaching_quality_analysis
-- Stores AI analysis results for each class session
-- ============================================================================
CREATE TABLE IF NOT EXISTS teaching_quality_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to trial class attendance record
  attendance_id UUID NOT NULL REFERENCES trial_class_attendance(id) ON DELETE CASCADE,

  -- Teacher and student info (denormalized for quick access)
  teacher_id UUID NOT NULL REFERENCES users(id),
  teacher_name TEXT NOT NULL,
  student_name TEXT NOT NULL,

  -- Class information
  class_date TIMESTAMPTZ NOT NULL,
  class_topic TEXT,

  -- WEBVTT transcript file
  transcript_text TEXT NOT NULL, -- Full WEBVTT content
  transcript_file_url TEXT, -- Optional: if stored in cloud storage

  -- AI Analysis Results
  overall_score INTEGER CHECK (overall_score >= 1 AND overall_score <= 10),

  -- Strengths (優點) - JSONB array of objects
  -- Example: [{"point": "清楚解釋概念", "evidence": "在 05:23 使用了生活化例子"}]
  strengths JSONB DEFAULT '[]'::jsonb,

  -- Weaknesses (缺點) - JSONB array of objects
  -- Example: [{"point": "說話速度過快", "evidence": "學生在 12:45 要求重複說明"}]
  weaknesses JSONB DEFAULT '[]'::jsonb,

  -- Summary of the class (課程摘要)
  class_summary TEXT,

  -- Suggestions for next class (下次上課建議) - JSONB array of objects
  -- Example: [{"suggestion": "放慢語速", "method": "每句話之間停頓2秒", "expected_effect": "提升學生理解度", "priority": 1}]
  suggestions JSONB DEFAULT '[]'::jsonb,

  -- Conversion optimization (if student didn't convert)
  conversion_status TEXT CHECK (conversion_status IN ('converted', 'not_converted', 'pending')),
  conversion_suggestions JSONB DEFAULT '[]'::jsonb, -- Similar structure to suggestions

  -- AI Model Information
  ai_model TEXT DEFAULT 'gpt-4o',
  ai_prompt_version TEXT DEFAULT 'v1',

  -- Metadata
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  analyzed_by UUID REFERENCES users(id), -- Who triggered the analysis

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_teaching_quality_teacher ON teaching_quality_analysis(teacher_id);
CREATE INDEX idx_teaching_quality_attendance ON teaching_quality_analysis(attendance_id);
CREATE INDEX idx_teaching_quality_date ON teaching_quality_analysis(class_date DESC);
CREATE INDEX idx_teaching_quality_score ON teaching_quality_analysis(overall_score);

-- ============================================================================
-- Table 2: suggestion_execution_log
-- Tracks whether suggestions were executed and their effectiveness
-- ============================================================================
CREATE TABLE IF NOT EXISTS suggestion_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the analysis that generated the suggestion
  analysis_id UUID NOT NULL REFERENCES teaching_quality_analysis(id) ON DELETE CASCADE,

  -- Suggestion details (from the suggestions JSONB array)
  suggestion_index INTEGER NOT NULL, -- Index in the suggestions array (0-based)
  suggestion_text TEXT NOT NULL, -- Copy of the suggestion for quick access

  -- Execution tracking
  is_executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMPTZ,
  execution_notes TEXT, -- Teacher's notes on how they executed it

  -- Effectiveness tracking (evaluated in next class)
  next_analysis_id UUID REFERENCES teaching_quality_analysis(id), -- Link to next class analysis
  effectiveness_score INTEGER CHECK (effectiveness_score >= 1 AND effectiveness_score <= 5),
  -- 1 = Not effective, 2 = Slightly effective, 3 = Moderately effective, 4 = Very effective, 5 = Extremely effective

  effectiveness_evidence TEXT, -- AI-generated evidence of improvement

  -- Metadata
  marked_by UUID REFERENCES users(id), -- Who marked it as executed
  evaluated_at TIMESTAMPTZ, -- When effectiveness was evaluated

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suggestion_log_analysis ON suggestion_execution_log(analysis_id);
CREATE INDEX idx_suggestion_log_next_analysis ON suggestion_execution_log(next_analysis_id);
CREATE INDEX idx_suggestion_log_executed ON suggestion_execution_log(is_executed);

-- ============================================================================
-- Table 3: Extend trial_class_attendance with ai_analysis field
-- Store quick reference to analysis without joining tables
-- ============================================================================
ALTER TABLE trial_class_attendance
ADD COLUMN IF NOT EXISTS ai_analysis_id UUID REFERENCES teaching_quality_analysis(id);

CREATE INDEX IF NOT EXISTS idx_trial_attendance_ai_analysis ON trial_class_attendance(ai_analysis_id);

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON TABLE teaching_quality_analysis IS 'AI-powered teaching quality analysis for each class session';
COMMENT ON TABLE suggestion_execution_log IS 'Tracks execution and effectiveness of teaching improvement suggestions';

COMMENT ON COLUMN teaching_quality_analysis.strengths IS 'JSONB array of strength objects: [{point, evidence}]';
COMMENT ON COLUMN teaching_quality_analysis.weaknesses IS 'JSONB array of weakness objects: [{point, evidence}]';
COMMENT ON COLUMN teaching_quality_analysis.suggestions IS 'JSONB array of suggestion objects: [{suggestion, method, expected_effect, priority}]';
COMMENT ON COLUMN teaching_quality_analysis.conversion_suggestions IS 'JSONB array for conversion optimization suggestions';

-- ============================================================================
-- Sample query examples (commented out)
-- ============================================================================

-- Get all analyses for a specific teacher
-- SELECT * FROM teaching_quality_analysis WHERE teacher_id = 'uuid' ORDER BY class_date DESC;

-- Get teacher's average score over time
-- SELECT DATE_TRUNC('month', class_date) as month, AVG(overall_score) as avg_score
-- FROM teaching_quality_analysis WHERE teacher_id = 'uuid' GROUP BY month ORDER BY month;

-- Get suggestions that were executed and their effectiveness
-- SELECT sel.*, tqa.class_date, tqa.teacher_name
-- FROM suggestion_execution_log sel
-- JOIN teaching_quality_analysis tqa ON sel.analysis_id = tqa.id
-- WHERE sel.is_executed = TRUE AND sel.effectiveness_score IS NOT NULL;

-- Get unexecuted suggestions for a teacher
-- SELECT tqa.class_date, tqa.student_name, sel.suggestion_text
-- FROM suggestion_execution_log sel
-- JOIN teaching_quality_analysis tqa ON sel.analysis_id = tqa.id
-- WHERE tqa.teacher_id = 'uuid' AND sel.is_executed = FALSE
-- ORDER BY tqa.class_date DESC;

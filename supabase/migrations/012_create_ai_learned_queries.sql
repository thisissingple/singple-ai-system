-- Migration: Create AI Learned Queries Table
-- Purpose: Store learned natural language query patterns for intelligent query optimization
-- Phase 9: AI Learning System

-- Drop table if exists (for clean re-runs)
DROP TABLE IF EXISTS ai_learned_queries;

-- Create AI learned queries table
CREATE TABLE ai_learned_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,                    -- 原始問題（例如：「這週Vicky上了幾個學生？」）
  question_pattern TEXT NOT NULL,            -- 關鍵字模式（例如：「這週 vicky 上 幾個 學生」）
  intent TEXT NOT NULL,                      -- 查詢意圖描述
  query_config JSONB NOT NULL,               -- 完整的 QueryAnalysis 物件
  teacher_id TEXT,                           -- 關聯的老師 ID（可選）
  confirmed_by_user BOOLEAN DEFAULT true,    -- 是否經過使用者確認
  usage_count INTEGER DEFAULT 1,             -- 使用次數
  last_used_at TIMESTAMPTZ DEFAULT NOW(),    -- 最後使用時間
  created_at TIMESTAMPTZ DEFAULT NOW(),      -- 建立時間
  updated_at TIMESTAMPTZ DEFAULT NOW()       -- 更新時間
);

-- Create indexes for better query performance
CREATE INDEX idx_learned_queries_pattern ON ai_learned_queries(question_pattern);
CREATE INDEX idx_learned_queries_teacher ON ai_learned_queries(teacher_id);
CREATE INDEX idx_learned_queries_usage ON ai_learned_queries(usage_count DESC);
CREATE INDEX idx_learned_queries_last_used ON ai_learned_queries(last_used_at DESC);

-- Add unique constraint to prevent duplicate patterns for same teacher
CREATE UNIQUE INDEX idx_learned_queries_unique_pattern ON ai_learned_queries(question_pattern, COALESCE(teacher_id, ''));

-- Comments for documentation
COMMENT ON TABLE ai_learned_queries IS 'AI learned query patterns for intelligent query optimization';
COMMENT ON COLUMN ai_learned_queries.question IS 'Original natural language question from user';
COMMENT ON COLUMN ai_learned_queries.question_pattern IS 'Normalized keyword pattern for matching';
COMMENT ON COLUMN ai_learned_queries.intent IS 'Query intent description';
COMMENT ON COLUMN ai_learned_queries.query_config IS 'Complete QueryAnalysis object as JSON';
COMMENT ON COLUMN ai_learned_queries.usage_count IS 'Number of times this pattern has been used';
COMMENT ON COLUMN ai_learned_queries.last_used_at IS 'Last time this pattern was used';

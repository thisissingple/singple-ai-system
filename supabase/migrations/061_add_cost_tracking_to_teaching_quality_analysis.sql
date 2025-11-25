-- Migration 056: Add Cost Tracking to Teaching Quality Analysis
-- Created: 2025-11-18
-- Purpose: Track OpenAI API costs and token usage for AI teaching quality analyses

-- Add columns for cost tracking
ALTER TABLE teaching_quality_analysis
ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS api_cost_usd NUMERIC(10, 6);

-- Add indexes for cost reporting
CREATE INDEX IF NOT EXISTS idx_tqa_api_cost ON teaching_quality_analysis(api_cost_usd) WHERE api_cost_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tqa_tokens_used ON teaching_quality_analysis(tokens_used) WHERE tokens_used IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN teaching_quality_analysis.tokens_used IS 'Total tokens used in OpenAI API call for this analysis';
COMMENT ON COLUMN teaching_quality_analysis.response_time_ms IS 'API response time in milliseconds';
COMMENT ON COLUMN teaching_quality_analysis.api_cost_usd IS 'Cost of OpenAI API call in USD (calculated from tokens and model pricing)';

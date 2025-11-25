-- Migration 058: Add Cost Tracking to Consultation Quality Analysis
-- 為諮詢品質分析表添加 AI 成本追蹤欄位，與體驗課分析表保持一致

ALTER TABLE consultation_quality_analysis
ADD COLUMN IF NOT EXISTS tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS response_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS api_cost_usd NUMERIC(10, 6);

-- 建立索引以加速成本查詢
CREATE INDEX IF NOT EXISTS idx_cqa_api_cost ON consultation_quality_analysis(api_cost_usd) WHERE api_cost_usd IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cqa_tokens_used ON consultation_quality_analysis(tokens_used) WHERE tokens_used IS NOT NULL;

-- 添加欄位註解
COMMENT ON COLUMN consultation_quality_analysis.tokens_used IS 'Total tokens used in OpenAI API call for this consultation analysis';
COMMENT ON COLUMN consultation_quality_analysis.response_time_ms IS 'API response time in milliseconds';
COMMENT ON COLUMN consultation_quality_analysis.api_cost_usd IS 'Cost of OpenAI API call in USD (calculated from tokens and model pricing)';

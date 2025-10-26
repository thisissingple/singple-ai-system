-- Add dual score system columns to teaching_quality_analysis table
-- Phase 32-33: Teaching score + Sales score + Conversion probability = Overall score

ALTER TABLE teaching_quality_analysis
  -- Change overall_score from 1-10 scale to 0-100 scale
  DROP CONSTRAINT IF EXISTS teaching_quality_analysis_overall_score_check,
  ADD CONSTRAINT teaching_quality_analysis_overall_score_check
    CHECK (overall_score >= 0 AND overall_score <= 100);

-- Add new score columns
ALTER TABLE teaching_quality_analysis
  ADD COLUMN IF NOT EXISTS teaching_score INTEGER CHECK (teaching_score >= 0 AND teaching_score <= 25),
  ADD COLUMN IF NOT EXISTS sales_score INTEGER CHECK (sales_score >= 0 AND sales_score <= 25),
  ADD COLUMN IF NOT EXISTS conversion_probability INTEGER CHECK (conversion_probability >= 0 AND conversion_probability <= 100);

-- Add comment for clarity
COMMENT ON COLUMN teaching_quality_analysis.overall_score IS '整體評分 (0-100): (teaching_score/25 * 30) + (sales_score/25 * 30) + (conversion_probability * 0.4)';
COMMENT ON COLUMN teaching_quality_analysis.teaching_score IS '教學品質評分 (0-25): 5個指標各5分';
COMMENT ON COLUMN teaching_quality_analysis.sales_score IS '推課策略評分 (0-25): 5個指標各5分';
COMMENT ON COLUMN teaching_quality_analysis.conversion_probability IS '成交機率 (0-100%): AI預估的轉換機率';

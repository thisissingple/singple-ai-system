-- Migration: Fix Teaching Quality Scores
-- Problem: 157 out of 158 records have teaching_score=0, sales_score=0
-- because backend was parsing from wrong field (summary instead of markdownOutput)
--
-- This migration creates a function to re-parse scores from conversion_suggestions->>'markdownOutput'

-- Create a function to extract teaching score from markdown
CREATE OR REPLACE FUNCTION extract_teaching_score(markdown TEXT)
RETURNS INTEGER AS $$
DECLARE
  score_match TEXT;
  score INTEGER;
BEGIN
  -- Pattern: **教學品質總分：18/25**
  score_match := (regexp_matches(markdown, '\*\*教學品質總分[：:]\s*(\d+)\s*/\s*25\*\*', 'i'))[1];

  IF score_match IS NOT NULL THEN
    score := score_match::INTEGER;
    IF score >= 0 AND score <= 25 THEN
      RETURN score;
    END IF;
  END IF;

  -- Pattern 2: **教學品質總分：** 18/25
  score_match := (regexp_matches(markdown, '\*\*教學品質總分[：:]\*\*\s*(\d+)\s*/\s*25', 'i'))[1];

  IF score_match IS NOT NULL THEN
    score := score_match::INTEGER;
    IF score >= 0 AND score <= 25 THEN
      RETURN score;
    END IF;
  END IF;

  -- Pattern 3: 教學品質總分 18/25
  score_match := (regexp_matches(markdown, '教學品質總分[^0-9]*(\d+)\s*/\s*25', 'i'))[1];

  IF score_match IS NOT NULL THEN
    score := score_match::INTEGER;
    IF score >= 0 AND score <= 25 THEN
      RETURN score;
    END IF;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to extract sales score from markdown
CREATE OR REPLACE FUNCTION extract_sales_score(markdown TEXT)
RETURNS INTEGER AS $$
DECLARE
  score_match TEXT;
  score INTEGER;
BEGIN
  -- Pattern 1: Most specific - Look for "總評（總分/25）：" format
  -- This avoids accidentally matching "教學品質總分：18/25" from teaching section
  score_match := (regexp_matches(markdown, '總評[（(][^)）]*[)）][：:]\s*\*\*\s*(\d+)\s*/\s*25', 'i'))[1];

  IF score_match IS NOT NULL THEN
    score := score_match::INTEGER;
    IF score >= 0 AND score <= 25 THEN
      RETURN score;
    END IF;
  END IF;

  -- Pattern 2: Alternative format - **總評：** 16/25
  score_match := (regexp_matches(markdown, '\*\*總評[：:]\*\*\s*(\d+)\s*/\s*25', 'i'))[1];

  IF score_match IS NOT NULL THEN
    score := score_match::INTEGER;
    IF score >= 0 AND score <= 25 THEN
      RETURN score;
    END IF;
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to extract conversion probability from markdown
CREATE OR REPLACE FUNCTION extract_conversion_probability(markdown TEXT)
RETURNS INTEGER AS $$
DECLARE
  prob_match TEXT;
  prob INTEGER;
BEGIN
  -- Pattern: 預估成交機率：70% or 📈 預估成交機率：70%
  prob_match := (regexp_matches(markdown, '預估成交機率[^0-9]{0,20}(\d+)%', 'i'))[1];

  IF prob_match IS NOT NULL THEN
    prob := prob_match::INTEGER;
    IF prob >= 0 AND prob <= 100 THEN
      RETURN prob;
    END IF;
  END IF;

  -- Fallback: default to 55
  RETURN 55;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to calculate overall score
CREATE OR REPLACE FUNCTION calculate_overall_score(teaching_score INTEGER, sales_score INTEGER, conversion_prob INTEGER)
RETURNS INTEGER AS $$
DECLARE
  teaching_contrib NUMERIC;
  sales_contrib NUMERIC;
  conversion_contrib NUMERIC;
  total NUMERIC;
BEGIN
  teaching_contrib := (teaching_score::NUMERIC / 25.0) * 30.0;
  sales_contrib := (sales_score::NUMERIC / 25.0) * 30.0;
  conversion_contrib := conversion_prob::NUMERIC * 0.4;

  total := teaching_contrib + sales_contrib + conversion_contrib;

  -- Round and clamp to 0-100
  total := GREATEST(0, LEAST(100, ROUND(total)));

  RETURN total::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all records that have markdownOutput (not just zero scores)
-- This is important because some records may have incorrect non-zero scores
-- due to the previous bug in regex pattern matching
DO $$
DECLARE
  rec RECORD;
  markdown_text TEXT;
  new_teaching_score INTEGER;
  new_sales_score INTEGER;
  new_conversion_prob INTEGER;
  new_overall_score INTEGER;
  success_count INTEGER := 0;
  updated_count INTEGER := 0;
  fail_count INTEGER := 0;
BEGIN
  RAISE NOTICE '🔍 Starting to fix teaching quality scores (including non-zero scores)...';
  RAISE NOTICE '';

  FOR rec IN
    SELECT id, student_name, conversion_suggestions, teaching_score, sales_score, conversion_probability, overall_score
    FROM teaching_quality_analysis
    WHERE conversion_suggestions->>'markdownOutput' IS NOT NULL
      AND length(conversion_suggestions->>'markdownOutput') > 50
    ORDER BY created_at DESC
  LOOP
    BEGIN
      -- Extract markdown from JSON (already validated by WHERE clause)
      markdown_text := rec.conversion_suggestions->>'markdownOutput';

      -- Parse scores using the corrected functions
      new_teaching_score := extract_teaching_score(markdown_text);
      new_sales_score := extract_sales_score(markdown_text);
      new_conversion_prob := extract_conversion_probability(markdown_text);
      new_overall_score := calculate_overall_score(new_teaching_score, new_sales_score, new_conversion_prob);

      -- Check if parsing was successful
      IF new_teaching_score = 0 AND new_sales_score = 0 THEN
        RAISE NOTICE '⚠️  % - Parsing failed (all scores = 0)', rec.student_name;
        fail_count := fail_count + 1;
        CONTINUE;
      END IF;

      -- Check if any score changed (only update if needed)
      IF new_teaching_score != rec.teaching_score OR
         new_sales_score != rec.sales_score OR
         new_conversion_prob != rec.conversion_probability THEN

        -- Update record
        UPDATE teaching_quality_analysis
        SET teaching_score = new_teaching_score,
            sales_score = new_sales_score,
            conversion_probability = new_conversion_prob,
            overall_score = new_overall_score,
            updated_at = NOW()
        WHERE id = rec.id;

        RAISE NOTICE '✅ % - Old: T=% S=% C=% O=% | New: T=% S=% C=% O=%',
          rec.student_name,
          rec.teaching_score, rec.sales_score, rec.conversion_probability, rec.overall_score,
          new_teaching_score, new_sales_score, new_conversion_prob, new_overall_score;

        updated_count := updated_count + 1;
      ELSE
        RAISE NOTICE '➖ % - No change needed (T=% S=% C=% O=%)',
          rec.student_name,
          rec.teaching_score, rec.sales_score, rec.conversion_probability, rec.overall_score;
      END IF;

      success_count := success_count + 1;

    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ % - Error: %', rec.student_name, SQLERRM;
      fail_count := fail_count + 1;
    END;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '📊 Summary:';
  RAISE NOTICE '========================================================';
  RAISE NOTICE '✅ Successfully processed: % records', success_count;
  RAISE NOTICE '📝 Actually updated: % records', updated_count;
  RAISE NOTICE '➖ No change needed: % records', success_count - updated_count;
  RAISE NOTICE '❌ Failed: % records', fail_count;
  IF (success_count + fail_count) > 0 THEN
    RAISE NOTICE '📈 Success rate: %', ROUND((success_count::NUMERIC / (success_count + fail_count)) * 100, 1) || '%';
  END IF;
END $$;

-- Verify final state
DO $$
DECLARE
  total INTEGER;
  zero_scores INTEGER;
  has_markdown INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM teaching_quality_analysis;
  SELECT COUNT(*) INTO zero_scores FROM teaching_quality_analysis WHERE teaching_score = 0 AND sales_score = 0;
  SELECT COUNT(*) INTO has_markdown FROM teaching_quality_analysis WHERE conversion_suggestions IS NOT NULL;

  RAISE NOTICE '';
  RAISE NOTICE '🔍 Final database state:';
  RAISE NOTICE '   Total records: %', total;
  RAISE NOTICE '   Records with zero scores: %', zero_scores;
  RAISE NOTICE '   Records with markdown: %', has_markdown;
  RAISE NOTICE '';
  RAISE NOTICE '✨ Migration complete!';
END $$;

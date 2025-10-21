-- Batch update eods_for_closers to extract deal_date and deal_amount from raw_data

-- Update deal_date from raw_data['（諮詢）成交日期']
UPDATE eods_for_closers
SET deal_date =
  CASE
    WHEN raw_data->>'（諮詢）成交日期' IS NOT NULL
    THEN TO_DATE(REPLACE(raw_data->>'（諮詢）成交日期', '/', '-'), 'YYYY-MM-DD')
    ELSE NULL
  END
WHERE raw_data->>'（諮詢）成交日期' IS NOT NULL
  AND deal_date IS NULL;

-- Update deal_amount from raw_data['（諮詢）實收金額']
-- Remove NT$, $, commas, and spaces, then cast to numeric
UPDATE eods_for_closers
SET deal_amount =
  CASE
    WHEN raw_data->>'（諮詢）實收金額' IS NOT NULL
    THEN CAST(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(raw_data->>'（諮詢）實收金額', 'NT\$', '', 'gi'),
            '\$', '', 'g'),
          ',', '', 'g'),
        '\s', '', 'g')
      AS NUMERIC)
    ELSE NULL
  END
WHERE raw_data->>'（諮詢）實收金額' IS NOT NULL
  AND deal_amount IS NULL;

-- Show results
SELECT
  COUNT(*) FILTER (WHERE deal_date IS NOT NULL) as deals_with_date,
  COUNT(*) FILTER (WHERE deal_amount IS NOT NULL) as deals_with_amount,
  COUNT(*) as total_deals
FROM eods_for_closers;

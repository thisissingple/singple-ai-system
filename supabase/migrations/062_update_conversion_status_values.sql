-- Migration 057: Update conversion_status to use Chinese values

-- Drop the old constraint
ALTER TABLE student_knowledge_base
DROP CONSTRAINT IF EXISTS student_knowledge_base_conversion_status_check;

-- Add new constraint with Chinese values matching trial class report
ALTER TABLE student_knowledge_base
ADD CONSTRAINT student_knowledge_base_conversion_status_check
CHECK (conversion_status = ANY (ARRAY['已轉高'::text, '未轉高'::text, '體驗中'::text, '未開始'::text]));

-- Update existing records to use new values (if any)
UPDATE student_knowledge_base
SET conversion_status = CASE conversion_status
  WHEN 'converted' THEN '已轉高'
  WHEN 'not_converted' THEN '未轉高'
  WHEN 'in_progress' THEN '體驗中'
  ELSE '未開始'
END
WHERE conversion_status IN ('converted', 'not_converted', 'in_progress');

COMMENT ON COLUMN student_knowledge_base.conversion_status IS 'Student conversion status: 已轉高 (converted to high-level), 未轉高 (not converted), 體驗中 (in progress), 未開始 (not started)';

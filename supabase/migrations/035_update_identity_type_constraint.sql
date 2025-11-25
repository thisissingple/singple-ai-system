-- Migration: Update identity_type constraint to replace 'sales' with 'setter'
-- 更新 identity_type 約束，將 sales 改為 setter

-- 1. 刪除舊的約束
ALTER TABLE business_identities
DROP CONSTRAINT IF EXISTS business_identities_identity_type_check;

-- 2. 更新所有 sales → setter
UPDATE business_identities
SET identity_type = 'setter'
WHERE identity_type = 'sales';

-- 3. 加上新的約束（使用 setter 而非 sales）
ALTER TABLE business_identities
ADD CONSTRAINT business_identities_identity_type_check
CHECK (identity_type IN ('teacher', 'consultant', 'setter', 'employee'));

-- 驗證
DO $$
DECLARE
  sales_count INTEGER;
  setter_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO sales_count FROM business_identities WHERE identity_type = 'sales';
  SELECT COUNT(*) INTO setter_count FROM business_identities WHERE identity_type = 'setter';

  RAISE NOTICE 'Migration completed:';
  RAISE NOTICE '  - Sales identities remaining: %', sales_count;
  RAISE NOTICE '  - Setter identities: %', setter_count;

  IF sales_count > 0 THEN
    RAISE WARNING 'Still found % sales identities!', sales_count;
  END IF;
END $$;

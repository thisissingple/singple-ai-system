-- Migration 026: Add phone number to trial_class_purchases
-- Purpose: Support telemarketing operations - allow staff to contact students directly

-- Add phone column
ALTER TABLE trial_class_purchases
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add comment
COMMENT ON COLUMN trial_class_purchases.phone IS '學生電話號碼（用於電話人員聯繫）';

-- Optional: Add index for quick phone lookup
CREATE INDEX IF NOT EXISTS idx_trial_purchases_phone
ON trial_class_purchases(phone)
WHERE phone IS NOT NULL;

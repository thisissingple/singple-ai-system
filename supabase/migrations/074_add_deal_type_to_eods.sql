-- Migration 074: Add deal_type column to eods_for_closers
-- 新增成交類型欄位，用於區分：諮詢、體驗課、續課、補分期、加購等

-- 新增 deal_type 欄位
ALTER TABLE eods_for_closers
ADD COLUMN IF NOT EXISTS deal_type TEXT;

-- 欄位註解
COMMENT ON COLUMN eods_for_closers.deal_type IS '成交類型（諮詢/體驗課/續課/補分期/加購等）';

-- 建立索引以加速查詢
CREATE INDEX IF NOT EXISTS idx_eods_deal_type
ON eods_for_closers(deal_type);

-- 建立複合索引：成交類型 + 諮詢日期（用於報表篩選）
CREATE INDEX IF NOT EXISTS idx_eods_deal_type_consultation_date
ON eods_for_closers(deal_type, consultation_date DESC);

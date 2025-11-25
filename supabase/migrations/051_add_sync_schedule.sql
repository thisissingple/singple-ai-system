-- ===================================
-- Phase 40: 新增同步排程設定
-- 建立日期: 2025-11-11
-- ===================================

-- 新增 sync_schedule 欄位到 sheet_mappings 表
ALTER TABLE sheet_mappings
ADD COLUMN sync_schedule JSONB DEFAULT '["02:00"]';

-- 註解說明
COMMENT ON COLUMN sheet_mappings.sync_schedule IS '同步排程設定 - 每日同步時間列表，格式: ["00:00", "06:00", "12:00", "18:00"]';

-- 更新現有記錄，設定預設值為每日凌晨 2:00
UPDATE sheet_mappings
SET sync_schedule = '["02:00"]'
WHERE sync_schedule IS NULL;

-- ===================================
-- 完成
-- ===================================

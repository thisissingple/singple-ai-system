-- ============================================
-- Migration 003: Fix sheet_data foreign keys
-- 修正 sheet_data 的外鍵，使其指向正確的 UUID 欄位
-- ============================================

-- 1. Drop existing foreign key constraints
ALTER TABLE sheet_data
  DROP CONSTRAINT IF EXISTS sheet_data_spreadsheet_id_spreadsheets_spreadsheet_id_fk;

-- 2. Alter column types to UUID (if not already)
ALTER TABLE sheet_data
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN spreadsheet_id TYPE UUID USING spreadsheet_id::uuid,
  ALTER COLUMN worksheet_id TYPE UUID USING worksheet_id::uuid,
  ALTER COLUMN last_updated TYPE TIMESTAMPTZ USING last_updated::timestamptz;

-- 3. Set default for id column
ALTER TABLE sheet_data
  ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- 4. Add correct foreign key constraints
ALTER TABLE sheet_data
  ADD CONSTRAINT sheet_data_spreadsheet_id_fkey
    FOREIGN KEY (spreadsheet_id) REFERENCES spreadsheets(id) ON DELETE CASCADE,
  ADD CONSTRAINT sheet_data_worksheet_id_fkey
    FOREIGN KEY (worksheet_id) REFERENCES worksheets(id) ON DELETE CASCADE;

-- 5. Recreate indexes (they should exist from migration 001)
CREATE INDEX IF NOT EXISTS idx_sheet_data_spreadsheet ON sheet_data(spreadsheet_id);
CREATE INDEX IF NOT EXISTS idx_sheet_data_worksheet ON sheet_data(worksheet_id);

SELECT '✅ sheet_data foreign keys fixed!' AS status;

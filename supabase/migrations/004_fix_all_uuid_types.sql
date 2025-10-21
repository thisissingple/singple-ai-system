-- ============================================
-- Migration 004: Fix all UUID types and foreign keys
-- 修正所有表的 UUID 類型與外鍵關聯
-- ============================================

-- Step 1: Drop all foreign key constraints
ALTER TABLE sheet_data
  DROP CONSTRAINT IF EXISTS sheet_data_spreadsheet_id_fkey,
  DROP CONSTRAINT IF EXISTS sheet_data_worksheet_id_fkey,
  DROP CONSTRAINT IF EXISTS sheet_data_spreadsheet_id_spreadsheets_spreadsheet_id_fk,
  DROP CONSTRAINT IF EXISTS sheet_data_worksheet_id_worksheets_id_fk;

ALTER TABLE worksheets
  DROP CONSTRAINT IF EXISTS worksheets_spreadsheet_id_spreadsheets_spreadsheet_id_fk,
  DROP CONSTRAINT IF EXISTS worksheets_spreadsheet_id_fkey;

-- Step 2: Fix spreadsheets table
ALTER TABLE spreadsheets
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN last_sync_at TYPE TIMESTAMPTZ USING last_sync_at::timestamptz,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;

-- Step 3: Fix worksheets table
ALTER TABLE worksheets
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN spreadsheet_id TYPE UUID USING spreadsheet_id::uuid,
  ALTER COLUMN last_sync_at TYPE TIMESTAMPTZ USING last_sync_at::timestamptz,
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at::timestamptz;

-- Step 4: Fix sheet_data table
ALTER TABLE sheet_data
  ALTER COLUMN id TYPE UUID USING id::uuid,
  ALTER COLUMN id SET DEFAULT uuid_generate_v4(),
  ALTER COLUMN spreadsheet_id TYPE UUID USING spreadsheet_id::uuid,
  ALTER COLUMN worksheet_id TYPE UUID USING worksheet_id::uuid,
  ALTER COLUMN last_updated TYPE TIMESTAMPTZ USING last_updated::timestamptz;

-- Step 5: Add back foreign key constraints with correct references
ALTER TABLE worksheets
  ADD CONSTRAINT worksheets_spreadsheet_id_fkey
    FOREIGN KEY (spreadsheet_id) REFERENCES spreadsheets(id) ON DELETE CASCADE;

ALTER TABLE sheet_data
  ADD CONSTRAINT sheet_data_spreadsheet_id_fkey
    FOREIGN KEY (spreadsheet_id) REFERENCES spreadsheets(id) ON DELETE CASCADE,
  ADD CONSTRAINT sheet_data_worksheet_id_fkey
    FOREIGN KEY (worksheet_id) REFERENCES worksheets(id) ON DELETE CASCADE;

SELECT '✅ All UUID types and foreign keys fixed!' AS status;

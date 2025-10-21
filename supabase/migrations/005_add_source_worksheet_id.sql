-- Add source_worksheet_id column to track which worksheet the data came from
-- This allows us to delete old data when syncing the same worksheet again

ALTER TABLE trial_class_attendance
ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL;

ALTER TABLE trial_class_purchase
ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL;

ALTER TABLE eods_for_closers
ADD COLUMN IF NOT EXISTS source_worksheet_id UUID REFERENCES worksheets(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trial_class_attendance_source_worksheet
ON trial_class_attendance(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_trial_class_purchase_source_worksheet
ON trial_class_purchase(source_worksheet_id);

CREATE INDEX IF NOT EXISTS idx_eods_for_closers_source_worksheet
ON eods_for_closers(source_worksheet_id);

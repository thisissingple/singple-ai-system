-- Migration 054: Add student_phone to all student-related tables
-- Purpose: Centralize phone number storage across all tables that record student data
-- Date: 2025-11-17

-- 1. eods_for_closers (諮詢記錄)
ALTER TABLE eods_for_closers
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN eods_for_closers.student_phone IS '學員電話號碼';

CREATE INDEX IF NOT EXISTS idx_eods_student_phone
ON eods_for_closers(student_phone)
WHERE student_phone IS NOT NULL;

-- 2. trial_class_attendance (體驗課出席記錄)
ALTER TABLE trial_class_attendance
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN trial_class_attendance.student_phone IS '學員電話號碼';

CREATE INDEX IF NOT EXISTS idx_trial_attendance_student_phone
ON trial_class_attendance(student_phone)
WHERE student_phone IS NOT NULL;

-- 3. trial_class_purchases (購買記錄)
ALTER TABLE trial_class_purchases
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN trial_class_purchases.student_phone IS '學員電話號碼';

CREATE INDEX IF NOT EXISTS idx_trial_purchases_student_phone
ON trial_class_purchases(student_phone)
WHERE student_phone IS NOT NULL;

-- 4. student_knowledge_base (學員知識庫)
ALTER TABLE student_knowledge_base
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN student_knowledge_base.student_phone IS '學員電話號碼（統一來源）';

CREATE INDEX IF NOT EXISTS idx_student_kb_phone
ON student_knowledge_base(student_phone)
WHERE student_phone IS NOT NULL;

-- 5. income_expense_records (收支記錄)
ALTER TABLE income_expense_records
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN income_expense_records.student_phone IS '學員電話號碼';

CREATE INDEX IF NOT EXISTS idx_income_expense_student_phone
ON income_expense_records(student_phone)
WHERE student_phone IS NOT NULL;

-- Note: consultation_analysis_overview is a VIEW, skipping
-- Note: student_class_summary is a VIEW, skipping

-- 6. consultation_chat_recaps (諮詢對話摘要)
ALTER TABLE consultation_chat_recaps
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN consultation_chat_recaps.student_phone IS '學員電話號碼';

-- 7. consultation_quality_analysis (諮詢品質分析)
ALTER TABLE consultation_quality_analysis
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN consultation_quality_analysis.student_phone IS '學員電話號碼';

-- 8. teacher_ai_conversations (老師 AI 對話)
ALTER TABLE teacher_ai_conversations
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN teacher_ai_conversations.student_phone IS '學員電話號碼';

-- 9. teaching_quality_analysis (教學品質分析)
ALTER TABLE teaching_quality_analysis
ADD COLUMN IF NOT EXISTS student_phone VARCHAR(20);

COMMENT ON COLUMN teaching_quality_analysis.student_phone IS '學員電話號碼';

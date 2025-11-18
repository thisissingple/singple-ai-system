-- Migration: Change teacher_id from UUID to TEXT in teacher_ai_conversations
-- Purpose: Support SKIP_AUTH mode where teacher_id is "admin-test-123" (not a valid UUID)
-- Date: 2025-11-18

-- Step 1: Drop existing foreign key constraints (if any)
ALTER TABLE teacher_ai_conversations
DROP CONSTRAINT IF EXISTS teacher_ai_conversations_teacher_id_fkey;

-- Step 2: Change teacher_id column type from UUID to TEXT
ALTER TABLE teacher_ai_conversations
ALTER COLUMN teacher_id TYPE TEXT USING teacher_id::TEXT;

-- Step 3: Recreate foreign key constraint with ON DELETE CASCADE
-- Note: This assumes there's a users table with id as TEXT
-- If users.id is still UUID, we'll need to handle this differently
-- ALTER TABLE teacher_ai_conversations
-- ADD CONSTRAINT teacher_ai_conversations_teacher_id_fkey
-- FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_teacher_ai_conversations_teacher_id
ON teacher_ai_conversations(teacher_id);

-- Add comment to document the change
COMMENT ON COLUMN teacher_ai_conversations.teacher_id IS
'Teacher ID (TEXT to support both UUID and SKIP_AUTH mode strings like "admin-test-123")';

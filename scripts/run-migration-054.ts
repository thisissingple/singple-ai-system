import { readFileSync } from 'fs';
import { join } from 'path';
import { queryDatabase } from '../server/services/pg-client';

async function runMigration() {
  console.log('🚀 Running Migration 054: Add student_phone to tables...\n');

  const migrationPath = join(process.cwd(), 'supabase/migrations/054_add_student_phone_to_tables.sql');
  const sql = readFileSync(migrationPath, 'utf-8');

  try {
    await queryDatabase(sql);
    console.log('✅ Migration 054 completed successfully!');

    // Verify the columns were added (excluding VIEWs)
    const tables = [
      'eods_for_closers',
      'trial_class_attendance',
      'trial_class_purchases',
      'student_knowledge_base',
      'income_expense_records',
      'consultation_chat_recaps',
      'consultation_quality_analysis',
      'teacher_ai_conversations',
      'teaching_quality_analysis'
    ];

    console.log('\n📋 Verifying columns added:');
    for (const table of tables) {
      const result = await queryDatabase(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = $1 AND column_name = 'student_phone'
      `, [table]);

      if (result.rows.length > 0) {
        console.log(`  ✓ ${table}.student_phone`);
      } else {
        console.log(`  ✗ ${table}.student_phone - FAILED`);
      }
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();

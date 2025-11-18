import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ override: true });

async function runMigration() {
  const pool = createPool('session');

  try {
    console.log('🔄 Running migration 055: Change teacher_id to TEXT...\n');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '055_change_teacher_id_to_text_in_ai_conversations.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Migration 055 completed successfully!\n');

    // Verify the change
    console.log('📋 Verifying teacher_id column type...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teacher_ai_conversations'
      AND column_name = 'teacher_id'
    `);

    console.table(result.rows);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔍 Full error:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

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
    console.log('🔄 Running migration 057: Update conversion_status to Chinese values...\n');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '057_update_conversion_status_values.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Migration 057 completed successfully!\n');

    // Verify the changes
    console.log('📋 Verifying new constraint...');
    const result = await pool.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'student_knowledge_base'::regclass
      AND contype = 'c'
      AND conname = 'student_knowledge_base_conversion_status_check'
    `);

    console.table(result.rows);

    if (result.rows.length === 1) {
      console.log('\n✅ Constraint updated successfully!');
    } else {
      console.log('\n⚠️ Warning: Expected 1 constraint, found', result.rows.length);
    }

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

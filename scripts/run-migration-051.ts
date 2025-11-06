/**
 * Run Migration 051: Create Consultation Chat Recaps Table
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const pool = createPool();

  try {
    console.log('🚀 Running Migration 051: Create Consultation Chat Recaps...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/051_create_consultation_chat_recaps.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration 051 completed successfully!');
    console.log('\n📝 Changes:');
    console.log('   - Created consultation_chat_recaps table');
    console.log('   - Added indexes for eod_id, analysis_id, emails, generated_at');

    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'consultation_chat_recaps'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Table structure:');
    console.table(result.rows);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

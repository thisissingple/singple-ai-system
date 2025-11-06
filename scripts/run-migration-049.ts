/**
 * Run Migration 049: Add Chat Assistant Config
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
    console.log('🚀 Running Migration 049: Add Chat Assistant Config Fields...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/049_add_chat_assistant_config.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration 049 completed successfully!');
    console.log('\n📝 Changes:');
    console.log('   - Added chat_ai_model column');
    console.log('   - Added chat_temperature column');
    console.log('   - Added chat_max_tokens column');
    console.log('   - Added chat_system_prompt column');

    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'consultation_analysis_config'
      AND column_name LIKE 'chat%'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 New columns in consultation_analysis_config:');
    console.table(result.rows);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

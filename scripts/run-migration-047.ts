/**
 * Run migration 047: Create consultation_analysis_config table
 */

import { createPool } from '../server/services/pg-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Running migration 047: Create consultation_analysis_config table\n');

  const migrationPath = path.join(__dirname, '../supabase/migrations/047_create_consultation_analysis_config.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  const pool = createPool();

  try {
    await pool.query(sql);
    console.log('✅ Migration 047 completed successfully!');

    // Verify table creation
    const verifyQuery = `
      SELECT
        id,
        ai_model,
        temperature,
        max_tokens,
        LENGTH(analysis_prompt) as prompt_length,
        updated_at,
        updated_by
      FROM consultation_analysis_config
      LIMIT 1
    `;

    const result = await pool.query(verifyQuery);

    if (result.rows.length > 0) {
      console.log('\n✅ Default configuration inserted:');
      console.log(`   Model: ${result.rows[0].ai_model}`);
      console.log(`   Temperature: ${result.rows[0].temperature}`);
      console.log(`   Max Tokens: ${result.rows[0].max_tokens}`);
      console.log(`   Prompt Length: ${result.rows[0].prompt_length} characters`);
      console.log(`   Updated At: ${result.rows[0].updated_at}`);
      console.log(`   Updated By: ${result.rows[0].updated_by}`);
    }
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

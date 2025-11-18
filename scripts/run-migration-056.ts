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
    console.log('🔄 Running migration 056: Add cost tracking to teaching_quality_analysis...\n');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '056_add_cost_tracking_to_teaching_quality_analysis.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    await pool.query(sql);

    console.log('✅ Migration 056 completed successfully!\n');

    // Verify the changes
    console.log('📋 Verifying new columns...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teaching_quality_analysis'
      AND column_name IN ('tokens_used', 'response_time_ms', 'api_cost_usd')
      ORDER BY column_name
    `);

    console.table(result.rows);

    if (result.rows.length === 3) {
      console.log('\n✅ All cost tracking columns added successfully!');
    } else {
      console.log('\n⚠️ Warning: Expected 3 columns, found', result.rows.length);
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

/**
 * Run Migration 052: Drop deprecated current_status column
 */

import { createPool } from '../server/services/pg-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = createPool();

  try {
    console.log('🚀 Running Migration 052: Drop deprecated current_status column...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/052_drop_deprecated_current_status_column.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('   - Dropped current_status column from trial_class_purchases');
    console.log('   - Added table comment\n');

    // Verify the column is gone
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'trial_class_purchases'
        AND column_name = 'current_status'
    `);

    if (result.rows.length === 0) {
      console.log('✅ Verification passed: current_status column no longer exists');
    } else {
      console.log('⚠️  Warning: current_status column still exists');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();

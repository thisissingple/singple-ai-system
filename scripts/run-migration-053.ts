/**
 * Run Migration 053: Drop unused columns from trial_class_purchases
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
    console.log('🚀 Running Migration 053: Drop unused columns from trial_class_purchases...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/053_drop_unused_columns_from_trial_class_purchases.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('   - Dropped 6 unused columns: age, occupation, notes, phone, updated_at, last_class_date');
    console.log('   - Updated table and column comments\n');

    // Verify the columns are gone
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'trial_class_purchases'
      ORDER BY ordinal_position
    `);

    console.log('📋 Remaining columns in trial_class_purchases:');
    result.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name}`);
    });

    console.log('\n✅ Expected columns: id, student_name, student_email, package_name, trial_class_count, remaining_classes, purchase_date, created_at');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();

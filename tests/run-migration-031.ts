/**
 * Run migration 031: Add dual score system columns
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import * as fs from 'fs';

async function runMigration() {
  const pool = createPool();

  try {
    console.log('📦 Running migration 031_add_dual_score_system.sql...\n');

    const sql = fs.readFileSync('./supabase/migrations/031_add_dual_score_system.sql', 'utf-8');
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'teaching_quality_analysis'
        AND column_name IN ('teaching_score', 'sales_score', 'conversion_probability')
      ORDER BY column_name
    `);

    console.log('📋 New columns:');
    result.rows.forEach((row: any) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

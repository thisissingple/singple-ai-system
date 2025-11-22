/**
 * Run migration 063: Add student_email to consultation_quality_analysis
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createPool } from '../server/services/pg-client';

async function runMigration() {
  console.log('🚀 Running migration 063: Add student_email to consultation_quality_analysis...\n');

  const pool = createPool('session');

  try {
    // Step 1: Add student_email column
    console.log('Step 1: Adding student_email column...');
    await pool.query(`
      ALTER TABLE consultation_quality_analysis
      ADD COLUMN IF NOT EXISTS student_email VARCHAR(255)
    `);
    console.log('✅ Column added\n');

    // Step 2: Create index for efficient JOIN
    console.log('Step 2: Creating index for multi-condition JOIN...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_consultation_quality_analysis_multi_key
      ON consultation_quality_analysis (student_email, consultation_date, closer_name)
    `);
    console.log('✅ Index created\n');

    // Step 3: Backfill existing records
    console.log('Step 3: Backfilling existing records from eods_for_closers...');
    const backfillResult = await pool.query(`
      UPDATE consultation_quality_analysis cqa
      SET student_email = e.student_email
      FROM eods_for_closers e
      WHERE cqa.eod_id = e.id
        AND cqa.student_email IS NULL
        AND e.student_email IS NOT NULL
      RETURNING cqa.id, cqa.student_name, e.student_email
    `);
    console.log(`✅ Backfilled ${backfillResult.rowCount} records\n`);

    if (backfillResult.rowCount && backfillResult.rowCount > 0) {
      console.log('Updated records:');
      backfillResult.rows.forEach((row: any) => {
        console.log(`  - ${row.student_name}: ${row.student_email}`);
      });
    }

    // Step 4: Verify current state
    console.log('\n📊 Current state of consultation_quality_analysis:');
    const verifyResult = await pool.query(`
      SELECT id, student_name, student_email, closer_name, consultation_date, eod_id
      FROM consultation_quality_analysis
      ORDER BY consultation_date DESC
    `);
    console.log(`Total records: ${verifyResult.rowCount}\n`);
    verifyResult.rows.forEach((row: any) => {
      console.log(`  ${row.student_name} | ${row.student_email || 'NO EMAIL'} | ${row.closer_name} | ${row.consultation_date}`);
    });

    console.log('\n✅ Migration 063 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);

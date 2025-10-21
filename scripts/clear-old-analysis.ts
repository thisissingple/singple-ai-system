/**
 * Clear Old Teaching Quality Analysis Data
 *
 * This script deletes all old analysis records to prepare for the new sales-focused analysis.
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function clearOldAnalysis() {
  console.log('🗑️  Starting to clear old analysis data...\n');

  try {
    // 1. Count existing records
    const countResult = await pool.query('SELECT COUNT(*) FROM teaching_quality_analysis');
    const totalRecords = parseInt(countResult.rows[0].count);
    console.log(`📊 Found ${totalRecords} existing analysis records`);

    if (totalRecords === 0) {
      console.log('✅ No records to delete. Database is clean.');
      return;
    }

    // 2. Reset ai_analysis_id in trial_class_attendance FIRST (to avoid foreign key constraint)
    console.log('\n🔄 Resetting ai_analysis_id references...');
    await pool.query('UPDATE trial_class_attendance SET ai_analysis_id = NULL WHERE ai_analysis_id IS NOT NULL');
    console.log('✅ Reset all ai_analysis_id references');

    // 3. Delete all records from teaching_quality_analysis
    console.log('\n🗑️  Deleting all analysis records...');
    await pool.query('DELETE FROM teaching_quality_analysis');
    console.log('✅ Deleted all records from teaching_quality_analysis');

    // 4. Verify deletion
    const verifyResult = await pool.query('SELECT COUNT(*) FROM teaching_quality_analysis');
    const remainingRecords = parseInt(verifyResult.rows[0].count);

    console.log(`\n📊 Final count: ${remainingRecords} records`);
    console.log('✅ Database is ready for new sales-focused analysis!\n');

  } catch (error) {
    console.error('❌ Error clearing old analysis:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

clearOldAnalysis();

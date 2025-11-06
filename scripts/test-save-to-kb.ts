/**
 * Test save-to-kb endpoint
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

const EOD_ID = 'd36edc72-e1b4-4500-beb3-4b90b3af012e';

async function main() {
  const pool = createPool();

  try {
    console.log(`🔍 Testing save-to-kb for EOD ID: ${EOD_ID}\n`);

    // Check if EOD record exists and has required fields
    const eodQuery = `
      SELECT
        e.id,
        e.student_name,
        e.student_email,
        e.closer_name,
        cqa.id as analysis_id
      FROM eods_for_closers e
      LEFT JOIN consultation_quality_analysis cqa ON e.id = cqa.eod_id
      WHERE e.id = $1
    `;

    const result = await pool.query(eodQuery, [EOD_ID]);

    if (result.rows.length === 0) {
      console.log('❌ EOD record not found');
      process.exit(1);
    }

    const record = result.rows[0];
    console.log('📋 EOD Record:');
    console.log(`   Student Name: ${record.student_name}`);
    console.log(`   Student Email: ${record.student_email || '❌ MISSING'}`);
    console.log(`   Closer Name: ${record.closer_name}`);
    console.log(`   Analysis ID: ${record.analysis_id || '❌ NO ANALYSIS'}`);

    if (!record.student_email) {
      console.log('\n❌ PROBLEM: student_email is NULL');
      console.log('   This will cause save-to-kb to fail with 400 error');
      console.log('   Need to update the record with student email first');
      process.exit(1);
    }

    if (!record.analysis_id) {
      console.log('\n❌ PROBLEM: No AI analysis found for this consultation');
      console.log('   Cannot save to KB without analysis');
      process.exit(1);
    }

    // Check if consultant exists in users table
    const userQuery = await pool.query(`
      SELECT email FROM users WHERE name = $1 AND 'consultant' = ANY(roles)
    `, [record.closer_name]);

    const consultantEmail = userQuery.rows.length > 0 ? userQuery.rows[0].email : null;
    console.log(`\n👤 Consultant Email: ${consultantEmail || '❌ NOT FOUND'}`);

    console.log('\n✅ All checks passed! save-to-kb should work.');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

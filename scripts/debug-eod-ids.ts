/**
 * Debug script to check eods_for_closers table IDs
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    // Check first few records
    const query = `
      SELECT id, student_name, student_email, closer_name, consultation_date, is_show
      FROM eods_for_closers
      WHERE is_show = '已上線'
      ORDER BY consultation_date DESC
      LIMIT 5
    `;

    const result = await pool.query(query);

    console.log('\n📋 Top 5 eods_for_closers records:');
    console.log('===============================================');
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. ${row.student_name} (${row.closer_name})`);
      console.log(`   ID: ${row.id}`);
      console.log(`   Email: ${row.student_email}`);
      console.log(`   Date: ${row.consultation_date}`);
      console.log(`   Show: ${row.is_show}`);
    });
    console.log('\n===============================================\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();

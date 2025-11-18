import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkAnalysis() {
  const pool = createPool('session');

  try {
    const result = await pool.query(`
      SELECT id, student_name, class_date, overall_score,
             strengths, weaknesses, suggestions, class_summary
      FROM teaching_quality_analysis
      WHERE student_name = '童義螢'
      ORDER BY class_date DESC
      LIMIT 1
    `);

    console.log('=== AI Analysis Record for 童義螢 ===\n');
    if (result.rows.length > 0) {
      const record = result.rows[0];
      console.log('ID:', record.id);
      console.log('Class Date:', record.class_date);
      console.log('Overall Score:', record.overall_score);
      console.log('\n--- Strengths ---');
      console.log(JSON.stringify(record.strengths, null, 2));
      console.log('\n--- Weaknesses ---');
      console.log(JSON.stringify(record.weaknesses, null, 2));
      console.log('\n--- Suggestions ---');
      console.log(JSON.stringify(record.suggestions, null, 2));
      console.log('\n--- Class Summary ---');
      console.log(record.class_summary);
    } else {
      console.log('No AI analysis found for 童義螢');
    }
  } catch (error: any) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAnalysis();

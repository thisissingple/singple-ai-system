import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkAnalysisContent() {
  const pool = createPool('session');

  try {
    console.log('🔍 Checking full AI analysis content for 童義螢...\n');

    const result = await pool.query(`
      SELECT
        id,
        student_name,
        class_date,
        overall_score,
        class_summary,
        strengths,
        weaknesses,
        suggestions,
        transcript_text
      FROM teaching_quality_analysis
      WHERE student_name = '童義螢'
      ORDER BY class_date DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No analysis found for 童義螢');
      return;
    }

    const analysis = result.rows[0];

    console.log('=== Basic Info ===');
    console.log('ID:', analysis.id);
    console.log('Student:', analysis.student_name);
    console.log('Class Date:', analysis.class_date);
    console.log('Overall Score:', analysis.overall_score);

    console.log('\n=== Class Summary ===');
    console.log(analysis.class_summary);

    console.log('\n=== Strengths (JSONB) ===');
    console.log(JSON.stringify(analysis.strengths, null, 2));

    console.log('\n=== Weaknesses (JSONB) ===');
    console.log(JSON.stringify(analysis.weaknesses, null, 2));

    console.log('\n=== Suggestions (JSONB) ===');
    console.log(JSON.stringify(analysis.suggestions, null, 2));

    console.log('\n=== Transcript Preview (first 500 chars) ===');
    console.log(analysis.transcript_text?.substring(0, 500) || 'No transcript');

    // Check if there's a markdown report stored somewhere
    console.log('\n🔍 Checking for Markdown report...');
    const columnsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'teaching_quality_analysis'
      AND (column_name LIKE '%markdown%' OR column_name LIKE '%report%' OR column_name LIKE '%raw%')
    `);

    if (columnsResult.rows.length > 0) {
      console.log('Found potential markdown columns:');
      console.table(columnsResult.rows);
    } else {
      console.log('❌ No markdown/report columns found in teaching_quality_analysis table');
      console.log('💡 The full markdown report is NOT stored in the database');
      console.log('💡 Only structured data (strengths, weaknesses, suggestions) is stored');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAnalysisContent();

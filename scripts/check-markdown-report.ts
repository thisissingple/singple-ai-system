import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkMarkdownReport() {
  const pool = createPool('session');

  try {
    console.log('🔍 Checking conversion_suggestions field for 童義螢...\n');

    const result = await pool.query(`
      SELECT
        id,
        student_name,
        class_date,
        conversion_suggestions
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

    console.log('\n=== Conversion Suggestions (JSONB) ===');

    if (!analysis.conversion_suggestions) {
      console.log('❌ conversion_suggestions field is NULL');
      console.log('💡 This means the Markdown report was not saved to the database');
      return;
    }

    try {
      const suggestions = typeof analysis.conversion_suggestions === 'string'
        ? JSON.parse(analysis.conversion_suggestions)
        : analysis.conversion_suggestions;

      console.log('Type:', typeof suggestions);
      console.log('Keys:', Object.keys(suggestions));

      if (suggestions.markdownOutput) {
        console.log('\n=== Full Markdown Report ===');
        console.log(suggestions.markdownOutput);
      } else {
        console.log('\n❌ No markdownOutput field found');
        console.log('Available fields:', JSON.stringify(suggestions, null, 2));
      }
    } catch (e: any) {
      console.error('❌ Failed to parse conversion_suggestions:', e.message);
      console.log('Raw content:', analysis.conversion_suggestions);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkMarkdownReport();

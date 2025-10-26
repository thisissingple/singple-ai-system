/**
 * Update all existing teaching_quality_analysis records with dual score system
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import { parseScoresFromMarkdown } from '../server/services/parse-teaching-scores';

async function main() {
  const pool = createPool();

  try {
    console.log('🔄 Updating existing analysis records with dual score system...\n');

    // Get all analysis records that have class_summary
    const result = await pool.query(`
      SELECT id, student_name, class_summary, overall_score as old_overall_score
      FROM teaching_quality_analysis
      WHERE class_summary IS NOT NULL
      ORDER BY created_at DESC
    `);

    const totalRecords = result.rows.length;
    console.log(`📊 Found ${totalRecords} records to update\n`);

    let updated = 0;
    let failed = 0;

    for (const row of result.rows) {
      try {
        const scores = parseScoresFromMarkdown(row.class_summary);

        await pool.query(`
          UPDATE teaching_quality_analysis
          SET
            teaching_score = $1,
            sales_score = $2,
            conversion_probability = $3,
            overall_score = $4,
            updated_at = NOW()
          WHERE id = $5
        `, [
          scores.teachingScore,
          scores.salesScore,
          scores.conversionProbability,
          scores.overallScore,
          row.id
        ]);

        updated++;

        if (row.student_name === '陳冠霖' || updated <= 3) {
          console.log(`✓ ${row.student_name}:`);
          console.log(`  Old: ${row.old_overall_score}/10`);
          console.log(`  New: ${scores.overallScore}/100 (T:${scores.teachingScore}/25, S:${scores.salesScore}/25, P:${scores.conversionProbability}%)`);
          console.log('');
        }

      } catch (error: any) {
        failed++;
        console.error(`✗ Failed to update ${row.student_name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Updated ${updated}/${totalRecords} records`);
    if (failed > 0) {
      console.log(`❌ Failed: ${failed} records`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

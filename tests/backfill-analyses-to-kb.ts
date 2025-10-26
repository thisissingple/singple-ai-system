/**
 * Backfill all existing analyses to student knowledge base
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import { getOrCreateStudentKB, addDataSourceRef } from '../server/services/student-knowledge-service';

async function main() {
  const pool = createPool();

  try {
    console.log('🔄 Backfilling existing analyses to student knowledge base...\n');

    // Get all analyses with student_email
    const result = await pool.query(`
      SELECT
        tqa.id as analysis_id,
        tca.student_email,
        tca.student_name,
        tqa.overall_score,
        tqa.created_at
      FROM teaching_quality_analysis tqa
      JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
      WHERE tca.student_email IS NOT NULL
        AND tca.student_email != ''
      ORDER BY tqa.created_at ASC
    `);

    const totalRecords = result.rows.length;
    console.log(`📊 Found ${totalRecords} analyses to process\n`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of result.rows) {
      try {
        // Ensure student KB exists
        await getOrCreateStudentKB(row.student_email, row.student_name);

        // Check if analysis already in KB
        const kbCheck = await pool.query(`
          SELECT data_sources
          FROM student_knowledge_base
          WHERE student_email = $1
        `, [row.student_email]);

        if (kbCheck.rows.length > 0) {
          const dataSources = kbCheck.rows[0].data_sources || {};
          const aiAnalyses = dataSources.ai_analyses || [];

          if (aiAnalyses.includes(row.analysis_id)) {
            skipped++;
            if (skipped <= 5) {
              console.log(`⊘ Skipped ${row.student_name}: analysis already in KB`);
            }
            continue;
          }
        }

        // Add analysis to KB
        await addDataSourceRef(row.student_email, 'ai_analyses', row.analysis_id);

        processed++;
        if (processed <= 10) {
          console.log(`✓ Added ${row.student_name}: ${row.analysis_id.substring(0, 8)}... (Score: ${row.overall_score}/100)`);
        } else if (processed === 11) {
          console.log('  ... (showing first 10 only)');
        }

      } catch (error: any) {
        errors++;
        console.error(`✗ Failed ${row.student_name}: ${error.message}`);
      }
    }

    console.log(`\n✅ Backfill completed!`);
    console.log(`  Processed: ${processed}`);
    console.log(`  Skipped (already in KB): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Total: ${totalRecords}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

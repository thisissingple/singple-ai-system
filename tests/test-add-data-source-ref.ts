/**
 * Test addDataSourceRef function
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import { getOrCreateStudentKB, addDataSourceRef } from '../server/services/student-knowledge-service';

async function main() {
  const pool = createPool();

  try {
    console.log('🧪 Testing addDataSourceRef function...\n');

    const testEmail = 'ssaa.42407@gmail.com';
    const testName = '陳冠霖';
    const testAnalysisId = 'test-analysis-id-123';

    // 1. Ensure KB exists
    console.log('1. Ensuring student KB exists...');
    await getOrCreateStudentKB(testEmail, testName);
    console.log('✓ KB ready\n');

    // 2. Add test analysis
    console.log('2. Adding test analysis to KB...');
    await addDataSourceRef(testEmail, 'ai_analyses', testAnalysisId);
    console.log('✓ Added successfully\n');

    // 3. Verify
    console.log('3. Verifying...');
    const result = await pool.query(`
      SELECT data_sources
      FROM student_knowledge_base
      WHERE student_email = $1
    `, [testEmail]);

    if (result.rows.length > 0) {
      const dataSources = result.rows[0].data_sources;
      const aiAnalyses = dataSources?.ai_analyses || [];

      console.log('✓ Current ai_analyses:', aiAnalyses);

      if (aiAnalyses.includes(testAnalysisId)) {
        console.log('✅ Test PASSED: Analysis ID found in knowledge base!');
      } else {
        console.log('❌ Test FAILED: Analysis ID not found');
      }
    }

    // 4. Cleanup test data
    console.log('\n4. Cleaning up test data...');
    await pool.query(`
      UPDATE student_knowledge_base
      SET data_sources = jsonb_set(
        data_sources,
        '{ai_analyses}',
        (
          SELECT jsonb_agg(elem)
          FROM jsonb_array_elements(data_sources->'ai_analyses') elem
          WHERE elem::text != $1
        )
      )
      WHERE student_email = $2
    `, [JSON.stringify(testAnalysisId), testEmail]);
    console.log('✓ Cleanup complete');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

/**
 * Test auto-save analysis to student knowledge base
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    console.log('🧪 Testing auto-save to knowledge base...\n');

    // 1. Check Chen Guanlin's knowledge base
    console.log('📋 Step 1: Check Chen Guanlin knowledge base');
    const kbResult = await pool.query(`
      SELECT
        student_email,
        student_name,
        data_sources,
        total_classes,
        created_at
      FROM student_knowledge_base
      WHERE student_name LIKE '%陳冠霖%'
    `);

    if (kbResult.rows.length === 0) {
      console.log('⚠️ No knowledge base found for Chen Guanlin');
      console.log('   (Will be created on next analysis)\n');
    } else {
      const kb = kbResult.rows[0];
      console.log(`✓ Found KB for ${kb.student_name} (${kb.student_email})`);
      console.log(`  Total classes: ${kb.total_classes}`);
      console.log(`  Created at: ${kb.created_at}\n`);

      // 2. Check ai_analyses data sources
      console.log('📋 Step 2: Check ai_analyses in data_sources');
      const aiAnalyses = kb.data_sources?.ai_analyses || [];
      console.log(`  Found ${aiAnalyses.length} AI analyses in knowledge base:`);

      if (aiAnalyses.length > 0) {
        aiAnalyses.forEach((id: string, index: number) => {
          console.log(`    ${index + 1}. ${id}`);
        });
      } else {
        console.log('    (None yet - auto-save will add them)');
      }
      console.log('');

      // 3. Get actual analysis records for Chen Guanlin
      console.log('📋 Step 3: Check actual analysis records');
      const analysisResult = await pool.query(`
        SELECT
          tqa.id,
          tqa.student_name,
          tqa.overall_score,
          tqa.teaching_score,
          tqa.sales_score,
          tqa.conversion_probability,
          tqa.created_at
        FROM teaching_quality_analysis tqa
        WHERE tqa.student_name LIKE '%陳冠霖%'
        ORDER BY tqa.created_at DESC
      `);

      console.log(`  Found ${analysisResult.rows.length} analysis records in database:`);
      analysisResult.rows.forEach((row: any, index: number) => {
        const inKB = aiAnalyses.includes(row.id);
        const marker = inKB ? '✓' : '✗';
        console.log(`    ${index + 1}. ${row.id.substring(0, 8)}... (Score: ${row.overall_score}/100) ${marker} ${inKB ? 'In KB' : 'NOT in KB'}`);
      });
      console.log('');

      // 4. Summary
      const totalAnalyses = analysisResult.rows.length;
      const inKB = aiAnalyses.length;
      const missing = totalAnalyses - inKB;

      console.log('📊 Summary:');
      console.log(`  Total analyses: ${totalAnalyses}`);
      console.log(`  In knowledge base: ${inKB}`);
      console.log(`  Missing from KB: ${missing}`);

      if (missing > 0) {
        console.log(`\n⚠️ ${missing} analysis record(s) not in knowledge base yet`);
        console.log('   These should be auto-added on next analysis');
      } else {
        console.log('\n✅ All analyses are in knowledge base!');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

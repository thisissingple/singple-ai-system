import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkAiCosts() {
  const pool = createPool('session');

  try {
    console.log('🔍 Checking AI costs for student: fas0955581382@gamil.com\n');

    // Check conversation costs
    const convResult = await pool.query(`
      SELECT
        COUNT(*) as conversation_count,
        COALESCE(SUM(api_cost_usd), 0) as total_conv_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens
      FROM teacher_ai_conversations
      WHERE student_email = $1
    `, ['fas0955581382@gamil.com']);

    console.log('💬 AI Conversations:');
    console.table(convResult.rows);

    // Check teaching quality analysis costs
    const analysisResult = await pool.query(`
      SELECT
        COUNT(*) as analysis_count,
        COALESCE(SUM(api_cost_usd), 0) as total_analysis_cost,
        COALESCE(SUM(tokens_used), 0) as total_tokens
      FROM teaching_quality_analysis
      WHERE student_name = (SELECT student_name FROM student_knowledge_base WHERE student_email = $1 LIMIT 1)
    `, ['fas0955581382@gamil.com']);

    console.log('\n📊 Teaching Quality Analyses:');
    console.table(analysisResult.rows);

    // Calculate total costs
    const totalConvCost = parseFloat(convResult.rows[0]?.total_conv_cost || 0);
    const totalAnalysisCost = parseFloat(analysisResult.rows[0]?.total_analysis_cost || 0);
    const totalCost = totalConvCost + totalAnalysisCost;

    console.log('\n💰 Total AI Cost Breakdown:');
    console.table([
      { source: 'AI Conversations', cost: `$${totalConvCost.toFixed(4)}` },
      { source: 'Teaching Quality Analysis', cost: `$${totalAnalysisCost.toFixed(4)}` },
      { source: 'TOTAL', cost: `$${totalCost.toFixed(4)}` }
    ]);

    // Verify with the actual query used in student-knowledge-service.ts
    const verifyResult = await pool.query(`
      SELECT
        COALESCE(SUM(conv_cost), 0) + COALESCE(SUM(analysis_cost), 0) as total_cost
      FROM (
        -- AI Conversations
        SELECT COALESCE(SUM(api_cost_usd), 0) as conv_cost, 0 as analysis_cost
        FROM teacher_ai_conversations
        WHERE student_email = $1

        UNION ALL

        -- Teaching Quality Analyses (transcript analyses)
        SELECT 0 as conv_cost, COALESCE(SUM(api_cost_usd), 0) as analysis_cost
        FROM teaching_quality_analysis
        WHERE student_name = (SELECT student_name FROM student_knowledge_base WHERE student_email = $1 LIMIT 1)
      ) all_costs
    `, ['fas0955581382@gamil.com']);

    console.log('\n✅ Verification (actual service query):');
    console.log(`Total Cost: $${parseFloat(verifyResult.rows[0]?.total_cost || 0).toFixed(4)}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAiCosts();

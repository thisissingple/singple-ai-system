/**
 * Check Analysis Result
 *
 * Fetch one analysis result from database to verify quality
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkAnalysisResult() {
  console.log('🔍 Fetching latest analysis result...\n');

  try {
    // Get the latest analysis
    const query = `
      SELECT
        tqa.id,
        tqa.overall_score,
        tqa.strengths,
        tqa.weaknesses,
        tqa.class_summary,
        tqa.suggestions,
        tqa.conversion_suggestions,
        tqa.created_at,
        tca.student_name,
        tca.teacher_name
      FROM teaching_quality_analysis tqa
      JOIN trial_class_attendance tca ON tca.ai_analysis_id = tqa.id
      ORDER BY tqa.created_at DESC
      LIMIT 1
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('❌ No analysis results found.');
      return;
    }

    const analysis = result.rows[0];

    console.log('📊 ========== 分析結果 ==========\n');
    console.log(`學員姓名: ${analysis.student_name}`);
    console.log(`諮詢師/老師: ${analysis.teacher_name}`);
    console.log(`成交機率評分: ${analysis.overall_score}/10`);
    console.log(`分析時間: ${analysis.created_at}\n`);

    console.log('🎯 ========== 學員狀況分析 ==========');
    if (analysis.strengths && analysis.strengths.length > 0) {
      analysis.strengths.forEach((s: any, i: number) => {
        console.log(`\n${i + 1}. ${s.point}`);
        console.log(`   ${s.evidence}`);
      });
    }

    console.log('\n\n⚠️  ========== 痛點/問題 ==========');
    if (analysis.weaknesses && analysis.weaknesses.length > 0) {
      analysis.weaknesses.forEach((w: any, i: number) => {
        console.log(`\n${i + 1}. ${w.point}`);
        console.log(`   ${w.evidence}`);
      });
    }

    console.log('\n\n💡 ========== 成交策略與話術 ==========');
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      analysis.suggestions.forEach((s: any, i: number) => {
        console.log(`\n${i + 1}. ${s.suggestion}`);
        console.log(`   方法: ${s.method}`);
        console.log(`   預期效果: ${s.expectedEffect}`);
        console.log(`   優先級: ${s.priority}`);
      });
    }

    console.log('\n\n📌 ========== 完整成交話術 ==========');
    console.log(analysis.class_summary);

    if (analysis.conversion_suggestions && analysis.conversion_suggestions.length > 0) {
      console.log('\n\n🎯 ========== 原始銷售分析資料 ==========');
      console.log(JSON.stringify(analysis.conversion_suggestions, null, 2));
    }

    console.log('\n\n✅ 分析結果已顯示完畢\n');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkAnalysisResult();

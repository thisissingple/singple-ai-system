/**
 * Check Double Bind section from Chen's analysis
 */

import 'dotenv/config';
import { queryDatabase, createPool } from '../server/services/pg-client';

async function checkDoubleBind() {
  const pool = createPool();

  try {
    console.log('🔍 查詢陳冠霖的分析報告...\n');

    const query = `
      SELECT class_summary
      FROM teaching_quality_analysis tqa
      JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
      WHERE tca.student_email = $1
      ORDER BY tqa.created_at DESC
      LIMIT 1
    `;
    const result = await pool.query(query, ['ssaa.42407@gmail.com']);

    if (result.rows.length === 0) {
      console.log('❌ 找不到分析報告');
      return;
    }

    const report = result.rows[0].class_summary;

    // Extract all scores section
    const scoresSection = report.match(
      /# 🧮 成交策略評估[\s\S]*?(?=# |$)/
    );

    if (scoresSection) {
      console.log('✅ 成交策略評估（完整5大指標）：\n');
      console.log('='.repeat(80));
      console.log(scoresSection[0]);
      console.log('='.repeat(80));
    } else {
      console.log('❌ 找不到成交策略評估段落');
      console.log('\n前 2000 字：');
      console.log(report.slice(0, 2000));
    }
  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    await pool.end();
  }
}

checkDoubleBind();

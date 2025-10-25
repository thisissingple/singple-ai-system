/**
 * Check both Teaching Quality and Sales Strategy scores
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

async function checkBothScores() {
  const pool = createPool();

  try {
    console.log('🔍 查詢陳冠霖的完整評分...\n');

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
      console.log('❌ 找不到報告');
      return;
    }

    const report = result.rows[0].class_summary;

    // Extract Teaching Quality section
    const teachingSection = report.match(/# 📚 教學品質評估[\s\S]*?(?=# 🧮|$)/);

    // Extract Sales Strategy section
    const salesSection = report.match(/# 🧮 成交策略評估[\s\S]*?(?=# 💬|$)/);

    if (teachingSection) {
      console.log('✅ 教學品質評估：\n');
      console.log('='.repeat(80));
      console.log(teachingSection[0].substring(0, 1500));
      console.log('\n...(後續內容省略)');
      console.log('='.repeat(80));
      console.log('\n');
    } else {
      console.log('❌ 找不到教學品質評估段落\n');
    }

    if (salesSection) {
      console.log('✅ 成交策略評估：\n');
      console.log('='.repeat(80));
      console.log(salesSection[0].substring(0, 1500));
      console.log('\n...(後續內容省略)');
      console.log('='.repeat(80));
    } else {
      console.log('❌ 找不到成交策略評估段落');
    }
  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    await pool.end();
  }
}

checkBothScores();

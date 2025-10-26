/**
 * Check new student profile format
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

async function checkStudentProfile() {
  const pool = createPool();

  try {
    console.log('🔍 查詢學員狀況掌握段落...\n');

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

    // Extract student profile section
    const profileSection = report.match(/# 🧑‍🏫 學員狀況掌握[\s\S]*?(?=# 📚|$)/);

    if (profileSection) {
      console.log('✅ 學員狀況掌握：\n');
      console.log('='.repeat(80));
      console.log(profileSection[0]);
      console.log('='.repeat(80));
    } else {
      console.log('❌ 找不到學員狀況掌握段落');
    }
  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    await pool.end();
  }
}

checkStudentProfile();

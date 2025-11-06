/**
 * Find 苑奕琝 | Vicky consultation record
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    // Find consultation record
    const result = await pool.query(`
      SELECT
        e.id,
        e.student_name,
        e.student_email,
        e.closer_name,
        e.consultation_date,
        e.consultation_result,
        CASE WHEN e.consultation_transcript IS NOT NULL AND LENGTH(e.consultation_transcript) > 0
          THEN true ELSE false END AS has_transcript,
        CASE WHEN cqa.id IS NOT NULL THEN true ELSE false END AS has_analysis,
        cqa.id AS analysis_id
      FROM eods_for_closers e
      LEFT JOIN consultation_quality_analysis cqa ON e.id = cqa.eod_id
      WHERE e.student_name LIKE '%苑%' OR e.closer_name LIKE '%Vicky%'
      ORDER BY e.consultation_date DESC
      LIMIT 10
    `);

    console.log('\n📋 找到的諮詢記錄：\n');
    console.log(result.rows);

    if (result.rows.length > 0) {
      const firstRecord = result.rows[0];
      console.log('\n✅ 第一筆記錄：');
      console.log(`   ID: ${firstRecord.id}`);
      console.log(`   學員: ${firstRecord.student_name}`);
      console.log(`   諮詢師: ${firstRecord.closer_name}`);
      console.log(`   日期: ${firstRecord.consultation_date}`);
      console.log(`   有逐字稿: ${firstRecord.has_transcript}`);
      console.log(`   有分析: ${firstRecord.has_analysis}`);

      if (firstRecord.has_analysis) {
        console.log(`\n🔗 查看分析頁面: http://localhost:5002/consultation-quality/${firstRecord.id}`);
      }
    }

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

main();

import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function checkRecentAnalysis() {
  const pool = createPool('session');

  // Get all consultation analyses for 童義螢
  const result = await pool.query(`
    SELECT
      ca.id,
      ca.eod_id,
      ca.analyzed_at,
      ca.created_at,
      ca.overall_rating,
      e.student_name,
      e.consultation_date
    FROM consultation_quality_analysis ca
    LEFT JOIN eods_for_closers e ON ca.eod_id = e.id
    WHERE e.student_email IN ('fas0955581382@gamil.com', 'tong.yiying1023@gmail.com')
    ORDER BY ca.analyzed_at DESC
    LIMIT 10
  `);

  console.log('童義螢的諮詢 AI 分析記錄：\n');

  result.rows.forEach((row, index) => {
    const analyzedUTC = new Date(row.analyzed_at);
    const analyzedTW = new Date(analyzedUTC.getTime() + 8 * 60 * 60 * 1000);

    console.log(`${index + 1}. ID: ${row.id}`);
    console.log(`   分析時間 (UTC): ${row.analyzed_at}`);
    console.log(`   分析時間 (台灣): ${analyzedTW.toLocaleString('zh-TW')}`);
    console.log(`   諮詢日期: ${row.consultation_date}`);
    console.log(`   評分: ${row.overall_rating}/10`);
    console.log('');
  });

  await pool.end();
}

checkRecentAnalysis().catch(console.error);

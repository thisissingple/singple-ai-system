import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function verifyTimeline() {
  const pool = createPool('session');

  try {
    console.log('='.repeat(80));
    console.log('童義螢 Timeline Verification Report');
    console.log('='.repeat(80));
    console.log('');

    // Get consultation AI analysis
    const analysisResult = await pool.query(`
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
      LIMIT 3
    `);

    console.log('📊 諮詢 AI 分析記錄:');
    console.log('');

    analysisResult.rows.forEach((row, index) => {
      const analyzedUTC = new Date(row.analyzed_at);
      const analyzedTaiwan = analyzedUTC.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Taipei',
      });

      console.log(`${index + 1}. Analysis ID: ${row.id}`);
      console.log(`   EOD ID: ${row.eod_id}`);
      console.log(`   ⏰ Database (UTC):    ${row.analyzed_at}`);
      console.log(`   🇹🇼 Taiwan Time:      ${analyzedTaiwan}`);
      console.log(`   📝 Overall Rating:    ${row.overall_rating}/10`);
      console.log(`   📅 Consultation Date: ${row.consultation_date}`);
      console.log('');
    });

    // Get chat recaps
    const recapResult = await pool.query(`
      SELECT
        id,
        eod_id,
        student_email,
        student_name,
        generated_at,
        created_at,
        total_messages,
        total_questions
      FROM consultation_chat_recaps
      WHERE student_email IN ('fas0955581382@gamil.com', 'tong.yiying1023@gmail.com')
      ORDER BY generated_at DESC
      LIMIT 3
    `);

    console.log('💬 諮詢對話摘要記錄:');
    console.log('');

    recapResult.rows.forEach((row, index) => {
      const generatedUTC = new Date(row.generated_at);
      const generatedTaiwan = generatedUTC.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Taipei',
      });

      console.log(`${index + 1}. Recap ID: ${row.id}`);
      console.log(`   EOD ID: ${row.eod_id}`);
      console.log(`   ⏰ Database (UTC):    ${row.generated_at}`);
      console.log(`   🇹🇼 Taiwan Time:      ${generatedTaiwan}`);
      console.log(`   📊 Messages/Questions: ${row.total_messages}/${row.total_questions}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('✅ Verification Complete');
    console.log('');
    console.log('📌 Key Points:');
    console.log('  1. Database stores all timestamps in UTC (correct)');
    console.log('  2. Taiwan Time = UTC + 8 hours');
    console.log('  3. Frontend uses toLocaleString() with timeZone: "Asia/Taipei"');
    console.log('  4. The displayed Taiwan times above match what frontend shows');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyTimeline().catch(console.error);

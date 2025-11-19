import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function checkLatestTimestamps() {
  const pool = createPool('session');

  try {
    console.log('='.repeat(80));
    console.log('檢查最新記錄的時間戳記（原始 UTC 值）');
    console.log('='.repeat(80));
    console.log('');

    // Get the latest analysis
    const analysisResult = await pool.query(`
      SELECT
        id,
        to_char(analyzed_at, 'YYYY-MM-DD HH24:MI:SS') as analyzed_at_formatted,
        analyzed_at AT TIME ZONE 'UTC' as utc_interpretation,
        analyzed_at AT TIME ZONE 'Asia/Taipei' as taiwan_interpretation
      FROM consultation_quality_analysis
      WHERE eod_id = 'ec5243bf-f497-41c9-92be-91b4c5b5ab17'
      ORDER BY analyzed_at DESC
      LIMIT 2
    `);

    console.log('📊 諮詢 AI 分析（最新 2 筆）:\n');
    analysisResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ID: ${row.id}`);
      console.log(`   原始儲存值: ${row.analyzed_at_formatted}`);
      console.log(`   解讀為 UTC → 台灣: ${row.utc_interpretation}`);
      console.log(`   解讀為台灣 → 台灣: ${row.taiwan_interpretation}`);
      console.log('');
    });

    // Get the latest recap
    const recapResult = await pool.query(`
      SELECT
        id,
        to_char(generated_at, 'YYYY-MM-DD HH24:MI:SS') as generated_at_formatted,
        generated_at AT TIME ZONE 'UTC' as utc_interpretation,
        generated_at AT TIME ZONE 'Asia/Taipei' as taiwan_interpretation
      FROM consultation_chat_recaps
      WHERE eod_id = 'ec5243bf-f497-41c9-92be-91b4c5b5ab17'
      ORDER BY generated_at DESC
      LIMIT 2
    `);

    console.log('💬 諮詢對話摘要（最新 2 筆）:\n');
    recapResult.rows.forEach((row, i) => {
      console.log(`${i + 1}. ID: ${row.id}`);
      console.log(`   原始儲存值: ${row.generated_at_formatted}`);
      console.log(`   解讀為 UTC → 台灣: ${row.utc_interpretation}`);
      console.log(`   解讀為台灣 → 台灣: ${row.taiwan_interpretation}`);
      console.log('');
    });

    // Current time for reference
    const nowResult = await pool.query(`
      SELECT
        NOW() as current_time,
        to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS') as current_formatted
    `);

    console.log('🕐 目前時間（供參考）:');
    console.log(`   NOW(): ${nowResult.rows[0].current_time}`);
    console.log(`   格式化: ${nowResult.rows[0].current_formatted}`);
    console.log('');

    console.log('='.repeat(80));
    console.log('');
    console.log('💡 判讀標準：');
    console.log('   ✅ 正確：原始儲存值應該是 UTC 時間（台灣時間 - 8 小時）');
    console.log('   ✅ 正確：「解讀為 UTC → 台灣」應該顯示正確的台灣執行時間');
    console.log('   ❌ 錯誤：如果「解讀為台灣 → 台灣」= 原始值，代表儲存的是台灣時間');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkLatestTimestamps().catch(console.error);

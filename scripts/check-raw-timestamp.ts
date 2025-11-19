import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function checkRawTimestamp() {
  const pool = createPool('session');

  try {
    console.log('='.repeat(80));
    console.log('檢查童義螢 AI 分析的原始時間戳記');
    console.log('='.repeat(80));
    console.log('');

    // Get the analysis record with timezone conversions
    const result = await pool.query(`
      SELECT
        id,
        analyzed_at,
        analyzed_at AT TIME ZONE 'UTC' as analyzed_utc,
        analyzed_at AT TIME ZONE 'Asia/Taipei' as analyzed_taiwan,
        to_char(analyzed_at, 'YYYY-MM-DD HH24:MI:SS') as analyzed_formatted
      FROM consultation_quality_analysis
      WHERE id = 'ba8eeb6e-41e8-4ed5-9e85-7907a4e20ab0'
    `);

    const row = result.rows[0];

    console.log('📊 Analysis ID:', row.id);
    console.log('');
    console.log('⏰ 時間戳記分析：');
    console.log(`   analyzed_at (pg 回傳):          ${row.analyzed_at}`);
    console.log(`   analyzed_at (格式化):           ${row.analyzed_formatted}`);
    console.log(`   AT TIME ZONE 'UTC':            ${row.analyzed_utc}`);
    console.log(`   AT TIME ZONE 'Asia/Taipei':    ${row.analyzed_taiwan}`);
    console.log('');

    // Check current time for comparison
    const nowResult = await pool.query(`
      SELECT
        NOW() as current_time,
        to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS') as current_formatted,
        NOW() AT TIME ZONE 'Asia/Taipei' as current_taiwan
    `);

    console.log('🕐 目前時間（供參考）：');
    console.log(`   NOW():                         ${nowResult.rows[0].current_time}`);
    console.log(`   格式化:                        ${nowResult.rows[0].current_formatted}`);
    console.log(`   AT TIME ZONE 'Asia/Taipei':   ${nowResult.rows[0].current_taiwan}`);
    console.log('');

    console.log('='.repeat(80));
    console.log('');
    console.log('💡 解讀說明：');
    console.log('   1. analyzed_at 儲存格式: TIMESTAMP WITHOUT TIME ZONE');
    console.log('   2. PostgreSQL 時區設定: UTC');
    console.log('   3. 資料庫內部儲存: 沒有時區資訊的時間戳記');
    console.log('   4. pg 模組讀取時: 假設是 UTC，轉換成本地時區（台灣）');
    console.log('');
    console.log('   ⚠️  如果「格式化」顯示 22:34，表示資料庫儲存的是 22:34');
    console.log('   ⚠️  如果「AT TIME ZONE Asia/Taipei」顯示 14:40 左右，表示應該是正確的');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkRawTimestamp().catch(console.error);

import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function diagnoseTimestamp() {
  const pool = createPool('session');

  try {
    console.log('='.repeat(80));
    console.log('時間戳記問題診斷');
    console.log('='.repeat(80));
    console.log('');

    // 1. 本地機器時間
    const localNow = new Date();
    console.log('📍 本地機器時間：');
    console.log(`   ISO (UTC):      ${localNow.toISOString()}`);
    console.log(`   台灣時間:       ${localNow.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
    console.log('');

    // 2. PostgreSQL 時間
    const pgTimeResult = await pool.query(`
      SELECT
        NOW() as pg_now,
        CURRENT_TIMESTAMP as pg_current_ts,
        NOW() AT TIME ZONE 'UTC' as pg_now_utc,
        NOW() AT TIME ZONE 'Asia/Taipei' as pg_now_taiwan
    `);

    const tzResult = await pool.query('SHOW timezone');

    console.log('🗄️  PostgreSQL 時間：');
    console.log(`   時區設定:       ${tzResult.rows[0].TimeZone}`);
    console.log(`   NOW():          ${pgTimeResult.rows[0].pg_now}`);
    console.log(`   AT TIME ZONE 'UTC':        ${pgTimeResult.rows[0].pg_now_utc}`);
    console.log(`   AT TIME ZONE 'Asia/Taipei': ${pgTimeResult.rows[0].pg_now_taiwan}`);
    console.log('');

    // 3. 測試插入時間戳記
    console.log('🧪 測試：插入新記錄並檢查時間戳記');

    // Create a test table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timestamp_test (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        created_at_explicit TIMESTAMP
      )
    `);

    // Insert with default NOW()
    const insertResult = await pool.query(`
      INSERT INTO timestamp_test (created_at_explicit)
      VALUES (NOW())
      RETURNING id, created_at, created_at_explicit
    `);

    console.log(`   插入記錄 ID: ${insertResult.rows[0].id}`);
    console.log(`   created_at (DEFAULT NOW()):  ${insertResult.rows[0].created_at}`);
    console.log(`   created_at_explicit (NOW()): ${insertResult.rows[0].created_at_explicit}`);
    console.log('');

    // 4. 比較時差
    const dbTime = new Date(pgTimeResult.rows[0].pg_now);
    const timeDiff = localNow.getTime() - dbTime.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    console.log('⏱️  時間差異分析：');
    console.log(`   本地 vs 資料庫: ${Math.abs(hoursDiff).toFixed(2)} 小時`);
    console.log(`   差異方向: ${hoursDiff > 0 ? '資料庫較慢' : '資料庫較快'}`);
    console.log('');

    // Clean up test table
    await pool.query('DROP TABLE IF EXISTS timestamp_test');

    console.log('='.repeat(80));
    console.log('');
    console.log('💡 診斷建議：');
    if (Math.abs(hoursDiff) > 0.1) {
      console.log(`   ⚠️  資料庫時間與本地時間相差 ${Math.abs(hoursDiff).toFixed(2)} 小時`);
      console.log('   ⚠️  這可能是 Supabase 伺服器時區設定問題');
      console.log('   ✅ 建議：在 INSERT 時明確指定台灣時間');
    } else {
      console.log('   ✅ 本地與資料庫時間同步正常');
    }
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

diagnoseTimestamp().catch(console.error);

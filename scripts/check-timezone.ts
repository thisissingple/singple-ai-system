import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function checkTimezone() {
  const pool = createPool('session');

  try {
    // Check timezone setting
    const tzResult = await pool.query('SHOW timezone');
    console.log('PostgreSQL timezone:', tzResult.rows[0].TimeZone);

    // Check consultation_quality_analysis timestamp
    const analysisResult = await pool.query(`
      SELECT analyzed_at, created_at
      FROM consultation_quality_analysis
      WHERE id = 'ba8eeb6e-41e8-4ed5-9e85-7907a4e20ab0'
    `);
    console.log('\n諮詢 AI 分析時間戳:');
    console.log('  analyzed_at:', analysisResult.rows[0].analyzed_at);
    console.log('  created_at:', analysisResult.rows[0].created_at);

    // Check chat recap timestamp
    const recapResult = await pool.query(`
      SELECT generated_at, created_at
      FROM consultation_chat_recaps
      WHERE id = 'e3aac195-420c-4429-8c79-ef870216f6dd'
    `);
    console.log('\nChat recap 時間戳:');
    console.log('  generated_at:', recapResult.rows[0].generated_at);
    console.log('  created_at:', recapResult.rows[0].created_at);

    // Test NOW() function
    const nowResult = await pool.query(`SELECT NOW() as current_time, CURRENT_TIMESTAMP as current_ts`);
    console.log('\n測試 NOW() 函數:');
    console.log('  NOW():', nowResult.rows[0].current_time);
    console.log('  CURRENT_TIMESTAMP:', nowResult.rows[0].current_ts);

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkTimezone().catch(console.error);

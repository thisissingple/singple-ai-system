import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';

dotenv.config({ override: true });

async function checkPgNow() {
  const pool = createPool('session');

  try {
    const result = await pool.query(`
      SELECT
        NOW() as pg_now,
        CURRENT_TIMESTAMP as pg_current_ts
    `);

    console.log('PostgreSQL current time:\n');
    console.log('NOW():', result.rows[0].pg_now);
    console.log('CURRENT_TIMESTAMP:', result.rows[0].pg_current_ts);

    const tzResult = await pool.query('SHOW timezone');
    console.log('Timezone:', tzResult.rows[0].TimeZone);

    console.log('\nLocal machine time:');
    console.log('JavaScript Date:', new Date().toISOString());
    console.log('Taiwan time:', new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPgNow().catch(console.error);

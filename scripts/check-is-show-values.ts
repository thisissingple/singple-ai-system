import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkValues() {
  const pool = createPool();
  try {
    const result = await pool.query(`
      SELECT is_show, COUNT(*) as count
      FROM eods_for_closers
      GROUP BY is_show
      ORDER BY count DESC;
    `);
    console.log('📊 is_show 欄位的值分布：');
    console.table(result.rows);
  } finally {
    await pool.end();
  }
}
checkValues();

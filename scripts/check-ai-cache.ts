/**
 * Check AI Report Cache in Supabase
 */
import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool.on('error', () => {});

  try {
    const result = await pool.query(`
      SELECT period, start_date, end_date, cache_date,
             LEFT(summary, 80) as summary_preview,
             generated_at
      FROM consultant_ai_reports
      ORDER BY generated_at DESC
      LIMIT 5
    `);

    console.log('📋 consultant_ai_reports 表內容 (存在於 Supabase):');
    console.log('快取報告數量:', result.rows.length);
    console.table(result.rows);
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();

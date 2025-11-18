import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkColumns() {
  const pool = createPool();
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'eods_for_closers'
      AND (column_name LIKE '%show%')
      ORDER BY column_name;
    `);
    console.log('📊 eods_for_closers 表中包含 "show" 的欄位：');
    console.table(result.rows);
  } finally {
    await pool.end();
  }
}
checkColumns();

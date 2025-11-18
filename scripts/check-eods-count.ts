import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkCount() {
  const pool = createPool();
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total FROM eods_for_closers;
    `);
    console.log('📊 eods_for_closers 總筆數:', result.rows[0].total);
    
    // 檢查是否有重複的記錄
    const duplicates = await pool.query(`
      SELECT student_email, consultation_date, COUNT(*) as count
      FROM eods_for_closers
      GROUP BY student_email, consultation_date
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10;
    `);
    console.log('\n📊 重複記錄 (前10筆):');
    console.table(duplicates.rows);
  } finally {
    await pool.end();
  }
}
checkCount();

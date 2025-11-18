import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkStatus() {
  const pool = createPool('session');

  try {
    const result = await pool.query(`
      SELECT student_name, student_email, conversion_status
      FROM student_knowledge_base
      WHERE student_email = $1
    `, ['fas0955581382@gamil.com']);

    console.log('學員轉換狀態：');
    console.table(result.rows);

    if (result.rows.length > 0) {
      const status = result.rows[0].conversion_status;
      console.log(`\n當前狀態值: "${status}"`);
      console.log(`狀態類型: ${typeof status}`);
      console.log(`是否為 NULL: ${status === null}`);
    }

  } catch (error: any) {
    console.error('錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkStatus();

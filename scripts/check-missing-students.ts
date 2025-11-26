/**
 * 檢查沒有購買記錄的學員
 */
import { createPool } from '../server/services/pg-client';

async function checkMissingStudents() {
  const pool = createPool();

  try {
    console.log('🔍 檢查「佳和」和「童義螢」的購買記錄...\n');

    // 檢查佳和
    const result1 = await pool.query(`
      SELECT COUNT(*) as count
      FROM trial_class_purchases
      WHERE student_name = '佳和'
    `);
    console.log('佳和的購買記錄數:', result1.rows[0].count);

    // 檢查童義螢
    const result2 = await pool.query(`
      SELECT COUNT(*) as count
      FROM trial_class_purchases
      WHERE student_name = '童義螢'
    `);
    console.log('童義螢的購買記錄數:', result2.rows[0].count);

    // 檢查他們的出席記錄
    const attendance = await pool.query(`
      SELECT student_name, student_email, class_date
      FROM trial_class_attendance
      WHERE student_name IN ('佳和', '童義螢')
      ORDER BY student_name, class_date
    `);

    console.log('\n📅 出席記錄:');
    console.table(attendance.rows);

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkMissingStudents();

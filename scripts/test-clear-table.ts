import dotenv from 'dotenv';
import { createPool, queryDatabase } from '../server/services/pg-client';

dotenv.config({ override: true });

async function testClearTable() {
  console.log('🧪 測試 clearTable 功能\n');

  // 1. 插入測試資料
  console.log('1️⃣ 插入測試資料...');
  const pool = createPool('session');
  await pool.query(`
    INSERT INTO eods_for_closers (student_email, student_name, consultation_date, is_show)
    VALUES
      ('test1@example.com', 'Test User 1', '2025-01-01', '已上線'),
      ('test2@example.com', 'Test User 2', '2025-01-02', '未上線')
  `);

  const countAfterInsert = await pool.query('SELECT COUNT(*) FROM eods_for_closers');
  console.log(`   ✅ 插入後總數: ${countAfterInsert.rows[0].count}`);

  // 2. 測試舊方法（錯誤的 transaction mode）
  console.log('\n2️⃣ 測試舊方法 (transaction mode)...');
  await queryDatabase('DELETE FROM eods_for_closers');  // 預設 transaction mode

  const countAfterOldDelete = await pool.query('SELECT COUNT(*) FROM eods_for_closers');
  console.log(`   ${countAfterOldDelete.rows[0].count === '0' ? '✅' : '❌'} 刪除後總數: ${countAfterOldDelete.rows[0].count}`);

  // 3. 重新插入測試資料
  if (countAfterOldDelete.rows[0].count !== '0') {
    console.log('\n3️⃣ 舊方法失敗，重新插入測試資料...');
    await pool.query(`
      INSERT INTO eods_for_closers (student_email, student_name, consultation_date, is_show)
      VALUES
        ('test3@example.com', 'Test User 3', '2025-01-03', '已上線')
    `);

    const countBeforeNewDelete = await pool.query('SELECT COUNT(*) FROM eods_for_closers');
    console.log(`   當前總數: ${countBeforeNewDelete.rows[0].count}`);
  }

  // 4. 測試新方法（正確的 session mode）
  console.log('\n4️⃣ 測試新方法 (session mode)...');
  await queryDatabase('DELETE FROM eods_for_closers', [], 'session');  // 明確使用 session mode

  const countAfterNewDelete = await pool.query('SELECT COUNT(*) FROM eods_for_closers');
  console.log(`   ${countAfterNewDelete.rows[0].count === '0' ? '✅' : '❌'} 刪除後總數: ${countAfterNewDelete.rows[0].count}`);

  // 5. 結論
  console.log('\n📊 測試結論:');
  console.log(`   舊方法 (transaction): ${countAfterOldDelete.rows[0].count === '0' ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`   新方法 (session): ${countAfterNewDelete.rows[0].count === '0' ? '✅ 成功' : '❌ 失敗'}`);

  await pool.end();
}

testClearTable().catch(console.error);

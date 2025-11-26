/**
 * 驗證 is_showed 欄位是否成功新增
 */
import { createPool } from '../server/services/pg-client';

async function verifyColumn() {
  const pool = createPool();

  try {
    console.log('🔍 檢查 trial_class_attendance 表的 is_showed 欄位...');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'trial_class_attendance'
      AND column_name = 'is_showed'
    `);

    if (result.rows.length === 0) {
      console.log('❌ is_showed 欄位不存在');
      process.exit(1);
    }

    console.log('✅ is_showed 欄位已成功新增！');
    console.log('欄位資訊:');
    console.log(JSON.stringify(result.rows[0], null, 2));

    // 測試插入一筆資料
    console.log('\n🧪 測試插入資料...');
    const testResult = await pool.query(`
      SELECT id, student_name, is_showed
      FROM trial_class_attendance
      LIMIT 5
    `);

    console.log(`📊 前 5 筆資料 (包含 is_showed 欄位):`);
    console.table(testResult.rows);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 驗證失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyColumn();

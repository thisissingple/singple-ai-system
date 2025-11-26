/**
 * 測試體驗課表單提交（包含 is_showed 欄位）
 */
import { createPool } from '../server/services/pg-client';

async function testFormSubmission() {
  const pool = createPool();

  try {
    console.log('🧪 測試表單提交（包含 is_showed 欄位）...\n');

    // 1. 模擬表單提交資料
    const testData = {
      studentName: '測試學員_Is_Showed',
      studentEmail: 'test-is-showed@example.com',
      classDate: '2025-11-20',
      teacherName: 'Karen',
      isShowed: 'true',  // 字串形式（來自 select）
      notes: '測試課程記錄',
      noConversionReason: ''
    };

    console.log('提交資料:');
    console.log(JSON.stringify(testData, null, 2));

    // 2. 直接調用 API
    const response = await fetch('http://localhost:5001/api/forms/public/7721acc7-5e6a-4ded-b70f-3db4aff0f840/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: testData })
    });

    const result = await response.json();

    if (!result.success) {
      console.log('\n❌ 提交失敗:', result.error);
      process.exit(1);
    }

    console.log('\n✅ 提交成功！Record ID:', result.id);

    // 3. 查詢剛剛插入的資料
    console.log('\n🔍 查詢插入的資料...');
    const queryResult = await pool.query(`
      SELECT
        id,
        student_name,
        student_email,
        class_date,
        teacher_name,
        is_showed,
        class_transcript,
        no_conversion_reason,
        created_at
      FROM trial_class_attendance
      WHERE student_email = 'test-is-showed@example.com'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (queryResult.rows.length === 0) {
      console.log('❌ 找不到插入的資料');
      process.exit(1);
    }

    const record = queryResult.rows[0];
    console.log('\n插入的記錄:');
    console.table(record);

    // 4. 驗證 is_showed 欄位
    if (record.is_showed === true) {
      console.log('\n✅ is_showed 欄位正確儲存為 boolean true');
    } else if (record.is_showed === false) {
      console.log('\n✅ is_showed 欄位正確儲存為 boolean false');
    } else {
      console.log('\n⚠️  is_showed 欄位值異常:', record.is_showed, typeof record.is_showed);
    }

    // 5. 清理測試資料
    console.log('\n🧹 清理測試資料...');
    await pool.query(`
      DELETE FROM trial_class_attendance
      WHERE student_email = 'test-is-showed@example.com'
    `);
    console.log('✅ 測試資料已清理');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testFormSubmission();

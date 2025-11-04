/**
 * Test /api/teaching-quality/student-records API response
 */

async function testStudentRecordsAPI() {
  console.log('\n=== 測試 /api/teaching-quality/student-records API ===\n');

  try {
    const response = await fetch('http://localhost:5001/api/teaching-quality/student-records');

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error('API returned success: false');
    }

    console.log(`✅ API 請求成功\n`);
    console.log(`📊 總共 ${data.data.records.length} 筆記錄\n`);

    // Check first 5 records
    console.log('🔍 前 5 筆記錄的 attendance_id:\n');
    data.data.records.slice(0, 5).forEach((record: any, idx: number) => {
      console.log(`${idx + 1}. ${record.student_name}`);
      console.log(`   attendance_id: ${record.attendance_id}`);
      console.log(`   類型: ${typeof record.attendance_id}`);
      console.log(`   是否為 UUID: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(record.attendance_id)}`);
      console.log('');
    });

    // Find records with invalid UUIDs
    const invalidRecords = data.data.records.filter((r: any) =>
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.attendance_id)
    );

    if (invalidRecords.length > 0) {
      console.log(`❌ 找到 ${invalidRecords.length} 筆無效的 attendance_id:\n`);
      invalidRecords.slice(0, 10).forEach((r: any) => {
        console.log(`  - ${r.student_name}: ${r.attendance_id}`);
      });
    } else {
      console.log('✅ 所有 attendance_id 都是有效的 UUID');
    }

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  }

  console.log('\n✅ 測試完成\n');
}

testStudentRecordsAPI();

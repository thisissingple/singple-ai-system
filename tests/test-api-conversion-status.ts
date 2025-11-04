/**
 * Test the updated API to verify conversion status is calculated correctly
 */

async function testAPI() {
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

    // Find 鄭吉宏's records
    const zhengRecords = data.data.records.filter((r: any) => r.student_name === '鄭吉宏');

    console.log(`🔍 鄭吉宏的記錄 (${zhengRecords.length} 筆):\n`);

    zhengRecords.forEach((record: any, idx: number) => {
      console.log(`${idx + 1}. 日期: ${record.class_date.split('T')[0]}`);
      console.log(`   老師: ${record.teacher_name}`);
      console.log(`   方案: ${record.package_name || '無'}`);
      console.log(`   剩餘堂數: ${record.remaining_classes || '無'}`);
      console.log(`   轉換狀態: ${record.conversion_status || '無'}`);
      console.log('');
    });

    // Check if all records show "已轉高"
    const allConverted = zhengRecords.every((r: any) => r.conversion_status === '已轉高');

    if (allConverted) {
      console.log('✅ 成功! 所有鄭吉宏的記錄都顯示「已轉高」');
    } else {
      console.log('❌ 失敗! 還有記錄沒有正確顯示「已轉高」');
      console.log('\n狀態分佈:');
      const statusCounts = zhengRecords.reduce((acc: any, r: any) => {
        const status = r.conversion_status || '無';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count} 筆`);
      });
    }

    // Also check a few other students
    console.log('\n\n📋 其他學生的轉換狀態範例:\n');
    const sampleRecords = data.data.records.slice(0, 10);
    sampleRecords.forEach((record: any) => {
      console.log(`${record.student_name} - ${record.conversion_status || '無'}`);
    });

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  }

  console.log('\n✅ 測試完成\n');
}

testAPI();

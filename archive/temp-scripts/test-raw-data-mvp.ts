/**
 * 測試 Raw Data MVP 功能
 * 驗證跨表查詢和 AI 對話是否正常運作
 */

const baseUrl = 'http://localhost:5001';

async function testRawDataMVP() {
  console.log('🧪 開始測試 Raw Data MVP\n');
  console.log('='.repeat(60) + '\n');

  // 測試 1：MVP 總報表 API
  console.log('📊 測試 1：MVP 總報表 API');
  try {
    const response = await fetch(`${baseUrl}/api/reports/raw-data-mvp?period=monthly`);
    const result = await response.json();

    if (result.success) {
      console.log('✅ 成功！');
      console.log('\nKPI 數據：');
      console.log(`  轉換率：${result.data.kpis.conversionRate.toFixed(1)}%`);
      console.log(`  體驗課完成率：${result.data.kpis.trialCompletionRate.toFixed(1)}%`);
      console.log(`  總營收：NT$ ${result.data.kpis.totalRevenue.toLocaleString()}`);
      console.log(`  總體驗課數：${result.data.kpis.totalTrials}`);

      console.log('\nTOP 3 教師：');
      result.data.teacherStats.forEach((t: any, i: number) => {
        console.log(`  ${i + 1}. ${t.name} - ${t.classCount} 堂課，${t.studentCount} 位學生`);
      });

      console.log('\n學生跟進狀態：');
      console.log(`  總計：${result.data.pipeline.total}`);
      console.log(`  待聯繫：${result.data.pipeline.pending}`);
      console.log(`  已聯繫：${result.data.pipeline.contacted}`);
      console.log(`  已成交：${result.data.pipeline.completed}`);
    } else {
      console.log('❌ 失敗：', result.error);
    }
  } catch (error: any) {
    console.log('❌ 錯誤：', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 測試 2：跨表查詢 API
  console.log('🔗 測試 2：跨表查詢 - Vicky 老師本月升高階學生');
  try {
    const response = await fetch(`${baseUrl}/api/raw-data/cross-table-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teacher: 'Vicky',
        status: '已轉高',
        month: new Date().toISOString().slice(0, 7) // 本月
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log(`✅ 成功！找到 ${result.count} 位學生\n`);

      if (result.data.length > 0) {
        result.data.slice(0, 5).forEach((student: any) => {
          console.log(`  • ${student.studentName}`);
          console.log(`    方案：${student.package || '未知'}`);
          console.log(`    金額：NT$ ${student.amount?.toLocaleString() || 0}`);
          console.log(`    狀態：${student.status || '未知'}`);
          console.log('');
        });

        if (result.data.length > 5) {
          console.log(`  ... 還有 ${result.data.length - 5} 位學生\n`);
        }

        const totalAmount = result.data.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
        console.log(`  總金額：NT$ ${totalAmount.toLocaleString()}`);
      } else {
        console.log('  (沒有符合條件的學生)');
      }
    } else {
      console.log('❌ 失敗：', result.error);
    }
  } catch (error: any) {
    console.log('❌ 錯誤：', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 測試 3：AI 對話 - 跨表問題
  console.log('🤖 測試 3：AI 對話 - Vicky 老師本月升高階學生');
  try {
    const response = await fetch(`${baseUrl}/api/ai/chat-raw-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: 'Vicky 老師本月有多少升高階的學生？'
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ 成功！');
      console.log('\nAI 回答：');
      console.log(result.data.answer);
      console.log('\n查詢類型：', result.data.queryType);
      console.log('使用的資料來源數：', result.data.dataUsed);
    } else {
      console.log('❌ 失敗：', result.error);
    }
  } catch (error: any) {
    console.log('❌ 錯誤：', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 測試 4：AI 對話 - 簡單問題
  console.log('🤖 測試 4：AI 對話 - 簡單 KPI 問題');
  try {
    const response = await fetch(`${baseUrl}/api/ai/chat-raw-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: '目前的轉換率和營收是多少？'
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ 成功！');
      console.log('\nAI 回答：');
      console.log(result.data.answer);
    } else {
      console.log('❌ 失敗：', result.error);
    }
  } catch (error: any) {
    console.log('❌ 錯誤：', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');
  console.log('🎉 測試完成！\n');
}

// 執行測試
testRawDataMVP().catch(console.error);

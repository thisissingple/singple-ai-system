/**
 * 測試 AI 自動確認功能
 * 測試當使用者輸入模糊詞彙時，AI 是否會自動提供選項讓使用者選擇
 */

async function testAIAutoConfirm() {
  const baseUrl = 'http://localhost:5001';

  console.log('🧪 開始測試 AI 自動確認功能\n');

  // 測試案例 1：「高階課程」不在實際資料中
  console.log('📝 測試案例 1：模糊詞彙「高階課程」');
  console.log('   預期：AI 應該詢問使用者是指「基礎課程包」還是「進階課程包」\n');

  try {
    const response = await fetch(`${baseUrl}/api/kpi/parse-definition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kpiName: 'conversionRate',
        definition: '高階課程轉換率',
      }),
    });

    if (!response.ok) {
      console.error('❌ API 請求失敗:', response.status);
      return;
    }

    const result = await response.json();
    console.log('✅ AI 解析結果：\n');
    console.log(JSON.stringify(result, null, 2));

    // 驗證是否有 needsConfirmation
    if (result.parsed?.needsConfirmation && result.parsed.needsConfirmation.length > 0) {
      console.log('\n✅ 成功！AI 檢測到模糊詞彙並提供選項：');
      result.parsed.needsConfirmation.forEach((item: any) => {
        console.log(`\n   問題：${item.question}`);
        console.log(`   使用者輸入：${item.userInput}`);
        console.log(`   提供的選項：`);
        item.options?.forEach((opt: string) => {
          console.log(`   - ${opt}`);
        });
      });
    } else {
      console.log('\n⚠️  AI 沒有提供確認選項（可能直接猜測了）');
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 測試案例 2：「李老師」在實際資料中
  console.log('📝 測試案例 2：明確詞彙「李老師」');
  console.log('   預期：AI 應該直接理解，不需要確認\n');

  try {
    const response = await fetch(`${baseUrl}/api/kpi/parse-definition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kpiName: 'conversionRate',
        definition: '李老師的學生轉換率',
      }),
    });

    if (!response.ok) {
      console.error('❌ API 請求失敗:', response.status);
      return;
    }

    const result = await response.json();
    console.log('✅ AI 解析結果：\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.parsed?.needsConfirmation && result.parsed.needsConfirmation.length > 0) {
      console.log('\n⚠️  AI 仍然要求確認（可能詞彙不夠明確）');
    } else {
      console.log('\n✅ 成功！AI 直接理解，無需確認');
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // 測試案例 3：「A老師」不在實際資料中
  console.log('📝 測試案例 3：模糊詞彙「A老師」');
  console.log('   預期：AI 應該詢問使用者是指哪位老師\n');

  try {
    const response = await fetch(`${baseUrl}/api/kpi/parse-definition`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        kpiName: 'conversionRate',
        definition: 'A老師的學生轉換率',
      }),
    });

    if (!response.ok) {
      console.error('❌ API 請求失敗:', response.status);
      return;
    }

    const result = await response.json();
    console.log('✅ AI 解析結果：\n');
    console.log(JSON.stringify(result, null, 2));

    if (result.parsed?.needsConfirmation && result.parsed.needsConfirmation.length > 0) {
      console.log('\n✅ 成功！AI 檢測到模糊詞彙並提供選項：');
      result.parsed.needsConfirmation.forEach((item: any) => {
        console.log(`\n   問題：${item.question}`);
        console.log(`   使用者輸入：${item.userInput}`);
        console.log(`   提供的選項：`);
        item.options?.forEach((opt: string) => {
          console.log(`   - ${opt}`);
        });
      });
    } else {
      console.log('\n⚠️  AI 沒有提供確認選項');
    }

  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }

  console.log('\n🎉 測試完成！\n');
}

// 執行測試
testAIAutoConfirm().catch(console.error);

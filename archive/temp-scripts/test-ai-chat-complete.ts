/**
 * 測試 AI Chat API（完整流程）
 * 用途：驗證 AI 對話功能是否正常運作
 */

async function testAIChatAPI() {
  const baseURL = 'http://localhost:5000';

  console.log('🧪 測試 AI Chat API');
  console.log('=' .repeat(50));

  try {
    // 測試問題
    const questions = [
      '本週哪個老師成交額最高？',
      '本月營收總計多少？',
      '哪位諮詢師成交率最高？',
    ];

    for (const question of questions) {
      console.log(`\n📤 問題: ${question}`);

      const response = await fetch(`${baseURL}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          history: [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`❌ API 錯誤 (${response.status}):`, error);
        continue;
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ API 回應成功');
        console.log('📊 回答:');
        console.log(result.data.answer);
        console.log(`\n信心分數: ${(result.data.confidence * 100).toFixed(0)}%`);

        if (result.data.data) {
          console.log('\n📈 相關資料:');
          console.log(JSON.stringify(result.data.data, null, 2));
        }
      } else {
        console.error('❌ API 回應失敗:', result);
      }

      console.log('\n' + '-'.repeat(50));
    }

    console.log('\n🎉 測試完成！');

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
    process.exit(1);
  }
}

testAIChatAPI();

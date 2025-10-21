/**
 * Simple AI Chat API Test
 */

async function testAIChatAPI() {
  try {
    console.log('🧪 測試 AI Chat API...\n');

    const response = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: '這週哪個老師成交額最高？',
        history: [],
      }),
    });

    const result = await response.json();

    console.log('📊 API 回應狀態:', response.status);
    console.log('✅ 成功:', result.success);

    if (result.success) {
      console.log('\n💬 AI 回答:');
      console.log(result.data?.answer || '無回答');

      if (result.data?.data) {
        console.log('\n📈 相關數據:');
        console.log(JSON.stringify(result.data.data, null, 2));
      }

      console.log('\n🎯 信心度:', result.data?.confidence || 'N/A');
    } else {
      console.error('❌ 錯誤:', result.error);
    }
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
}

testAIChatAPI();

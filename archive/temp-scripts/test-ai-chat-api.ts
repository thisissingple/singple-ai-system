/**
 * 測試 AI Chat API
 */

async function testAIChatAPI() {
  console.log('='.repeat(60));
  console.log('🧪 測試 AI Chat API');
  console.log('='.repeat(60));
  console.log('');

  try {
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    console.log('✅ API 回應成功');
    console.log('');
    console.log('📊 回應資料:');
    console.log(JSON.stringify(result, null, 2));
    console.log('');
    console.log('💬 AI 回答:');
    console.log(result.data?.answer || '無回答');
    console.log('');
    console.log('='.repeat(60));
    console.log('✅ 測試完成');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('');
    console.error('❌ 測試失敗:', error);
    console.error('');
  }
}

testAIChatAPI();

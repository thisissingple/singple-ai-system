/**
 * Test Consultation Quality Chat API
 */

async function testChatAPI() {
  const API_URL = 'http://localhost:5002/api/consultation-quality/chat';
  const eodId = 'd36edc72-e1b4-4500-beb3-4b90b3af012e';

  console.log('🧪 Testing Chat API...\n');

  try {
    // Test payload
    const payload = {
      messages: [
        { role: 'user', content: '這位學員的核心痛點是什麼？' }
      ],
      eodId,
      consultationTranscript: '測試逐字稿內容',
      aiAnalysis: '測試分析內容'
    };

    console.log('📤 Sending request to:', API_URL);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:');
    response.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('\n❌ Error Response:', errorText);
      return;
    }

    // Check if it's a streaming response
    const contentType = response.headers.get('content-type');
    console.log('\n✅ Response Content-Type:', contentType);

    if (contentType?.includes('text/plain') || contentType?.includes('text/event-stream')) {
      console.log('\n✅ Streaming response detected!');
      console.log('📥 Streaming data (first 500 chars):');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunk = '';

      if (reader) {
        const { value, done } = await reader.read();
        if (value) {
          chunk = decoder.decode(value, { stream: true });
          console.log(chunk.substring(0, 500));
        }
        reader.releaseLock();
      }

      console.log('\n✅ Chat API is working correctly!');
    } else {
      const text = await response.text();
      console.log('\n📥 Response Body:', text.substring(0, 500));
    }

  } catch (error: any) {
    console.error('\n❌ Test Failed:', error.message);
    if (error.cause) {
      console.error('   Cause:', error.cause);
    }
  }
}

testChatAPI();

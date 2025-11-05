/**
 * Test OpenAI API key validity
 */

import OpenAI from 'openai';

async function testOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  console.log('🔧 Testing OpenAI API key...\n');
  console.log(`API Key (first 20 chars): ${apiKey.substring(0, 20)}...`);
  console.log(`API Key length: ${apiKey.length} characters\n`);

  const openai = new OpenAI({ apiKey });

  try {
    // Test 1: List models (simple API call)
    console.log('Test 1: Listing available models...');
    const models = await openai.models.list();
    console.log('✅ API key is valid!');
    console.log(`   Found ${models.data.length} models\n`);

    // Test 2: Simple chat completion
    console.log('Test 2: Testing chat completion...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say "Hello, API test successful!" in Traditional Chinese.' },
      ],
      max_tokens: 50,
    });

    console.log('✅ Chat completion successful!');
    console.log(`   Response: ${completion.choices[0].message.content}\n`);

    console.log('🎉 All tests passed! OpenAI API key is working correctly.');
    return true;
  } catch (error: any) {
    console.log('❌ API key test failed!');
    console.log('   Error:', error.message);
    console.log('   Status:', error.status);
    console.log('   Type:', error.type);

    if (error.status === 401) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check your API key at https://platform.openai.com/account/api-keys');
      console.log('   2. Ensure the key has not been revoked or expired');
      console.log('   3. Verify you have usage limits and billing set up');
    }

    return false;
  }
}

testOpenAIKey().then(success => {
  process.exit(success ? 0 : 1);
});

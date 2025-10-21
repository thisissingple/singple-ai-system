/**
 * Test OpenAI Connection
 * Quick test to verify OpenAI API key is working
 */

import OpenAI from 'openai';

async function testOpenAIConnection() {
  console.log('🔍 Testing OpenAI API connection...\n');

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    process.exit(1);
  }

  console.log(`✅ API Key found: ${apiKey.substring(0, 20)}...`);

  try {
    const client = new OpenAI({ apiKey });

    console.log('\n📡 Sending test request to OpenAI (gpt-4o)...');

    const completion = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond in Traditional Chinese.'
        },
        {
          role: 'user',
          content: '請用一句話介紹你自己。'
        }
      ],
      max_tokens: 100
    });

    const response = completion.choices[0].message.content;

    console.log('\n✅ OpenAI API 連接成功！\n');
    console.log('📝 回應內容：');
    console.log(response);
    console.log('\n📊 使用統計：');
    console.log(`   - 模型: ${completion.model}`);
    console.log(`   - Prompt Tokens: ${completion.usage?.prompt_tokens}`);
    console.log(`   - Completion Tokens: ${completion.usage?.completion_tokens}`);
    console.log(`   - Total Tokens: ${completion.usage?.total_tokens}`);

    // Calculate cost for gpt-4o
    const inputCost = (completion.usage?.prompt_tokens || 0) / 1_000_000 * 2.50;
    const outputCost = (completion.usage?.completion_tokens || 0) / 1_000_000 * 10.00;
    const totalCost = inputCost + outputCost;

    console.log(`\n💰 成本估算：`);
    console.log(`   - Input Cost: $${inputCost.toFixed(6)}`);
    console.log(`   - Output Cost: $${outputCost.toFixed(6)}`);
    console.log(`   - Total Cost: $${totalCost.toFixed(6)} (~NT$${(totalCost * 32).toFixed(2)})`);

    console.log('\n🎉 測試完成！OpenAI API 可以正常使用。');

  } catch (error: any) {
    console.error('\n❌ OpenAI API 連接失敗：');
    console.error(error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testOpenAIConnection();

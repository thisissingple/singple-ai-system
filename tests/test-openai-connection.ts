/**
 * 測試 OpenAI API 連線
 */

import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 測試 OpenAI API 連線...\n');

// 檢查環境變數
console.log('📋 環境變數檢查:');
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.log('❌ OPENAI_API_KEY 未設定');
  process.exit(1);
}
console.log(`✅ OPENAI_API_KEY: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);

// 檢查是否有其他相關環境變數
const baseUrl = process.env.OPENAI_BASE_URL || process.env.OPENAI_API_BASE;
if (baseUrl) {
  console.log(`⚠️  發現 BASE URL 設定: ${baseUrl}`);
}

console.log('\n🧪 嘗試建立 OpenAI client...');

try {
  const client = new OpenAI({ apiKey });
  console.log('✅ OpenAI client 建立成功');

  console.log('\n🚀 測試簡單的 API 呼叫...');
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: '測試，請回答 OK' }],
    max_tokens: 10,
  });

  console.log('✅ API 呼叫成功！');
  console.log(`   回應: ${response.choices[0].message.content}`);

} catch (error: any) {
  console.error('❌ 錯誤:', error.message);
  console.error('   詳細資訊:', error);

  if (error.message.includes('ENOTFOUND')) {
    console.error('\n💡 這是 DNS 解析錯誤！');
    console.error('   可能原因:');
    console.error('   1. OPENAI_BASE_URL 環境變數設定錯誤');
    console.error('   2. 網路連線問題');
    console.error('   3. OpenAI SDK 版本問題');
  }
}

console.log('\n✨ 測試完成！');

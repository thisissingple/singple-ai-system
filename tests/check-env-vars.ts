/**
 * 檢查 Zeabur 環境變數設定
 */

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 檢查環境變數設定...\n');

const requiredVars = [
  'OPENAI_API_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABASE_URL',
  'SESSION_SECRET',
];

const optionalVars = [
  'ANTHROPIC_API_KEY',
  'SESSION_DB_URL',
  'SUPABASE_DB_URL',
];

console.log('📋 必要環境變數:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`❌ ${varName}: 未設定`);
  } else {
    // 顯示前10個字元和最後5個字元
    const masked = value.length > 15
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value.substring(0, 10) + '...';
    console.log(`✅ ${varName}: ${masked}`);
  }
});

console.log('\n📋 選用環境變數:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`⚪ ${varName}: 未設定`);
  } else {
    const masked = value.length > 15
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}`
      : value.substring(0, 10) + '...';
    console.log(`✅ ${varName}: ${masked}`);
  }
});

// 檢查 OPENAI_API_KEY 格式
const openaiKey = process.env.OPENAI_API_KEY;
if (openaiKey) {
  console.log('\n🔑 OpenAI API Key 檢查:');
  if (openaiKey.startsWith('sk-')) {
    console.log('✅ 格式正確（以 sk- 開頭）');
  } else {
    console.log('❌ 格式錯誤（應該以 sk- 開頭）');
  }
  console.log(`   長度: ${openaiKey.length} 字元`);
}

// 檢查 SUPABASE_URL 格式
const supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl) {
  console.log('\n🔗 Supabase URL 檢查:');
  if (supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')) {
    console.log('✅ 格式正確');
    console.log(`   URL: ${supabaseUrl}`);
  } else {
    console.log('❌ 格式可能錯誤');
    console.log(`   值: ${supabaseUrl}`);
  }
}

console.log('\n✨ 檢查完成！');

/**
 * 環境變數檢查腳本
 */
import dotenv from 'dotenv';

// 載入環境變數
dotenv.config({ override: true });

console.log('🔍 檢查環境變數...\n');

console.log('📊 Supabase 設定：');
console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓ 已設定' : '✗ 未設定'}`);
console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓ 已設定' : '✗ 未設定'}`);

console.log('\n📊 Google Sheets 設定：');
console.log(`  GOOGLE_SHEETS_CREDENTIALS: ${process.env.GOOGLE_SHEETS_CREDENTIALS ? '✓ 已設定' : '✗ 未設定'}`);

console.log('\n📊 其他設定：');
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
console.log(`  PORT: ${process.env.PORT || 'NOT SET'}`);
console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? '✓ 已設定' : '✗ 未設定'}`);

// 檢查 .env 檔案
import { readFileSync } from 'fs';
console.log('\n📁 .env 檔案內容（部分）：');
try {
  const envContent = readFileSync('.env', 'utf-8');
  const lines = envContent.split('\n').filter(line =>
    line.includes('SUPABASE') || line.includes('GOOGLE_SHEETS')
  );
  lines.forEach(line => {
    if (line.includes('KEY') || line.includes('CREDENTIALS')) {
      const [key] = line.split('=');
      console.log(`  ${key}=***`);
    } else {
      console.log(`  ${line}`);
    }
  });
} catch (error) {
  console.log('  無法讀取 .env 檔案');
}

// 測試 Supabase client
console.log('\n🧪 測試 Supabase Client：');
import { getSupabaseClient, isSupabaseAvailable } from '../server/services/supabase-client';

console.log(`  isAvailable: ${isSupabaseAvailable()}`);
const client = getSupabaseClient();
console.log(`  client: ${client ? '✓ 已初始化' : '✗ 未初始化'}`);

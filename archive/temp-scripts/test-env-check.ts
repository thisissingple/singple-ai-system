/**
 * 測試環境變數載入
 */

import dotenv from 'dotenv';

// 載入 .env
const result = dotenv.config();

console.log('=== Dotenv Config Result ===');
console.log('Parsed:', result.parsed ? Object.keys(result.parsed) : 'none');
console.log('Error:', result.error || 'none');
console.log('');

console.log('=== Environment Variables ===');
console.log('NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('PORT:', process.env.PORT || 'not set');
console.log('SKIP_AUTH:', process.env.SKIP_AUTH || 'not set');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `${process.env.ANTHROPIC_API_KEY.substring(0, 20)}...` : 'not set');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'set' : 'not set');
console.log('');

console.log('=== All ENV Keys ===');
const envKeys = Object.keys(process.env).filter(key =>
  key.includes('ANTHROPIC') ||
  key.includes('SUPABASE') ||
  key.includes('DATABASE') ||
  key.includes('NODE_') ||
  key.includes('PORT') ||
  key.includes('SKIP')
);
console.log(envKeys.join('\n'));

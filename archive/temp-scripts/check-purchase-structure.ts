import { getSupabaseClient } from './server/services/supabase-client.js';

async function check() {
  const client = getSupabaseClient();
  const { data } = await client.from('trial_class_purchases').select('*').limit(2);

  console.log('\n=== 第一筆購買記錄 ===');
  console.log('欄位:', Object.keys(data[0]));
  console.log('\n目前狀態（自動計算）:', data[0]['目前狀態（自動計算）']);
  console.log('姓名:', data[0]['姓名']);
  console.log('email:', data[0]['email']);
  console.log('\n完整資料:');
  console.log(JSON.stringify(data[0], null, 2));
}

check();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  console.log('📋 檢查 Supabase users 表結構...\n');

  // 嘗試查詢 users 表
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ 查詢 users 表錯誤:', error.message);
    console.log('\n可能原因：');
    console.log('1. users 表不存在');
    console.log('2. 權限設定問題');
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ users 表存在');
    console.log('\n📊 表結構（從第一筆資料推斷）：');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\n欄位列表：', Object.keys(data[0]));
  } else {
    console.log('⚠️  users 表存在但沒有資料');
  }
}

checkUsersTable().catch(console.error);

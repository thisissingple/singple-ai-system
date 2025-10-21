import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listTables() {
  console.log('📋 檢查 Supabase 現有的表...\n');

  // 嘗試幾個可能的表
  const possibleTables = [
    'users',
    'teachers',
    'trial_class_attendance',
    'raw_data',
    'purchases',
    'students'
  ];

  for (const table of possibleTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (!error) {
      console.log(`✅ ${table} - 存在`);
      if (data && data.length > 0) {
        console.log(`   欄位: ${Object.keys(data[0]).join(', ')}`);
      }
    } else {
      console.log(`❌ ${table} - 不存在或無權限`);
    }
  }
}

listTables().catch(console.error);

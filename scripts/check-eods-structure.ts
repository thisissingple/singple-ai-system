/**
 * 檢查 eods_for_closers 表結構
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStructure() {
  // 取得一筆範例資料
  const { data, error } = await supabase
    .from('eods_for_closers')
    .select('*')
    .limit(1);

  if (error) {
    console.error('錯誤:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('📋 eods_for_closers 表欄位：');
    console.log(Object.keys(data[0]).join('\n'));
    console.log('\n📝 範例資料：');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('表中無資料');
  }
}

checkStructure();

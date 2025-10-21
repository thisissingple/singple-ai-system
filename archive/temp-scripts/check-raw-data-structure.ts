import { getSupabaseClient } from './server/services/supabase-client';

const supabase = getSupabaseClient();

async function checkStructure() {
  console.log('📊 檢查 eods_for_closers raw_data 結構\n');
  
  const { data, error } = await supabase
    .from('eods_for_closers')
    .select('student_email, raw_data')
    .not('raw_data', 'is', null)
    .neq('raw_data', '{}')
    .limit(5);

  if (error) {
    console.error('❌ 錯誤:', error);
    return;
  }

  console.log(`✅ 找到 ${data?.length || 0} 筆資料\n`);

  data?.forEach((row, index) => {
    console.log(`\n記錄 ${index + 1}:`);
    console.log('Email:', row.student_email);
    console.log('Raw Data Keys:', Object.keys(row.raw_data || {}));
    console.log('Raw Data:', JSON.stringify(row.raw_data, null, 2));
  });
}

checkStructure();

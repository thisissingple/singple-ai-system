import { getSupabaseClient } from '../server/services/supabase-client';

async function getFirstWorksheet() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase 未連線');
    return;
  }

  const { data, error } = await supabase
    .from('worksheets')
    .select('id, worksheet_name')
    .limit(1);

  if (error) {
    console.error('❌ 查詢失敗:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ 找到 Worksheet:');
    console.log(`   ID: ${data[0].id}`);
    console.log(`   Name: ${data[0].worksheet_name}`);
  } else {
    console.log('⚠️  資料庫中沒有 worksheet 記錄');
    console.log('   建議：先執行簡化版測試，不依賴真實 worksheet');
  }
}

getFirstWorksheet().catch(console.error);

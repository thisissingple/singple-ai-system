/**
 * 嘗試透過 Supabase RPC 重新載入 PostgREST schema cache
 */

import { getSupabaseClient } from '../server/services/supabase-client.js';

async function reloadSchemaCache() {
  console.log('🔄 嘗試重新載入 PostgREST schema cache...\n');

  const client = getSupabaseClient();

  // 方法 1: 使用 RPC 執行 NOTIFY
  console.log('方法 1: 使用 pg_notify...');
  const { data: notifyData, error: notifyError } = await client.rpc('pg_notify', {
    channel: 'pgrst',
    payload: 'reload schema'
  });

  if (notifyError) {
    console.log('❌ pg_notify 失敗:', notifyError.message);
  } else {
    console.log('✓ pg_notify 成功');
  }

  // 等待幾秒
  console.log('\n⏳ 等待 5 秒讓 cache 更新...\n');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 驗證是否修復
  console.log('🔍 驗證修復狀態...\n');

  const { data, error } = await client
    .from('trial_class_purchase')
    .select('age, current_status')
    .limit(1);

  if (error) {
    console.log('❌ 仍然失敗:', error.message);
    console.log('\n📋 建議手動操作:');
    console.log('1. 登入 Supabase Dashboard');
    console.log('2. 左側選單 → SQL Editor');
    console.log('3. 執行: NOTIFY pgrst, \'reload schema\';');
    console.log('4. 或暫停後恢復 Project (Settings → General → Pause/Resume)');
  } else {
    console.log('✅ 成功！Schema cache 已更新');
    console.log('測試資料:', data);
  }
}

reloadSchemaCache().catch(console.error);

#!/usr/bin/env tsx
/**
 * 清理 source_worksheet_id 為 null 的舊資料
 */

import { getSupabaseClient } from '../server/services/supabase-client';

async function clean() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    process.exit(1);
  }

  console.log('\n🗑️  清理 eods_for_closers 中 source_worksheet_id 為 null 的資料...\n');

  // 先檢查有多少筆
  const { count: nullCount, error: countError } = await supabase
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true })
    .is('source_worksheet_id', null);

  if (countError) {
    console.error('❌ 查詢失敗:', countError);
    process.exit(1);
  }

  console.log(`📊 發現 ${nullCount} 筆 source_worksheet_id 為 null 的資料`);

  if (!nullCount || nullCount === 0) {
    console.log('✅ 沒有需要清理的資料');
    return;
  }

  // 確認刪除
  console.log(`\n⚠️  即將刪除 ${nullCount} 筆資料，請確認...`);
  console.log('按 Ctrl+C 取消，或繼續執行...\n');

  // 等待 2 秒
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 刪除
  const { error: deleteError, count: deletedCount } = await supabase
    .from('eods_for_closers')
    .delete({ count: 'exact' })
    .is('source_worksheet_id', null);

  if (deleteError) {
    console.error('❌ 刪除失敗:', deleteError);
    process.exit(1);
  }

  console.log(`✅ 成功刪除 ${deletedCount} 筆資料`);

  // 檢查剩餘資料
  const { count: remainingCount } = await supabase
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 剩餘資料筆數: ${remainingCount}`);
  console.log('\n✅ 清理完成！\n');
}

clean().catch(console.error);

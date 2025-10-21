#!/usr/bin/env tsx
/**
 * 診斷 Supabase 中的重複資料問題
 */

import { getSupabaseClient } from '../server/services/supabase-client';

async function diagnose() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase client not available');
    process.exit(1);
  }

  console.log('\n📊 診斷 eods_for_closers 資料分佈...\n');

  // 1. 檢查總資料數
  const { count: totalCount, error: countError } = await supabase
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ 查詢失敗:', countError);
    process.exit(1);
  }

  console.log(`✅ 總資料筆數: ${totalCount}`);

  // 2. 按 source_worksheet_id 分組統計
  const { data: groupData, error: groupError } = await supabase
    .from('eods_for_closers')
    .select('source_worksheet_id, synced_at');

  if (groupError) {
    console.error('❌ 查詢失敗:', groupError);
    process.exit(1);
  }

  // 統計每個 worksheet 的資料量
  const worksheetStats = new Map<string, { count: number; firstSync: Date; lastSync: Date }>();

  groupData?.forEach(row => {
    const wsId = row.source_worksheet_id;
    const syncTime = new Date(row.synced_at);

    if (!worksheetStats.has(wsId)) {
      worksheetStats.set(wsId, { count: 0, firstSync: syncTime, lastSync: syncTime });
    }

    const stats = worksheetStats.get(wsId)!;
    stats.count++;
    if (syncTime < stats.firstSync) stats.firstSync = syncTime;
    if (syncTime > stats.lastSync) stats.lastSync = syncTime;
  });

  console.log('\n📋 按 worksheet 分組統計:\n');
  for (const [wsId, stats] of worksheetStats.entries()) {
    console.log(`Worksheet ID: ${wsId}`);
    console.log(`  資料筆數: ${stats.count}`);
    console.log(`  首次同步: ${stats.firstSync.toISOString()}`);
    console.log(`  最後同步: ${stats.lastSync.toISOString()}`);
    console.log('');
  }

  // 3. 檢查 worksheets 表中有多少個對應到 eods_for_closers
  const { data: worksheets, error: wsError } = await supabase
    .from('worksheets')
    .select('id, worksheet_name, spreadsheet_id, supabase_table, is_enabled, last_sync_at')
    .eq('supabase_table', 'eods_for_closers');

  if (wsError) {
    console.error('❌ 查詢 worksheets 失敗:', wsError);
    process.exit(1);
  }

  console.log('\n📑 對應到 eods_for_closers 的 worksheets:\n');
  worksheets?.forEach(ws => {
    console.log(`ID: ${ws.id}`);
    console.log(`  名稱: ${ws.worksheet_name}`);
    console.log(`  Spreadsheet ID: ${ws.spreadsheet_id}`);
    console.log(`  啟用: ${ws.is_enabled ? 'Yes' : 'No'}`);
    console.log(`  最後同步: ${ws.last_sync_at || 'Never'}`);
    console.log('');
  });

  // 4. 建議
  console.log('\n💡 診斷建議:\n');
  if (worksheetStats.size > 1) {
    console.log(`⚠️  發現 ${worksheetStats.size} 個不同的 worksheet 同步到同一個 table`);
    console.log('   這會導致資料累積，因為每個 worksheet 只會刪除自己的資料');
    console.log('   建議：確保只有一個 worksheet 對應到 eods_for_closers');
  } else {
    console.log('✅ 只有一個 worksheet 對應到 eods_for_closers');
    console.log('   可能原因：');
    console.log('   1. 刪除邏輯沒有執行成功');
    console.log('   2. source_worksheet_id 在某些資料中不一致');
  }

  console.log('\n');
}

diagnose().catch(console.error);

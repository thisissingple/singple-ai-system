/**
 * Clean duplicate data from Supabase
 * Keeps the most recent record for each worksheet row
 */

import { getSupabaseClient } from './server/services/supabase-client';

async function cleanDuplicates() {
  console.log('🧹 清理 Supabase 重複資料\n');

  const client = getSupabaseClient();
  if (!client) {
    console.log('❌ Supabase client 不可用');
    return;
  }

  let totalDeleted = 0;

  // Clean trial_class_attendance
  console.log('1️⃣ 清理 trial_class_attendance 表...');
  const { data: attendance } = await client
    .from('trial_class_attendance')
    .select('id, source_worksheet_id, origin_row_index, created_at')
    .order('created_at', { ascending: false });

  if (attendance) {
    const rowMap = new Map<string, any[]>();
    attendance.forEach(row => {
      const key = `${row.source_worksheet_id}_${row.origin_row_index}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, []);
      }
      rowMap.get(key)!.push(row);
    });

    const toDelete: string[] = [];
    for (const [key, rows] of rowMap.entries()) {
      if (rows.length > 1) {
        // Keep the first one (most recent), delete the rest
        const [keep, ...remove] = rows;
        toDelete.push(...remove.map(r => r.id));
      }
    }

    if (toDelete.length > 0) {
      console.log(`  - 發現 ${toDelete.length} 筆重複記錄`);
      console.log(`  - 刪除中...`);

      const { error } = await client
        .from('trial_class_attendance')
        .delete()
        .in('id', toDelete);

      if (error) {
        console.error(`  ❌ 刪除失敗: ${error.message}`);
      } else {
        console.log(`  ✓ 成功刪除 ${toDelete.length} 筆重複記錄`);
        totalDeleted += toDelete.length;
      }
    } else {
      console.log(`  ✓ 沒有重複記錄`);
    }
  }
  console.log('');

  // Clean trial_class_purchase
  console.log('2️⃣ 清理 trial_class_purchase 表...');
  const { data: purchase } = await client
    .from('trial_class_purchase')
    .select('id, source_worksheet_id, origin_row_index, created_at')
    .order('created_at', { ascending: false });

  if (purchase) {
    const rowMap = new Map<string, any[]>();
    purchase.forEach(row => {
      const key = `${row.source_worksheet_id}_${row.origin_row_index}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, []);
      }
      rowMap.get(key)!.push(row);
    });

    const toDelete: string[] = [];
    for (const [key, rows] of rowMap.entries()) {
      if (rows.length > 1) {
        const [keep, ...remove] = rows;
        toDelete.push(...remove.map(r => r.id));
      }
    }

    if (toDelete.length > 0) {
      console.log(`  - 發現 ${toDelete.length} 筆重複記錄`);
      console.log(`  - 刪除中...`);

      const { error } = await client
        .from('trial_class_purchase')
        .delete()
        .in('id', toDelete);

      if (error) {
        console.error(`  ❌ 刪除失敗: ${error.message}`);
      } else {
        console.log(`  ✓ 成功刪除 ${toDelete.length} 筆重複記錄`);
        totalDeleted += toDelete.length;
      }
    } else {
      console.log(`  ✓ 沒有重複記錄`);
    }
  }
  console.log('');

  // Clean eods_for_closers
  console.log('3️⃣ 清理 eods_for_closers 表...');
  const { data: eods } = await client
    .from('eods_for_closers')
    .select('id, source_worksheet_id, origin_row_index, created_at')
    .order('created_at', { ascending: false});

  if (eods) {
    const rowMap = new Map<string, any[]>();
    eods.forEach(row => {
      const key = `${row.source_worksheet_id}_${row.origin_row_index}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, []);
      }
      rowMap.get(key)!.push(row);
    });

    const toDelete: string[] = [];
    for (const [key, rows] of rowMap.entries()) {
      if (rows.length > 1) {
        const [keep, ...remove] = rows;
        toDelete.push(...remove.map(r => r.id));
      }
    }

    if (toDelete.length > 0) {
      console.log(`  - 發現 ${toDelete.length} 筆重複記錄`);
      console.log(`  - 刪除中...`);

      const { error } = await client
        .from('eods_for_closers')
        .delete()
        .in('id', toDelete);

      if (error) {
        console.error(`  ❌ 刪除失敗: ${error.message}`);
      } else {
        console.log(`  ✓ 成功刪除 ${toDelete.length} 筆重複記錄`);
        totalDeleted += toDelete.length;
      }
    } else {
      console.log(`  ✓ 沒有重複記錄`);
    }
  }
  console.log('');

  // Final counts
  const [attCount, purCount, eodsCount] = await Promise.all([
    client.from('trial_class_attendance').select('id', { count: 'exact', head: true }),
    client.from('trial_class_purchase').select('id', { count: 'exact', head: true }),
    client.from('eods_for_closers').select('id', { count: 'exact', head: true }),
  ]);

  console.log('📊 清理後的筆數:');
  console.log(`  - trial_class_attendance: ${attCount.count}`);
  console.log(`  - trial_class_purchase: ${purCount.count}`);
  console.log(`  - eods_for_closers: ${eodsCount.count}`);
  console.log('');

  console.log(`✅ 清理完成！共刪除 ${totalDeleted} 筆重複記錄`);
}

cleanDuplicates()
  .then(() => {
    console.log('\n✓ 完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 錯誤:', error);
    process.exit(1);
  });

/**
 * Clean all data from Supabase tables
 * Use this to reset and start fresh
 */

import { getSupabaseClient } from './server/services/supabase-client';

async function cleanAllTables() {
  console.log('🗑️  清空 Supabase 所有表資料\n');

  const client = getSupabaseClient();
  if (!client) {
    console.log('❌ Supabase client 不可用');
    return;
  }

  const tables = [
    'trial_class_attendance',
    'trial_class_purchase',
    'eods_for_closers',
  ];

  for (const table of tables) {
    console.log(`正在清空 ${table}...`);

    try {
      const { error, count } = await client
        .from(table)
        .delete({ count: 'exact' })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible condition)

      if (error) {
        console.error(`❌ 清空 ${table} 失敗:`, error.message);
      } else {
        console.log(`✓ 成功清空 ${table}（刪除 ${count ?? '所有'} 筆）`);
      }
    } catch (error: any) {
      console.error(`❌ 錯誤:`, error.message);
    }
  }

  // Verify tables are empty
  console.log('\n📊 驗證清空結果:');
  for (const table of tables) {
    const { count } = await client
      .from(table)
      .select('id', { count: 'exact', head: true });

    console.log(`  - ${table}: ${count} 筆`);
  }

  console.log('\n✅ 清空完成！現在可以重新同步資料。');
}

cleanAllTables()
  .then(() => {
    console.log('\n完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n錯誤:', error);
    process.exit(1);
  });

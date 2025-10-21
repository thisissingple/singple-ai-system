import { getSupabaseClient } from './server/services/supabase-client.js';

async function deleteAllData() {
  const client = getSupabaseClient();

  console.log('🗑️  清空所有 Supabase 表格資料...\n');

  const tables = [
    'trial_class_purchase',
    'trial_class_attendance',
    'eods_for_closers',
    'users',
    'field_mappings',
    'worksheets',
    'spreadsheets',
    'worksheet_sync_logs',
    'ai_learning_queries',
    'ai_learning_query_fields'
  ];

  for (const tableName of tables) {
    console.log(`處理 ${tableName}...`);

    const { error } = await client
      .from(tableName)
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000'); // 刪除所有記錄

    if (error) {
      console.log(`  ❌ 失敗: ${error.message}`);
    } else {
      // 驗證
      const { count } = await client
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      console.log(`  ✓ 完成，剩餘: ${count} 筆`);
    }
  }

  console.log('\n✅ 清空完成');
}

deleteAllData().catch(console.error);

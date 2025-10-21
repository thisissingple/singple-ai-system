import { getSupabaseClient } from './server/services/supabase-client.js';

async function listAllTables() {
  const client = getSupabaseClient();

  console.log('📋 列出所有 Supabase 表格及資料量...\n');

  // 常見的表格名稱（從 schema.ts 推測）
  const tables = [
    'trial_class_purchase',
    'trial_class_attendance',
    'eods_for_closers',
    'users',
    'departments',
    'teachers',
    'sales',
    'worksheets',
    'spreadsheets',
    'field_mappings',
    'worksheet_sync_logs',
    'ai_learning_queries',
    'ai_learning_query_fields'
  ];

  for (const tableName of tables) {
    const { count, error } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${tableName}: 不存在或無法存取`);
    } else {
      console.log(`✓ ${tableName}: ${count} 筆資料`);

      // 如果有資料，顯示第一筆的欄位
      if (count && count > 0) {
        const { data } = await client
          .from(tableName)
          .select('*')
          .limit(1);

        if (data && data[0]) {
          const columns = Object.keys(data[0]);
          console.log(`  欄位 (${columns.length}): ${columns.slice(0, 10).join(', ')}${columns.length > 10 ? '...' : ''}`);
        }
      }
    }
  }
}

listAllTables().catch(console.error);

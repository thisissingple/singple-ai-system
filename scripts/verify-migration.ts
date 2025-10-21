import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyMigration() {
  console.log('🔍 驗證 Supabase 遷移...\n');

  const tables = [
    'users',
    'sessions',
    'roles',
    'google_oauth_tokens',
    'spreadsheets',
    'user_spreadsheets',
    'worksheets',
    'sheet_data',
    'sync_history',
    'trial_class_attendance',
    'trial_class_purchase',
    'eods_for_closers',
    'dashboard_templates',
    'custom_dashboards',
  ];

  let allSuccess = true;

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ ${table.padEnd(30)}: ERROR - ${error.message}`);
      allSuccess = false;
    } else {
      console.log(`✅ ${table.padEnd(30)}: ${count} 筆記錄`);
    }
  }

  console.log('\n' + '='.repeat(50));
  if (allSuccess) {
    console.log('✅ 所有表驗證通過！');
  } else {
    console.log('❌ 部分表驗證失敗，請檢查 migration 是否正確執行');
  }
}

verifyMigration().catch(console.error);

/**
 * 運行 Migration 037: 創建 GoHighLevel Contacts 表
 * 用途：接收 GoHighLevel webhook 資料
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// 載入環境變數
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數：');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runMigration() {
  try {
    console.log('📦 準備運行 Migration 037: 創建 GoHighLevel Contacts 表...\n');

    // 讀取 SQL 文件
    const sqlPath = join(process.cwd(), 'supabase/migrations/037_create_gohighlevel_contacts.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL 文件路徑:', sqlPath);
    console.log('📝 SQL 長度:', sql.length, '字元\n');

    console.log('⚠️  請手動在 Supabase Dashboard 執行此 migration：');
    console.log('https://supabase.com/dashboard/project/_/sql\n');
    console.log('或使用 psql 命令：');
    console.log(`psql "${process.env.SUPABASE_DB_URL}" -f supabase/migrations/037_create_gohighlevel_contacts.sql\n`);

    // 驗證表是否已存在
    console.log('🔍 驗證表結構...');
    const { data: tableData, error: tableError } = await supabase
      .from('gohighlevel_contacts')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('❌ 表尚未創建，請先執行 SQL');
      console.log('錯誤訊息:', tableError.message);
    } else {
      console.log('✅ 表 gohighlevel_contacts 已存在！');
    }

    console.log('\n🎉 Migration 037 檢查完成！');
    console.log('📋 下一步：');
    console.log('   1. 在 Supabase Dashboard 執行 SQL');
    console.log('   2. 設定 GoHighLevel Webhook URL');
    console.log('   3. 測試 webhook 接收\n');

  } catch (error) {
    console.error('❌ Migration 檢查失敗:', error);
    process.exit(1);
  }
}

// 運行 migration
runMigration();

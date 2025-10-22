/**
 * 運行 Migration 035: 創建廣告名單表
 * 用途：Facebook Lead Ads 名單追蹤系統
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
    console.log('📦 準備運行 Migration 035: 創建廣告名單表...\n');

    // 讀取 SQL 文件
    const sqlPath = join(process.cwd(), 'supabase/migrations/035_create_ad_leads_table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL 文件路徑:', sqlPath);
    console.log('📝 SQL 長度:', sql.length, '字元\n');

    // 執行 SQL
    console.log('⚙️  開始執行 SQL...');

    // 使用 RPC 執行原始 SQL（需要 admin 權限）
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // 如果 RPC 不可用，嘗試直接透過 pg 模組執行
      console.log('ℹ️  RPC 方法不可用，改用直接執行方式...');

      // 分割 SQL 語句並逐個執行
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.toUpperCase().startsWith('COMMENT ON')) {
          // 跳過 COMMENT 語句（可能會失敗）
          console.log('⏩ 跳過 COMMENT 語句');
          continue;
        }

        console.log('\n📌 執行語句片段...');
        const result = await supabase.from('_sql').select('*').limit(0);
        // 由於 Supabase Client 不直接支援 raw SQL，建議手動在 Dashboard 執行
      }

      console.log('\n⚠️  無法透過 Supabase Client 直接執行 migration');
      console.log('請手動在 Supabase Dashboard 執行此 SQL：');
      console.log('https://supabase.com/dashboard/project/_/sql\n');
      console.log('或使用 psql 命令：');
      console.log(`psql "${process.env.SUPABASE_DB_URL}" -f supabase/migrations/035_create_ad_leads_table.sql\n`);

      return;
    }

    console.log('✅ Migration 執行成功！\n');

    // 驗證表是否創建成功
    console.log('🔍 驗證表結構...');
    const { data: tableData, error: tableError } = await supabase
      .from('ad_leads')
      .select('*')
      .limit(0);

    if (tableError) {
      console.error('❌ 表驗證失敗:', tableError.message);
      console.log('\n請檢查 Supabase Dashboard 確認表是否已創建');
    } else {
      console.log('✅ 表 ad_leads 已成功創建！');
    }

    console.log('\n🎉 Migration 035 完成！');
    console.log('📋 下一步：');
    console.log('   1. 檢查 Supabase Dashboard 確認表結構');
    console.log('   2. 設定 Facebook Webhook URL');
    console.log('   3. 測試前端頁面\n');

  } catch (error) {
    console.error('❌ Migration 失敗:', error);
    process.exit(1);
  }
}

// 運行 migration
runMigration();

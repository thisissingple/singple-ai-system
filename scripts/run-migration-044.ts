/**
 * 執行 Migration 044: 建立密碼重設請求表
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM 替代 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function runMigration() {
  console.log('🚀 開始執行 Migration 044...\n');

  try {
    // 讀取 SQL 檔案
    const migrationPath = path.join(__dirname, '../supabase/migrations/044_create_password_reset_requests.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration 檔案:', migrationPath);
    console.log('📝 SQL 內容長度:', sql.length, 'bytes\n');

    // 建立 Supabase 客戶端
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 執行 SQL
    console.log('⏳ 執行 SQL...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql }).single();

    if (error) {
      // 如果沒有 exec_sql function，改用直接執行
      console.log('⚠️ exec_sql function 不存在，改用直接執行\n');

      // 使用 pg-client 直接執行整個 SQL
      const { createPool, queryDatabase } = await import('../server/services/pg-client');
      const pool = createPool();

      console.log('執行完整 SQL 腳本...');

      try {
        // 移除註解行
        const cleanedSql = sql
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n');

        await queryDatabase(cleanedSql);
        console.log('✅ Migration 執行成功！\n');
      } catch (err: any) {
        console.error('❌ 錯誤:', err.message);
        throw err;
      }
    } else {
      console.log('✅ Migration 執行成功！\n');
    }

    console.log('🎉 完成！');
    console.log('\n📋 已建立表：');
    console.log('   - password_reset_requests (密碼重設請求表)');
    console.log('\n💡 提示：');
    console.log('   - 使用者可以在登入頁面點擊「忘記密碼」提交請求');
    console.log('   - 管理員可以在後台查看並處理請求');

  } catch (error: any) {
    console.error('\n❌ Migration 執行失敗:', error);
    console.error('錯誤詳情:', error.message);
    process.exit(1);
  }
}

// 執行
runMigration()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('腳本執行失敗:', error);
    process.exit(1);
  });

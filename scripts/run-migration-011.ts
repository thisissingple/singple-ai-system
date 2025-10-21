/**
 * 執行 Migration 011: AI Field Mapping System
 * 建立 field_mappings 和 mapping_history 表
 */

import { getSupabaseClient } from '../server/services/supabase-client';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 開始執行 Migration 011: AI Field Mapping System\n');

  const client = getSupabaseClient();
  if (!client) {
    console.error('❌ Supabase client 無法初始化');
    process.exit(1);
  }

  try {
    // 讀取 migration SQL 檔案
    const migrationPath = join(__dirname, '../supabase/migrations/011_create_field_mappings.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('📄 讀取 migration 檔案成功');
    console.log(`📍 路徑: ${migrationPath}\n`);

    // 將 SQL 分割為多個語句（按照 semicolon 分割，但保留 function 定義）
    // 這裡我們直接使用 Supabase 的 RPC 來執行 SQL
    console.log('🔧 執行 SQL 語句...\n');

    // 執行整個 SQL 檔案
    // 注意：Supabase JS client 不支援直接執行 SQL，我們需要手動執行每個語句
    // 或者使用 REST API

    // 方法 1: 使用 rpc 執行 SQL（如果有設定）
    // 方法 2: 逐一執行 CREATE TABLE 等語句

    // 檢查表是否已存在
    const { data: existingTables, error: checkError } = await client
      .from('field_mappings')
      .select('id')
      .limit(1);

    if (checkError) {
      if (checkError.code === '42P01') {
        // 表不存在，需要建立
        console.log('⚠️  field_mappings 表不存在，需要透過 Supabase Dashboard 或 SQL Editor 執行 migration');
        console.log('\n📋 請執行以下步驟：');
        console.log('1. 登入 Supabase Dashboard: https://supabase.com/dashboard');
        console.log('2. 選擇您的專案');
        console.log('3. 前往 SQL Editor');
        console.log('4. 複製並執行 migration 檔案內容：');
        console.log(`   ${migrationPath}`);
        console.log('\n或使用 psql 連線執行：');
        console.log(`   psql "$SUPABASE_DB_URL" -f ${migrationPath}`);
        console.log('\n✅ 完成後，表將會自動建立');
      } else {
        console.error('❌ 檢查表時發生錯誤:', checkError);
      }
    } else {
      console.log('✅ field_mappings 表已存在，無需重複執行 migration');
    }

    // 檢查 mapping_history 表
    const { data: historyTables, error: historyError } = await client
      .from('mapping_history')
      .select('id')
      .limit(1);

    if (historyError) {
      if (historyError.code === '42P01') {
        console.log('⚠️  mapping_history 表不存在');
      } else {
        console.error('❌ 檢查 mapping_history 表時發生錯誤:', historyError);
      }
    } else {
      console.log('✅ mapping_history 表已存在');
    }

    console.log('\n🎯 Migration 狀態檢查完成');

  } catch (error) {
    console.error('❌ Migration 執行失敗:', error);
    process.exit(1);
  }
}

// 執行
runMigration();

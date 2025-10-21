#!/usr/bin/env tsx
/**
 * 遷移腳本：從 VARCHAR ID 遷移到 UUID ID
 *
 * 此腳本會：
 * 1. 檢查現有資料
 * 2. 詢問確認
 * 3. 刪除所有表（CASCADE）
 * 4. 執行新的 migration SQL
 */

import { createClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as readline from 'readline';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_DB_URL) {
  console.error('❌ 缺少環境變數：SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkExistingData() {
  console.log('\n📊 檢查現有資料...\n');

  const tables = [
    'users', 'spreadsheets', 'worksheets', 'sheet_data',
    'members', 'member_activity_log', 'custom_dashboards'
  ];

  const dataSummary: Record<string, number> = {};

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        dataSummary[table] = count || 0;
        console.log(`  ${table}: ${count || 0} 筆`);
      }
    } catch (e) {
      // 表可能不存在
    }
  }

  return dataSummary;
}

async function confirmMigration(dataSummary: Record<string, number>): Promise<boolean> {
  const totalRecords = Object.values(dataSummary).reduce((sum, count) => sum + count, 0);

  console.log('\n⚠️  警告：此操作將：');
  console.log('  1. 刪除所有現有表（CASCADE）');
  console.log('  2. 清除所有資料');
  console.log(`  3. 總共 ${totalRecords} 筆資料將被刪除`);
  console.log('  4. 建立新的 UUID-based schema\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('確定要繼續嗎？(輸入 "yes" 確認): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function dropAllTables() {
  console.log('\n🗑️  刪除所有舊表...\n');

  const tables = [
    'member_activity_log',
    'members',
    'custom_dashboards',
    'dashboard_templates',
    'sheet_data',
    'worksheets',
    'spreadsheets',
    'roles',
    'sessions',
    'users'
  ];

  for (const table of tables) {
    try {
      execSync(
        `psql "${SUPABASE_DB_URL}" -c "DROP TABLE IF EXISTS ${table} CASCADE;"`,
        { stdio: 'pipe' }
      );
      console.log(`  ✓ 刪除 ${table}`);
    } catch (error) {
      console.log(`  ⚠️  ${table} (可能不存在)`);
    }
  }
}

async function runMigration() {
  console.log('\n📝 執行新的 migration...\n');

  try {
    execSync(
      `psql "${SUPABASE_DB_URL}" -f supabase/migrations/001_create_all_tables.sql`,
      { stdio: 'inherit' }
    );
    console.log('\n✅ Migration 執行成功！');
    return true;
  } catch (error) {
    console.error('\n❌ Migration 執行失敗');
    return false;
  }
}

async function main() {
  console.log('🔄 開始 Neon → Supabase UUID Schema 遷移\n');
  console.log('============================================\n');

  // 檢查現有資料
  const dataSummary = await checkExistingData();

  // 確認遷移
  const confirmed = await confirmMigration(dataSummary);

  if (!confirmed) {
    console.log('\n❌ 遷移已取消');
    process.exit(0);
  }

  // 刪除舊表
  await dropAllTables();

  // 執行新 migration
  const success = await runMigration();

  if (success) {
    console.log('\n✅ 遷移完成！');
    console.log('\n下一步：');
    console.log('  1. 執行驗證：npx tsx scripts/verify-supabase-migration.ts');
    console.log('  2. 重新同步 Google Sheets 資料');
  } else {
    console.log('\n❌ 遷移失敗，請檢查錯誤訊息');
    process.exit(1);
  }
}

main().catch(console.error);

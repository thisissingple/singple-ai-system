#!/usr/bin/env tsx
/**
 * 透過 Supabase REST API 執行 Migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

async function dropTables() {
  console.log('\n🗑️  刪除舊表...\n');

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
    const { error } = await supabase.rpc('exec_sql', {
      sql: `DROP TABLE IF EXISTS ${table} CASCADE`
    });

    if (error) {
      console.log(`  ⚠️  ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ 刪除 ${table}`);
    }
  }
}

async function executeMigration() {
  console.log('\n📝 讀取 Migration SQL...\n');

  const migrationSQL = readFileSync('supabase/migrations/001_create_all_tables.sql', 'utf-8');

  // 分割成個別語句
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`找到 ${statements.length} 個 SQL 語句\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    if (stmt.includes('CREATE EXTENSION')) {
      console.log(`  ⏭️  跳過 EXTENSION (${i + 1}/${statements.length})`);
      continue;
    }

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });

      if (error) {
        console.log(`  ❌ 語句 ${i + 1}: ${error.message.substring(0, 80)}`);
        errorCount++;
      } else {
        const preview = stmt.substring(0, 50).replace(/\s+/g, ' ');
        console.log(`  ✓ 語句 ${i + 1}: ${preview}...`);
        successCount++;
      }
    } catch (e: any) {
      console.log(`  ❌ 語句 ${i + 1}: ${e.message}`);
      errorCount++;
    }
  }

  console.log(`\n執行完成: ${successCount} 成功, ${errorCount} 失敗`);
}

async function main() {
  console.log('🔄 開始 Migration (使用 Supabase API)\n');
  console.log('============================================');

  // 檢查是否有 exec_sql function
  console.log('\n檢查 Supabase RPC function...');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: 'SELECT 1 as test'
  });

  if (error) {
    console.error('\n❌ Supabase 沒有 exec_sql function');
    console.log('請在 Supabase SQL Editor 手動執行 Migration SQL');
    console.log('檔案位置: supabase/migrations/001_create_all_tables.sql\n');
    process.exit(1);
  }

  await dropTables();
  await executeMigration();

  console.log('\n✅ Migration 完成！');
}

main().catch(console.error);

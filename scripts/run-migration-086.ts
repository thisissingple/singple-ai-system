/**
 * 執行 Migration 086: 擴展 sync_logs 記錄詳細同步資訊
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 開始執行 Migration 086...\n');

  // 讀取 migration SQL
  const sqlPath = join(process.cwd(), 'supabase/migrations/086_add_sync_details_to_logs.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // 建立連線（使用 session pooler）
  const connStr = process.env.SUPABASE_DB_URL?.replace(':5432/', ':6543/') || process.env.SUPABASE_DB_URL;
  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 執行 migration
    console.log('⏳ 正在執行 migration...');
    await pool.query(sql);

    console.log('\n✅ Migration 執行完成！');

    // 驗證新欄位
    const columnResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sync_logs'
        AND column_name IN ('source_records', 'duplicate_records', 'skipped_records', 'duplicate_details', 'skipped_details')
      ORDER BY column_name
    `);

    console.log('\n📊 新增欄位：');
    columnResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    if (columnResult.rows.length === 5) {
      console.log('\n✅ 所有 5 個欄位都已成功建立');
    } else {
      console.log(`\n⚠️ 只找到 ${columnResult.rows.length}/5 個欄位`);
    }

  } catch (error: any) {
    console.error('\n❌ Migration 執行失敗:', error.message);
    if (error.detail) {
      console.error('   詳細:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();

/**
 * 執行 Migration 085: 新增 item_key 計算欄位
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 開始執行 Migration 085...\n');

  // 讀取 migration SQL
  const sqlPath = join(process.cwd(), 'supabase/migrations/085_add_item_key_column.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // 建立連線（使用 session pooler）
  const connStr = process.env.SUPABASE_DB_URL?.replace(':5432/', ':6543/') || process.env.SUPABASE_DB_URL;
  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 查詢執行前狀態
    const beforeResult = await pool.query('SELECT COUNT(*) as count FROM income_expense_records');
    console.log(`📊 執行前資料筆數: ${beforeResult.rows[0].count}`);

    // 執行 migration
    console.log('\n⏳ 正在執行 migration...');
    await pool.query(sql);

    console.log('\n✅ Migration 執行完成！');

    // 查詢執行後狀態
    const afterResult = await pool.query('SELECT COUNT(*) as count FROM income_expense_records');
    console.log(`📊 執行後資料筆數: ${afterResult.rows[0].count}`);
    console.log(`🗑️  清理了 ${parseInt(beforeResult.rows[0].count) - parseInt(afterResult.rows[0].count)} 筆重複資料`);

    // 驗證 item_key 欄位
    const columnResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'income_expense_records'
        AND column_name = 'item_key'
    `);

    if (columnResult.rows.length > 0) {
      console.log('\n✅ item_key 欄位建立成功');
    }

    // 驗證 index
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'income_expense_records'
        AND indexname = 'idx_income_expense_unique_key'
    `);

    if (indexResult.rows.length > 0) {
      console.log('✅ UNIQUE INDEX 建立成功：');
      console.log(`   ${indexResult.rows[0].indexdef}`);
    }

    // 檢查 item_key 的 NULL 數量
    const nullCheck = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE item_key IS NULL OR item_key = '') as empty_item_key,
        COUNT(*) as total
      FROM income_expense_records
    `);
    console.log(`\n📊 item_key 狀態：空值 ${nullCheck.rows[0].empty_item_key} / 總計 ${nullCheck.rows[0].total}`);

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

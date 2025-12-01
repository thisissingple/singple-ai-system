/**
 * 執行 Migration 082: 為 income_expense_records 新增 UNIQUE INDEX
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 開始執行 Migration 082...\n');

  // 讀取 migration SQL
  const sqlPath = join(process.cwd(), 'supabase/migrations/082_add_income_expense_unique_index.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // 建立連線
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 先查詢目前狀態
    const beforeResult = await pool.query('SELECT COUNT(*) as count FROM income_expense_records');
    console.log(`📊 執行前資料筆數: ${beforeResult.rows[0].count}`);

    // 執行 migration
    console.log('\n⏳ 正在執行 migration...');
    const result = await pool.query(sql);

    // 顯示結果
    console.log('\n✅ Migration 執行完成！');

    // 查詢執行後狀態
    const afterResult = await pool.query('SELECT COUNT(*) as count FROM income_expense_records');
    console.log(`📊 執行後資料筆數: ${afterResult.rows[0].count}`);
    console.log(`🗑️  清理了 ${parseInt(beforeResult.rows[0].count) - parseInt(afterResult.rows[0].count)} 筆重複資料`);

    // 驗證 index 是否建立
    const indexResult = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'income_expense_records'
        AND indexname = 'idx_income_expense_unique_key'
    `);

    if (indexResult.rows.length > 0) {
      console.log('\n✅ UNIQUE INDEX 建立成功：');
      console.log(`   ${indexResult.rows[0].indexdef}`);
    } else {
      console.log('\n⚠️ UNIQUE INDEX 未找到');
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

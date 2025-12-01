/**
 * 執行 Migration 087: 薪資記錄新增職位和合約欄位
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 開始執行 Migration 087...\n');

  // 讀取 migration SQL
  const sqlPath = join(process.cwd(), 'supabase/migrations/087_add_role_and_contract_to_salary.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // 建立連線（使用 session pooler）
  const connStr = process.env.SUPABASE_SESSION_DB_URL ||
                  process.env.SESSION_DB_URL ||
                  process.env.SUPABASE_DB_URL?.replace(':5432/', ':6543/') ||
                  process.env.SUPABASE_DB_URL;
  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
    query_timeout: 60000,
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
      WHERE table_name = 'salary_calculations'
        AND column_name IN ('role_type', 'contract_id', 'contract_name')
      ORDER BY column_name
    `);

    console.log('\n📊 新增欄位：');
    columnResult.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    if (columnResult.rows.length === 3) {
      console.log('\n✅ 所有 3 個欄位都已成功建立');
    } else {
      console.log(`\n⚠️ 只找到 ${columnResult.rows.length}/3 個欄位`);
    }

    // 檢查回填結果
    const backfillResult = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(role_type) as with_role
      FROM salary_calculations
    `);

    const { total, with_role } = backfillResult.rows[0];
    console.log(`\n📈 回填狀況：${with_role}/${total} 筆記錄已填入 role_type`);

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

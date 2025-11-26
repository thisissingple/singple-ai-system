import 'dotenv/config';
import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    console.log('📖 讀取 migration 檔案...');
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '064_recreate_income_expense_table.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 執行 migration...');
    await pool.query(migrationSQL);

    console.log('✅ Migration 064 執行成功！');
    console.log('');
    console.log('📊 檢查新表結構...');

    const result = await pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'income_expense_records'
      ORDER BY ordinal_position;
    `);

    console.log('');
    console.log('新的 income_expense_records 表欄位：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    result.rows.forEach((row) => {
      const nullable = row.is_nullable === 'YES' ? '可空' : '必填';
      console.log(`  ${row.column_name.padEnd(25)} ${row.data_type.padEnd(30)} ${nullable}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🎉 完成！舊的收支表已刪除，新的收支表已建立。');

  } catch (error) {
    console.error('❌ Migration 執行失敗：', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();

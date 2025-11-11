/**
 * 執行資料庫 Migration
 */
import { readFileSync } from 'fs';
import { createPool } from '../server/services/pg-client';

async function runMigration(sqlFilePath: string) {
  const pool = createPool();

  try {
    console.log(`📄 讀取 SQL 檔案: ${sqlFilePath}`);
    const sql = readFileSync(sqlFilePath, 'utf-8');

    console.log('🚀 執行 Migration...');
    await pool.query(sql);

    console.log('✅ Migration 執行成功！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration 執行失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('請提供 SQL 檔案路徑');
  console.error('用法: npx tsx scripts/run-migration.ts <sql-file-path>');
  process.exit(1);
}

runMigration(sqlFile);

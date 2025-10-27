import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';

const { Pool } = pg;

async function runMigration() {
  // 從環境變數讀取資料庫連線
  const connectionString = process.env.SUPABASE_DB_URL;

  if (!connectionString) {
    console.error('❌ 錯誤: SUPABASE_DB_URL 環境變數未設定');
    console.log('💡 提示: 請在 .env 檔案中設定 SUPABASE_DB_URL');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 連線至資料庫...');
    const client = await pool.connect();

    console.log('📖 讀取 migration 檔案...');
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '026_add_currency_columns_to_cost_profit.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 執行 migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration 026 執行成功！');
    console.log('');
    console.log('新增欄位：');
    console.log('  - currency: 幣別 (TWD/USD/RMB)');
    console.log('  - exchange_rate_used: 儲存時的匯率');
    console.log('  - amount_in_twd: 換算後的 TWD 金額（鎖定值）');

    client.release();
    await pool.end();

  } catch (error) {
    console.error('❌ Migration 失敗:', error);
    process.exit(1);
  }
}

runMigration();

/**
 * 執行 Migration 035: 創建廣告名單表
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_SESSION_DB_URL || process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

async function executeMigration() {
  try {
    console.log('📦 開始執行 Migration 035: 創建廣告名單表\n');

    // 讀取 SQL 文件
    const sqlPath = join(process.cwd(), 'supabase/migrations/035_create_ad_leads_table.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📄 SQL 文件:', sqlPath);
    console.log('📝 SQL 長度:', sql.length, '字元\n');
    console.log('⚙️  開始執行 SQL...\n');

    // 執行 SQL
    const result = await pool.query(sql);

    console.log('✅ Migration 執行成功！\n');

    // 驗證表是否創建成功
    console.log('🔍 驗證表結構...');
    const checkTable = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ad_leads'
      ORDER BY ordinal_position;
    `);

    if (checkTable.rows.length > 0) {
      console.log('✅ 表 ad_leads 已成功創建！');
      console.log(`   共 ${checkTable.rows.length} 個欄位\n`);
      console.log('📋 欄位列表：');
      checkTable.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.error('❌ 表驗證失敗');
    }

    console.log('\n🎉 Migration 035 完成！');
    console.log('📋 下一步：');
    console.log('   1. 設定 Facebook Webhook URL');
    console.log('   2. 建立前端頁面');
    console.log('   3. 測試完整流程\n');

  } catch (error: any) {
    console.error('❌ Migration 失敗:', error.message);
    console.error('\n錯誤詳情:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

executeMigration();

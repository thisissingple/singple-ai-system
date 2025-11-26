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
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '066_create_salary_calculator.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 執行 migration...');
    await pool.query(migrationSQL);

    console.log('✅ Migration 066 執行成功！');
    console.log('');
    console.log('📊 檢查新建立的表...');

    // 檢查 employee_salary_settings
    const settingsResult = await pool.query(`
      SELECT employee_name, role_type, base_salary, commission_rate
      FROM employee_salary_settings
      ORDER BY employee_name;
    `);

    console.log('');
    console.log('👥 員工薪資設定:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    settingsResult.rows.forEach((row) => {
      console.log(`  ${row.employee_name.padEnd(10)} | ${row.role_type.padEnd(8)} | 底薪: $${row.base_salary} | 抽成: ${row.commission_rate}%`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('🎉 完成！薪資計算器資料表已建立。');

  } catch (error) {
    console.error('❌ Migration 執行失敗：', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();

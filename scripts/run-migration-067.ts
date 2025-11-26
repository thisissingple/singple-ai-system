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
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', '067_add_part_time_support.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 執行 migration...');
    await pool.query(migrationSQL);

    console.log('✅ Migration 067 執行成功！\n');

    // 檢查 Gladys 的設定
    const gladysResult = await pool.query(`
      SELECT
        employee_name,
        employment_type,
        hourly_rate,
        base_salary,
        role_type,
        is_active
      FROM employee_salary_settings
      WHERE employee_name = 'Gladys 黃芷若'
    `);

    console.log('👤 Gladys 黃芷若 的設定：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (gladysResult.rows.length > 0) {
      const gladys = gladysResult.rows[0];
      console.log(`  員工類型: ${gladys.employment_type === 'part_time' ? '兼職' : '正職'}`);
      console.log(`  時薪: $${gladys.hourly_rate}`);
      console.log(`  底薪: $${gladys.base_salary}`);
      console.log(`  角色: ${gladys.role_type}`);
      console.log(`  狀態: ${gladys.is_active ? '啟用' : '停用'}`);
    } else {
      console.log('  ❌ 找不到 Gladys 黃芷若');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 顯示所有員工類型
    const allEmployeesResult = await pool.query(`
      SELECT
        employee_name,
        employment_type,
        hourly_rate,
        base_salary,
        is_active
      FROM employee_salary_settings
      WHERE is_active = true
      ORDER BY employment_type, employee_name
    `);

    console.log('📊 所有活躍員工列表：\n');
    let currentType = '';
    allEmployeesResult.rows.forEach(row => {
      if (row.employment_type !== currentType) {
        currentType = row.employment_type;
        const typeLabel = currentType === 'part_time' ? '兼職人員' : '正職人員';
        console.log(`\n【${typeLabel}】`);
      }
      if (row.employment_type === 'part_time') {
        console.log(`  ✓ ${row.employee_name.padEnd(20)} - 時薪: $${row.hourly_rate}`);
      } else {
        console.log(`  ✓ ${row.employee_name.padEnd(20)} - 底薪: $${row.base_salary}`);
      }
    });

    console.log('\n🎉 完成！兼職人員支援已啟用。\n');

  } catch (error) {
    console.error('❌ Migration 執行失敗：', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();

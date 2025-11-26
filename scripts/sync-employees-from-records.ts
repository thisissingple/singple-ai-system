import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

/**
 * 從 income_expense_records 中提取所有出現過的員工名稱
 * 並自動新增到 employee_salary_settings 表中
 */

async function syncEmployees() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    console.log('🔍 正在從收支記錄中提取員工名稱...\n');

    // 1. 提取所有教練 (teacher_name)
    const teachersResult = await pool.query(`
      SELECT DISTINCT teacher_name as name, 'teacher' as role
      FROM income_expense_records
      WHERE teacher_name IS NOT NULL
        AND teacher_name != ''
        AND transaction_category = '收入'
      ORDER BY teacher_name
    `);

    // 2. 提取所有 Closer (closer)
    const closersResult = await pool.query(`
      SELECT DISTINCT closer as name, 'closer' as role
      FROM income_expense_records
      WHERE closer IS NOT NULL
        AND closer != ''
        AND transaction_category = '收入'
      ORDER BY closer
    `);

    // 3. 提取所有 Setter (setter)
    const settersResult = await pool.query(`
      SELECT DISTINCT setter as name, 'setter' as role
      FROM income_expense_records
      WHERE setter IS NOT NULL
        AND setter != ''
        AND transaction_category = '收入'
      ORDER BY setter
    `);

    console.log('📊 找到的員工：');
    console.log(`   教練 (teachers): ${teachersResult.rows.length} 位`);
    console.log(`   Closers: ${closersResult.rows.length} 位`);
    console.log(`   Setters: ${settersResult.rows.length} 位\n`);

    // 4. 合併所有員工（去重）
    const allEmployees = new Map<string, string>();

    teachersResult.rows.forEach(row => {
      allEmployees.set(row.name, 'teacher');
    });

    closersResult.rows.forEach(row => {
      // 如果已經是 teacher，保持 teacher 角色
      if (!allEmployees.has(row.name)) {
        allEmployees.set(row.name, 'closer');
      }
    });

    settersResult.rows.forEach(row => {
      // 如果已經有其他角色，保持原角色
      if (!allEmployees.has(row.name)) {
        allEmployees.set(row.name, 'setter');
      }
    });

    console.log(`✅ 總共找到 ${allEmployees.size} 位不重複的員工\n`);

    // 5. 檢查哪些員工還沒有在 employee_salary_settings 中
    const existingResult = await pool.query(`
      SELECT employee_name
      FROM employee_salary_settings
    `);

    const existingEmployees = new Set(existingResult.rows.map(r => r.employee_name));
    console.log(`📋 資料庫中已有 ${existingEmployees.size} 位員工設定\n`);

    // 6. 新增缺少的員工
    const missingEmployees = Array.from(allEmployees.entries())
      .filter(([name]) => !existingEmployees.has(name));

    if (missingEmployees.length === 0) {
      console.log('✅ 所有員工都已在資料庫中，無需新增');
    } else {
      console.log(`🆕 需要新增 ${missingEmployees.length} 位員工：\n`);

      for (const [name, role] of missingEmployees) {
        console.log(`   新增: ${name} (${role})`);

        await pool.query(`
          INSERT INTO employee_salary_settings (
            employee_name,
            role_type,
            base_salary,
            commission_rate,
            point_commission_rate,
            is_active,
            notes
          ) VALUES ($1, $2, 0, 0, 0, true, $3)
          ON CONFLICT (employee_name) DO NOTHING
        `, [
          name,
          role,
          `自動新增於 ${new Date().toISOString().split('T')[0]}`
        ]);
      }

      console.log('\n✅ 新增完成！');
    }

    // 7. 顯示最終列表
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const finalResult = await pool.query(`
      SELECT employee_name, role_type, base_salary, commission_rate, is_active
      FROM employee_salary_settings
      ORDER BY role_type, employee_name
    `);

    console.log('\n📊 完整員工列表：\n');
    let currentRole = '';
    finalResult.rows.forEach(row => {
      if (row.role_type !== currentRole) {
        currentRole = row.role_type;
        console.log(`\n【${currentRole.toUpperCase()}】`);
      }
      const status = row.is_active ? '✓' : '✗';
      console.log(`  ${status} ${row.employee_name.padEnd(15)} - 底薪: $${row.base_salary}, 抽成: ${row.commission_rate}%`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 提示：');
    console.log('   - 新員工的底薪和抽成率預設為 0，請手動設定');
    console.log('   - 如果有離職員工，請將 is_active 設為 false');
    console.log('   - 可以使用 PUT /api/salary/employees/:name API 更新設定\n');

  } catch (error) {
    console.error('❌ 錯誤：', error);
    throw error;
  } finally {
    await pool.end();
  }
}

syncEmployees();

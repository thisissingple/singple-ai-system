import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

/**
 * 從 Singple 系統的 users 表同步員工到薪資計算器
 * 正確來源：users 表，而非 Google Sheets 同步的資料
 */

async function syncEmployeesFromUsers() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    console.log('🔍 從 Singple 系統的 users 表提取員工...\n');

    // 1. 獲取所有活躍使用者
    const usersResult = await pool.query(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        roles,
        status
      FROM users
      WHERE status = 'active'
      ORDER BY first_name, last_name
    `);

    console.log(`📊 找到 ${usersResult.rows.length} 位活躍使用者\n`);

    // 2. 將使用者角色映射到員工角色
    interface EmployeeMapping {
      name: string;
      roleType: 'teacher' | 'closer' | 'setter';
      userId: string;
      email: string;
    }

    const employees: EmployeeMapping[] = [];

    usersResult.rows.forEach(user => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      if (!fullName) return;

      const roles = user.roles || [];

      // 優先級：teacher > consultant (closer) > sales (setter)
      let roleType: 'teacher' | 'closer' | 'setter' | null = null;

      if (roles.includes('teacher')) {
        roleType = 'teacher';
      } else if (roles.includes('consultant')) {
        roleType = 'closer';
      } else if (roles.includes('sales')) {
        roleType = 'setter';
      }

      if (roleType) {
        employees.push({
          name: fullName,
          roleType,
          userId: user.id,
          email: user.email,
        });
      }
    });

    console.log(`✅ 映射到 ${employees.length} 位員工：\n`);
    employees.forEach(emp => {
      console.log(`   ${emp.name.padEnd(20)} → ${emp.roleType}`);
    });
    console.log('');

    // 3. 檢查現有的員工設定
    const existingResult = await pool.query(`
      SELECT employee_name, is_active
      FROM employee_salary_settings
    `);

    const existingEmployees = new Map(
      existingResult.rows.map(r => [r.employee_name, r.is_active])
    );

    console.log(`📋 資料庫中已有 ${existingEmployees.size} 位員工設定\n`);

    // 4. 更新或新增員工
    let addedCount = 0;
    let updatedCount = 0;
    let reactivatedCount = 0;

    for (const emp of employees) {
      const exists = existingEmployees.has(emp.name);
      const isActive = existingEmployees.get(emp.name);

      if (!exists) {
        // 新增員工
        console.log(`🆕 新增: ${emp.name} (${emp.roleType})`);
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
          emp.name,
          emp.roleType,
          `從 Singple 系統同步 (${new Date().toISOString().split('T')[0]})`
        ]);
        addedCount++;
      } else if (!isActive) {
        // 重新啟用員工
        console.log(`♻️  重新啟用: ${emp.name}`);
        await pool.query(`
          UPDATE employee_salary_settings
          SET is_active = true,
              role_type = $2,
              notes = $3
          WHERE employee_name = $1
        `, [
          emp.name,
          emp.roleType,
          `重新啟用 (${new Date().toISOString().split('T')[0]})`
        ]);
        reactivatedCount++;
      } else {
        // 更新角色類型（如果改變）
        await pool.query(`
          UPDATE employee_salary_settings
          SET role_type = $2
          WHERE employee_name = $1 AND role_type != $2
        `, [emp.name, emp.roleType]);
        updatedCount++;
      }
    }

    console.log('');

    // 5. 停用不在 users 表中的員工
    const currentEmployeeNames = new Set(employees.map(e => e.name));
    const toDeactivate = Array.from(existingEmployees.keys())
      .filter(name => !currentEmployeeNames.has(name) && existingEmployees.get(name) === true);

    if (toDeactivate.length > 0) {
      console.log(`⛔ 停用已離職員工 (${toDeactivate.length} 位)：\n`);
      for (const name of toDeactivate) {
        console.log(`   停用: ${name}`);
        await pool.query(`
          UPDATE employee_salary_settings
          SET is_active = false,
              notes = COALESCE(notes, '') || ' | 已停用 (' || $2 || ')'
          WHERE employee_name = $1
        `, [name, new Date().toISOString().split('T')[0]]);
      }
      console.log('');
    }

    // 6. 顯示最終統計
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 同步結果：');
    console.log(`   🆕 新增員工: ${addedCount} 位`);
    console.log(`   ♻️  重新啟用: ${reactivatedCount} 位`);
    console.log(`   🔄 更新角色: ${updatedCount} 位`);
    console.log(`   ⛔ 停用員工: ${toDeactivate.length} 位`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

    // 7. 顯示最終活躍員工列表
    const finalResult = await pool.query(`
      SELECT employee_name, role_type, base_salary, commission_rate, is_active
      FROM employee_salary_settings
      WHERE is_active = true
      ORDER BY role_type, employee_name
    `);

    console.log('📊 目前活躍員工列表：\n');
    let currentRole = '';
    finalResult.rows.forEach(row => {
      if (row.role_type !== currentRole) {
        currentRole = row.role_type;
        const roleLabel = currentRole === 'teacher' ? '教練' : currentRole === 'closer' ? 'Closer' : 'Setter';
        console.log(`\n【${roleLabel.toUpperCase()}】`);
      }
      console.log(`  ✓ ${row.employee_name.padEnd(20)} - 底薪: $${row.base_salary}, 抽成: ${row.commission_rate}%`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 同步完成！員工資料已從 Singple 系統更新。\n');

  } catch (error) {
    console.error('❌ 錯誤：', error);
    throw error;
  } finally {
    await pool.end();
  }
}

syncEmployeesFromUsers();

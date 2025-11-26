import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function checkGladysRevenue() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    // 1. 檢查 Gladys 的設定
    console.log('📋 檢查 Gladys 黃芷若 的員工設定：\n');
    const settingResult = await pool.query(`
      SELECT employee_name, role_type, employment_type, hourly_rate, commission_rate
      FROM employee_salary_settings
      WHERE employee_name = 'Gladys 黃芷若'
    `);

    if (settingResult.rows.length === 0) {
      console.log('❌ 找不到 Gladys 黃芷若 的員工設定');
      return;
    }

    const setting = settingResult.rows[0];
    console.log(`  姓名: ${setting.employee_name}`);
    console.log(`  角色: ${setting.role_type}`);
    console.log(`  類型: ${setting.employment_type}`);
    console.log(`  時薪: $${setting.hourly_rate}`);
    console.log(`  抽成比例: ${setting.commission_rate}%\n`);

    // 2. 根據角色類型查詢業績
    const roleType = setting.role_type;
    let fieldName = '';

    switch (roleType) {
      case 'teacher':
        fieldName = 'teacher_name';
        break;
      case 'closer':
        fieldName = 'closer';
        break;
      case 'setter':
        fieldName = 'setter';
        break;
    }

    console.log(`🔍 查詢 ${fieldName} 欄位中的業績記錄...\n`);

    const revenueQuery = `
      SELECT
        transaction_date,
        income_item,
        amount_twd,
        ${fieldName}
      FROM income_expense_records
      WHERE ${fieldName} = $1
        AND transaction_category = '收入'
        AND amount_twd IS NOT NULL
      ORDER BY transaction_date DESC
      LIMIT 10
    `;

    const revenueResult = await pool.query(revenueQuery, ['Gladys 黃芷若']);

    console.log(`📊 找到 ${revenueResult.rows.length} 筆業績記錄：\n`);

    if (revenueResult.rows.length > 0) {
      revenueResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. 日期: ${row.transaction_date}`);
        console.log(`     項目: ${row.income_item}`);
        console.log(`     金額: $${row.amount_twd}`);
        console.log('');
      });

      // 計算指定期間的總業績
      const periodStart = '2025-10-26';
      const periodEnd = '2025-11-25';

      const periodQuery = `
        SELECT
          income_item,
          COUNT(*) as count,
          SUM(amount_twd) as total_amount
        FROM income_expense_records
        WHERE ${fieldName} = $1
          AND transaction_date >= $2
          AND transaction_date <= $3
          AND transaction_category = '收入'
          AND amount_twd IS NOT NULL
        GROUP BY income_item
      `;

      const periodResult = await pool.query(periodQuery, [
        'Gladys 黃芷若',
        periodStart,
        periodEnd,
      ]);

      console.log(`\n📅 ${periodStart} 至 ${periodEnd} 期間業績：\n`);

      if (periodResult.rows.length > 0) {
        let totalRevenue = 0;
        periodResult.rows.forEach(row => {
          const amount = parseFloat(row.total_amount);
          totalRevenue += amount;
          console.log(`  ${row.income_item}: $${amount.toLocaleString()} (${row.count} 筆)`);
        });
        console.log(`\n  總業績: $${totalRevenue.toLocaleString()}`);
      } else {
        console.log('  ❌ 此期間無業績記錄');
      }
    } else {
      console.log('  ❌ 找不到任何業績記錄');
      console.log(`\n💡 可能原因：`);
      console.log(`  1. income_expense_records 表中的 ${fieldName} 欄位沒有 "Gladys 黃芷若" 的記錄`);
      console.log(`  2. 姓名拼寫可能不一致（空格、全形/半形等）`);
      console.log(`  3. 該員工尚未有任何業績記錄\n`);

      // 檢查是否有類似的名字
      const similarQuery = `
        SELECT DISTINCT ${fieldName}
        FROM income_expense_records
        WHERE ${fieldName} ILIKE '%Gladys%' OR ${fieldName} ILIKE '%黃芷若%'
        LIMIT 5
      `;

      const similarResult = await pool.query(similarQuery);

      if (similarResult.rows.length > 0) {
        console.log('  🔍 找到類似的名字：');
        similarResult.rows.forEach(row => {
          console.log(`     - ${row[fieldName]}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ 錯誤：', error);
    throw error;
  } finally {
    await pool.end();
  }
}

checkGladysRevenue();

/**
 * Check salary-related data for planning
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    console.log('\n📊 收支資料分析（用於薪資試算規劃）');
    console.log('===============================================\n');

    // 1. 查詢教練名單
    const teachersQuery = `
      SELECT DISTINCT teacher_name, COUNT(*) as record_count
      FROM income_expense_records
      WHERE teacher_name IS NOT NULL AND teacher_name != ''
      GROUP BY teacher_name
      ORDER BY record_count DESC
      LIMIT 10
    `;
    const teachers = await pool.query(teachersQuery);
    console.log('📋 教練名單 (前10位):');
    teachers.rows.forEach(row => {
      console.log(`   - ${row.teacher_name}: ${row.record_count} 筆記錄`);
    });

    // 2. 查詢業績歸屬人（Closer）
    console.log('\n📋 業績歸屬人1 (Closer) - 前10位:');
    const closersQuery = `
      SELECT DISTINCT closer, COUNT(*) as record_count
      FROM income_expense_records
      WHERE closer IS NOT NULL AND closer != ''
      GROUP BY closer
      ORDER BY record_count DESC
      LIMIT 10
    `;
    const closers = await pool.query(closersQuery);
    closers.rows.forEach(row => {
      console.log(`   - ${row.closer}: ${row.record_count} 筆記錄`);
    });

    // 3. 查詢業績歸屬人（Setter）
    console.log('\n📋 業績歸屬人2 (Setter) - 前10位:');
    const settersQuery = `
      SELECT DISTINCT setter, COUNT(*) as record_count
      FROM income_expense_records
      WHERE setter IS NOT NULL AND setter != ''
      GROUP BY setter
      ORDER BY record_count DESC
      LIMIT 10
    `;
    const setters = await pool.query(settersQuery);
    setters.rows.forEach(row => {
      console.log(`   - ${row.setter}: ${row.record_count} 筆記錄`);
    });

    // 4. 收支類別分析
    console.log('\n📋 收支類別分析:');
    const categoriesQuery = `
      SELECT transaction_category, COUNT(*) as count, SUM(amount_twd) as total_amount
      FROM income_expense_records
      WHERE transaction_category IS NOT NULL
      GROUP BY transaction_category
      ORDER BY count DESC
    `;
    const categories = await pool.query(categoriesQuery);
    categories.rows.forEach(row => {
      console.log(`   - ${row.transaction_category}: ${row.count} 筆, 總額 NT$ ${parseFloat(row.total_amount || 0).toLocaleString()}`);
    });

    // 5. 收入項目分析
    console.log('\n📋 收入項目 (前10種):');
    const incomeItemsQuery = `
      SELECT income_item, COUNT(*) as count, SUM(amount_twd) as total_amount
      FROM income_expense_records
      WHERE income_item IS NOT NULL AND income_item != ''
      GROUP BY income_item
      ORDER BY count DESC
      LIMIT 10
    `;
    const incomeItems = await pool.query(incomeItemsQuery);
    incomeItems.rows.forEach(row => {
      console.log(`   - ${row.income_item}: ${row.count} 筆, 總額 NT$ ${parseFloat(row.total_amount || 0).toLocaleString()}`);
    });

    // 6. 範例交易記錄
    console.log('\n📋 範例交易記錄 (最近3筆):');
    const sampleQuery = `
      SELECT
        transaction_date,
        transaction_category,
        income_item,
        amount_twd,
        teacher_name,
        closer,
        setter,
        customer_name
      FROM income_expense_records
      ORDER BY transaction_date DESC
      LIMIT 3
    `;
    const samples = await pool.query(sampleQuery);
    samples.rows.forEach((row, idx) => {
      console.log(`\n   ${idx + 1}. 日期: ${row.transaction_date}`);
      console.log(`      類別: ${row.transaction_category || '(無)'}`);
      console.log(`      項目: ${row.income_item || '(無)'}`);
      console.log(`      金額: NT$ ${row.amount_twd || 0}`);
      console.log(`      教練: ${row.teacher_name || '(無)'}`);
      console.log(`      Closer: ${row.closer || '(無)'}`);
      console.log(`      Setter: ${row.setter || '(無)'}`);
      console.log(`      顧客: ${row.customer_name || '(無)'}`);
    });

    console.log('\n===============================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

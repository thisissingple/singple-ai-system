import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function testCostProfitData() {
  const client = await pool.connect();

  try {
    console.log('🔍 測試成本獲利數據...\n');

    // 1. 檢查總筆數
    const countResult = await client.query('SELECT COUNT(*) FROM cost_profit');
    console.log(`✓ 總筆數: ${countResult.rows[0].count}`);

    // 2. 檢查月份分布
    const monthsResult = await client.query(`
      SELECT year, month, COUNT(*) as count
      FROM cost_profit
      GROUP BY year, month
      ORDER BY year DESC,
        CASE month
          WHEN 'January' THEN 1
          WHEN 'February' THEN 2
          WHEN 'March' THEN 3
          WHEN 'April' THEN 4
          WHEN 'May' THEN 5
          WHEN 'June' THEN 6
          WHEN 'July' THEN 7
          WHEN 'August' THEN 8
          WHEN 'September' THEN 9
          WHEN 'October' THEN 10
          WHEN 'November' THEN 11
          WHEN 'December' THEN 12
        END DESC
    `);
    console.log('\n📅 月份分布:');
    monthsResult.rows.forEach(row => {
      console.log(`  ${row.year} ${row.month}: ${row.count} 筆`);
    });

    // 3. 計算 August 2025 的數據
    const augustResult = await client.query(`
      SELECT
        category_name,
        SUM(CAST(amount AS NUMERIC)) as total
      FROM cost_profit
      WHERE year = 2025 AND month = 'August'
      GROUP BY category_name
      ORDER BY category_name
    `);

    console.log('\n💰 August 2025 統計:');
    let revenue = 0;
    let totalCost = 0;

    augustResult.rows.forEach(row => {
      const amount = parseFloat(row.total);
      console.log(`  ${row.category_name}: $${amount.toLocaleString()}`);

      if (row.category_name === '收入金額') {
        revenue = amount;
      } else {
        totalCost += amount;
      }
    });

    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    console.log('\n📊 August 2025 關鍵指標:');
    console.log(`  營收: $${revenue.toLocaleString()}`);
    console.log(`  成本: $${totalCost.toLocaleString()}`);
    console.log(`  淨利: $${profit.toLocaleString()}`);
    console.log(`  毛利率: ${profitMargin.toFixed(2)}%`);

    // 4. 檢查 amount 欄位類型
    const sampleResult = await client.query(`
      SELECT id, category_name, item_name, amount, month, year
      FROM cost_profit
      WHERE year = 2025 AND month = 'August'
      LIMIT 5
    `);

    console.log('\n🔬 Sample Data (前5筆):');
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.category_name} - ${row.item_name}: ${row.amount} (type: ${typeof row.amount})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    pool.end();
  }
}

testCostProfitData();

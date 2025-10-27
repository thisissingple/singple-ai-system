import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function addSeptemberCosts() {
  const client = await pool.connect();

  try {
    console.log('開始新增 2025 年 9 月成本資料...\n');

    // September 2025 costs data
    const records = [
      {
        category_name: '系統費用',
        item_name: 'Google Workspace',
        amount: 1588,
        notes: '2025/08/01 – 2025/08/31 / 3 名使用者 (52.92 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '軟體服務',
        item_name: 'Manus Pro',
        amount: 5970,
        notes: '2025/09/02 – 2025/10/02 / 1 帳號 (199.00 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '通訊費用',
        item_name: 'Slack Pro',
        amount: 1181,
        notes: '2025/09/05 – 2025/10/05 / 9 名成員 (39.38 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '軟體服務',
        item_name: 'ChatGPT Plus',
        amount: 600,
        notes: '2025/09/06 – 2025/10/05 / 個人 (20.00 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '軟體服務',
        item_name: 'Adobe Acrobat Premium',
        amount: 404,
        notes: '2025/09/06 – 2025/10/05 / 每月 (13.47 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '通訊費用',
        item_name: 'Zoom Pro',
        amount: 498,
        notes: '2025/09/07 – 2025/10/06 / 月費 (16.61 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '軟體服務',
        item_name: 'Anthropic Max plan',
        amount: 3000,
        notes: '2025/09/10 – 2025/10/10 / 5x Plan (100.00 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '軟體服務',
        item_name: 'Trello Premium',
        amount: 2250,
        notes: '2025/09/20 – 2025/10/20 / 6 名成員 (75.00 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      },
      {
        category_name: '軟體服務',
        item_name: 'Replit Core',
        amount: 660,
        notes: '2025/09/24 – 2025/10/24 / 含折扣 (22.00 USD)',
        month: 'September',
        year: 2025,
        is_confirmed: true
      }
    ];

    // Start transaction
    await client.query('BEGIN');

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        await client.query(
          `INSERT INTO cost_profit
           (category_name, item_name, amount, notes, month, year, is_confirmed)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            record.category_name,
            record.item_name,
            record.amount,
            record.notes,
            record.month,
            record.year,
            record.is_confirmed
          ]
        );

        console.log(`✓ 新增成功: ${record.category_name} - ${record.item_name} (NT$${record.amount.toLocaleString()})`);
        successCount++;
      } catch (error) {
        console.error(`✗ 新增失敗:`, record, error);
        errorCount++;
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    console.log('\n=== 新增完成 ===');
    console.log(`成功: ${successCount} 筆`);
    console.log(`失敗: ${errorCount} 筆`);

    // Verify data
    const countResult = await client.query(
      'SELECT COUNT(*) FROM cost_profit WHERE year = 2025 AND month = $1',
      ['September']
    );
    console.log(`\n2025 年 9 月總筆數: ${countResult.rows[0].count}`);

    // Show summary
    const summaryResult = await client.query(`
      SELECT category_name, COUNT(*) as count, SUM(amount) as total
      FROM cost_profit
      WHERE year = 2025 AND month = 'September'
      GROUP BY category_name
      ORDER BY category_name
    `);

    console.log('\n=== 9 月分類統計 ===');
    let totalCost = 0;
    for (const row of summaryResult.rows) {
      console.log(`${row.category_name}: ${row.count} 筆, NT$${parseFloat(row.total).toLocaleString()}`);
      totalCost += parseFloat(row.total);
    }
    console.log(`\n總成本: NT$${totalCost.toLocaleString()}`);

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Execute import
addSeptemberCosts()
  .then(() => {
    console.log('\n✓ 匯入作業完成');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 匯入作業失敗:', error);
    pool.end();
    process.exit(1);
  });

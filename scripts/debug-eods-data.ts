import { createPool } from '../server/services/pg-client';

async function debugEodsData() {
  const pool = createPool();

  try {
    const email = 'stephenlzq@gmail.com';

    // 直接從資料庫查詢
    const query = `
      SELECT
        student_name,
        student_email,
        deal_date,
        plan,
        actual_amount
      FROM eods_for_closers
      WHERE LOWER(TRIM(student_email)) = LOWER(TRIM($1))
        AND (plan LIKE '%高階一對一訓練%')
      ORDER BY deal_date;
    `;

    const result = await pool.query(query, [email]);

    console.log(`\n🔍 檢查 ${email} 的 eods_for_closers 資料：\n`);

    result.rows.forEach((row: any, idx: number) => {
      console.log(`記錄 ${idx + 1}:`);
      console.log(`  student_name: ${row.student_name}`);
      console.log(`  deal_date: ${row.deal_date}`);
      console.log(`  plan: ${row.plan}`);
      console.log(`  actual_amount: ${row.actual_amount} (type: ${typeof row.actual_amount})`);
      console.log('');
    });

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

debugEodsData();

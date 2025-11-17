import { createPool } from '../server/services/pg-client';

async function verifyConvertedCount() {
  const pool = createPool();

  try {
    const query = `
      SELECT DISTINCT
        t.student_email,
        t.student_name
      FROM trial_class_purchases t
      INNER JOIN eods_for_closers e
        ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
      WHERE e.actual_amount IS NOT NULL
        AND e.actual_amount != 'NT$0.00'
        AND e.deal_date IS NOT NULL
        AND e.deal_date >= t.purchase_date
        AND (e.plan LIKE '%高階一對一訓練%')
      ORDER BY t.student_name;
    `;

    const result = await pool.query(query);

    console.log('\n📊 已轉高學生（使用 >= 邏輯）：\n');
    console.log(`✅ 總共: ${result.rows.length} 位不重複學生\n`);

    result.rows.forEach((row: any, idx: number) => {
      console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

verifyConvertedCount();

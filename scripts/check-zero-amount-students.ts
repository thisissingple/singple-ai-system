import { createPool } from '../server/services/pg-client';

async function checkZeroAmountStudents() {
  const pool = createPool();

  try {
    const emails = [
      'stephenlzq@gmail.com',
      'xl3196@gmail.com',
      'v79228@gmail.com',
      'ssaa.42407@gmail.com',
      'monkey02191129@gmail.com',
      'a0909075080@gmail.com',
      'jitw331@gmail.com',
      'daniel.cock@yahoo.com.tw'
    ];

    console.log('\n🔍 檢查累積金額為 0 的已轉高學生：\n');

    for (const email of emails) {
      const query = `
        SELECT
          t.student_name,
          t.student_email,
          t.purchase_date,
          e.deal_date,
          e.plan,
          e.actual_amount
        FROM trial_class_purchases t
        INNER JOIN eods_for_closers e
          ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
        WHERE LOWER(TRIM(t.student_email)) = LOWER(TRIM($1))
          AND e.actual_amount IS NOT NULL
          AND e.actual_amount != 'NT$0.00'
          AND e.deal_date IS NOT NULL
          AND e.deal_date >= t.purchase_date
          AND (e.plan LIKE '%高階一對一訓練%')
        ORDER BY e.deal_date;
      `;

      const result = await pool.query(query, [email]);

      if (result.rows.length > 0) {
        const student = result.rows[0];
        console.log(`✅ ${student.student_name} (${email}):`);
        console.log(`   購買日期: ${student.purchase_date}`);

        result.rows.forEach((row: any, idx: number) => {
          console.log(`   成交 ${idx + 1}: ${row.deal_date} - ${row.plan} - ${row.actual_amount}`);
        });
        console.log('');
      } else {
        console.log(`❌ ${email}: 無符合條件的成交記錄\n`);
      }
    }

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

checkZeroAmountStudents();

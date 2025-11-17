import { createPool } from '../server/services/pg-client';

async function debugMissing7Students() {
  const pool = createPool();

  try {
    // 查詢所有符合條件的學生（使用正確定義）
    const allQuery = `
      SELECT DISTINCT
        t.student_email,
        t.student_name,
        t.purchase_date as trial_purchase_date,
        e.deal_date,
        e.plan,
        e.actual_amount,
        CASE
          WHEN e.deal_date > t.purchase_date THEN 'deal_date > purchase_date'
          WHEN e.deal_date = t.purchase_date THEN 'deal_date = purchase_date'
          WHEN e.deal_date < t.purchase_date THEN 'deal_date < purchase_date'
          ELSE 'unknown'
        END as date_comparison
      FROM trial_class_purchases t
      INNER JOIN eods_for_closers e
        ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
      WHERE e.actual_amount IS NOT NULL
        AND e.actual_amount != 'NT$0.00'
        AND e.deal_date IS NOT NULL
        AND (e.plan LIKE '%高階一對一訓練%')
      ORDER BY date_comparison, t.student_name;
    `;

    const allResult = await pool.query(allQuery);

    console.log('\n📊 所有包含「高階一對一訓練」的成交記錄：\n');

    // Group by date comparison
    const groups = new Map<string, any[]>();
    allResult.rows.forEach((row: any) => {
      const key = row.date_comparison;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    });

    groups.forEach((rows, comparison) => {
      console.log(`\n🔹 ${comparison}: ${rows.length} 筆記錄\n`);

      const uniqueEmails = new Set(rows.map((r: any) => r.student_email));
      console.log(`   不重複學生數: ${uniqueEmails.size} 位\n`);

      rows.slice(0, 3).forEach((row: any, idx: number) => {
        console.log(`   ${idx + 1}. ${row.student_name} (${row.student_email})`);
        console.log(`      體驗課購買: ${row.trial_purchase_date}`);
        console.log(`      高階成交日期: ${row.deal_date}`);
        console.log(`      方案: ${row.plan}`);
        console.log('');
      });
    });

    console.log(`\n✅ 總記錄數: ${allResult.rows.length} 筆`);
    const totalUniqueEmails = new Set(allResult.rows.map((r: any) => r.student_email));
    console.log(`👥 總不重複學生數: ${totalUniqueEmails.size} 位\n`);

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

debugMissing7Students();

import { createPool } from '../server/services/pg-client';

async function check25ConvertedStudents() {
  const pool = createPool();

  try {
    const query = `
      -- 查詢已轉高的 25 位學生（有 deal_date）
      SELECT DISTINCT
        t.student_name,
        t.student_email,
        t.purchase_date as trial_purchase_date,
        e.deal_date,
        e.plan,
        e.actual_amount
      FROM trial_class_purchases t
      INNER JOIN eods_for_closers e
        ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
      WHERE e.actual_amount IS NOT NULL
        AND e.actual_amount != 'NT$0.00'
        AND e.deal_date IS NOT NULL
        AND e.deal_date > t.purchase_date
        AND (e.plan LIKE '%高階一對一訓練%')
      ORDER BY t.student_name;
    `;

    const result = await pool.query(query);
    console.log('\n📊 已轉高的學生（使用正確定義）：\n');

    if (result.rows.length === 0) {
      console.log('❌ 沒有找到符合條件的記錄！');
    } else {
      // Group by plan name
      const planGroups = new Map<string, number>();

      result.rows.forEach((row: any) => {
        const plan = row.plan;
        planGroups.set(plan, (planGroups.get(plan) || 0) + 1);
      });

      console.log('📋 方案名稱統計：\n');
      planGroups.forEach((count, plan) => {
        console.log(`   ${plan}: ${count} 筆`);
      });

      console.log(`\n✅ 總共: ${result.rows.length} 筆記錄\n`);

      // Show unique student count
      const uniqueEmails = new Set(result.rows.map((r: any) => r.student_email));
      console.log(`👥 不重複學生數: ${uniqueEmails.size} 位\n`);

      // Show first 5 examples
      console.log('📝 前 5 筆範例：\n');
      result.rows.slice(0, 5).forEach((row: any, idx: number) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
        console.log(`   體驗課購買: ${row.trial_purchase_date}`);
        console.log(`   高階成交日期: ${row.deal_date}`);
        console.log(`   方案: ${row.plan}`);
        console.log(`   金額: ${row.actual_amount}`);
        console.log('');
      });
    }

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

check25ConvertedStudents();

import { createPool } from '../server/services/pg-client';

async function checkFromTrialToEods() {
  const pool = createPool();

  try {
    const query = `
      -- 從體驗課出發，JOIN 到高階成交
      SELECT DISTINCT
        t.student_name,
        t.student_email,
        t.purchase_date as trial_purchase_date,
        t.package_name as trial_package_name,
        e.actual_amount,
        e.deal_date,
        e.plan as eod_plan,
        e.created_at as eod_created_at
      FROM trial_class_purchases t
      INNER JOIN eods_for_closers e
        ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
      WHERE e.actual_amount IS NOT NULL
        AND e.actual_amount != 'NT$0.00'
        AND e.deal_date IS NULL
        AND (e.plan LIKE '%高階%' OR e.plan LIKE '%一對一訓練%')
      ORDER BY t.student_name
      LIMIT 10;
    `;

    const result = await pool.query(query);
    console.log('\n📊 從體驗課查到高階但缺少成交日期的學生（10 位範例）：\n');

    if (result.rows.length === 0) {
      console.log('✅ 沒有符合條件的記錄！');
    } else {
      result.rows.forEach((row: any, idx: number) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
        console.log(`   體驗課購買日期: ${row.trial_purchase_date}`);
        console.log(`   體驗課方案: ${row.trial_package_name}`);
        console.log(`   高階成交金額: ${row.actual_amount}`);
        console.log(`   高階成交日期: ${row.deal_date || '❌ 缺少'}`);
        console.log(`   高階方案: ${row.eod_plan}`);
        console.log('');
      });
    }

    // 計算總數
    const countQuery = `
      SELECT COUNT(DISTINCT t.student_email) as total
      FROM trial_class_purchases t
      INNER JOIN eods_for_closers e
        ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
      WHERE e.actual_amount IS NOT NULL
        AND e.actual_amount != 'NT$0.00'
        AND e.deal_date IS NULL
        AND (e.plan LIKE '%高階%' OR e.plan LIKE '%一對一訓練%');
    `;
    const countResult = await pool.query(countQuery);
    console.log(`\n總共符合條件的學生數: ${countResult.rows[0].total} 位\n`);

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

checkFromTrialToEods();

import { createPool } from '../server/services/pg-client';

async function checkHighLevelStudents() {
  const pool = createPool();

  try {
    const query = `
      -- 查詢高階方案但缺少成交日期的學生
      SELECT
        e.student_name,
        e.student_email,
        e.actual_amount,
        e.deal_date,
        e.plan,
        e.created_at as eod_created_at,
        (SELECT purchase_date
         FROM trial_class_purchases t
         WHERE LOWER(TRIM(t.student_email)) = LOWER(TRIM(e.student_email))
         LIMIT 1
        ) AS trial_purchase_date
      FROM eods_for_closers e
      WHERE e.actual_amount IS NOT NULL
        AND e.actual_amount != 'NT$0.00'
        AND e.deal_date IS NULL
        AND (e.plan LIKE '%高階%' OR e.plan LIKE '%一對一訓練%')
      ORDER BY e.student_name
      LIMIT 10;
    `;

    const result = await pool.query(query);
    console.log('\n📊 高階方案但缺少成交日期的學生（10 位範例）：\n');
    console.log('總數檢查中...\n');

    if (result.rows.length === 0) {
      console.log('✅ 沒有符合條件的記錄！');
    } else {
      result.rows.forEach((row: any, idx: number) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
        console.log(`   高階成交金額: ${row.actual_amount}`);
        console.log(`   高階成交日期: ${row.deal_date || '❌ 缺少'}`);
        console.log(`   高階方案: ${row.plan}`);
        console.log(`   高階建檔日期: ${row.eod_created_at}`);
        console.log(`   體驗課購買日期: ${row.trial_purchase_date || '❌ 缺少'}`);
        console.log('');
      });
    }

    // 計算總數
    const countQuery = `
      SELECT COUNT(*) as total
      FROM eods_for_closers e
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

checkHighLevelStudents();

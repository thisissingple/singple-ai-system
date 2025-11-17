import { createPool } from '../server/services/pg-client';

async function checkConvertedStudents() {
  const pool = createPool();

  try {
    const query = `
      -- 查詢真正已轉高但缺少成交日期的學生
      SELECT DISTINCT
        e.student_name,
        e.student_email,
        e.actual_amount,
        e.deal_date,
        e.plan as eod_plan,
        e.created_at as eod_created_at,
        t.purchase_date as trial_purchase_date,
        t.package_name as trial_package_name
      FROM eods_for_closers e
      INNER JOIN trial_class_purchases t
        ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
      WHERE e.actual_amount IS NOT NULL
        AND e.actual_amount != 'NT$0.00'
        AND e.deal_date IS NULL
        AND (e.plan LIKE '%高階%' OR e.plan LIKE '%一對一訓練%')
      ORDER BY e.student_name
      LIMIT 3;
    `;

    const result = await pool.query(query);
    console.log('\n📊 已轉高但缺少成交日期的學生（3 位範例）：\n');

    if (result.rows.length === 0) {
      console.log('✅ 沒有符合條件的記錄！');
    } else {
      result.rows.forEach((row: any, idx: number) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
        console.log(`   高階成交金額: ${row.actual_amount}`);
        console.log(`   高階成交日期: ${row.deal_date || '❌ 缺少'}`);
        console.log(`   高階方案名稱: ${row.eod_plan}`);
        console.log(`   高階建檔日期: ${row.eod_created_at}`);
        console.log(`   體驗課購買日期: ${row.trial_purchase_date}`);
        console.log(`   體驗課方案: ${row.trial_package_name}`);
        console.log('');
      });
    }

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

checkConvertedStudents();

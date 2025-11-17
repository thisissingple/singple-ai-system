import { createPool } from '../server/services/pg-client';

async function checkMissingDealDate() {
  const pool = createPool();

  try {
    const query = `
      -- 查詢 eods_for_closers 中缺少成交日期的學生
      SELECT
        student_name,
        student_email,
        actual_amount,
        deal_date,
        created_at,
        (SELECT MIN(class_date)
         FROM trial_class_attendance
         WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(d.student_email))
        ) AS earliest_class_date,
        (SELECT purchase_date
         FROM trial_class_purchases
         WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(d.student_email))
         LIMIT 1
        ) AS trial_purchase_date
      FROM eods_for_closers d
      WHERE deal_date IS NULL
      ORDER BY student_name;
    `;

    const result = await pool.query(query);
    console.log('\n📊 已轉高但缺少成交日期的學生（eods_for_closers）：\n');
    console.log('總數：', result.rows.length, '位\n');

    if (result.rows.length === 0) {
      console.log('✅ 沒有缺少成交日期的記錄！');
    } else {
      result.rows.forEach((row: any, idx: number) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
        console.log(`   成交金額: ${row.actual_amount || '❌ 缺少'}`);
        console.log(`   成交日期: ${row.deal_date || '❌ 缺少'}`);
        console.log(`   建檔日期: ${row.created_at || '❌ 缺少'}`);
        console.log(`   體驗課購買日期: ${row.trial_purchase_date || '❌ 缺少'}`);
        console.log(`   最早上課日期: ${row.earliest_class_date || '❌ 缺少'}`);
        console.log('');
      });
    }

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

checkMissingDealDate();

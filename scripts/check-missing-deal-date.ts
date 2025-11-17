import { createPool } from '../server/services/pg-client';

async function checkMissingDealDate() {
  const pool = createPool();

  try {
    const query = `
      -- 查詢已購買高階方案但缺少成交日期的學生
      SELECT DISTINCT
        p.student_name,
        p.student_email,
        p.package_name,
        p.purchase_date,
        d.deal_date,
        d.actual_amount,
        (SELECT MIN(class_date)
         FROM trial_class_attendance
         WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(p.student_email))
        ) AS earliest_class_date
      FROM trial_class_purchases p
      LEFT JOIN eods_for_closers d
        ON LOWER(TRIM(d.student_email)) = LOWER(TRIM(p.student_email))
      WHERE (p.package_name LIKE '%高階%' OR p.package_name LIKE '%高音%')
        AND d.deal_date IS NULL
      ORDER BY p.student_name;
    `;

    const result = await pool.query(query);
    console.log('\n📊 已轉高但缺少成交日期的學生：\n');
    console.log('總數：', result.rows.length, '位\n');

    if (result.rows.length === 0) {
      console.log('✅ 沒有缺少成交日期的記錄！');
    } else {
      result.rows.forEach((row: any, idx: number) => {
        console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
        console.log(`   購買方案: ${row.package_name}`);
        console.log(`   購買日期: ${row.purchase_date}`);
        console.log(`   成交日期: ${row.deal_date || '❌ 缺少'}`);
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

import { createPool } from '../server/services/pg-client';

async function generateUpdateSQL() {
  const pool = createPool();

  try {
    const query = `
      SELECT DISTINCT
        p.student_email,
        p.student_name,
        p.package_name,
        p.purchase_date,
        (SELECT MIN(class_date)
         FROM trial_class_attendance
         WHERE LOWER(TRIM(student_email)) = LOWER(TRIM(p.student_email))
        ) AS earliest_class_date
      FROM trial_class_purchases p
      LEFT JOIN eods_for_closers d
        ON LOWER(TRIM(d.student_email)) = LOWER(TRIM(p.student_email))
      WHERE (p.package_name LIKE '%高階%' OR p.package_name LIKE '%高音%')
        AND d.deal_date IS NULL
        AND p.purchase_date IS NOT NULL
      ORDER BY p.student_name;
    `;

    const result = await pool.query(query);

    console.log('\n-- ============================================');
    console.log('-- 批次更新成交日期 SQL');
    console.log('-- 總共 ' + result.rows.length + ' 位學生需要更新');
    console.log('-- ============================================\n');

    result.rows.forEach((row: any, idx: number) => {
      const email = row.student_email.trim();
      const purchaseDate = new Date(row.purchase_date).toISOString().split('T')[0];

      console.log(`-- ${idx + 1}. ${row.student_name} (購買日期: ${purchaseDate})`);
      console.log(`UPDATE eods_for_closers`);
      console.log(`SET deal_date = '${purchaseDate}'`);
      console.log(`WHERE LOWER(TRIM(student_email)) = '${email.toLowerCase()}';`);
      console.log('');
    });

    console.log('\n-- ============================================');
    console.log('-- 注意事項：');
    console.log('-- 1. 請在 Google Sheets 或資料庫瀏覽器中執行這些 SQL');
    console.log('-- 2. 建議先備份資料');
    console.log('-- 3. 執行後重新載入體驗課總覽頁面驗證');
    console.log('-- ============================================\n');

    await pool.end();
  } catch (error: any) {
    console.error('錯誤:', error.message);
    process.exit(1);
  }
}

generateUpdateSQL();

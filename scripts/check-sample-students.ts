import { createPool } from '../server/services/pg-client';

async function checkSampleStudents() {
  const pool = createPool();

  try {
    const query = `
      -- 查詢 3 個已轉高的學生範例
      SELECT
        student_name,
        student_email,
        actual_amount,
        deal_date,
        created_at
      FROM eods_for_closers
      WHERE actual_amount IS NOT NULL
        AND actual_amount != 'NT$0.00'
        AND deal_date IS NULL
      ORDER BY student_name
      LIMIT 3;
    `;

    const result = await pool.query(query);
    console.log('\n📊 已轉高學生範例（3 位）：\n');

    result.rows.forEach((row: any, idx: number) => {
      console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
      console.log(`   成交金額: ${row.actual_amount}`);
      console.log(`   成交日期: ${row.deal_date || '❌ 缺少'}`);
      console.log(`   建檔日期 (created_at): ${row.created_at}`);
      console.log('');
    });

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

checkSampleStudents();

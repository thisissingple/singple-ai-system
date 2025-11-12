import { queryDatabase } from '../server/services/pg-client.js';

async function checkLeadSourceClosingRate() {
  // 查詢「開嗓菜單」的所有資料
  const query = `
    SELECT
      student_name,
      student_email,
      consultation_date,
      deal_date,
      is_show
    FROM eods_for_closers
    WHERE lead_source = '開嗓菜單'
      AND consultation_date IS NOT NULL
    ORDER BY consultation_date DESC
  `;

  const result = await queryDatabase(query, [], 'session');

  console.log('開嗓菜單的所有諮詢記錄：');
  console.log('總筆數:', result.rows.length);
  console.table(result.rows);

  // 計算不重複學生數
  const uniqueStudents = new Set(result.rows.map(row => row.student_email));
  console.log('\n不重複學生數:', uniqueStudents.size);
  console.log('不重複學生列表:');
  uniqueStudents.forEach(email => {
    const studentRecords = result.rows.filter(r => r.student_email === email);
    const hasDeal = studentRecords.some(r => r.deal_date !== null);
    console.log(`  - ${studentRecords[0].student_name} (${email}): ${hasDeal ? '已成交' : '未成交'}`);
  });

  // 計算成交的不重複學生數
  const dealtStudents = new Set();
  result.rows.forEach(row => {
    if (row.deal_date !== null) {
      dealtStudents.add(row.student_email);
    }
  });

  console.log('\n成交的不重複學生數:', dealtStudents.size);
  console.log('成交率 (成交學生數 / 總學生數):', (dealtStudents.size / uniqueStudents.size * 100).toFixed(1) + '%');

  // 計算成交筆數
  const dealCount = result.rows.filter(r => r.deal_date !== null).length;
  console.log('\n總成交筆數:', dealCount);
  console.log('成交率 (成交筆數 / 總筆數):', (dealCount / result.rows.length * 100).toFixed(1) + '%');

  process.exit(0);
}

checkLeadSourceClosingRate().catch(console.error);

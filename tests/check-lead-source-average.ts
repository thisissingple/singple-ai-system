import { queryDatabase } from '../server/services/pg-client.js';

async function checkLeadSourceAverage() {
  // 查詢「開嗓菜單」的所有成交記錄
  const query = `
    SELECT
      student_name,
      actual_amount,
      deal_date,
      consultation_date
    FROM eods_for_closers
    WHERE lead_source = '開嗓菜單'
      AND deal_date IS NOT NULL
      AND consultation_date IS NOT NULL
    ORDER BY consultation_date DESC
  `;

  const result = await queryDatabase(query, [], 'session');
  
  console.log('開嗓菜單的所有成交記錄：');
  console.log('總筆數:', result.rows.length);
  console.table(result.rows);

  // 計算平均值
  let totalAmount = 0;
  let count = 0;
  
  result.rows.forEach(row => {
    if (row.actual_amount) {
      // 移除非數字字符
      const cleaned = String(row.actual_amount).replace(/[^0-9.-]/g, '');
      const amount = parseFloat(cleaned);
      if (!isNaN(amount)) {
        totalAmount += amount;
        count++;
        console.log(`${row.student_name}: ${cleaned} (${amount})`);
      }
    }
  });

  console.log('\n計算結果：');
  console.log('總金額:', totalAmount);
  console.log('成交人數:', count);
  console.log('平均實收:', totalAmount / count);

  process.exit(0);
}

checkLeadSourceAverage().catch(console.error);

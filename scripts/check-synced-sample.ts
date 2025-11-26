/**
 * Check sample synced records
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    console.log('\n📋 Sample synced records (first 5):');
    console.log('===============================================');

    const query = `
      SELECT
        id,
        transaction_date,
        customer_email,
        customer_name,
        amount_twd,
        payment_method,
        teacher_name,
        closer,
        setter,
        consultation_source,
        data_source,
        created_at
      FROM income_expense_records
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('❌ No records found');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`\n${index + 1}.`);
        console.log(`   ID: ${row.id}`);
        console.log(`   交易日期: ${row.transaction_date || '(無)'}`);
        console.log(`   顧客Email: ${row.customer_email || '(無)'}`);
        console.log(`   顧客姓名: ${row.customer_name || '(無)'}`);
        console.log(`   金額: ${row.amount_twd || '(無)'}`);
        console.log(`   付款方式: ${row.payment_method || '(無)'}`);
        console.log(`   授課教練: ${row.teacher_name || '(無)'}`);
        console.log(`   業績歸屬人1: ${row.closer || '(無)'}`);
        console.log(`   業績歸屬人2: ${row.setter || '(無)'}`);
        console.log(`   諮詢來源: ${row.consultation_source || '(無)'}`);
        console.log(`   資料來源: ${row.data_source || '(無)'}`);
        console.log(`   建立時間: ${row.created_at}`);
      });
    }

    // Count total records
    const countResult = await pool.query('SELECT COUNT(*) as total FROM income_expense_records');
    console.log(`\n📊 Total records: ${countResult.rows[0].total}`);

    console.log('\n===============================================\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

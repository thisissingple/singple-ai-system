/**
 * 測試資料庫連線
 */

import { queryDatabase } from '../server/services/pg-client';

async function testConnection() {
  console.log('🔍 測試資料庫連線...\n');

  try {
    console.log('📝 測試 1: SELECT NOW()');
    const result1 = await queryDatabase('SELECT NOW() as current_time');
    console.log('✅ 成功! 當前時間:', result1.rows[0].current_time);

    console.log('\n📝 測試 2: 查詢 income_expense_records 表');
    const result2 = await queryDatabase('SELECT COUNT(*) FROM income_expense_records');
    console.log('✅ 成功! 記錄數量:', result2.rows[0].count);

    console.log('\n📝 測試 3: 查詢最近 5 筆記錄');
    const result3 = await queryDatabase(`
      SELECT id, transaction_date, transaction_type, amount, description
      FROM income_expense_records
      ORDER BY transaction_date DESC
      LIMIT 5
    `);
    console.log('✅ 成功! 找到', result3.rows.length, '筆記錄');
    result3.rows.forEach(row => {
      console.log(`   - ${row.transaction_date} | ${row.transaction_type} | $${row.amount} | ${row.description || '(無描述)'}`);
    });

    console.log('\n🎉 所有測試通過！資料庫連線正常。');
  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
    console.error('錯誤詳情:', error);
  }
}

testConnection();

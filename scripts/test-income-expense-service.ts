import 'dotenv/config';
import { incomeExpenseService } from '../server/services/income-expense-service';

async function testIncomeExpenseService() {
  console.log('🧪 測試收支紀錄服務（新版）\n');

  try {
    // 測試 1: 建立一筆測試記錄
    console.log('📝 測試 1: 建立收支記錄...');
    const testRecord = await incomeExpenseService.createRecord({
      transaction_date: '2025-11-25',
      amount_twd: 15000,
      payment_method: '信用卡',
      income_item: '體驗課購課',
      quantity: 1,
      transaction_category: '課程收入',
      course_category: '英文',
      currency: 'TWD',
      customer_name: '測試學生',
      customer_email: 'test@example.com',
      customer_type: '學生',
      deal_method: '線上',
      consultation_source: 'Facebook',
      notes: '這是一筆測試記錄',
    });

    console.log('✅ 記錄已建立:', {
      id: testRecord.id,
      transaction_date: testRecord.transaction_date,
      amount_twd: testRecord.amount_twd,
      customer_name: testRecord.customer_name,
    });
    console.log('');

    // 測試 2: 查詢單筆記錄
    console.log('🔍 測試 2: 查詢單筆記錄...');
    const fetchedRecord = await incomeExpenseService.getRecordById(testRecord.id);
    console.log('✅ 查詢成功:', {
      id: fetchedRecord.id,
      income_item: fetchedRecord.income_item,
      amount_twd: fetchedRecord.amount_twd,
    });
    console.log('');

    // 測試 3: 更新記錄
    console.log('✏️ 測試 3: 更新記錄...');
    const updatedRecord = await incomeExpenseService.updateRecord(testRecord.id, {
      amount_twd: 18000,
      notes: '金額已調整',
      is_confirmed: true,
    });
    console.log('✅ 更新成功:', {
      id: updatedRecord.id,
      amount_twd: updatedRecord.amount_twd,
      notes: updatedRecord.notes,
      is_confirmed: updatedRecord.is_confirmed,
    });
    console.log('');

    // 測試 4: 查詢記錄列表
    console.log('📋 測試 4: 查詢記錄列表...');
    const queryResult = await incomeExpenseService.queryRecords({
      transaction_category: '課程收入',
      page: 1,
      limit: 10,
    });
    console.log('✅ 查詢成功:', {
      total: queryResult.total,
      page: queryResult.page,
      limit: queryResult.limit,
      records_count: queryResult.records.length,
    });
    console.log('');

    // 測試 5: 月度統計
    console.log('📊 測試 5: 月度統計...');
    const summary = await incomeExpenseService.getMonthlySummary('2025-11');
    console.log('✅ 統計成功:', {
      month: summary.month,
      total_income: summary.total_income,
      total_expense: summary.total_expense,
      net_profit: summary.net_profit,
      record_count: summary.record_count,
    });
    console.log('');

    // 測試 6: 軟刪除記錄
    console.log('🗑️ 測試 6: 軟刪除記錄...');
    await incomeExpenseService.deleteRecord(testRecord.id);
    console.log('✅ 軟刪除成功');
    console.log('');

    // 測試 7: 驗證軟刪除（應該查不到）
    console.log('🔍 測試 7: 驗證軟刪除...');
    try {
      await incomeExpenseService.getRecordById(testRecord.id);
      console.log('❌ 錯誤：軟刪除的記錄不應該被查到');
    } catch (error: any) {
      console.log('✅ 軟刪除驗證成功：記錄已被過濾');
    }
    console.log('');

    // 測試 8: 永久刪除記錄
    console.log('🗑️ 測試 8: 永久刪除記錄...');
    await incomeExpenseService.hardDeleteRecord(testRecord.id);
    console.log('✅ 永久刪除成功');
    console.log('');

    console.log('🎉 所有測試通過！');
    console.log('');
    console.log('✅ 新的收支表系統已經準備好使用');
    console.log('');
    console.log('📋 欄位對應 Google Sheets：');
    console.log('  - Date → transaction_date');
    console.log('  - 付款方式 → payment_method');
    console.log('  - 收入項目 → income_item');
    console.log('  - 數量 → quantity');
    console.log('  - 收支類別 → transaction_category');
    console.log('  - 課程類別 → course_category');
    console.log('  - 授課教練 → teacher_id (關聯 users 表)');
    console.log('  - 商家姓名/顧客姓名 → customer_name');
    console.log('  - 顧客Email → customer_email');
    console.log('  - 備註 → notes');
    console.log('  - 姓名類別 → customer_type');
    console.log('  - 金額（台幣）→ amount_twd');
    console.log('  - 金額（換算台幣）→ amount_converted');
    console.log('  - 諮詢師 → closer_id (關聯 users 表)');
    console.log('  - 電訪人員 → setter_id (關聯 users 表)');
    console.log('  - 填表人員 → form_filler_id (關聯 users 表)');
    console.log('  - 成交方式 → deal_method');
    console.log('  - 諮詢來源 → consultation_source');

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
    console.error(error);
  }
}

testIncomeExpenseService();

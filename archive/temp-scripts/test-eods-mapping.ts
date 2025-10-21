/**
 * 測試 EODs for Closers 的欄位對應
 */

import { transformRowData, detectMissingMappings } from './configs/sheet-field-mappings-complete';

// 從實際 raw_data 提取的真實欄位
const actualHeaders = [
  'Name',
  'Email',
  '（諮詢）諮詢人員',
  '（諮詢）成交日期',
  '（諮詢）諮詢日期',
  '提交表單時間',
  '（諮詢）備註',
  '（諮詢）電話負責人',
  '（諮詢）是否上線',
  '（諮詢）名單來源',
  '（諮詢）諮詢結果',
  '（諮詢）成交方案',
  '（諮詢）方案數量',
  '（諮詢）付款方式',
  '（諮詢）分期期數',
  '（諮詢）方案價格',
  '（諮詢）實收金額',
  '月份',
  '年份',
  '週別'
];

// 模擬實際資料
const sampleRow = {
  'Name': 'Law Joey',
  'Email': 'law-joey@hotmail.com',
  '（諮詢）諮詢人員': '47',
  '（諮詢）成交日期': '2025/9/23',
  '（諮詢）諮詢日期': '2025/9/23',
  '提交表單時間': '2025/9/23 15:27',
  '（諮詢）備註': '性別：｜年齡：25–34歲｜職業： ｜諮詢師筆記：文字成交',
  '（諮詢）電話負責人': '',
  '（諮詢）是否上線': '已上線',
  '（諮詢）名單來源': '明星導師計劃2.0',
  '（諮詢）諮詢結果': '已成交',
  '（諮詢）成交方案': '初學專案（4堂）',
  '（諮詢）方案數量': '1',
  '（諮詢）付款方式': '信用卡',
  '（諮詢）分期期數': '1',
  '（諮詢）方案價格': '$4,000.00',
  '（諮詢）實收金額': '$4,000.00',
  '月份': '9月',
  '年份': '2025',
  '週別': '第39週'
};

console.log('=== 測試 EODs for Closers 欄位對應 ===\n');

// 測試 1: 檢測缺失的欄位
console.log('📋 測試 1: 檢測缺失的欄位');
const missingFields = detectMissingMappings(actualHeaders, 'eods_for_closers');
if (missingFields.length === 0) {
  console.log('✅ 所有欄位都已正確映射！');
} else {
  console.log(`❌ 發現 ${missingFields.length} 個缺失的欄位映射：`);
  missingFields.forEach(field => {
    console.log(`  - ${field.googleSheetColumn} → ${field.supabaseColumn} (${field.required ? '必填' : '選填'})`);
  });
}

// 測試 2: 轉換資料
console.log('\n📋 測試 2: 轉換實際資料');
const transformed = transformRowData(sampleRow, 'eods_for_closers');

console.log('\n🔍 轉換結果:');
console.log('  student_name:', transformed.student_name);
console.log('  student_email:', transformed.student_email);
console.log('  closer_name:', transformed.closer_name);
console.log('  deal_date:', transformed.deal_date);
console.log('  consultation_date:', transformed.consultation_date);
console.log('  form_submitted_at:', transformed.form_submitted_at);
console.log('  caller_name:', transformed.caller_name || '(null)');
console.log('  is_online:', transformed.is_online);
console.log('  lead_source:', transformed.lead_source);
console.log('  consultation_result:', transformed.consultation_result);
console.log('  deal_package:', transformed.deal_package);
console.log('  package_quantity:', transformed.package_quantity);
console.log('  payment_method:', transformed.payment_method);
console.log('  installment_periods:', transformed.installment_periods);
console.log('  package_price:', transformed.package_price);
console.log('  actual_amount:', transformed.actual_amount);
console.log('  month:', transformed.month);
console.log('  year:', transformed.year);
console.log('  week_number:', transformed.week_number);
console.log('  notes:', transformed.notes);

console.log('\n📊 raw_data 包含的欄位:');
console.log('  ', Object.keys(transformed.raw_data).join(', '));

console.log('\n✅ 測試完成！');

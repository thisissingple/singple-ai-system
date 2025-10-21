/**
 * 測試欄位對應和同步功能
 */

import { transformRowData, detectMissingMappings } from './configs/sheet-field-mappings-complete';

// 模擬體驗課上課記錄表的資料
const trialClassAttendanceHeaders = [
  '姓名',
  'email',
  '上課日期',
  '授課老師',
  '是否已確認',
  '未聯繫原因',
  '體驗課文字檔'
];

const sampleRow = {
  '姓名': '張小明',
  'email': 'ming@example.com',
  '上課日期': '2025-01-15',
  '授課老師': '王老師',
  '是否已確認': 'true',
  '未聯繫原因': '',
  '體驗課文字檔': '學生表現良好，建議繼續進階課程'
};

// 模擬體驗課購買記錄表的資料
const trialClassPurchaseHeaders = [
  '姓名',
  'email',
  '購買日期',
  '課程類型',
  '價格'
];

const samplePurchaseRow = {
  '姓名': '張小明',
  'email': 'ming@example.com',
  '購買日期': '2025-01-20',
  '課程類型': '進階英文課程',
  '價格': '12000'
};

console.log('=== 測試欄位對應 ===\n');

// 測試 1: 檢測缺失的欄位映射
console.log('📋 測試 1: 檢測體驗課上課記錄表的缺失欄位');
const missingAttendance = detectMissingMappings(trialClassAttendanceHeaders, 'trial_class_attendance');
if (missingAttendance.length === 0) {
  console.log('✅ 所有欄位都已正確映射！');
} else {
  console.log('❌ 發現缺失的欄位映射：');
  missingAttendance.forEach(field => {
    console.log(`  - ${field.googleSheetColumn} → ${field.supabaseColumn} (${field.required ? '必填' : '選填'})`);
  });
}

console.log('\n📋 測試 2: 檢測體驗課購買記錄表的缺失欄位');
const missingPurchase = detectMissingMappings(trialClassPurchaseHeaders, 'trial_class_purchase');
if (missingPurchase.length === 0) {
  console.log('✅ 所有欄位都已正確映射！');
} else {
  console.log('❌ 發現缺失的欄位映射：');
  missingPurchase.forEach(field => {
    console.log(`  - ${field.googleSheetColumn} → ${field.supabaseColumn} (${field.required ? '必填' : '選填'})`);
  });
}

// 測試 2: 轉換資料
console.log('\n📋 測試 3: 轉換體驗課上課記錄資料');
const transformedAttendance = transformRowData(sampleRow, 'trial_class_attendance');
console.log('原始資料:', sampleRow);
console.log('轉換後資料:', JSON.stringify(transformedAttendance, null, 2));

console.log('\n📋 測試 4: 轉換體驗課購買記錄資料');
const transformedPurchase = transformRowData(samplePurchaseRow, 'trial_class_purchase');
console.log('原始資料:', samplePurchaseRow);
console.log('轉換後資料:', JSON.stringify(transformedPurchase, null, 2));

console.log('\n✅ 測試完成！');

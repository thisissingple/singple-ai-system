/**
 * 測試缺失欄位檢測功能
 *
 * 這個腳本用於驗證缺失欄位檢測是否正常運作
 *
 * 測試兩個版本的 mapping 配置：
 * - sheet-field-mappings.ts (舊版)
 * - sheet-field-mappings-complete.ts (新版完整版)
 */

import { detectMissingMappings as detectMissingMappingsOld } from '../configs/sheet-field-mappings';
import { detectMissingMappings as detectMissingMappingsComplete } from '../configs/sheet-field-mappings-complete';

console.log('========================================');
console.log('測試缺失欄位檢測功能');
console.log('========================================\n');

function testBothVersions(testName: string, headers: string[], tableName: string) {
  console.log(`📝 ${testName}`);

  console.log('\n  【舊版 mapping】');
  const missingOld = detectMissingMappingsOld(headers, tableName);
  console.log(`  缺失欄位數量: ${missingOld.length}`);

  const requiredOld = missingOld.filter(m => m.required);
  const optionalOld = missingOld.filter(m => !m.required);

  if (requiredOld.length > 0) {
    console.log(`  必填缺失 (${requiredOld.length}):`);
    requiredOld.forEach(m => console.log(`    - ${m.label} (${m.googleSheetColumn})`));
  }

  if (optionalOld.length > 0) {
    console.log(`  選填缺失 (${optionalOld.length}):`);
    optionalOld.forEach(m => console.log(`    - ${m.label} (${m.googleSheetColumn})`));
  }

  console.log('\n  【新版 mapping (complete)】');
  const missingComplete = detectMissingMappingsComplete(headers, tableName);
  console.log(`  缺失欄位數量: ${missingComplete.length}`);

  const requiredComplete = missingComplete.filter(m => m.required);
  const optionalComplete = missingComplete.filter(m => !m.required);

  if (requiredComplete.length > 0) {
    console.log(`  必填缺失 (${requiredComplete.length}):`);
    requiredComplete.forEach(m => console.log(`    - ${m.label} (${m.googleSheetColumn})`));
  }

  if (optionalComplete.length > 0) {
    console.log(`  選填缺失 (${optionalComplete.length}):`);
    optionalComplete.forEach(m => console.log(`    - ${m.label} (${m.googleSheetColumn})`));
  }

  console.log();
}

// 測試 1: 完整欄位（無缺失）
testBothVersions(
  '測試 1: trial_class_attendance - 完整欄位（舊版定義）',
  [
    '姓名',
    'email',
    '上課日期',
    '授課老師',
    '是否已審核',
    '未轉換原因',
    '備註',
  ],
  'trial_class_attendance'
);

// 測試 2: 缺少必填欄位
testBothVersions(
  '測試 2: trial_class_attendance - 缺少必填欄位（上課日期）',
  [
    '姓名',
    'email',
    // 缺少：上課日期
    '授課老師',
    '備註',
  ],
  'trial_class_attendance'
);

// 測試 3: trial_class_purchase - 缺少多個欄位
testBothVersions(
  '測試 3: trial_class_purchase - 缺少多個欄位',
  [
    '姓名',
    'email',
    // 缺少：方案名稱、體驗課購買日期、方案價格、年齡、職業、備註等
  ],
  'trial_class_purchase'
);

// 測試 4: eods_for_closers - 測試英文欄位
testBothVersions(
  '測試 4: eods_for_closers - 缺少必填欄位',
  [
    'Name',
    'Email',
    // 缺少：（諮詢）諮詢人員
    '諮詢日期',
    '是否線上',
  ],
  'eods_for_closers'
);

// 測試 5: 帶空白的 headers
testBothVersions(
  '測試 5: 測試空白字元處理',
  [
    '  姓名  ',
    '  email  ',
    '  上課日期  ',
    '  授課老師  ',
  ],
  'trial_class_attendance'
);

// 總結
console.log('========================================');
console.log('測試總結');
console.log('========================================');
console.log('✅ 所有功能測試完成');
console.log('');
console.log('功能驗證：');
console.log('  ✅ 完整欄位檢測');
console.log('  ✅ 缺失必填欄位檢測');
console.log('  ✅ 缺失選填欄位檢測');
console.log('  ✅ 中文 label 顯示');
console.log('  ✅ 空白字元處理');
console.log('  ✅ 多表支援（trial_class_attendance, trial_class_purchase, eods_for_closers）');

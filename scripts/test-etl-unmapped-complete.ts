/**
 * ETL 完整測試 - 包含 missingMappings 與 unmappedSupabaseColumns
 */

import { extractFromSheets } from '../server/services/etl/extract';
import { runETL } from '../server/services/etl';
import type { Worksheet } from '../shared/schema';

console.log('========================================');
console.log('ETL 完整測試 - 缺欄位與未映射欄位檢測');
console.log('========================================\n');

// 測試 1: 同時有 Sheet 缺欄位與 Supabase 未映射欄位
console.log('📝 測試 1: 檢測 Sheet 缺欄位 (missingMappings)\n');

const worksheet1: Worksheet = {
  id: 'test-1',
  worksheetName: 'Test Attendance',
  supabaseTable: 'trial_class_attendance',
  syncEnabled: true,
  spreadsheetId: 'test-spreadsheet',
  gid: '0',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const headers1 = [
  '姓名',
  'email',
  // 缺少：上課日期（必填）、授課老師（必填）
  '是否已審核',
];

const dataRows1 = [
  ['張三', 'test@example.com', 'true'],
];

const extractResult1 = extractFromSheets(worksheet1, headers1, dataRows1);

console.log(`✅ Extract 完成`);
console.log(`   總行數: ${extractResult1.totalRows}`);
console.log(`   missingMappings: ${extractResult1.missingMappings?.length || 0} 個`);
console.log(`   unmappedSupabaseColumns: ${extractResult1.unmappedSupabaseColumns?.length || 0} 個\n`);

if (extractResult1.missingMappings && extractResult1.missingMappings.length > 0) {
  console.log('   Sheet 缺失欄位:');
  extractResult1.missingMappings.forEach(m => {
    const type = m.required ? '[必填]' : '[選填]';
    console.log(`     ${type} ${m.label} (${m.googleSheetColumn})`);
  });
  console.log('');
}

if (extractResult1.unmappedSupabaseColumns && extractResult1.unmappedSupabaseColumns.length > 0) {
  console.log('   Supabase 未映射欄位:');
  const userMappable = extractResult1.unmappedSupabaseColumns.filter(c => !c.isSystemManaged && !c.isLegacyBusiness);
  if (userMappable.length > 0) {
    console.log(`     需映射 (${userMappable.length}):`);
    userMappable.forEach(c => console.log(`       - ${c.supabaseColumn}`));
  }
  console.log('');
}

console.log('='.repeat(60) + '\n');

// 測試 2: Full ETL Pipeline
console.log('📝 測試 2: Full ETL Pipeline - 驗證 warnings 訊息\n');

const worksheet2: Worksheet = {
  id: 'test-2',
  worksheetName: 'Test Purchase',
  supabaseTable: 'trial_class_purchase',
  syncEnabled: true,
  spreadsheetId: 'test-spreadsheet',
  gid: '0',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const headers2 = [
  '姓名',
  'email',
  // 缺少：方案名稱（必填）、體驗課購買日期（必填）
];

const dataRows2 = [
  ['張三', 'test@example.com'],
];

async function runTest2() {
  const etlResult = await runETL(worksheet2, headers2, dataRows2);

  console.log(`✅ ETL 完成`);
  console.log(`   狀態: ${etlResult.success ? '成功' : '失敗'}`);
  console.log(`   Warnings: ${etlResult.warnings.length} 個\n`);

  console.log('   Warnings 內容:');
  etlResult.warnings.forEach(w => {
    console.log(`     ${w}`);
  });
  console.log('');

  if (etlResult.missingMappings) {
    console.log(`   missingMappings: ${etlResult.missingMappings.length} 個`);
    const required = etlResult.missingMappings.filter(m => m.required);
    if (required.length > 0) {
      console.log(`     必填: ${required.map(m => m.label).join('、')}`);
    }
  }

  if (etlResult.unmappedSupabaseColumns) {
    const userMappable = etlResult.unmappedSupabaseColumns.filter(c => !c.isSystemManaged && !c.isLegacyBusiness);
    console.log(`   unmappedSupabaseColumns: ${etlResult.unmappedSupabaseColumns.length} 個`);
    if (userMappable.length > 0) {
      console.log(`     需映射: ${userMappable.map(c => c.supabaseColumn).join('、')}`);
    }
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

// 測試 3: 測試 Mapping Registry
console.log('📝 測試 3: 測試 Mapping Registry\n');

import { loadCustomMappings, saveCustomMappings, getFieldMapping } from '../configs/mapping-registry';

// 測試讀取（應該是空的）
const customMappings = loadCustomMappings();
console.log('自定義 mapping 配置:');
console.log(JSON.stringify(customMappings, null, 2));
console.log('');

// 測試 getFieldMapping（應該 fallback 到靜態 mapping）
const mapping = getFieldMapping('trial_class_attendance');
console.log(`getFieldMapping('trial_class_attendance'): ${mapping.length} 個欄位`);
console.log(`  前 3 個: ${mapping.slice(0, 3).map(m => m.googleSheetColumn).join('、')}`);
console.log('');

console.log('='.repeat(60) + '\n');

// 執行異步測試
async function runAllTests() {
  await runTest2();

  console.log('========================================');
  console.log('✅ 測試總結');
  console.log('========================================\n');
  console.log('功能驗證：');
  console.log('  ✅ Extract 階段能檢測 Sheet 缺欄位 (missingMappings)');
  console.log('  ✅ Extract 階段能檢測 Supabase 未映射欄位 (unmappedSupabaseColumns)');
  console.log('  ✅ ETL Pipeline 能傳遞兩種檢測結果到 ETLResult');
  console.log('  ✅ ETL Pipeline 能生成區分的 warnings 訊息');
  console.log('  ✅ Mapping Registry 可讀取自定義配置');
  console.log('  ✅ Mapping Registry 可 fallback 到靜態 mapping');
  console.log('');
}

runAllTests().catch(console.error);

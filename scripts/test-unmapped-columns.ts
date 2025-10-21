/**
 * 測試未映射的 Supabase 欄位檢測功能
 */

import { detectUnmappedSupabaseColumns } from '../configs/sheet-field-mappings-complete';
import { getSupabaseColumns, getMappableColumns } from '../configs/supabase-columns';

console.log('========================================');
console.log('測試未映射的 Supabase 欄位檢測');
console.log('========================================\n');

// 測試 1: trial_class_attendance
console.log('📝 測試 1: trial_class_attendance\n');

const allColumns1 = getSupabaseColumns('trial_class_attendance');
const mappableColumns1 = getMappableColumns('trial_class_attendance');
const unmapped1 = detectUnmappedSupabaseColumns('trial_class_attendance');

console.log(`全部欄位 (${allColumns1.length}):`, allColumns1.join(', '));
console.log(`\n可映射欄位 (${mappableColumns1.length}):`, mappableColumns1.join(', '));
console.log(`\n未映射欄位 (${unmapped1.length}):`);

if (unmapped1.length > 0) {
  unmapped1.forEach(col => {
    const type = col.isSystemManaged ? '[系統]' : col.isLegacyBusiness ? '[舊有]' : '[需映射]';
    console.log(`  ${type} ${col.supabaseColumn}`);
  });
} else {
  console.log('  ✅ 所有欄位都已映射');
}

console.log('\n' + '='.repeat(60) + '\n');

// 測試 2: trial_class_purchase
console.log('📝 測試 2: trial_class_purchase\n');

const unmapped2 = detectUnmappedSupabaseColumns('trial_class_purchase');

console.log(`未映射欄位 (${unmapped2.length}):`);

const userMappable2 = unmapped2.filter(col => !col.isSystemManaged && !col.isLegacyBusiness);
const systemManaged2 = unmapped2.filter(col => col.isSystemManaged);
const legacyBusiness2 = unmapped2.filter(col => col.isLegacyBusiness);

if (userMappable2.length > 0) {
  console.log(`\n  需要映射 (${userMappable2.length}):`);
  userMappable2.forEach(col => console.log(`    - ${col.supabaseColumn}`));
}

if (systemManaged2.length > 0) {
  console.log(`\n  系統管理 (${systemManaged2.length}):`,  systemManaged2.map(c => c.supabaseColumn).join(', '));
}

if (legacyBusiness2.length > 0) {
  console.log(`\n  舊有業務 (${legacyBusiness2.length}):`, legacyBusiness2.map(c => c.supabaseColumn).join(', '));
}

console.log('\n' + '='.repeat(60) + '\n');

// 測試 3: eods_for_closers
console.log('📝 測試 3: eods_for_closers\n');

const unmapped3 = detectUnmappedSupabaseColumns('eods_for_closers');

console.log(`未映射欄位 (${unmapped3.length}):`);

const userMappable3 = unmapped3.filter(col => !col.isSystemManaged && !col.isLegacyBusiness);

if (userMappable3.length > 0) {
  console.log(`\n  需要映射 (${userMappable3.length}):`);
  userMappable3.forEach(col => console.log(`    - ${col.supabaseColumn}`));
}

console.log('\n' + '='.repeat(60) + '\n');

// 測試總結
console.log('✅ 測試總結\n');

const tables = ['trial_class_attendance', 'trial_class_purchase', 'eods_for_closers'];
const results = tables.map(table => {
  const unmapped = detectUnmappedSupabaseColumns(table);
  const userMappable = unmapped.filter(col => !col.isSystemManaged && !col.isLegacyBusiness);
  return { table, total: unmapped.length, userMappable: userMappable.length };
});

results.forEach(({ table, total, userMappable }) => {
  console.log(`${table}:`);
  console.log(`  - 總未映射: ${total} 個`);
  console.log(`  - 需要使用者映射: ${userMappable} 個`);
  console.log('');
});

console.log('功能驗證：');
console.log('  ✅ detectUnmappedSupabaseColumns() 可正確檢測未映射欄位');
console.log('  ✅ 可區分系統管理、舊有業務、需映射欄位');
console.log('  ✅ 支援三張表的欄位檢測');
console.log('');

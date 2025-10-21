/**
 * Check for duplicate data in Supabase
 */

import { getSupabaseClient } from './server/services/supabase-client';

async function checkDuplicates() {
  console.log('🔍 檢查 Supabase 重複資料\n');

  const client = getSupabaseClient();
  if (!client) {
    console.log('❌ Supabase client 不可用');
    return;
  }

  // Check trial_class_attendance
  console.log('1️⃣ 檢查 trial_class_attendance 表...');
  const { data: attendance, error: attError } = await client
    .from('trial_class_attendance')
    .select('id, student_email, class_date, source_worksheet_id, origin_row_index, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (attError) {
    console.log(`❌ 錯誤: ${attError.message}\n`);
  } else {
    console.log(`✓ 總筆數: ${attendance?.length || 0}`);
    
    // Group by source_worksheet_id + origin_row_index to find duplicates
    const rowMap = new Map<string, any[]>();
    attendance?.forEach(row => {
      const key = `${row.source_worksheet_id}_${row.origin_row_index}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, []);
      }
      rowMap.get(key)!.push(row);
    });

    const duplicates = Array.from(rowMap.entries()).filter(([_, rows]) => rows.length > 1);
    console.log(`⚠️  重複記錄組數: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log(`\n範例重複記錄:`);
      duplicates.slice(0, 3).forEach(([key, rows]) => {
        console.log(`  - ${key}: ${rows.length} 筆重複`);
        rows.forEach(row => {
          console.log(`    * ID: ${row.id}, created_at: ${row.created_at}, origin_row: ${row.origin_row_index}`);
        });
      });
    }
    console.log('');
  }

  // Check trial_class_purchase
  console.log('2️⃣ 檢查 trial_class_purchase 表...');
  const { data: purchase, error: purError } = await client
    .from('trial_class_purchase')
    .select('id, student_email, purchase_date, source_worksheet_id, origin_row_index, created_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (purError) {
    console.log(`❌ 錯誤: ${purError.message}\n`);
  } else {
    console.log(`✓ 總筆數: ${purchase?.length || 0}`);
    
    const rowMap = new Map<string, any[]>();
    purchase?.forEach(row => {
      const key = `${row.source_worksheet_id}_${row.origin_row_index}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, []);
      }
      rowMap.get(key)!.push(row);
    });

    const duplicates = Array.from(rowMap.entries()).filter(([_, rows]) => rows.length > 1);
    console.log(`⚠️  重複記錄組數: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log(`\n範例重複記錄:`);
      duplicates.slice(0, 3).forEach(([key, rows]) => {
        console.log(`  - ${key}: ${rows.length} 筆重複`);
        rows.forEach(row => {
          console.log(`    * ID: ${row.id}, created_at: ${row.created_at}, origin_row: ${row.origin_row_index}`);
        });
      });
    }
    console.log('');
  }

  // Check eods_for_closers
  console.log('3️⃣ 檢查 eods_for_closers 表...');
  const { data: eods, error: eodsError } = await client
    .from('eods_for_closers')
    .select('id, student_email, source_worksheet_id, origin_row_index, created_at')
    .order('created_at', { ascending: false })
    .limit(3000);

  if (eodsError) {
    console.log(`❌ 錯誤: ${eodsError.message}\n`);
  } else {
    console.log(`✓ 總筆數: ${eods?.length || 0}`);
    
    // Group by origin_row_index + source_worksheet_id
    const rowMap = new Map<string, any[]>();
    eods?.forEach(row => {
      const key = `${row.source_worksheet_id}_${row.origin_row_index}`;
      if (!rowMap.has(key)) {
        rowMap.set(key, []);
      }
      rowMap.get(key)!.push(row);
    });

    const duplicates = Array.from(rowMap.entries()).filter(([_, rows]) => rows.length > 1);
    console.log(`⚠️  重複記錄組數 (相同來源行): ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      console.log(`\n範例重複記錄:`);
      duplicates.slice(0, 5).forEach(([key, rows]) => {
        console.log(`  - ${key}: ${rows.length} 筆重複`);
        rows.forEach(row => {
          console.log(`    * ID: ${row.id}, created_at: ${row.created_at}`);
        });
      });
    }
    console.log('');
  }

  // Summary
  console.log('📊 總結:');
  console.log(`  - trial_class_attendance: ${attendance?.length || 0} 筆`);
  console.log(`  - trial_class_purchase: ${purchase?.length || 0} 筆`);
  console.log(`  - eods_for_closers: ${eods?.length || 0} 筆`);
  console.log('');
  
  console.log('💡 建議:');
  console.log('  如果有重複資料，可以執行以下操作:');
  console.log('  1. 清空 Supabase 所有表資料');
  console.log('  2. 重新同步一次（確保不會重複插入）');
}

checkDuplicates()
  .then(() => {
    console.log('\n✓ 檢查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 錯誤:', error);
    process.exit(1);
  });

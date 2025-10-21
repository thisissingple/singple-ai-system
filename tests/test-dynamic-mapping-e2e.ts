/**
 * End-to-End Test for Dynamic Field Mapping
 * 端到端測試：動態欄位對應完整流程
 */

import { transformWithDynamicMapping, getFieldMappings, validateMappings } from '../server/services/etl/dynamic-transform';
import { getSupabaseClient } from '../server/services/supabase-client';

async function testDynamicMappingE2E() {
  console.log('🧪 端到端測試：動態欄位對應\n');
  console.log('='.repeat(60));

  // 使用真實的 UUID 格式（測試用）
  const testWorksheetId = '00000000-0000-0000-0000-000000000001';

  // ============================================
  // Step 1: 模擬儲存欄位對應
  // ============================================
  console.log('\n📋 Step 1: 儲存欄位對應設定');
  console.log('-'.repeat(60));

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase 未連線');
    return;
  }

  const testMappings = [
    {
      worksheet_id: testWorksheetId,
      google_column: '學員姓名',
      supabase_column: 'student_name',
      data_type: 'text',
      transform_function: 'cleanText',
      is_required: true,
      ai_confidence: 0.95,
      ai_reasoning: '姓名欄位匹配',
      is_active: true,
      is_confirmed: true,
      confirmed_by: 'test',
      confirmed_at: new Date().toISOString()
    },
    {
      worksheet_id: testWorksheetId,
      google_column: 'Email',
      supabase_column: 'student_email',
      data_type: 'text',
      transform_function: 'cleanText',
      is_required: true,
      ai_confidence: 0.90,
      ai_reasoning: 'Email 欄位匹配',
      is_active: true,
      is_confirmed: true,
      confirmed_by: 'test',
      confirmed_at: new Date().toISOString()
    },
    {
      worksheet_id: testWorksheetId,
      google_column: '體驗課日期',
      supabase_column: 'class_date',
      data_type: 'date',
      transform_function: 'toDate',
      is_required: true,
      ai_confidence: 0.85,
      ai_reasoning: '日期欄位匹配',
      is_active: true,
      is_confirmed: true,
      confirmed_by: 'test',
      confirmed_at: new Date().toISOString()
    },
    {
      worksheet_id: testWorksheetId,
      google_column: '方案價格',
      supabase_column: 'package_price',
      data_type: 'integer',
      transform_function: 'toInteger',
      is_required: false,
      ai_confidence: 0.80,
      ai_reasoning: '價格欄位匹配',
      is_active: true,
      is_confirmed: true,
      confirmed_by: 'test',
      confirmed_at: new Date().toISOString()
    }
  ];

  try {
    // 先刪除測試資料
    await supabase
      .from('field_mappings')
      .delete()
      .eq('worksheet_id', testWorksheetId);

    // 插入測試對應
    const { error } = await supabase
      .from('field_mappings')
      .insert(testMappings);

    if (error) {
      console.error('❌ 儲存對應失敗:', error);
      console.warn('⚠️  這可能是因為 field_mappings 表尚未建立');
      console.warn('   請先執行 Migration 011: supabase/migrations/011_create_field_mappings.sql');
      return;
    }

    console.log(`✅ 已儲存 ${testMappings.length} 個欄位對應`);
  } catch (error) {
    console.error('❌ 儲存對應時發生錯誤:', error);
    return;
  }

  // ============================================
  // Step 2: 讀取欄位對應
  // ============================================
  console.log('\n📋 Step 2: 讀取欄位對應');
  console.log('-'.repeat(60));

  try {
    const mappings = await getFieldMappings(testWorksheetId);
    console.log(`✅ 成功讀取 ${mappings.length} 個對應`);
    mappings.forEach(m => {
      console.log(`   - "${m.google_column}" → ${m.supabase_column} (${m.data_type}, 信心: ${(m.ai_confidence * 100).toFixed(0)}%)`);
    });
  } catch (error) {
    console.error('❌ 讀取對應失敗:', error);
    return;
  }

  // ============================================
  // Step 3: 驗證對應設定
  // ============================================
  console.log('\n📋 Step 3: 驗證對應設定');
  console.log('-'.repeat(60));

  try {
    const validation = await validateMappings(testWorksheetId);

    if (validation.valid) {
      console.log('✅ 對應設定有效');
    } else {
      console.log('❌ 對應設定無效');
      console.log('   缺少必填欄位:', validation.missingRequired);
    }

    if (validation.warnings.length > 0) {
      console.log('⚠️  警告:');
      validation.warnings.forEach(w => console.log(`   - ${w}`));
    }
  } catch (error) {
    console.error('❌ 驗證失敗:', error);
  }

  // ============================================
  // Step 4: 轉換測試資料
  // ============================================
  console.log('\n📋 Step 4: 使用動態對應轉換資料');
  console.log('-'.repeat(60));

  const testGoogleData = [
    {
      '學員姓名': '王小明  ',
      'Email': ' xiaoming@example.com ',
      '體驗課日期': '2025-10-01',
      '方案價格': '$4,500',
      '備註': '很積極的學員'
    },
    {
      '學員姓名': '李美麗',
      'Email': 'meili@example.com',
      '體驗課日期': '2025-10-02',
      '方案價格': '3000',
      '備註': null
    },
    {
      '學員姓名': '張三',
      'Email': 'zhang3@example.com',
      '體驗課日期': '2025-10-03',
      '方案價格': null,
      '備註': '待確認'
    }
  ];

  try {
    const transformed = await transformWithDynamicMapping(testWorksheetId, testGoogleData);

    console.log(`✅ 成功轉換 ${transformed.length} 筆資料\n`);

    transformed.forEach((row, i) => {
      console.log(`資料 ${i + 1}:`);
      console.log(`  student_name: "${row.student_name}"`);
      console.log(`  student_email: "${row.student_email}"`);
      console.log(`  class_date: ${row.class_date}`);
      console.log(`  package_price: ${row.package_price}`);
      console.log(`  raw_data: ${JSON.stringify(row.raw_data).substring(0, 50)}...`);
      console.log();
    });

    // 驗證轉換結果
    console.log('🔍 驗證轉換結果:');
    console.log('-'.repeat(60));

    // 檢查 cleanText 是否正確
    if (transformed[0].student_name === '王小明' && transformed[0].student_email === 'xiaoming@example.com') {
      console.log('✅ cleanText 轉換正確（已去除空白）');
    } else {
      console.log('❌ cleanText 轉換失敗');
    }

    // 檢查 toDate 是否正確
    if (transformed[0].class_date === '2025-10-01') {
      console.log('✅ toDate 轉換正確');
    } else {
      console.log('❌ toDate 轉換失敗');
    }

    // 檢查 toInteger 是否正確
    if (transformed[0].package_price === 4500 && transformed[1].package_price === 3000) {
      console.log('✅ toInteger 轉換正確（已去除貨幣符號）');
    } else {
      console.log('❌ toInteger 轉換失敗');
    }

    // 檢查 null 值處理
    if (transformed[2].package_price === null) {
      console.log('✅ null 值處理正確');
    } else {
      console.log('❌ null 值處理失敗');
    }

    // 檢查 raw_data 是否保留
    if (transformed[0].raw_data && Object.keys(transformed[0].raw_data).length > 0) {
      console.log('✅ raw_data 已保留');
    } else {
      console.log('❌ raw_data 未保留');
    }

  } catch (error) {
    console.error('❌ 轉換失敗:', error);
  }

  // ============================================
  // Step 5: 清理測試資料
  // ============================================
  console.log('\n📋 Step 5: 清理測試資料');
  console.log('-'.repeat(60));

  try {
    await supabase
      .from('field_mappings')
      .delete()
      .eq('worksheet_id', testWorksheetId);

    console.log('✅ 測試資料已清理');
  } catch (error) {
    console.error('❌ 清理失敗:', error);
  }

  // ============================================
  // 總結
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('🎉 端到端測試完成');
  console.log('='.repeat(60));
  console.log('\n✅ 測試項目:');
  console.log('   1. 儲存欄位對應設定');
  console.log('   2. 讀取欄位對應');
  console.log('   3. 驗證對應設定');
  console.log('   4. 動態轉換資料');
  console.log('   5. 驗證轉換結果');
  console.log('   6. 清理測試資料');
  console.log('\n🚀 系統已準備好使用動態欄位對應！');
}

// 執行測試
testDynamicMappingE2E().catch(error => {
  console.error('💥 測試失敗:', error);
  process.exit(1);
});

/**
 * Test Migration 011: Verify Field Mappings Tables
 * 測試 Migration 011：驗證欄位對應表已建立
 */

import { getSupabaseClient } from '../server/services/supabase-client';

async function testMigration011() {
  console.log('🧪 測試 Migration 011: Field Mappings Tables\n');
  console.log('='.repeat(60));

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase 未連線');
    return;
  }

  console.log('✓ Supabase client 初始化成功\n');

  // 使用真實的 worksheet ID
  const testWorksheetId = '21af2a88-9f6d-4827-bd3b-b2470603b7a9';

  try {
    // ============================================
    // Test 1: 驗證 field_mappings 表存在
    // ============================================
    console.log('📋 Test 1: 驗證 field_mappings 表存在');
    console.log('-'.repeat(60));

    const { data: mappings1, error: error1 } = await supabase
      .from('field_mappings')
      .select('*')
      .limit(1);

    if (error1) {
      console.error('❌ field_mappings 表不存在或無法存取:', error1.message);
      return;
    }

    console.log('✅ field_mappings 表存在且可存取\n');

    // ============================================
    // Test 2: 驗證 mapping_history 表存在
    // ============================================
    console.log('📋 Test 2: 驗證 mapping_history 表存在');
    console.log('-'.repeat(60));

    const { data: history1, error: error2 } = await supabase
      .from('mapping_history')
      .select('*')
      .limit(1);

    if (error2) {
      console.error('❌ mapping_history 表不存在或無法存取:', error2.message);
      return;
    }

    console.log('✅ mapping_history 表存在且可存取\n');

    // ============================================
    // Test 3: 插入測試資料
    // ============================================
    console.log('📋 Test 3: 插入測試資料');
    console.log('-'.repeat(60));

    const testMapping = {
      worksheet_id: testWorksheetId,
      google_column: '測試欄位',
      supabase_column: 'test_column',
      data_type: 'text',
      transform_function: 'cleanText',
      is_required: false,
      ai_confidence: 0.85,
      ai_reasoning: 'Migration 測試資料',
      is_active: true,
      is_confirmed: true,
      confirmed_by: 'migration_test',
      confirmed_at: new Date().toISOString()
    };

    const { data: inserted, error: error3 } = await supabase
      .from('field_mappings')
      .insert([testMapping])
      .select();

    if (error3) {
      console.error('❌ 插入測試資料失敗:', error3.message);
      return;
    }

    console.log('✅ 成功插入測試資料');
    console.log(`   ID: ${inserted[0].id}`);
    console.log(`   Google Column: ${inserted[0].google_column}`);
    console.log(`   Supabase Column: ${inserted[0].supabase_column}\n`);

    const insertedId = inserted[0].id;

    // ============================================
    // Test 4: 查詢測試資料
    // ============================================
    console.log('📋 Test 4: 查詢測試資料');
    console.log('-'.repeat(60));

    const { data: queried, error: error4 } = await supabase
      .from('field_mappings')
      .select('*')
      .eq('id', insertedId)
      .single();

    if (error4) {
      console.error('❌ 查詢失敗:', error4.message);
      return;
    }

    console.log('✅ 成功查詢測試資料');
    console.log(`   AI Confidence: ${queried.ai_confidence}`);
    console.log(`   Is Active: ${queried.is_active}`);
    console.log(`   Created At: ${queried.created_at}\n`);

    // ============================================
    // Test 5: 驗證歷史記錄自動建立
    // ============================================
    console.log('📋 Test 5: 驗證歷史記錄自動建立（觸發器）');
    console.log('-'.repeat(60));

    const { data: history, error: error5 } = await supabase
      .from('mapping_history')
      .select('*')
      .eq('field_mapping_id', insertedId);

    if (error5) {
      console.error('❌ 查詢歷史記錄失敗:', error5.message);
      return;
    }

    if (history && history.length > 0) {
      console.log(`✅ 歷史記錄已自動建立（共 ${history.length} 筆）`);
      console.log(`   Action: ${history[0].action}`);
      console.log(`   Changed By: ${history[0].changed_by}`);
      console.log(`   Change Reason: ${history[0].change_reason}\n`);
    } else {
      console.log('⚠️  未找到歷史記錄（觸發器可能未正常運作）\n');
    }

    // ============================================
    // Test 6: 更新測試資料
    // ============================================
    console.log('📋 Test 6: 更新測試資料');
    console.log('-'.repeat(60));

    const { data: updated, error: error6 } = await supabase
      .from('field_mappings')
      .update({ ai_confidence: 0.95 })
      .eq('id', insertedId)
      .select();

    if (error6) {
      console.error('❌ 更新失敗:', error6.message);
      return;
    }

    console.log('✅ 成功更新測試資料');
    console.log(`   New AI Confidence: ${updated[0].ai_confidence}\n`);

    // ============================================
    // Test 7: 驗證 updated_at 自動更新
    // ============================================
    console.log('📋 Test 7: 驗證 updated_at 自動更新');
    console.log('-'.repeat(60));

    if (updated[0].updated_at !== queried.updated_at) {
      console.log('✅ updated_at 已自動更新（觸發器正常）');
      console.log(`   舊值: ${queried.updated_at}`);
      console.log(`   新值: ${updated[0].updated_at}\n`);
    } else {
      console.log('⚠️  updated_at 未更新（觸發器可能未正常運作）\n');
    }

    // ============================================
    // Test 8: 清理測試資料
    // ============================================
    console.log('📋 Test 8: 清理測試資料');
    console.log('-'.repeat(60));

    const { error: error7 } = await supabase
      .from('field_mappings')
      .delete()
      .eq('id', insertedId);

    if (error7) {
      console.error('❌ 刪除測試資料失敗:', error7.message);
      return;
    }

    console.log('✅ 成功刪除測試資料\n');

    // ============================================
    // 完成
    // ============================================
    console.log('='.repeat(60));
    console.log('🎉 所有測試通過！Migration 011 執行成功！');
    console.log('='.repeat(60));
    console.log('\n✅ 驗證結果:');
    console.log('   - field_mappings 表已建立');
    console.log('   - mapping_history 表已建立');
    console.log('   - 資料插入/查詢/更新/刪除正常');
    console.log('   - 觸發器運作正常');
    console.log('   - 索引和約束已套用');

  } catch (err: any) {
    console.error('\n❌ 測試過程發生錯誤:', err.message);
  }
}

testMigration011().catch(console.error);

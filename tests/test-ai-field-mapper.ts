/**
 * Test AI Field Mapper Service
 * 測試 AI 欄位對應功能
 */

import { createAIFieldMapper } from '../server/services/ai-field-mapper';

async function testAIFieldMapper() {
  console.log('🧪 測試 AI Field Mapper\n');

  const mapper = createAIFieldMapper();

  // ============================================
  // Test Case 1: trial_class_attendance 欄位
  // ============================================
  console.log('📋 Test 1: 體驗課上課記錄表');
  console.log('─'.repeat(60));

  const googleColumns1 = [
    '學員姓名',
    'Email',
    '體驗課日期',
    '老師',
    '是否已審核',
    '未成交原因',
    '課程內容記錄',
    '備註'
  ];

  const supabaseColumns1 = [
    'student_name',
    'student_email',
    'class_date',
    'teacher_name',
    'is_reviewed',
    'no_conversion_reason',
    'class_transcript',
    'notes'
  ];

  try {
    const result1 = await mapper.analyzeAndSuggest(
      googleColumns1,
      supabaseColumns1,
      'trial_class_attendance',
      '體驗課上課記錄'
    );

    console.log(`\n✅ 分析完成 (整體信心: ${(result1.overallConfidence * 100).toFixed(1)}%)\n`);

    console.log('📊 對應建議:');
    result1.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. "${s.googleColumn}" → ${s.supabaseColumn}`);
      console.log(`   信心: ${(s.confidence * 100).toFixed(0)}% | 型別: ${s.dataType} | 必填: ${s.isRequired}`);
      console.log(`   轉換: ${s.transformFunction || '無'}`);
      console.log(`   原因: ${s.reasoning}`);
      console.log();
    });

    if (result1.unmappedGoogleColumns.length > 0) {
      console.log('⚠️  未對應的 Google 欄位:');
      result1.unmappedGoogleColumns.forEach(col => console.log(`   - ${col}`));
      console.log();
    }

    if (result1.unmappedSupabaseColumns.length > 0) {
      console.log('ℹ️  未使用的 Supabase 欄位:');
      result1.unmappedSupabaseColumns.forEach(col => console.log(`   - ${col}`));
      console.log();
    }

  } catch (error) {
    console.error('❌ Test 1 失敗:', error);
  }

  // ============================================
  // Test Case 2: trial_class_purchase 欄位
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test 2: 體驗課購買記錄表');
  console.log('─'.repeat(60));

  const googleColumns2 = [
    '學員姓名',
    'Email',
    '購買方案',
    '購買日期',
    '方案價格',
    '年齡',
    '職業'
  ];

  const supabaseColumns2 = [
    'student_name',
    'student_email',
    'package_name',
    'purchase_date',
    'package_price',
    'age',
    'occupation',
    'notes'
  ];

  try {
    const result2 = await mapper.analyzeAndSuggest(
      googleColumns2,
      supabaseColumns2,
      'trial_class_purchase',
      '體驗課購買記錄'
    );

    console.log(`\n✅ 分析完成 (整體信心: ${(result2.overallConfidence * 100).toFixed(1)}%)\n`);

    console.log('📊 對應建議:');
    result2.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. "${s.googleColumn}" → ${s.supabaseColumn}`);
      console.log(`   信心: ${(s.confidence * 100).toFixed(0)}% | 型別: ${s.dataType}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Test 2 失敗:', error);
  }

  // ============================================
  // Test Case 3: eods_for_closers 欄位
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test 3: EODs for Closers');
  console.log('─'.repeat(60));

  const googleColumns3 = [
    '學員姓名（諮詢）',
    'Email（諮詢）',
    '諮詢師',
    '成交日期',
    '諮詢日期',
    '成交方案',
    '實際金額',
    '付款方式'
  ];

  const supabaseColumns3 = [
    'student_name',
    'student_email',
    'closer_name',
    'deal_date',
    'consultation_date',
    'deal_package',
    'actual_amount',
    'payment_method'
  ];

  try {
    const result3 = await mapper.analyzeAndSuggest(
      googleColumns3,
      supabaseColumns3,
      'eods_for_closers',
      'EODs for Closers'
    );

    console.log(`\n✅ 分析完成 (整體信心: ${(result3.overallConfidence * 100).toFixed(1)}%)\n`);

    console.log('📊 對應建議:');
    result3.suggestions.forEach((s, i) => {
      console.log(`${i + 1}. "${s.googleColumn}" → ${s.supabaseColumn}`);
      console.log(`   信心: ${(s.confidence * 100).toFixed(0)}% | 型別: ${s.dataType}`);
      console.log();
    });

  } catch (error) {
    console.error('❌ Test 3 失敗:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 測試完成');
  console.log('='.repeat(60));
}

// 執行測試
testAIFieldMapper().catch(error => {
  console.error('💥 測試執行失敗:', error);
  process.exit(1);
});

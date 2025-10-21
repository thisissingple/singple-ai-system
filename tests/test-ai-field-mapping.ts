/**
 * 測試 AI Field Mapping 功能
 */

import { AIFieldMapper } from '../server/services/ai-field-mapper';
import { readFileSync } from 'fs';

async function testAIFieldMapping() {
  console.log('=== 測試 AI 欄位對應功能 ===\n');

  // 檢查 API Key
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ 缺少 ANTHROPIC_API_KEY 環境變數');
    console.log('請在 Replit Secrets 設定 ANTHROPIC_API_KEY');
    process.exit(1);
  }

  const mapper = new AIFieldMapper();

  // 測試 1: EODs for Closers
  console.log('📋 測試 1: EODs for Closers 欄位對應');
  console.log('─'.repeat(50));

  const eodsGoogleColumns = [
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

  const eodsSupabaseColumns = [
    'student_name',
    'student_email',
    'closer_name',
    'deal_date',
    'consultation_date',
    'form_submitted_at',
    'notes',
    'caller_name',
    'is_online',
    'lead_source',
    'consultation_result',
    'deal_package',
    'package_quantity',
    'payment_method',
    'installment_periods',
    'package_price',
    'actual_amount',
    'month',
    'year',
    'week_number'
  ];

  console.log(`Google Sheets 欄位數: ${eodsGoogleColumns.length}`);
  console.log(`Supabase 欄位數: ${eodsSupabaseColumns.length}`);
  console.log('');

  try {
    console.log('🤖 呼叫 Claude API 分析欄位...');
    const result = await mapper.analyzeAndSuggest(
      eodsGoogleColumns,
      eodsSupabaseColumns,
      'eods_for_closers',
      'EODs for Closers'
    );

    console.log('\n✅ AI 分析完成！');
    console.log('');
    console.log('📊 分析結果:');
    console.log(`  - 成功對應: ${result.suggestions.length} 個欄位`);
    console.log(`  - 無法對應: ${result.unmappedGoogleColumns.length} 個 Google 欄位`);
    console.log(`  - 未使用: ${result.unmappedSupabaseColumns.length} 個 Supabase 欄位`);
    console.log(`  - 整體信心: ${(result.overallConfidence * 100).toFixed(1)}%`);
    console.log('');

    console.log('🎯 對應建議:');
    console.log('');
    result.suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .forEach((suggestion, index) => {
        const confidenceEmoji = suggestion.confidence >= 0.9 ? '🟢' :
                               suggestion.confidence >= 0.7 ? '🟡' : '🔴';
        console.log(`${index + 1}. ${confidenceEmoji} [${(suggestion.confidence * 100).toFixed(0)}%]`);
        console.log(`   Google:    "${suggestion.googleColumn}"`);
        console.log(`   Supabase:  ${suggestion.supabaseColumn}`);
        console.log(`   型別:      ${suggestion.dataType}`);
        if (suggestion.transformFunction) {
          console.log(`   轉換:      ${suggestion.transformFunction}`);
        }
        console.log(`   必填:      ${suggestion.isRequired ? '是' : '否'}`);
        console.log(`   原因:      ${suggestion.reasoning}`);
        console.log('');
      });

    if (result.unmappedGoogleColumns.length > 0) {
      console.log('⚠️  無法對應的 Google 欄位:');
      result.unmappedGoogleColumns.forEach(col => console.log(`  - ${col}`));
      console.log('');
    }

    if (result.unmappedSupabaseColumns.length > 0) {
      console.log('ℹ️  未使用的 Supabase 欄位:');
      result.unmappedSupabaseColumns.forEach(col => console.log(`  - ${col}`));
      console.log('');
    }

    // 測試 2: 體驗課上課記錄表
    console.log('\n' + '='.repeat(50));
    console.log('📋 測試 2: 體驗課上課記錄表欄位對應');
    console.log('─'.repeat(50));

    const attendanceGoogle = ['姓名', 'email', '上課日期', '授課老師', '是否已確認', '未聯繫原因', '體驗課文字檔'];
    const attendanceSupabase = ['student_name', 'student_email', 'class_date', 'teacher_name', 'is_reviewed', 'no_conversion_reason', 'class_transcript'];

    const result2 = await mapper.analyzeAndSuggest(
      attendanceGoogle,
      attendanceSupabase,
      'trial_class_attendance',
      '體驗課上課記錄表'
    );

    console.log('\n✅ AI 分析完成！');
    console.log(`  - 成功對應: ${result2.suggestions.length}/${attendanceGoogle.length}`);
    console.log(`  - 整體信心: ${(result2.overallConfidence * 100).toFixed(1)}%`);
    console.log('');

    result2.suggestions.forEach(s => {
      console.log(`  "${s.googleColumn}" → ${s.supabaseColumn} (${(s.confidence * 100).toFixed(0)}%)`);
    });

    console.log('\n');
    console.log('✅ 所有測試完成！');
    console.log('');
    console.log('💡 下一步:');
    console.log('  1. 執行 Migration (supabase/migrations/011_create_field_mappings.sql)');
    console.log('  2. 建立 API 端點儲存對應');
    console.log('  3. 開發前端 UI');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    if (error instanceof Error) {
      console.error('錯誤訊息:', error.message);
    }
    process.exit(1);
  }
}

testAIFieldMapping();

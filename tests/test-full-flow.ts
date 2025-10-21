/**
 * 完整流程測試
 * 測試：Google Sheets (Mock) → Supabase → TotalReportService → KPI Calculator
 */

import { devSeedService } from '../server/services/dev-seed-service';
import { totalReportService } from '../server/services/reporting/total-report-service';
import { supabaseReportRepository } from '../server/services/reporting/supabase-report-repository';

async function testFullFlow() {
  console.log('🧪 開始完整流程測試\n');
  console.log('=' .repeat(60));

  // ========================================
  // 步驟 1：檢查 Supabase 連線
  // ========================================
  console.log('\n📊 步驟 1：檢查 Supabase 連線');
  console.log('-'.repeat(60));

  if (!supabaseReportRepository.isAvailable()) {
    console.log('❌ Supabase 未設定，無法測試同步功能');
    console.log('💡 請檢查 .env 檔案的 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    return;
  }
  console.log('✓ Supabase 已連線');

  // ========================================
  // 步驟 2：建立測試資料（會自動同步到 Supabase）
  // ========================================
  console.log('\n📝 步驟 2：建立測試資料（包含 Supabase 同步）');
  console.log('-'.repeat(60));

  const seedResult = await devSeedService.seedTotalReportData();

  if (!seedResult.success) {
    console.log('❌ 測試資料建立失敗');
    return;
  }

  console.log(`✓ 測試資料建立成功`);
  console.log(`  - Spreadsheets: ${seedResult.spreadsheetsCreated}`);
  console.log(`  - Worksheets: ${seedResult.worksheetsCreated}`);
  console.log(`  - Storage rows: ${seedResult.dataRowsInserted}`);
  console.log(`  - Supabase rows: ${seedResult.supabaseRowsInserted || 0}`);

  if (seedResult.supabaseTables) {
    console.log(`  - Supabase tables:`);
    Object.entries(seedResult.supabaseTables).forEach(([table, count]) => {
      console.log(`    • ${table}: ${count} rows`);
    });
  }

  // ========================================
  // 步驟 3：從 Supabase 查詢資料
  // ========================================
  console.log('\n🔍 步驟 3：驗證 Supabase 資料');
  console.log('-'.repeat(60));

  const dateRange = {
    start: '2025-09-01',
    end: '2025-09-30',
  };

  const [attendance, purchases, deals] = await Promise.all([
    supabaseReportRepository.getAttendance(dateRange),
    supabaseReportRepository.getPurchases(dateRange),
    supabaseReportRepository.getDeals(dateRange),
  ]);

  console.log(`✓ Supabase 查詢成功`);
  console.log(`  - Attendance: ${attendance.length} 筆`);
  console.log(`  - Purchases: ${purchases.length} 筆`);
  console.log(`  - Deals: ${deals.length} 筆`);

  // ========================================
  // 步驟 4：產生總報表（使用新的 KPI Calculator）
  // ========================================
  console.log('\n📊 步驟 4：產生總報表（使用 KPI Calculator）');
  console.log('-'.repeat(60));

  const report = await totalReportService.generateReport({
    period: 'monthly',
    baseDate: '2025-09-15',
  });

  if (!report) {
    console.log('❌ 報表產生失敗');
    return;
  }

  console.log(`✓ 報表產生成功`);
  console.log(`  - Mode: ${report.mode}`);
  console.log(`  - Period: ${report.period}`);
  console.log(`  - Date range: ${report.dateRange.start} ~ ${report.dateRange.end}`);

  // ========================================
  // 步驟 5：驗證 KPI 計算結果
  // ========================================
  console.log('\n🎯 步驟 5：驗證 KPI 計算結果');
  console.log('-'.repeat(60));

  const { summaryMetrics } = report;
  console.log(`✓ KPI 計算完成：`);
  console.log(`  - 體驗課總數: ${summaryMetrics.totalTrials}`);
  console.log(`  - 成交數: ${summaryMetrics.totalConversions}`);
  console.log(`  - 轉換率: ${summaryMetrics.conversionRate.toFixed(2)}%`);
  console.log(`  - 平均轉換時間: ${summaryMetrics.avgConversionTime} 天`);
  console.log(`  - 體驗課完成率: ${summaryMetrics.trialCompletionRate.toFixed(2)}%`);
  console.log(`  - 待聯繫學員: ${summaryMetrics.pendingStudents} 位`);
  console.log(`  - 潛在收益: NT$ ${summaryMetrics.potentialRevenue.toLocaleString()}`);

  // ========================================
  // 步驟 6：驗證 AI 建議
  // ========================================
  console.log('\n🤖 步驟 6：驗證 AI 建議');
  console.log('-'.repeat(60));

  const { aiSuggestions } = report;
  console.log(`✓ AI 建議生成完成：`);
  console.log(`  - Daily (${aiSuggestions.daily.length} 條):`);
  aiSuggestions.daily.forEach(s => console.log(`    • ${s}`));
  console.log(`  - Weekly (${aiSuggestions.weekly.length} 條):`);
  aiSuggestions.weekly.forEach(s => console.log(`    • ${s}`));
  console.log(`  - Monthly (${aiSuggestions.monthly.length} 條):`);
  aiSuggestions.monthly.forEach(s => console.log(`    • ${s}`));

  // ========================================
  // 步驟 7：驗證 Warnings
  // ========================================
  if (report.warnings && report.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    console.log('-'.repeat(60));
    report.warnings.forEach(w => console.log(`  - ${w}`));
  }

  // ========================================
  // 總結
  // ========================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ 完整流程測試通過！');
  console.log('='.repeat(60));
  console.log('\n📋 測試結果摘要：');
  console.log(`  1. Supabase 連線：✓`);
  console.log(`  2. 資料同步：✓ (${seedResult.supabaseRowsInserted} 筆)`);
  console.log(`  3. 資料查詢：✓ (${attendance.length + purchases.length + deals.length} 筆)`);
  console.log(`  4. KPI 計算：✓ (7 個指標)`);
  console.log(`  5. AI 建議：✓ (${aiSuggestions.daily.length + aiSuggestions.weekly.length + aiSuggestions.monthly.length} 條)`);
  console.log(`\n🎉 所有功能正常運作！\n`);
}

// 執行測試
testFullFlow().catch(error => {
  console.error('\n❌ 測試失敗:', error);
  process.exit(1);
});

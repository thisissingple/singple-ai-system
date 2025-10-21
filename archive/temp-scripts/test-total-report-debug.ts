/**
 * Debug Total Report KPI Calculation
 * 檢查從 Supabase 取得的資料和 KPI 計算邏輯
 */

import { totalReportService } from './server/services/reporting/total-report-service';
import { supabaseReportRepository } from './server/services/reporting/supabase-report-repository';

async function main() {
  console.log('='.repeat(60));
  console.log('🔍 Debug Total Report KPI Calculation');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. 檢查 Supabase 連線
    console.log('1️⃣ Checking Supabase connection...');
    const isAvailable = supabaseReportRepository.isAvailable();
    console.log(`   Supabase available: ${isAvailable ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (!isAvailable) {
      console.error('❌ Supabase not available! Please check environment variables:');
      console.error('   - SUPABASE_URL');
      console.error('   - SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    // 2. 取得資料筆數
    console.log('2️⃣ Fetching table counts from Supabase...');
    const counts = await supabaseReportRepository.getTableCounts();
    console.log(`   Attendance: ${counts.attendance} records`);
    console.log(`   Purchases: ${counts.purchases} records`);
    console.log(`   Deals (EODs): ${counts.deals} records`);
    console.log('');

    if (counts.attendance === 0 && counts.purchases === 0 && counts.deals === 0) {
      console.error('⚠️  WARNING: All tables are empty!');
      console.error('   Please sync Google Sheets data to Supabase first.');
      return;
    }

    // 3. 取得 date range（使用 'all' period）
    console.log('3️⃣ Fetching data with period="all"...');
    const dateRange = totalReportService.getDateRange('all', new Date());
    console.log(`   Date range: ${dateRange.start} to ${dateRange.end}`);
    console.log('');

    const warnings: string[] = [];
    const { attendanceData, purchaseData, eodsData, dataSource } = await totalReportService.fetchRawData(dateRange, warnings);

    console.log(`   Data source: ${dataSource.toUpperCase()}`);
    console.log(`   Attendance data: ${attendanceData.length} records`);
    console.log(`   Purchase data: ${purchaseData.length} records`);
    console.log(`   EODs data: ${eodsData.length} records`);
    console.log('');

    if (warnings.length > 0) {
      console.log('   ⚠️  Warnings:');
      warnings.forEach(w => console.log(`      - ${w}`));
      console.log('');
    }

    // 4. 檢查前 3 筆資料的欄位
    console.log('4️⃣ Inspecting data fields...');
    console.log('');

    if (attendanceData.length > 0) {
      console.log('   📋 Attendance Data (first record):');
      const firstAttendance = attendanceData[0];
      console.log('      Fields:', Object.keys(firstAttendance.data).join(', '));
      console.log('      Sample data:', JSON.stringify(firstAttendance.data, null, 2).split('\n').map(l => '      ' + l).join('\n'));
      console.log('');
    }

    if (purchaseData.length > 0) {
      console.log('   💰 Purchase Data (first record):');
      const firstPurchase = purchaseData[0];
      console.log('      Fields:', Object.keys(firstPurchase.data).join(', '));
      console.log('      Sample data:', JSON.stringify(firstPurchase.data, null, 2).split('\n').map(l => '      ' + l).join('\n'));
      console.log('');
    }

    if (eodsData.length > 0) {
      console.log('   📊 EODs Data (first record):');
      const firstEod = eodsData[0];
      console.log('      Fields:', Object.keys(firstEod.data).join(', '));
      console.log('      Sample data:', JSON.stringify(firstEod.data, null, 2).split('\n').map(l => '      ' + l).join('\n'));
      console.log('');
    }

    // 5. 產生完整報表
    console.log('5️⃣ Generating total report...');
    const report = await totalReportService.generateReport({
      period: 'all',
      baseDate: new Date().toISOString().split('T')[0],
    });

    if (!report) {
      console.error('❌ Failed to generate report');
      return;
    }

    console.log('   ✅ Report generated successfully');
    console.log('');

    // 6. 顯示 KPI 結果
    console.log('6️⃣ Summary Metrics (KPIs):');
    console.log('');
    console.log('   📊 轉換率 (Conversion Rate):', `${report.summaryMetrics.conversionRate.toFixed(2)}%`);
    console.log('   ⏱️  平均轉換時間 (Avg Conversion Time):', `${report.summaryMetrics.avgConversionTime} days`);
    console.log('   ✅ 體驗課完成率 (Trial Completion Rate):', `${report.summaryMetrics.trialCompletionRate.toFixed(2)}%`);
    console.log('   👥 待追蹤學員 (Pending Students):', report.summaryMetrics.pendingStudents);
    console.log('   💰 潛在收益 (Potential Revenue):', `NT$ ${report.summaryMetrics.potentialRevenue.toLocaleString()}`);
    console.log('   📚 體驗課總數 (Total Trials):', report.summaryMetrics.totalTrials);
    console.log('   🎯 成交總數 (Total Conversions):', report.summaryMetrics.totalConversions);
    console.log('');

    // 7. 顯示漏斗數據
    console.log('7️⃣ Funnel Data:');
    report.funnelData.forEach(stage => {
      console.log(`   ${stage.stage}: ${stage.value}`);
    });
    console.log('');

    // 8. 顯示教師數據（前 5 名）
    console.log('8️⃣ Teacher Insights (Top 5):');
    report.teacherInsights.slice(0, 5).forEach((teacher, idx) => {
      console.log(`   ${idx + 1}. ${teacher.teacherName}`);
      console.log(`      Classes: ${teacher.classCount}, Conversion: ${teacher.conversionRate}%, Revenue: NT$ ${teacher.totalRevenue.toLocaleString()}`);
    });
    console.log('');

    // 9. 顯示學生數據（前 5 名）
    console.log('9️⃣ Student Insights (First 5):');
    report.studentInsights.slice(0, 5).forEach((student, idx) => {
      console.log(`   ${idx + 1}. ${student.studentName} (${student.email})`);
      console.log(`      Status: ${student.status}, Intent Score: ${student.intentScore}, Teacher: ${student.teacherName}`);
    });
    console.log('');

    // 10. 檢查警告
    if (report.warnings && report.warnings.length > 0) {
      console.log('⚠️  Report Warnings:');
      report.warnings.forEach(w => console.log(`   - ${w}`));
      console.log('');
    }

    console.log('='.repeat(60));
    console.log('✅ Debug Complete');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('');
    console.error('❌ Error:', error);
    console.error('');
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
  }
}

main();

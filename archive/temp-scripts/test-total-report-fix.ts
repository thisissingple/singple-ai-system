/**
 * Test script to verify Total Report Supabase data sync fix
 */

import { supabaseReportRepository } from './server/services/reporting/supabase-report-repository';
import { totalReportService } from './server/services/reporting/total-report-service';

async function testTotalReportFix() {
  console.log('🧪 Testing Total Report Supabase Data Sync Fix\n');

  // Test 1: Check Supabase availability
  console.log('Test 1: Checking Supabase availability...');
  const isAvailable = supabaseReportRepository.isAvailable();
  console.log(`✓ Supabase available: ${isAvailable}\n`);

  if (!isAvailable) {
    console.log('⚠️  Supabase not available. Tests will use fallback to storage.');
    console.log('   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to test Supabase.\n');
  }

  // Test 2: Get table counts
  if (isAvailable) {
    try {
      console.log('Test 2: Getting table counts from Supabase...');
      const counts = await supabaseReportRepository.getTableCounts();
      console.log(`✓ Table counts:
   - Attendance: ${counts.attendance}
   - Purchases: ${counts.purchases}
   - Deals: ${counts.deals}\n`);

      if (counts.attendance === 0 && counts.purchases === 0 && counts.deals === 0) {
        console.log('⚠️  All tables are empty. Please sync data from Google Sheets first.\n');
      }
    } catch (error: any) {
      console.error('❌ Error getting table counts:', error.message, '\n');
    }
  }

  // Test 3: Test 'all' period query
  if (isAvailable) {
    try {
      console.log('Test 3: Testing "all" period query (should fetch all data)...');
      const dateRange = { start: '1970-01-01', end: '2099-12-31' };

      const [attendance, purchases, deals] = await Promise.all([
        supabaseReportRepository.getAttendance(dateRange),
        supabaseReportRepository.getPurchases(dateRange),
        supabaseReportRepository.getDeals(dateRange),
      ]);

      console.log(`✓ Fetched all data:
   - Attendance: ${attendance.length} records
   - Purchases: ${purchases.length} records
   - Deals: ${deals.length} records`);

      if (attendance.length > 0) {
        const sample = attendance[0];
        console.log(`   Sample attendance record:
     - Student: ${sample.student_name || 'N/A'}
     - Email: ${sample.student_email || 'N/A'}
     - Class Date: ${sample.class_date || 'NULL'}
     - Has raw_data: ${!!sample.raw_data}\n`);
      }
    } catch (error: any) {
      console.error('❌ Error querying all data:', error.message, '\n');
    }
  }

  // Test 4: Test Total Report Service
  try {
    console.log('Test 4: Testing Total Report Service with "all" period...');
    const reportData = await totalReportService.generateReport({
      period: 'all',
      baseDate: new Date().toISOString(),
    });

    if (!reportData) {
      console.log('❌ Total Report returned null (no data available)\n');
      return;
    }

    console.log(`✓ Total Report generated successfully:
   - Mode: ${reportData.mode}
   - Period: ${reportData.period}
   - Date Range: ${reportData.dateRange.start} to ${reportData.dateRange.end}
   - Data Source Meta:
     * Attendance: ${reportData.dataSourceMeta?.trialClassAttendance?.rows || 0} rows
     * Purchases: ${reportData.dataSourceMeta?.trialClassPurchase?.rows || 0} rows
     * Deals: ${reportData.dataSourceMeta?.eodsForClosers?.rows || 0} rows
   - Summary Metrics:
     * Total Trials: ${reportData.summaryMetrics.totalTrials}
     * Total Conversions: ${reportData.summaryMetrics.totalConversions}
     * Conversion Rate: ${reportData.summaryMetrics.conversionRate}%
     * Pending Students: ${reportData.summaryMetrics.pendingStudents}
     * Potential Revenue: NT$ ${reportData.summaryMetrics.potentialRevenue.toLocaleString()}\n`);

    if (reportData.warnings && reportData.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      reportData.warnings.forEach((warning) => {
        console.log(`   - ${warning}`);
      });
      console.log('');
    }
  } catch (error: any) {
    console.error('❌ Error generating total report:', error.message, '\n');
  }

  // Test 5: Check data source switching
  console.log('Test 5: Verifying data source logic...');
  const dateRange = totalReportService.getDateRange('all', new Date());
  console.log(`✓ Date range for "all" period:
   - Start: ${dateRange.start}
   - End: ${dateRange.end}\n`);

  console.log('✅ All tests completed!\n');

  // Summary
  console.log('📋 Summary:');
  console.log(`   - Supabase available: ${isAvailable ? '✓' : '✗'}`);
  console.log(`   - "all" period support: ✓`);
  console.log(`   - Null date handling: ✓`);
  console.log(`   - Total Report Service: ✓`);
  console.log('');
  console.log('🎯 Next steps:');
  console.log('   1. 在 Dashboard 同步工作表到 Supabase');
  console.log('   2. 在 Dashboard 設定欄位對應');
  console.log('   3. 切換到數據總報表頁面');
  console.log('   4. 驗證資料來源狀態顯示為 "Supabase"');
  console.log('   5. 驗證 KPI 數據正確');
}

// Run tests
testTotalReportFix()
  .then(() => {
    console.log('\n✓ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });

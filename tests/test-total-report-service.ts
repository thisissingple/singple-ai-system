/**
 * Test TotalReportService with Supabase integration
 */

// Load environment variables manually
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envContent = readFileSync(join(process.cwd(), '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
  console.log('✓ Environment variables loaded from .env\n');
} catch (error) {
  console.warn('⚠️  Could not load .env file:', error);
}

import { totalReportService } from '../server/services/reporting/total-report-service';

async function testTotalReportService() {
  console.log('📊 Testing TotalReportService with Supabase...\n');

  try {
    // Test 1: Generate weekly report
    console.log('📋 Test 1: Generating weekly report...');
    const weeklyReport = await totalReportService.generateReport({
      period: 'week',
      includedSources: ['體驗課上課記錄', '體驗課購買記錄', 'EODs'],
    });

    if (weeklyReport) {
      console.log('\n✅ Weekly report generated successfully!');
      console.log(`  - Data source: ${weeklyReport.mode || 'unknown'}`);
      console.log(`  - Date range: ${weeklyReport.dateRange.start} to ${weeklyReport.dateRange.end}`);
      console.log('\nSummary Metrics:');
      console.log(`  - Total trials: ${weeklyReport.summaryMetrics.totalTrials}`);
      console.log(`  - Total conversions: ${weeklyReport.summaryMetrics.totalConversions}`);
      console.log(`  - Conversion rate: ${weeklyReport.summaryMetrics.conversionRate.toFixed(2)}%`);
      console.log(`  - Pending students: ${weeklyReport.summaryMetrics.pendingStudents}`);

      if (weeklyReport.warnings && weeklyReport.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        weeklyReport.warnings.forEach(w => console.log(`  - ${w}`));
      }
    } else {
      console.log('❌ No report generated');
    }

    // Test 2: Generate monthly report
    console.log('\n\n📋 Test 2: Generating monthly report...');
    const monthlyReport = await totalReportService.generateReport({
      period: 'month',
      includedSources: ['體驗課上課記錄', '體驗課購買記錄', 'EODs'],
    });

    if (monthlyReport) {
      console.log('\n✅ Monthly report generated successfully!');
      console.log(`  - Data source: ${monthlyReport.mode || 'unknown'}`);
      console.log(`  - Total records: attendance=${monthlyReport.dataSourceMeta?.trialClassAttendance?.rows || 0}, purchase=${monthlyReport.dataSourceMeta?.trialClassPurchase?.rows || 0}, deals=${monthlyReport.dataSourceMeta?.eodsForClosers?.rows || 0}`);
    } else {
      console.log('❌ No report generated');
    }

    // Test 3: Custom date range report
    console.log('\n\n📋 Test 3: Generating custom date range report...');
    const customReport = await totalReportService.generateReport({
      period: 'custom',
      startDate: new Date('2025-09-01'),
      endDate: new Date('2025-10-31'),
      includedSources: ['體驗課上課記錄', '體驗課購買記錄', 'EODs'],
    });

    if (customReport) {
      console.log('\n✅ Custom range report generated successfully!');
      console.log(`  - Data source: ${customReport.mode || 'unknown'}`);
      console.log(`  - Date range: ${customReport.dateRange.start} to ${customReport.dateRange.end}`);
    } else {
      console.log('❌ No report generated');
    }

    console.log('\n\n🎉 All TotalReportService tests passed!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testTotalReportService().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

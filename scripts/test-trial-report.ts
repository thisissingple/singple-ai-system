/**
 * Test Trial Report Generation
 * 測試體驗課報表生成
 */

import { totalReportService } from '../server/services/reporting/total-report-service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  try {
    console.log('🔍 Testing trial report generation...\n');
    console.log('Environment:');
    console.log(`  SUPABASE_URL: ${process.env.SUPABASE_URL ? '✓' : '✗'}`);
    console.log(`  SUPABASE_DB_URL: ${process.env.SUPABASE_DB_URL ? '✓' : '✗'}`);
    console.log('');

    console.log('⏳ Generating report for period: daily...\n');

    const startTime = Date.now();

    const reportData = await totalReportService.generateReport({
      period: 'daily',
      userId: undefined, // 測試不帶權限過濾
    });

    const duration = Date.now() - startTime;

    console.log(`✅ Report generated in ${duration}ms\n`);
    console.log('Report summary:');
    console.log(`  Period: ${reportData.period}`);
    console.log(`  Start Date: ${reportData.startDate}`);
    console.log(`  End Date: ${reportData.endDate}`);
    console.log(`  KPIs: ${Object.keys(reportData.kpis || {}).length} metrics`);
    console.log(`  Raw Data: ${reportData.rawData?.length || 0} records`);
    console.log('');

    if (reportData.kpis) {
      console.log('Key KPIs:');
      console.log(`  Trials: ${reportData.kpis.trials || 0}`);
      console.log(`  Conversions: ${reportData.kpis.conversions || 0}`);
      console.log(`  Conversion Rate: ${reportData.kpis.conversionRate?.toFixed(1) || 0}%`);
    }

  } catch (error: any) {
    console.error('❌ Error generating report:');
    console.error(error);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

main();

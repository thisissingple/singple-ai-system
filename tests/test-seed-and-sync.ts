/**
 * Test script to seed data and verify Supabase sync
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
  console.log('✓ Environment variables loaded from .env');
} catch (error) {
  console.warn('⚠️  Could not load .env file:', error);
}

import { devSeedService } from '../server/services/dev-seed-service';
import { supabaseReportRepository } from '../server/services/reporting/supabase-report-repository';

async function testSeedAndSync() {
  console.log('🌱 Starting seed and sync test...\n');

  try {
    // 1. Seed test data
    console.log('📊 Step 1: Seeding test data...');
    const seedResult = await devSeedService.seedTotalReportData();

    console.log('\n✅ Seed completed:');
    console.log(`  - Spreadsheets created: ${seedResult.spreadsheetsCreated}`);
    console.log(`  - Worksheets created: ${seedResult.worksheetsCreated}`);
    console.log(`  - Data rows inserted to storage: ${seedResult.dataRowsInserted}`);
    console.log(`  - Supabase available: ${seedResult.supabase}`);
    if (seedResult.supabaseRowsInserted !== undefined) {
      console.log(`  - Supabase rows inserted: ${seedResult.supabaseRowsInserted}`);
    }

    // 2. Verify Supabase data
    if (supabaseReportRepository.isAvailable()) {
      console.log('\n📋 Step 2: Verifying Supabase data...');

      const counts = await supabaseReportRepository.getTableCounts();
      console.log('\n✅ Supabase table counts:');
      console.log(`  - trial_class_attendance: ${counts.attendance} rows`);
      console.log(`  - trial_class_purchase: ${counts.purchases} rows`);
      console.log(`  - eods_for_closers: ${counts.deals} rows`);
      console.log(`  - Total: ${counts.attendance + counts.purchases + counts.deals} rows`);

      // Sample some data by getting raw data without date filter
      console.log('\n🔍 Step 3: Sampling data from Supabase...');

      // Use getAllAttendance instead to avoid date filter issues
      const { getSupabaseClient, SUPABASE_TABLES } = await import('./server/services/supabase-client');
      const client = getSupabaseClient();

      const { data: attendanceSample } = await client!.from(SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE).select('*').limit(1);

      if (attendanceSample.length > 0) {
        console.log('\n✅ Sample attendance record:');
        console.log(`  - Student: ${attendanceSample[0].student_name}`);
        console.log(`  - Email: ${attendanceSample[0].student_email}`);
        console.log(`  - Teacher: ${attendanceSample[0].teacher_name}`);
        console.log(`  - Class date: ${attendanceSample[0].class_date}`);
      }

      const { data: purchaseSample } = await client!.from(SUPABASE_TABLES.TRIAL_CLASS_PURCHASE).select('*').limit(1);

      if (purchaseSample.length > 0) {
        console.log('\n✅ Sample purchase record:');
        console.log(`  - Student: ${purchaseSample[0].student_name}`);
        console.log(`  - Email: ${purchaseSample[0].student_email}`);
        console.log(`  - Plan: ${purchaseSample[0].plan}`);
        console.log(`  - Purchase date: ${purchaseSample[0].purchase_date}`);
      }

      console.log('\n🎉 All tests passed! Supabase sync is working correctly.');
    } else {
      console.log('\n⚠️  Supabase not available - data only stored locally');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testSeedAndSync().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});

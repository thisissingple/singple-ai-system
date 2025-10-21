import { getSupabaseClient } from './server/services/supabase-client';

async function testDirect() {
  console.log('🔍 Testing Supabase direct query...');

  const client = getSupabaseClient();

  // Test 1: Count records
  const { count: purchaseCount, error: countError } = await client
    .from('trial_class_purchase')
    .select('*', { count: 'exact', head: true });

  console.log('Purchase count:', purchaseCount, countError || '');

  // Test 2: Select all
  const { data, error } = await client
    .from('trial_class_purchase')
    .select('*')
    .limit(5);

  console.log('Purchase data (first 5):', data?.length || 0, 'records');
  if (data && data.length > 0) {
    console.log('Sample record:', JSON.stringify(data[0], null, 2));
  }
  if (error) {
    console.log('Error:', error);
  }

  // Test 3: Check attendance
  const { data: attendanceData, error: attendanceError } = await client
    .from('trial_class_attendance')
    .select('*')
    .limit(5);

  console.log('Attendance data (first 5):', attendanceData?.length || 0, 'records');
  if (attendanceError) {
    console.log('Attendance error:', attendanceError);
  }

  // Test 4: Check deals
  const { data: dealsData, error: dealsError } = await client
    .from('eods_for_closers')
    .select('*')
    .limit(5);

  console.log('Deals data (first 5):', dealsData?.length || 0, 'records');
  if (dealsError) {
    console.log('Deals error:', dealsError);
  }
}

testDirect().catch(console.error);

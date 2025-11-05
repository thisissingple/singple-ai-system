/**
 * Test with correct database credentials
 */

import pkg from 'pg';
const { Pool } = pkg;

async function testConnection() {
  const connectionString = 'postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres';

  console.log('🔧 Testing database connection...\n');
  console.log('Host: aws-1-ap-southeast-1.pooler.supabase.com');
  console.log('Port: 5432');
  console.log('User: postgres.vqkkqkjaywkjtraepqbg');
  console.log('Database: postgres\n');

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic connection test...');
    const result1 = await pool.query('SELECT 1 AS test, current_database(), current_user, version()');
    console.log('✅ Connection successful!');
    console.log('   Database:', result1.rows[0].current_database);
    console.log('   User:', result1.rows[0].current_user);
    console.log('   PostgreSQL version:', result1.rows[0].version.split(',')[0]);

    // Test 2: Check if eods_for_closers table exists
    console.log('\nTest 2: Checking tables...');
    const result2 = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('eods_for_closers', 'consultation_quality_analysis')
      ORDER BY table_name
    `);
    console.log('✅ Tables found:', result2.rows.map(r => r.table_name).join(', '));

    // Test 3: Count records in eods_for_closers
    console.log('\nTest 3: Counting records...');
    const result3 = await pool.query(`
      SELECT COUNT(*) as total FROM eods_for_closers WHERE is_show = 'true'
    `);
    console.log('✅ Total consultation records:', result3.rows[0].total);

    console.log('\n🎉 All tests passed! Database connection is working correctly!');
    return true;
  } catch (error: any) {
    console.log('❌ Connection failed!');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    return false;
  } finally {
    await pool.end();
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});

/**
 * Test database connection with different URL formats
 */

const { Pool } = require('pg');

async function testConnection(name, connectionString) {
  console.log(`\n=== Testing: ${name} ===`);
  console.log(`Connection string: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const result = await pool.query('SELECT 1 AS test, current_database(), current_user');
    console.log('✅ Connection successful!');
    console.log('   Database:', result.rows[0].current_database);
    console.log('   User:', result.rows[0].current_user);
    console.log('   Test query result:', result.rows[0].test);
    return true;
  } catch (error) {
    console.log('❌ Connection failed!');
    console.log('   Error:', error.message);
    console.log('   Code:', error.code);
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('🔧 Database Connection Tests\n');

  // Test 1: Original URL (with password that might need encoding)
  const password = 'Spp89082658';
  const host = 'aws-0-ap-southeast-1.pooler.supabase.com';
  const port = '6543';
  const user = 'postgres.etvhaxtwnyjmldsokizd';
  const database = 'postgres';

  await testConnection(
    'Original URL',
    `postgresql://${user}:${password}@${host}:${port}/${database}`
  );

  // Test 2: URL-encoded password
  const encodedPassword = encodeURIComponent(password);
  await testConnection(
    'URL-encoded password',
    `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`
  );

  // Test 3: Direct connection URL (Transaction Pooler - port 5432)
  await testConnection(
    'Transaction Pooler (port 5432)',
    `postgresql://${user}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/${database}`
  );

  // Test 4: Session Pooler (port 6543) - current
  await testConnection(
    'Session Pooler (port 6543)',
    `postgresql://${user}:${password}@${host}:${port}/${database}`
  );

  // Test 5: Try with postgres schema
  await testConnection(
    'With explicit schema',
    `postgresql://${user}:${password}@${host}:${port}/${database}?schema=public`
  );

  console.log('\n✅ All tests completed!');
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

import pkg from 'pg';
const { Pool } = pkg;

async function testConnection() {
  const sessionUrl = process.env.SUPABASE_SESSION_DB_URL;
  const transactionUrl = process.env.SUPABASE_DB_URL;
  
  console.log('\n📋 URL Comparison:');
  console.log('Transaction:', transactionUrl);
  console.log('Session:', sessionUrl);
  console.log('Are they different?', sessionUrl !== transactionUrl ? '✅ Yes' : '❌ No (PROBLEM!)');
  
  if (!sessionUrl) {
    console.error('\n❌ SUPABASE_SESSION_DB_URL not configured!');
    process.exit(1);
  }
  
  console.log('\n🔍 Testing Session DB Connection...');
  const pool = new Pool({
    connectionString: sessionUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  
  try {
    const result = await pool.query('SELECT NOW() as time, version() as pg_version');
    console.log('✅ Connection successful!');
    console.log('Time:', result.rows[0].time);
    console.log('PostgreSQL:', result.rows[0].pg_version.substring(0, 50) + '...');
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await pool.end();
  }
}

testConnection();

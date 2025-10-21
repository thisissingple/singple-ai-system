import pkg from 'pg';
const { Pool } = pkg;

async function testConnection() {
  // 從 pooler URL 轉換為直接連線 URL
  // Pooler: aws-1-ap-southeast-1.pooler.supabase.com:6543
  // Direct: aws-0-ap-southeast-1.pooler.supabase.com:5432 (without .pooler)
  
  const directUrl = 'postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@db.vqkkqkjaywkjtraepqbg.supabase.co:5432/postgres';
  
  console.log('\n🔍 Testing Direct DB Connection...');
  console.log('URL:', directUrl.replace(/:[^:]+@/, ':***@'));
  
  const pool = new Pool({
    connectionString: directUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  
  try {
    const result = await pool.query('SELECT NOW() as time, current_database() as db');
    console.log('✅ Direct connection successful!');
    console.log('Time:', result.rows[0].time);
    console.log('Database:', result.rows[0].db);
  } catch (error: any) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await pool.end();
  }
}

testConnection();

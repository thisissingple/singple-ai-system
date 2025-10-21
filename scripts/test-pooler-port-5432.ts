import pkg from 'pg';
const { Pool } = pkg;

async function testMultipleUrls() {
  const urls = [
    {
      name: 'Pooler aws-0 port 5432',
      url: 'postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
    },
    {
      name: 'Pooler aws-1 port 5432',
      url: 'postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
    },
    {
      name: 'Original Session URL (port 6543)',
      url: process.env.SUPABASE_SESSION_DB_URL!
    }
  ];
  
  for (const { name, url } of urls) {
    console.log(`\n📋 Testing: ${name}`);
    const pool = new Pool({
      connectionString: url,
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
    });
    
    try {
      const result = await pool.query('SELECT NOW() as time');
      console.log(`✅ SUCCESS! Time: ${result.rows[0].time}`);
      await pool.end();
      return url; // Return first successful URL
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message}`);
      await pool.end();
    }
  }
  
  console.log('\n❌ All connection attempts failed!');
}

testMultipleUrls();

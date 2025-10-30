import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'know_it_all%'
      ORDER BY table_name
    `);
    
    console.log(`\n✅ Know-it-all 資料庫表 (${result.rows.length} 個):`);
    result.rows.forEach((row, i) => console.log(`   ${i+1}. ${row.table_name}`));
    console.log('');
  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function listTables() {
  const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    const query = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    const result = await pool.query(query);

    console.log('\n📋 資料庫中的所有表:\n');
    result.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.table_name}`);
    });
    console.log(`\n總共 ${result.rows.length} 個表\n`);

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

listTables();

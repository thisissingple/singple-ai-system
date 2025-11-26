import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

async function checkColumns() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'income_expense_records'
      ORDER BY ordinal_position
    `);

    console.log('📋 income_expense_records 表的欄位：\n');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}`);
    });
  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    await pool.end();
  }
}

checkColumns();

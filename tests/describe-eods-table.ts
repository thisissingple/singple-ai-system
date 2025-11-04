import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function describeTable() {
  const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'eods_for_closers'
      ORDER BY ordinal_position
    `;
    const result = await pool.query(query);

    console.log('\n📋 eods_for_closers 表結構:\n');
    result.rows.forEach((row) => {
      console.log(`  ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

describeTable();

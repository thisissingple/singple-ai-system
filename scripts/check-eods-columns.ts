import { createPool } from '../server/services/pg-client';

async function checkColumns() {
  const pool = createPool();

  try {
    const query = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'eods_for_closers'
      ORDER BY ordinal_position;
    `;

    const result = await pool.query(query);
    console.log('\neods_for_closers 表的欄位：\n');
    result.rows.forEach((row: any) => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    await pool.end();
  } catch (error: any) {
    console.error('錯誤:', error.message);
    process.exit(1);
  }
}

checkColumns();

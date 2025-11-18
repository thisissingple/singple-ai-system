import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkSchema() {
  const pool = createPool('session');
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'eods_for_closers'
      ORDER BY ordinal_position;
    `);

    console.log('📋 eods_for_closers columns:');
    result.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.column_name}`);
    });
  } finally {
    await pool.end();
  }
}

checkSchema();

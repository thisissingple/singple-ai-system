import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkSchema() {
  const pool = createPool('session');
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'teacher_ai_conversations'
      ORDER BY ordinal_position;
    `);

    console.log('📋 teacher_ai_conversations schema:');
    console.table(result.rows);
  } finally {
    await pool.end();
  }
}

checkSchema();

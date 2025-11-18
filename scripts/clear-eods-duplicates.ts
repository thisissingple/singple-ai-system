import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function clearDuplicates() {
  const pool = createPool('session');
  try {
    console.log('🗑️  Deleting all records from eods_for_closers...');
    const result = await pool.query('DELETE FROM eods_for_closers');
    console.log(`✅ Deleted ${result.rowCount} records`);

    // Verify
    const count = await pool.query('SELECT COUNT(*) as total FROM eods_for_closers');
    console.log(`📊 Current count: ${count.rows[0].total}`);
  } finally {
    await pool.end();
  }
}

clearDuplicates();

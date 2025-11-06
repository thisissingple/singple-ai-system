/**
 * Check users table schema
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    console.log('🔍 Checking users table schema...\n');

    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📋 Users table columns:');
    console.table(result.rows);

    // Sample data
    const sampleResult = await pool.query(`
      SELECT * FROM users WHERE 'consultant' = ANY(roles) LIMIT 3
    `);

    console.log('\n📊 Sample users with consultant role:');
    console.table(sampleResult.rows);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

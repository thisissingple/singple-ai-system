/**
 * Make amount_twd nullable for testing
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    console.log('🔧 Making amount_twd nullable for testing...');

    await pool.query('ALTER TABLE income_expense_records ALTER COLUMN amount_twd DROP NOT NULL');

    console.log('✅ amount_twd is now nullable');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

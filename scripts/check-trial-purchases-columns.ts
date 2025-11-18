import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function checkColumns() {
  const pool = createPool('session');

  try {
    console.log('🔍 Checking trial_class_purchases table structure...\n');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'trial_class_purchases'
      ORDER BY ordinal_position
    `);

    console.log('=== Column Structure ===');
    console.table(result.rows);

    // Also check a sample record to see the actual data
    console.log('\n=== Sample Record ===');
    const sampleResult = await pool.query(`
      SELECT *
      FROM trial_class_purchases
      LIMIT 1
    `);

    if (sampleResult.rows.length > 0) {
      console.log('Sample data:');
      console.log(JSON.stringify(sampleResult.rows[0], null, 2));
    } else {
      console.log('No records found in trial_class_purchases');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();

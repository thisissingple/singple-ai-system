/**
 * Test consultant email lookup
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';

const CLOSER_NAME = 'Vicky';

async function main() {
  const pool = createPool();

  try {
    console.log(`🔍 Testing consultant lookup for: ${CLOSER_NAME}\n`);

    const userQuery = await pool.query(`
      SELECT email, first_name, last_name FROM users
      WHERE (
        first_name = $1
        OR CONCAT(first_name, ' ', COALESCE(last_name, '')) = $1
        OR CONCAT(first_name, last_name) = $1
      )
      AND 'consultant' = ANY(roles)
      LIMIT 1
    `, [CLOSER_NAME]);

    if (userQuery.rows.length > 0) {
      console.log('✅ Found consultant:');
      console.log(`   Email: ${userQuery.rows[0].email}`);
      console.log(`   Name: ${userQuery.rows[0].first_name} ${userQuery.rows[0].last_name || ''}`);
    } else {
      console.log('❌ Consultant not found');
      console.log('\n📋 Available consultants:');
      const allConsultants = await pool.query(`
        SELECT email, first_name, last_name
        FROM users
        WHERE 'consultant' = ANY(roles)
        ORDER BY first_name
      `);
      console.table(allConsultants.rows);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

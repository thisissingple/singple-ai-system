/**
 * Script: Create Dummy User for SKIP_AUTH Mode
 *
 * Purpose: Insert a dummy user with UUID 00000000-0000-0000-0000-000000000000
 *          to satisfy foreign key constraints during development
 *
 * Created: 2025-10-30
 */

import { createPool, queryDatabase } from '../server/services/pg-client.js';

async function createDummyUser() {
  const pool = createPool();

  try {
    console.log('[Setup] Creating dummy user for SKIP_AUTH mode...');

    const result = await queryDatabase(
      pool,
      `INSERT INTO users (id, email, name, roles)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING
       RETURNING id, email, name`,
      [
        '00000000-0000-0000-0000-000000000000',
        'dev@localhost',
        'Development User',
        ['admin'] // Give admin role for development
      ]
    );

    if (result.rows.length > 0) {
      console.log('[Setup] ✅ Dummy user created successfully:');
      console.log(result.rows[0]);
    } else {
      console.log('[Setup] ℹ️ Dummy user already exists (no action needed)');

      // Verify it exists
      const checkResult = await queryDatabase(
        pool,
        `SELECT id, email, name, roles FROM users WHERE id = $1`,
        ['00000000-0000-0000-0000-000000000000']
      );

      if (checkResult.rows.length > 0) {
        console.log('[Setup] ✅ Verified dummy user exists:');
        console.log(checkResult.rows[0]);
      }
    }

  } catch (error: any) {
    console.error('[Setup] ❌ Error creating dummy user:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
createDummyUser()
  .then(() => {
    console.log('[Setup] Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[Setup] Failed:', error);
    process.exit(1);
  });

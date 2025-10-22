/**
 * Update Owner Account - Disable Must Change Password
 * 停用強制修改密碼要求
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const dbUrl = process.env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error('❌ Missing SUPABASE_DB_URL');
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: dbUrl });

async function main() {
  try {
    const ownerEmail = 'xk4xk4563022@gmail.com';

    console.log(`🔧 Updating ${ownerEmail} account...\n`);

    // 查看當前狀態
    const currentResult = await pool.query(`
      SELECT id, email, first_name, must_change_password
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `, [ownerEmail]);

    if (currentResult.rows.length === 0) {
      console.error(`❌ User ${ownerEmail} not found!`);
      await pool.end();
      return;
    }

    console.log('📊 Current status:');
    console.log(`   Email: ${currentResult.rows[0].email}`);
    console.log(`   Name: ${currentResult.rows[0].first_name}`);
    console.log(`   must_change_password: ${currentResult.rows[0].must_change_password}`);
    console.log('');

    // 更新 must_change_password 為 false
    const updateResult = await pool.query(`
      UPDATE users
      SET
        must_change_password = false,
        updated_at = NOW()
      WHERE LOWER(email) = LOWER($1)
      RETURNING id, email, first_name, must_change_password
    `, [ownerEmail]);

    console.log('✅ Account updated!\n');
    console.log('📊 New status:');
    console.log(`   Email: ${updateResult.rows[0].email}`);
    console.log(`   Name: ${updateResult.rows[0].first_name}`);
    console.log(`   must_change_password: ${updateResult.rows[0].must_change_password}`);
    console.log('');
    console.log('✅ You can now login without being forced to change password!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

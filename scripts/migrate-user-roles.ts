/**
 * Migrate User Roles
 * 將單一 role 欄位遷移到 roles 陣列
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
    console.log('🔄 Migrating user roles from single role to roles array...\n');

    // 更新所有 roles 為空陣列的使用者
    const updateResult = await pool.query(`
      UPDATE users
      SET
        roles = ARRAY[role]::text[],
        updated_at = NOW()
      WHERE
        (roles IS NULL OR roles = '{}' OR array_length(roles, 1) IS NULL)
        AND role IS NOT NULL
        AND email IS NOT NULL
      RETURNING id, email, first_name, role, roles
    `);

    console.log(`✅ Updated ${updateResult.rows.length} users:\n`);

    updateResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.first_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Roles: ${JSON.stringify(user.roles)}`);
      console.log('');
    });

    // 顯示還有多少使用者沒有 email
    const noEmailResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE email IS NULL
    `);

    if (parseInt(noEmailResult.rows[0].count) > 0) {
      console.log(`⚠️  Warning: ${noEmailResult.rows[0].count} users have no email address.`);
      console.log('   These users cannot log in until email is added.\n');
    }

    console.log('✅ Role migration complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

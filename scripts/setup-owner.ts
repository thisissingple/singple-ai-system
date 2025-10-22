/**
 * Setup Owner Account
 * 設定擁有者帳號為最高權限
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
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
    console.log('🔧 Setting up owner account...\n');

    const ownerEmail = 'xk4xk4563022@gmail.com';
    const ownerPassword = 'Owner123!'; // 請登入後立即修改
    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    // 1. 更新擁有者帳號
    console.log(`📝 Updating ${ownerEmail} to super_admin...`);

    const updateResult = await pool.query(`
      UPDATE users
      SET
        role = 'super_admin',
        roles = ARRAY['super_admin', 'admin', 'manager', 'teacher', 'sales', 'consultant']::text[],
        password_hash = $1,
        status = 'active',
        must_change_password = true,
        department = '管理部',
        updated_at = NOW()
      WHERE LOWER(email) = LOWER($2)
      RETURNING id, email, first_name, last_name, role, roles, status
    `, [passwordHash, ownerEmail]);

    if (updateResult.rows.length === 0) {
      console.error(`❌ User ${ownerEmail} not found!`);
      await pool.end();
      return;
    }

    console.log('✅ Owner account updated successfully!\n');
    console.log('📊 Account details:');
    console.log(`   Email: ${updateResult.rows[0].email}`);
    console.log(`   Name: ${updateResult.rows[0].first_name} ${updateResult.rows[0].last_name || ''}`);
    console.log(`   Role: ${updateResult.rows[0].role}`);
    console.log(`   Roles: ${JSON.stringify(updateResult.rows[0].roles)}`);
    console.log(`   Status: ${updateResult.rows[0].status}`);

    // 2. 刪除剛才建立的測試管理員帳號
    console.log('\n🗑️  Removing temporary admin account...');

    const deleteResult = await pool.query(`
      DELETE FROM users
      WHERE email = 'admin@singple.com'
      RETURNING email
    `);

    if (deleteResult.rows.length > 0) {
      console.log('✅ Temporary admin@singple.com removed');
    }

    console.log('\n📝 Login credentials:');
    console.log(`   Email: ${ownerEmail}`);
    console.log(`   Password: ${ownerPassword}`);
    console.log('\n⚠️  IMPORTANT: You MUST change this password after first login!');
    console.log('🔗 Login at: https://singple-ai-system.zeabur.app/login\n');

    // 3. 顯示所有使用者的角色狀態
    console.log('📊 All users in database:\n');
    const allUsers = await pool.query(`
      SELECT email, first_name, last_name, role, roles, status
      FROM users
      WHERE email IS NOT NULL
      ORDER BY
        CASE
          WHEN role = 'super_admin' THEN 1
          WHEN role = 'admin' THEN 2
          WHEN role = 'manager' THEN 3
          ELSE 4
        END,
        created_at ASC
    `);

    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.first_name || 'N/A'} ${user.last_name || ''}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Roles: ${JSON.stringify(user.roles || [])}`);
      console.log(`   Status: ${user.status}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

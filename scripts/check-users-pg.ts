/**
 * Check and Create Admin User via PostgreSQL Direct Connection
 * 使用 PostgreSQL 直接連接檢查並建立管理員
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
    console.log('🔍 Connecting to database...\n');

    // Check existing users
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, role, roles, status
      FROM users
      ORDER BY created_at ASC
    `);

    console.log(`📊 Found ${result.rows.length} existing users:\n`);

    if (result.rows.length > 0) {
      result.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.first_name} ${user.last_name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Roles: ${JSON.stringify(user.roles)}`);
        console.log(`   Status: ${user.status}`);
        console.log('');
      });

      // Check if admin exists
      const hasAdmin = result.rows.some(u =>
        (Array.isArray(u.roles) && u.roles.includes('admin')) || u.role === 'admin'
      );

      if (hasAdmin) {
        console.log('✅ Admin user already exists!');
        console.log('ℹ️  If you need to reset password, modify the database directly.');
        await pool.end();
        return;
      }
    }

    console.log('⚠️  No admin user found. Creating default admin account...\n');

    // Create admin user
    const adminEmail = 'admin@singple.com';
    const adminPassword = 'Admin123!';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const insertResult = await pool.query(`
      INSERT INTO users (
        email,
        first_name,
        last_name,
        password_hash,
        role,
        roles,
        status,
        must_change_password,
        department,
        failed_login_attempts,
        locked_until,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, email, first_name, last_name, role, roles, status
    `, [
      adminEmail,
      'Admin',
      'User',
      passwordHash,
      'admin',
      ['admin'],
      'active',
      false,
      null,
      0,
      null,
    ]);

    console.log('✅ Admin user created successfully!\n');
    console.log('📝 Login credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('\n⚠️  IMPORTANT: Please change this password after first login!\n');
    console.log('🔗 Login at: https://singple-ai-system.zeabur.app/login\n');
    console.log('Created user:', insertResult.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

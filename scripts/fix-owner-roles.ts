/**
 * Fix Owner Roles - Remove teacher role
 * 修正擁有者角色 - 移除 teacher 角色
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new pg.Pool({ connectionString: process.env.SUPABASE_DB_URL });

async function main() {
  console.log('🔧 Fixing owner roles...\n');

  // 更新為只包含管理相關角色
  const result = await pool.query(`
    UPDATE users
    SET
      roles = ARRAY['super_admin', 'admin', 'manager']::text[],
      updated_at = NOW()
    WHERE email = 'xk4xk4563022@gmail.com'
    RETURNING first_name, email, role, roles
  `);

  console.log('✅ Roles updated!\n');
  console.log('New roles:');
  console.log(result.rows[0]);

  console.log('\n\n📋 Updated teacher list:');
  const teachers = await pool.query(`
    SELECT first_name
    FROM users
    WHERE 'teacher' = ANY(roles)
    AND status = 'active'
    AND first_name IS NOT NULL
    ORDER BY first_name ASC
  `);

  teachers.rows.forEach((t, i) => {
    console.log(`${i + 1}. ${t.first_name}`);
  });

  await pool.end();
}

main();

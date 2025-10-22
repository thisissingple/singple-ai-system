/**
 * List All Active Users Who Can Login
 * 列出所有可以登入的使用者
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
    console.log('👥 Checking all users in database...\n');

    // 查詢所有使用者
    const result = await pool.query(`
      SELECT
        email,
        first_name,
        last_name,
        role,
        roles,
        status,
        password_hash IS NOT NULL as has_password,
        must_change_password,
        department
      FROM users
      ORDER BY
        CASE
          WHEN role = 'super_admin' THEN 1
          WHEN role = 'admin' THEN 2
          WHEN role = 'manager' THEN 3
          WHEN role = 'teacher' THEN 4
          WHEN role = 'sales' THEN 5
          WHEN role = 'consultant' THEN 6
          ELSE 7
        END,
        created_at ASC
    `);

    console.log(`📊 Total users: ${result.rows.length}\n`);
    console.log('═'.repeat(80));

    let canLoginCount = 0;
    let cannotLoginCount = 0;

    result.rows.forEach((user, index) => {
      const canLogin = user.email && user.has_password && user.status === 'active';

      if (canLogin) canLoginCount++;
      else cannotLoginCount++;

      const statusIcon = canLogin ? '✅' : '❌';
      const statusText = canLogin ? 'CAN LOGIN' : 'CANNOT LOGIN';

      console.log(`${statusIcon} ${index + 1}. ${statusText}`);
      console.log(`   Email: ${user.email || '(無 Email)'}`);
      console.log(`   Name: ${user.first_name || 'N/A'} ${user.last_name || ''}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Roles: ${JSON.stringify(user.roles || [])}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Has Password: ${user.has_password ? 'Yes' : 'No'}`);
      console.log(`   Must Change Password: ${user.must_change_password}`);
      console.log(`   Department: ${user.department || 'N/A'}`);

      if (!canLogin) {
        console.log(`   ⚠️  Reason: ${
          !user.email ? 'No email address' :
          !user.has_password ? 'No password set' :
          user.status !== 'active' ? 'Account inactive' :
          'Unknown'
        }`);
      }

      console.log('');
    });

    console.log('═'.repeat(80));
    console.log(`\n📈 Summary:`);
    console.log(`   ✅ Can login: ${canLoginCount} users`);
    console.log(`   ❌ Cannot login: ${cannotLoginCount} users`);
    console.log('');

    // 列出可登入的使用者
    console.log('✅ Users who CAN login:\n');
    result.rows
      .filter(u => u.email && u.has_password && u.status === 'active')
      .forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (${user.first_name}) - ${user.role}`);
      });

    console.log('\n❌ Users who CANNOT login:\n');
    result.rows
      .filter(u => !(u.email && u.has_password && u.status === 'active'))
      .forEach((user, i) => {
        const reason = !user.email ? 'No email' :
                      !user.has_password ? 'No password' :
                      'Inactive';
        console.log(`   ${i + 1}. ${user.first_name} - ${reason}`);
      });

    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

main();

/**
 * 一次性腳本：修復 Admin 帳號密碼
 * 為 server 查詢到的 admin 帳號設定密碼
 */

import { queryDatabase } from '../server/services/pg-client';
import bcrypt from 'bcryptjs';

async function fixAdminPassword() {
  console.log('🔧 修復 Admin 密碼...\n');

  // 查詢所有 admin@example.com 的帳號
  const query = `
    SELECT
      id,
      email,
      first_name,
      password_hash IS NOT NULL as has_password
    FROM users
    WHERE LOWER(email) = LOWER('admin@example.com')
  `;

  console.log('📊 查詢所有 admin@example.com 帳號...');
  const result = await queryDatabase(query, []);

  console.log(`找到 ${result.rows.length} 個帳號:\n`);
  result.rows.forEach((user: any) => {
    console.log(`  - ID: ${user.id}`);
    console.log(`    Email: ${user.email}`);
    console.log(`    Name: ${user.first_name}`);
    console.log(`    Has Password: ${user.has_password ? '✅ Yes' : '❌ No'}\n`);
  });

  // 為所有沒有密碼的 admin 帳號設定密碼
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('🔑 設定密碼: admin123\n');

  for (const user of result.rows) {
    if (!user.has_password) {
      console.log(`⚙️  更新帳號: ${user.id}...`);

      const updateQuery = `
        UPDATE users
        SET
          password_hash = $1,
          must_change_password = false,
          last_password_change_at = NOW(),
          failed_login_attempts = 0
        WHERE id = $2
        RETURNING id, email, first_name
      `;

      const updateResult = await queryDatabase(updateQuery, [passwordHash, user.id]);

      if (updateResult.rows.length > 0) {
        console.log(`   ✅ 成功! Email: ${updateResult.rows[0].email}\n`);
      } else {
        console.log(`   ❌ 失敗!\n`);
      }
    } else {
      console.log(`   ℹ️  帳號 ${user.id} 已有密碼，跳過\n`);
    }
  }

  console.log('✅ 完成!');
}

fixAdminPassword()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ 錯誤:', err);
    process.exit(1);
  });

/**
 * 建立第一個 Admin 帳號
 * 用於初始化系統
 */

import { queryDatabase } from '../server/services/pg-client';
import { hashPassword } from '../server/services/auth-service';

async function createFirstAdmin() {
  try {
    console.log('🔧 開始建立第一個 Admin 帳號...\n');

    // 設定 Admin 資料
    const adminEmail = 'admin@company.com';
    const adminPassword = 'admin123';
    const adminFirstName = 'Admin';
    const adminLastName = 'User';

    // 檢查是否已存在
    const existingQuery = `
      SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)
    `;
    const existing = await queryDatabase(existingQuery, [adminEmail]);

    if (existing.rows.length > 0) {
      console.log('⚠️  Admin 帳號已存在！');
      console.log(`   Email: ${existing.rows[0].email}`);
      console.log(`   ID: ${existing.rows[0].id}\n`);
      console.log('💡 您可以使用此帳號登入，或用重設密碼功能\n');
      return;
    }

    // 加密密碼
    console.log('🔐 加密密碼中...');
    const passwordHash = await hashPassword(adminPassword);

    // 建立 Admin
    console.log('👤 建立 Admin 帳號中...');
    const insertQuery = `
      INSERT INTO users (
        id,
        email,
        first_name,
        last_name,
        password_hash,
        must_change_password,
        role,
        roles,
        status,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, false, 'admin', ARRAY['admin'], 'active', NOW(), NOW()
      )
      RETURNING id, email, first_name, last_name, role, status
    `;

    const result = await queryDatabase(insertQuery, [
      adminEmail,
      adminFirstName,
      adminLastName,
      passwordHash,
    ]);

    const admin = result.rows[0];

    console.log('\n✅ Admin 帳號建立成功！\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ', adminEmail);
    console.log('🔑 密碼:     ', adminPassword);
    console.log('👤 姓名:     ', `${adminFirstName} ${adminLastName}`);
    console.log('🎭 角色:     ', admin.role);
    console.log('📊 狀態:     ', admin.status);
    console.log('🆔 ID:       ', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🌐 請訪問登入頁面：http://localhost:5000/login');
    console.log('   使用上述帳號密碼登入\n');

  } catch (error: any) {
    console.error('❌ 建立 Admin 失敗:', error.message);
    throw error;
  }
}

// 執行
createFirstAdmin()
  .then(() => {
    console.log('✅ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  });

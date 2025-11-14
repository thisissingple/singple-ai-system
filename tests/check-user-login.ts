import { createPool } from '../server/services/pg-client';

async function checkUserLogin() {
  const pool = createPool();

  try {
    // 查詢用戶資料
    const email = 'mama725619@gmail.com';

    const result = await pool.query(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        roles,
        status,
        must_change_password,
        failed_login_attempts,
        locked_until,
        password_hash IS NOT NULL as has_password,
        last_login_at,
        created_at
      FROM users
      WHERE email ILIKE $1
    `, [email]);

    if (result.rows.length === 0) {
      console.log('❌ 找不到該用戶:', email);
    } else {
      console.log('✅ 找到用戶資料:');
      console.log(JSON.stringify(result.rows[0], null, 2));

      const user = result.rows[0];

      console.log('\n📊 登入診斷:');
      console.log('==================');

      if (user.status !== 'active') {
        console.log('⚠️  帳號狀態:', user.status, '(必須是 active 才能登入)');
      } else {
        console.log('✅ 帳號狀態: active');
      }

      if (!user.has_password) {
        console.log('❌ 尚未設定密碼');
      } else {
        console.log('✅ 已設定密碼');
      }

      if (user.locked_until) {
        const lockTime = new Date(user.locked_until);
        const now = new Date();
        if (lockTime > now) {
          console.log('⚠️  帳號已鎖定至:', lockTime.toLocaleString('zh-TW'));
        } else {
          console.log('✅ 帳號未鎖定 (鎖定已過期)');
        }
      } else {
        console.log('✅ 帳號未鎖定');
      }

      if (user.failed_login_attempts > 0) {
        console.log(`⚠️  登入失敗次數: ${user.failed_login_attempts}/5`);
      } else {
        console.log('✅ 無登入失敗記錄');
      }

      if (user.must_change_password) {
        console.log('ℹ️  首次登入需要修改密碼');
      }

      console.log('\nroles 欄位:', user.roles);
      console.log('role 欄位:', user.role);
    }

  } finally {
    await pool.end();
  }
}

checkUserLogin();

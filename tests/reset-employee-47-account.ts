/**
 * 重設員工 47 的帳號
 * 保留員工記錄，但清除登入問題
 */

import { createPool } from '../server/services/pg-client';
import { hashPassword } from '../server/services/auth-service';

async function resetEmployee47() {
  const pool = createPool();

  try {
    const userId = '0a0be4f3-28cb-40df-9cb6-eeeba351fabe';
    const email = 'mama725619@gmail.com';
    const newPassword = 'Temp' + Math.random().toString(36).substring(2, 10); // 生成隨機臨時密碼

    console.log('🔄 重設員工 47 的帳號');
    console.log('='.repeat(60));
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log();

    // 步驟 1: 清除所有權限
    console.log('步驟 1: 清除所有權限');
    const permResult = await pool.query(`
      DELETE FROM user_permissions
      WHERE user_id::text = $1::text
      RETURNING id
    `, [userId]);
    console.log(`✅ 已清除 ${permResult.rowCount} 筆權限`);

    // 步驟 2: 重設密碼
    console.log('步驟 2: 重設密碼');
    const passwordHash = await hashPassword(newPassword);

    await pool.query(`
      UPDATE users
      SET password_hash = $2,
          must_change_password = true,
          failed_login_attempts = 0,
          locked_until = NULL,
          status = 'active',
          updated_at = NOW()
      WHERE id::text = $1::text
    `, [userId, passwordHash]);
    console.log(`✅ 已重設密碼`);
    console.log(`   新的臨時密碼: ${newPassword}`);

    // 步驟 3: 重新分配權限
    console.log('步驟 3: 重新分配權限');
    const modules = ['consultant_report', 'trial_class_report', 'form_builder'];

    for (const moduleId of modules) {
      await pool.query(`
        INSERT INTO user_permissions (id, user_id, module_id, scope, is_active, created_at)
        VALUES (gen_random_uuid(), $1, $2, 'all', true, NOW())
      `, [userId, moduleId]);
    }
    console.log(`✅ 已分配 ${modules.length} 個權限模組`);

    console.log();
    console.log('='.repeat(60));
    console.log('✅ 重設完成！');
    console.log();
    console.log('📋 登入資訊：');
    console.log('  Email: mama725619@gmail.com');
    console.log('  臨時密碼:', newPassword);
    console.log();
    console.log('💡 請員工：');
    console.log('  1. 使用以上帳號密碼登入');
    console.log('  2. 系統會要求修改密碼');
    console.log('  3. 設定新密碼後即可正常使用');

  } catch (error: any) {
    console.error('❌ 重設失敗:', error.message);
    console.error('詳細錯誤:', error);
  } finally {
    await pool.end();
  }
}

resetEmployee47();

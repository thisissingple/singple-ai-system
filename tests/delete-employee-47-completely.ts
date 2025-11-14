/**
 * 完全刪除員工 47
 * 按照正確順序刪除所有關聯資料
 */

import { createPool } from '../server/services/pg-client';

async function deleteEmployee47() {
  const pool = createPool();

  try {
    const userId = '0a0be4f3-28cb-40df-9cb6-eeeba351fabe';
    const email = 'mama725619@gmail.com';

    console.log('🗑️  刪除員工 47');
    console.log('='.repeat(60));
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log();

    console.log('⚠️  這將永久刪除以下資料：');
    console.log('  - 用戶權限 (6 筆)');
    console.log('  - 業務身份 (1 筆)');
    console.log('  - 員工檔案 (1 筆)');
    console.log('  - 用戶帳號 (1 筆)');
    console.log();

    // 開始刪除
    console.log('開始刪除流程...');
    console.log();

    // 步驟 1: 刪除用戶權限
    console.log('步驟 1: 刪除用戶權限');
    const permResult = await pool.query(`
      DELETE FROM user_permissions
      WHERE user_id::text = $1::text
      RETURNING id
    `, [userId]);
    console.log(`✅ 已刪除 ${permResult.rowCount} 筆權限記錄`);

    // 步驟 2: 刪除業務身份
    console.log('步驟 2: 刪除業務身份');
    const bizResult = await pool.query(`
      DELETE FROM business_identities
      WHERE user_id::text = $1::text
      RETURNING id
    `, [userId]);
    console.log(`✅ 已刪除 ${bizResult.rowCount} 筆業務身份記錄`);

    // 步驟 3: 刪除員工檔案
    console.log('步驟 3: 刪除員工檔案');
    const profileResult = await pool.query(`
      DELETE FROM employee_profiles
      WHERE user_id::text = $1::text
      RETURNING id
    `, [userId]);
    console.log(`✅ 已刪除 ${profileResult.rowCount} 筆員工檔案記錄`);

    // 步驟 4: 刪除用戶帳號
    console.log('步驟 4: 刪除用戶帳號');
    const userResult = await pool.query(`
      DELETE FROM users
      WHERE id::text = $1::text
      RETURNING id, email
    `, [userId]);
    console.log(`✅ 已刪除用戶帳號: ${userResult.rows[0]?.email}`);

    console.log();
    console.log('='.repeat(60));
    console.log('✅ 刪除完成！');
    console.log();
    console.log('💡 下一步：');
    console.log('  1. 在管理介面重新建立員工 47 的帳號');
    console.log('  2. 使用 Email: mama725619@gmail.com');
    console.log('  3. 設定新的臨時密碼');
    console.log('  4. 分配適當的權限');

  } catch (error: any) {
    console.error('❌ 刪除失敗:', error.message);
    console.error('詳細錯誤:', error);
  } finally {
    await pool.end();
  }
}

deleteEmployee47();

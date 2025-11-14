/**
 * 診斷登入跳轉問題
 * 模擬完整的登入流程，檢查每個步驟
 */

import { createPool } from '../server/services/pg-client';

async function debugLoginRedirect() {
  const pool = createPool();

  try {
    const email = 'mama725619@gmail.com';

    console.log('🔍 診斷登入跳轉問題');
    console.log('='.repeat(60));
    console.log();

    // 步驟 1: 檢查用戶資料
    console.log('📋 步驟 1: 檢查用戶資料');
    console.log('-'.repeat(60));
    const userResult = await pool.query(`
      SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        roles,
        status,
        must_change_password,
        password_hash IS NOT NULL as has_password
      FROM users
      WHERE email ILIKE $1
    `, [email]);

    if (userResult.rows.length === 0) {
      console.log('❌ 找不到用戶');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ 用戶存在');
    console.log('   Email:', user.email);
    console.log('   姓名:', user.first_name, user.last_name);
    console.log('   角色:', user.role);
    console.log('   多重角色:', user.roles);
    console.log('   狀態:', user.status);
    console.log('   需要修改密碼:', user.must_change_password ? '是 ⚠️' : '否 ✅');
    console.log();

    // 步驟 2: 檢查權限配置
    console.log('📋 步驟 2: 檢查權限配置');
    console.log('-'.repeat(60));

    const permissionsResult = await pool.query(`
      SELECT
        pm.module_id,
        pm.module_name,
        pm.module_category,
        up.scope
      FROM user_permissions up
      JOIN permission_modules pm ON up.module_id::text = pm.id::text
      WHERE up.user_id::text = $1::text
        AND up.is_active = true
        AND pm.is_active = true
      ORDER BY pm.display_order
    `, [user.id]);

    if (permissionsResult.rows.length === 0) {
      console.log('⚠️  該用戶沒有任何權限！');
      console.log('   這可能是問題的根源：');
      console.log('   - 用戶登入成功');
      console.log('   - 但沒有權限訪問任何頁面');
      console.log('   - 前端可能因此跳回登入頁');
      console.log();
      console.log('💡 解決方案：為用戶分配權限');
    } else {
      console.log(`✅ 找到 ${permissionsResult.rows.length} 個權限模組:`);
      permissionsResult.rows.forEach((perm, idx) => {
        console.log(`   ${idx + 1}. ${perm.module_name} (${perm.module_id})`);
        console.log(`      類別: ${perm.module_category}`);
        console.log(`      範圍: ${perm.scope}`);
      });
    }
    console.log();

    // 步驟 3: 檢查預期的登入流程
    console.log('📋 步驟 3: 預期的登入流程');
    console.log('-'.repeat(60));
    console.log('1. 用戶在登入頁輸入帳號密碼');
    console.log('2. POST /api/auth/login');
    console.log('3. 後端驗證成功，回傳 { success: true, user: {...} }');
    console.log();

    if (user.must_change_password) {
      console.log('4. ⚠️  前端檢查 user.must_change_password = true');
      console.log('5. 跳轉到 /change-password 頁面');
      console.log('6. 用戶設定新密碼');
      console.log('7. POST /api/auth/change-password');
      console.log('8. 修改成功後，must_change_password 設為 false');
      console.log('9. 根據用戶權限跳轉到對應頁面');
    } else {
      console.log('4. ✅ user.must_change_password = false');
      console.log('5. 使用 window.location.href = "/" 跳轉到首頁');
    }
    console.log();

    // 步驟 4: 檢查可能的問題
    console.log('📋 步驟 4: 可能的問題診斷');
    console.log('-'.repeat(60));

    const issues: string[] = [];

    if (user.status !== 'active') {
      issues.push('❌ 帳號狀態不是 active');
    }

    if (!user.has_password) {
      issues.push('❌ 沒有設定密碼');
    }

    if (user.must_change_password) {
      issues.push('⚠️  需要修改密碼（這是正常的首次登入流程）');
    }

    if (permissionsResult.rows.length === 0) {
      issues.push('❌ 沒有任何權限模組（這會導致無法訪問任何頁面）');
    }

    if (issues.length === 0) {
      console.log('✅ 沒有發現明顯問題');
    } else {
      console.log('發現以下問題:');
      issues.forEach(issue => {
        console.log('  ', issue);
      });
    }
    console.log();

    // 步驟 5: 建議的修復方案
    console.log('📋 步驟 5: 建議的修復方案');
    console.log('-'.repeat(60));

    if (permissionsResult.rows.length === 0) {
      console.log('🔧 需要為用戶分配權限:');
      console.log();
      console.log('   方案 A: 使用管理介面分配權限');
      console.log('   1. 以管理員身份登入');
      console.log('   2. 前往「設定 → 權限管理」');
      console.log('   3. 為該用戶分配適當的模組權限');
      console.log();
      console.log('   方案 B: 使用 SQL 直接分配權限');
      console.log('   -- 查看可用的模組');
      console.log('   SELECT id, module_id, module_name FROM permission_modules WHERE is_active = true;');
      console.log();
      console.log('   -- 為用戶分配權限（範例：諮詢師報表）');
      console.log('   INSERT INTO user_permissions (id, user_id, module_id, scope, is_active)');
      console.log("   SELECT gen_random_uuid(), '" + user.id + "', id, 'all', true");
      console.log("   FROM permission_modules WHERE module_id = 'consultant_report';");
    }

    if (user.must_change_password) {
      console.log();
      console.log('🔧 首次登入流程:');
      console.log('   1. 用戶登入後會自動跳轉到 /change-password');
      console.log('   2. 設定新密碼');
      console.log('   3. 系統會根據權限跳轉到對應頁面');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('診斷完成');

  } finally {
    await pool.end();
  }
}

debugLoginRedirect();

/**
 * 修復用戶權限問題
 * 為用戶 47 (mama725619@gmail.com) 分配諮詢師權限
 */

import { createPool } from '../server/services/pg-client';

async function fixUserPermissions() {
  const pool = createPool();

  try {
    const email = 'mama725619@gmail.com';
    const userId = '0a0be4f3-28cb-40df-9cb6-eeeba351fabe';

    console.log('🔧 修復用戶權限');
    console.log('='.repeat(60));
    console.log('用戶:', email);
    console.log('角色: consultant (諮詢師)');
    console.log();

    // 步驟 1: 查看所有可用的權限模組
    console.log('📋 步驟 1: 查看所有可用的權限模組');
    console.log('-'.repeat(60));
    const modulesResult = await pool.query(`
      SELECT id, module_id, module_name, module_category
      FROM permission_modules
      WHERE is_active = true
      ORDER BY display_order
    `);

    console.log(`找到 ${modulesResult.rows.length} 個權限模組:`);
    modulesResult.rows.forEach((mod, idx) => {
      console.log(`  ${idx + 1}. ${mod.module_name} (${mod.module_id}) - ${mod.module_category}`);
    });
    console.log();

    // 步驟 2: 為諮詢師分配適當的權限
    console.log('📋 步驟 2: 為諮詢師分配權限');
    console.log('-'.repeat(60));

    // 諮詢師通常需要的權限：
    // 1. consultant_report - 諮詢師報表（必須）
    // 2. trial_class_report - 體驗課總覽（可選）
    // 3. form_builder - 表單填寫（可選）

    const consultantModules = [
      'consultant_report',    // 諮詢師報表
      'trial_class_report',   // 體驗課總覽
      'form_builder',         // 表單填寫
    ];

    for (const moduleId of consultantModules) {
      // 檢查模組是否存在
      const moduleCheck = await pool.query(`
        SELECT id, module_name FROM permission_modules
        WHERE module_id = $1 AND is_active = true
      `, [moduleId]);

      if (moduleCheck.rows.length === 0) {
        console.log(`⚠️  模組不存在: ${moduleId}`);
        continue;
      }

      const module = moduleCheck.rows[0];

      // 檢查是否已經有權限
      const permCheck = await pool.query(`
        SELECT id FROM user_permissions
        WHERE user_id::text = $1::text AND module_id = $2
      `, [userId, moduleId]);

      if (permCheck.rows.length > 0) {
        console.log(`✅ 已有權限: ${module.module_name}`);
      } else {
        // 新增權限（module_id 是 text，直接使用 moduleId）
        await pool.query(`
          INSERT INTO user_permissions (id, user_id, module_id, scope, is_active, created_at)
          VALUES (gen_random_uuid(), $1, $2, 'all', true, NOW())
        `, [userId, moduleId]);

        console.log(`✅ 已新增權限: ${module.module_name}`);
      }
    }

    console.log();

    // 步驟 3: 驗證權限
    console.log('📋 步驟 3: 驗證權限配置');
    console.log('-'.repeat(60));

    const finalCheck = await pool.query(`
      SELECT
        pm.module_id,
        pm.module_name,
        pm.module_category,
        up.scope
      FROM user_permissions up
      JOIN permission_modules pm ON up.module_id = pm.module_id
      WHERE up.user_id::text = $1::text
        AND up.is_active = true
        AND pm.is_active = true
      ORDER BY pm.display_order
    `, [userId]);

    console.log(`✅ 用戶現在有 ${finalCheck.rows.length} 個權限模組:`);
    finalCheck.rows.forEach((perm, idx) => {
      console.log(`  ${idx + 1}. ${perm.module_name} (${perm.module_id})`);
      console.log(`     類別: ${perm.module_category}, 範圍: ${perm.scope}`);
    });

    console.log();
    console.log('='.repeat(60));
    console.log('✅ 權限修復完成！');
    console.log();
    console.log('💡 下一步:');
    console.log('  1. 請員工重新登入（或重新整理頁面）');
    console.log('  2. 登入後會跳轉到 /change-password 修改密碼');
    console.log('  3. 修改密碼後會跳轉到「諮詢師報表」頁面');

  } finally {
    await pool.end();
  }
}

fixUserPermissions();

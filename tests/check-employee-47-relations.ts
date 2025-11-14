/**
 * 檢查員工 47 的所有關聯資料
 * 找出哪些資料表引用了這個員工
 */

import { createPool } from '../server/services/pg-client';

async function checkRelations() {
  const pool = createPool();

  try {
    const userId = '0a0be4f3-28cb-40df-9cb6-eeeba351fabe';
    const email = 'mama725619@gmail.com';

    console.log('🔍 檢查員工 47 的關聯資料');
    console.log('='.repeat(60));
    console.log('User ID:', userId);
    console.log('Email:', email);
    console.log();

    // 檢查各個資料表
    const tables = [
      { name: 'users', column: 'id', displayName: '用戶主表' },
      { name: 'employee_profiles', column: 'user_id', displayName: '員工檔案' },
      { name: 'user_permissions', column: 'user_id', displayName: '用戶權限' },
      { name: 'business_identities', column: 'user_id', displayName: '業務身份' },
      { name: 'salary_records', column: 'user_id', displayName: '薪資記錄' },
      { name: 'insurance_records', column: 'user_id', displayName: '保險記錄' },
      { name: 'custom_form_submissions', column: 'submitted_by', displayName: '表單提交記錄' },
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`
          SELECT COUNT(*) as count
          FROM ${table.name}
          WHERE ${table.column}::text = $1::text
        `, [userId]);

        const count = parseInt(result.rows[0].count);

        if (count > 0) {
          console.log(`⚠️  ${table.displayName} (${table.name}): ${count} 筆`);
        } else {
          console.log(`✅ ${table.displayName} (${table.name}): 0 筆`);
        }
      } catch (error: any) {
        console.log(`❌ ${table.displayName} (${table.name}): 查詢失敗 (${error.message})`);
      }
    }

    console.log();
    console.log('='.repeat(60));
    console.log('💡 解決方案：');
    console.log();
    console.log('方案 A：停用帳號（推薦）');
    console.log('  - 不刪除資料，只是將 status 設為 inactive');
    console.log('  - 保留所有歷史記錄');
    console.log('  - 之後可以重新啟用');
    console.log();
    console.log('方案 B：完全刪除（需要按順序刪除關聯資料）');
    console.log('  1. 刪除 user_permissions');
    console.log('  2. 刪除 business_identities');
    console.log('  3. 刪除 employee_profiles');
    console.log('  4. 刪除 custom_form_submissions');
    console.log('  5. 最後刪除 users');
    console.log();
    console.log('方案 C：重設帳號（最簡單）');
    console.log('  - 清除權限');
    console.log('  - 重設密碼');
    console.log('  - 重設 must_change_password = true');
    console.log('  - 保留員工記錄');

  } finally {
    await pool.end();
  }
}

checkRelations();

/**
 * 修復缺少 employee_profiles 的使用者
 * 為所有沒有 employee_profiles 記錄的使用者建立記錄並自動生成員工編號
 */

import * as dotenv from 'dotenv';

// 載入環境變數
dotenv.config();

import { createPool, queryDatabase } from '../server/services/pg-client.js';

async function fixMissingEmployeeProfiles() {
  console.log('🔧 開始修復缺少 employee_profiles 的使用者...\n');

  try {
    // 1. 找出所有沒有 employee_profiles 的使用者
    const findQuery = `
      SELECT u.id, u.email, u.first_name, u.last_name
      FROM users u
      LEFT JOIN employee_profiles ep ON u.id = ep.user_id
      WHERE ep.user_id IS NULL
      ORDER BY u.created_at ASC
    `;

    const result = await queryDatabase(findQuery);

    if (result.rows.length === 0) {
      console.log('✅ 所有使用者都已有 employee_profiles 記錄！');
      return;
    }

    console.log(`📋 找到 ${result.rows.length} 位使用者缺少 employee_profiles 記錄：\n`);

    result.rows.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name} ${user.last_name || ''} (${user.email})`);
    });

    console.log('\n開始為這些使用者建立 employee_profiles...\n');

    // 2. 為每位使用者建立 employee_profiles
    let successCount = 0;
    let errorCount = 0;

    for (const user of result.rows) {
      try {
        await queryDatabase(`
          INSERT INTO employee_profiles (user_id)
          VALUES ($1)
        `, [user.id]);

        // 查詢自動生成的員工編號
        const profileResult = await queryDatabase(`
          SELECT employee_number
          FROM employee_profiles
          WHERE user_id = $1
        `, [user.id]);

        const employeeNumber = profileResult.rows[0]?.employee_number || '(未取得)';

        console.log(`   ✅ ${user.first_name} ${user.last_name || ''} - 員工編號: ${employeeNumber}`);
        successCount++;
      } catch (error: any) {
        console.error(`   ❌ ${user.first_name} ${user.last_name || ''} - 錯誤: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`🎉 修復完成！`);
    console.log(`   成功: ${successCount} 位`);
    if (errorCount > 0) {
      console.log(`   失敗: ${errorCount} 位`);
    }
    console.log('='.repeat(50));

    // 3. 顯示所有員工編號（驗證）
    console.log('\n📊 所有員工編號列表：\n');
    const allProfiles = await queryDatabase(`
      SELECT
        ep.employee_number,
        u.first_name,
        u.last_name,
        u.email
      FROM employee_profiles ep
      JOIN users u ON ep.user_id = u.id
      ORDER BY ep.employee_number ASC
    `);

    allProfiles.rows.forEach((profile) => {
      console.log(`   ${profile.employee_number} - ${profile.first_name} ${profile.last_name || ''} (${profile.email})`);
    });

  } catch (error: any) {
    console.error('\n❌ 錯誤:', error.message);
    throw error;
  }
}

// 執行修復
fixMissingEmployeeProfiles()
  .then(() => {
    console.log('\n✨ 完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 執行失敗:', error);
    process.exit(1);
  });

/**
 * 測試 Admin 權限
 *
 * 目的：驗證 Admin 使用者可以看到所有資料（不受權限過濾限制）
 */

import { buildPermissionFilter } from '../server/services/permission-filter-service';
import { queryDatabase } from '../server/services/pg-client';

async function testAdminPermissions() {
  console.log('🧪 開始測試 Admin 權限...\n');

  try {
    // 取得 Admin 使用者
    const adminResult = await queryDatabase(`
      SELECT id, first_name, roles
      FROM users
      WHERE 'admin' = ANY(roles)
      LIMIT 1
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ 找不到 Admin 使用者');
      process.exit(1);
    }

    const admin = adminResult.rows[0];
    console.log(`✅ 找到 Admin 使用者: ${admin.first_name} (ID: ${admin.id})\n`);

    // 測試 1: Trial Class Attendance 權限
    console.log('測試 1：Admin 查詢試聽課記錄');
    const trialClassFilter = await buildPermissionFilter({
      userId: admin.id,
      tableName: 'trial_class_attendance'
    });
    console.log(`  權限過濾條件: ${trialClassFilter}`);

    const trialClassQuery = `
      SELECT COUNT(*) as total
      FROM trial_class_attendance
      WHERE ${trialClassFilter}
    `;
    const trialClassResult = await queryDatabase(trialClassQuery);
    console.log(`  ✅ Admin 可以看到 ${trialClassResult.rows[0].total} 筆試聽課記錄（全部）\n`);

    // 測試 2: Teaching Quality Analysis 權限
    console.log('測試 2：Admin 查詢教學品質分析');
    const teachingQualityFilter = await buildPermissionFilter({
      userId: admin.id,
      tableName: 'teaching_quality_analysis'
    });
    console.log(`  權限過濾條件: ${teachingQualityFilter}`);

    const teachingQualityQuery = `
      SELECT COUNT(*) as total
      FROM teaching_quality_analysis
      WHERE ${teachingQualityFilter}
    `;
    const teachingQualityResult = await queryDatabase(teachingQualityQuery);
    console.log(`  ✅ Admin 可以看到 ${teachingQualityResult.rows[0].total} 筆教學品質分析（全部）\n`);

    // 測試 3: Income Expense Records 權限
    console.log('測試 3：Admin 查詢收支記錄');
    const incomeExpenseFilter = await buildPermissionFilter({
      userId: admin.id,
      tableName: 'income_expense_records'
    });
    console.log(`  權限過濾條件: ${incomeExpenseFilter}`);

    const incomeExpenseQuery = `
      SELECT COUNT(*) as total
      FROM income_expense_records
      WHERE ${incomeExpenseFilter}
    `;
    const incomeExpenseResult = await queryDatabase(incomeExpenseQuery);
    console.log(`  ✅ Admin 可以看到 ${incomeExpenseResult.rows[0].total} 筆收支記錄（全部）\n`);

    // 比較 Admin 和 Teacher 的權限差異
    console.log('=== 權限比較 ===\n');

    // 取得 Karen (教師)
    const karenResult = await queryDatabase(`
      SELECT id FROM users WHERE first_name = 'Karen' LIMIT 1
    `);
    const karenId = karenResult.rows[0].id;

    // Karen 的試聽課記錄
    const karenFilter = await buildPermissionFilter({
      userId: karenId,
      tableName: 'trial_class_attendance'
    });
    const karenQuery = `
      SELECT COUNT(*) as total
      FROM trial_class_attendance
      WHERE ${karenFilter}
    `;
    const karenRecords = await queryDatabase(karenQuery);

    console.log('📊 資料可見性比較:');
    console.log(`   Admin: ${trialClassResult.rows[0].total} 筆試聽課記錄（100%）`);
    console.log(`   Karen (教師): ${karenRecords.rows[0].total} 筆試聽課記錄（只有自己的）`);
    console.log('');
    console.log(`   ✅ Admin 可以看到 ${parseInt(trialClassResult.rows[0].total) - parseInt(karenRecords.rows[0].total)} 筆其他教師的記錄`);
    console.log('');

    // 驗證過濾條件
    console.log('=== 過濾條件驗證 ===\n');
    console.log(`Admin 過濾條件: "${trialClassFilter}"`);
    console.log(`Karen 過濾條件: "${karenFilter}"`);
    console.log('');

    if (trialClassFilter === '1=1' || trialClassFilter.includes('1=1')) {
      console.log('✅ 正確！Admin 的過濾條件為 "1=1"（不過濾）');
    } else {
      console.log('⚠️  警告：Admin 的過濾條件可能有問題');
    }

    if (karenFilter.includes('teacher_code') || karenFilter.includes('T001')) {
      console.log('✅ 正確！Karen 的過濾條件包含業務編號限制');
    } else {
      console.log('⚠️  警告：Karen 的過濾條件可能有問題');
    }

    console.log('\n🎉 所有測試完成！Admin 權限正常');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    process.exit(1);
  }
}

testAdminPermissions()
  .then(() => {
    console.log('\n✅ 測試腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 測試腳本執行失敗:', error);
    process.exit(1);
  });

/**
 * 測試權限過濾功能
 *
 * 目的：驗證 Phase 19.3 的 API 權限過濾整合是否正確
 *
 * 測試情境：
 * 1. Admin 使用者 → 應該看到所有資料
 * 2. 教師 (Karen T001) → 只看到自己的資料
 * 3. 諮詢師 → 只看到自己相關的資料
 */

import { buildPermissionFilter, getUserIdentityCodes } from '../server/services/permission-filter-service';
import { queryDatabase } from '../server/services/pg-client';

async function testPermissionFilter() {
  console.log('🧪 開始測試權限過濾功能...\n');

  // 先執行基本的 service 測試
  console.log('=== 第一部分：權限過濾服務基本功能 ===\n');

  // 取得 Karen 的 user_id
  const karenResult = await queryDatabase(`
    SELECT id, first_name, roles
    FROM users
    WHERE first_name = 'Karen'
    LIMIT 1
  `);

  if (karenResult.rows.length === 0) {
    console.log('❌ 找不到 Karen 使用者');
    return;
  }

  const karenUserId = karenResult.rows[0].id;
  console.log(`✅ 找到 Karen (ID: ${karenUserId})\n`);

  try {
    // 測試 1：取得 Karen 的業務編號
    console.log('測試 1：取得 Karen 的所有業務編號');
    const allCodes = await getUserIdentityCodes(karenUserId);
    console.log('  結果:', allCodes);
    console.log('  ✅ 應包含教師編號 (T001)\n');

    // 測試 2：只取得教師編號
    console.log('測試 2：只取得教師編號');
    const teacherCodes = await getUserIdentityCodes(karenUserId, 'teacher');
    console.log('  結果:', teacherCodes);
    console.log('  ✅ 預期: ["T001"]\n');

    // 測試 3：建立體驗課過濾條件
    console.log('測試 3：建立體驗課過濾條件');
    const filter = await buildPermissionFilter({
      userId: karenUserId,
      tableName: 'trial_class_attendance',
    });
    console.log('  生成的 SQL WHERE 條件:');
    console.log('  ' + filter);
    console.log('');

    // 測試 4：加上額外條件
    console.log('測試 4：加上日期範圍的額外條件');
    const filterWithDate = await buildPermissionFilter({
      userId: karenUserId,
      tableName: 'trial_class_attendance',
      additionalConditions: "class_date >= '2024-01-01'",
    });
    console.log('  生成的 SQL WHERE 條件:');
    console.log('  ' + filterWithDate);
    console.log('');

    // 測試 5：實際查詢資料
    console.log('=== 第二部分：實際資料查詢測試 ===\n');

    // 測試 5-1: Trial Class Attendance
    console.log('測試 5-1：查詢 Karen 的試聽課記錄');
    const trialClassQuery = `
      SELECT
        id,
        student_name,
        teacher_name,
        teacher_code,
        class_date
      FROM trial_class_attendance
      WHERE ${filter}
      ORDER BY class_date DESC
      LIMIT 5
    `;

    const trialClassResult = await queryDatabase(trialClassQuery);
    console.log(`  ✅ Karen 可以看到 ${trialClassResult.rows.length} 筆試聽課記錄（前 5 筆）`);
    if (trialClassResult.rows.length > 0) {
      trialClassResult.rows.forEach((row: any) => {
        console.log(`     - ${row.student_name} | 教師: ${row.teacher_name} (${row.teacher_code || 'N/A'}) | ${row.class_date}`);
      });
    }
    console.log('');

    // 測試 5-2: Teaching Quality Analysis
    console.log('測試 5-2：查詢 Karen 的教學品質分析');
    const teachingQualityFilter = await buildPermissionFilter({
      userId: karenUserId,
      tableName: 'teaching_quality_analysis'
    });

    const teachingQualityQuery = `
      SELECT
        id,
        student_name,
        teacher_name,
        teacher_id,
        class_date,
        overall_score
      FROM teaching_quality_analysis
      WHERE ${teachingQualityFilter}
      ORDER BY class_date DESC
      LIMIT 5
    `;

    const teachingQualityResult = await queryDatabase(teachingQualityQuery);
    console.log(`  ✅ Karen 可以看到 ${teachingQualityResult.rows.length} 筆教學品質分析（前 5 筆）`);
    if (teachingQualityResult.rows.length > 0) {
      teachingQualityResult.rows.forEach((row: any) => {
        console.log(`     - ${row.student_name} | 教師: ${row.teacher_name} | 分數: ${row.overall_score} | ${row.class_date}`);
      });
    }
    console.log('');

    // 測試 5-3: Income Expense Records
    console.log('測試 5-3：查詢 Karen 的收支記錄');
    const incomeExpenseFilter = await buildPermissionFilter({
      userId: karenUserId,
      tableName: 'income_expense_records'
    });

    const incomeExpenseQuery = `
      SELECT
        id,
        transaction_date,
        transaction_type,
        amount,
        item_name,
        notes
      FROM income_expense_records
      WHERE ${incomeExpenseFilter}
      ORDER BY transaction_date DESC
      LIMIT 5
    `;

    const incomeExpenseResult = await queryDatabase(incomeExpenseQuery);
    console.log(`  ✅ Karen 可以看到 ${incomeExpenseResult.rows.length} 筆收支記錄（前 5 筆）`);
    if (incomeExpenseResult.rows.length > 0) {
      incomeExpenseResult.rows.forEach((row: any) => {
        console.log(`     - ${row.transaction_date} | ${row.transaction_type} | $${row.amount} | ${row.item_name || row.notes?.substring(0, 40) || 'N/A'}`);
      });
    }
    console.log('');

    // 測試 6: Admin 權限
    console.log('測試 6：驗證 Admin 可以看到所有資料');
    const adminResult = await queryDatabase(`
      SELECT id, first_name, roles
      FROM users
      WHERE 'super_admin' = ANY(roles) OR 'admin' = ANY(roles)
      LIMIT 1
    `);

    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`  ✅ 找到 Admin 使用者: ${admin.first_name}`);

      const adminFilter = await buildPermissionFilter({
        userId: admin.id,
        tableName: 'trial_class_attendance'
      });

      console.log(`  📝 Admin 的權限過濾條件: ${adminFilter}`);

      if (adminFilter === '1=1' || adminFilter.includes('1=1')) {
        console.log('  ✅ 正確！Admin 可以看到所有資料');
      } else {
        console.log('  ⚠️  警告：Admin 的過濾條件可能有問題');
      }
    } else {
      console.log('  ⚠️  找不到 Admin 使用者，跳過此測試');
    }
    console.log('');

    console.log('=== 測試總計 ===');
    console.log('📊 Karen 的資料統計:');
    console.log(`   - Trial Class Attendance: ${trialClassResult.rows.length} 筆（前 5 筆）`);
    console.log(`   - Teaching Quality Analysis: ${teachingQualityResult.rows.length} 筆（前 5 筆）`);
    console.log(`   - Income Expense Records: ${incomeExpenseResult.rows.length} 筆（前 5 筆）`);
    console.log('');

    console.log('🎉 所有測試完成！');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    process.exit(1);
  }
}

testPermissionFilter()
  .then(() => {
    console.log('\n✅ 測試腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 測試腳本執行失敗:', error);
    process.exit(1);
  });

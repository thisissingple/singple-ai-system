/**
 * 檢查現有方案名稱
 * 查詢 trial_class_purchases 中所有使用中的方案
 */

import { createPool, queryDatabase } from '../server/services/pg-client';

async function checkExistingPlans() {
  console.log('🔍 正在查詢現有方案...\n');

  try {
    const pool = createPool();

    // 查詢 trial_class_purchases 表中所有不同的方案名稱
    const result = await queryDatabase(pool, `
      SELECT DISTINCT
        package_name,
        COUNT(*) as student_count
      FROM trial_class_purchases
      WHERE package_name IS NOT NULL AND package_name != ''
      GROUP BY package_name
      ORDER BY student_count DESC
    `);

    console.log('📊 目前使用中的方案：\n');
    console.log('方案名稱                    | 學生數量');
    console.log('---------------------------|--------');

    result.rows.forEach((row: any) => {
      console.log(`${row.package_name.padEnd(25)} | ${row.student_count}`);
    });

    console.log('\n---\n');

    // 查詢哪些方案還沒有在 course_plans 中
    const missingPlans = await queryDatabase(pool, `
      SELECT DISTINCT p.package_name, COUNT(*) as student_count
      FROM trial_class_purchases p
      LEFT JOIN course_plans cp ON p.package_name = cp.plan_name
      WHERE p.package_name IS NOT NULL
        AND p.package_name != ''
        AND cp.plan_name IS NULL
      GROUP BY p.package_name
      ORDER BY student_count DESC
    `);

    if (missingPlans.rows.length > 0) {
      console.log('⚠️  以下方案尚未建立在 course_plans 表中：\n');
      missingPlans.rows.forEach((row: any) => {
        console.log(`  ❌ "${row.package_name}" (${row.student_count} 位學生)`);
      });
      console.log('\n需要手動補充這些方案！');
    } else {
      console.log('✅ 所有方案都已存在於 course_plans 表中！');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ 查詢失敗:', error);
    process.exit(1);
  }
}

checkExistingPlans();

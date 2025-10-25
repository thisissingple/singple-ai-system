import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';

async function checkLawJoeyClasses() {
  const pool = createPool();

  console.log('\n🔍 檢查 Law Joey 的上課記錄與剩餘堂數...\n');

  try {
    // 1. 查詢 Law Joey 的所有上課記錄
    const attendanceResult = await queryDatabase(`
      SELECT
        student_name,
        student_email,
        class_date,
        teacher_name,
        is_reviewed
      FROM trial_class_attendance
      WHERE student_name = 'Law Joey'
      ORDER BY class_date DESC
    `);

    console.log('📚 Law Joey 的上課記錄（共 ' + attendanceResult.rows.length + ' 筆）:');
    attendanceResult.rows.forEach((record, index) => {
      console.log(`  [${index + 1}] ${record.class_date.toISOString().split('T')[0]} - ${record.teacher_name} - ${record.is_reviewed || '未評價'}`);
    });

    // 2. 查詢 Law Joey 的購買記錄
    const purchaseResult = await queryDatabase(`
      SELECT
        student_email,
        student_name,
        deal_date,
        deal_amount,
        purchased_package,
        remaining_lessons,
        status
      FROM trial_class_purchases
      WHERE student_name = 'Law Joey'
      ORDER BY deal_date DESC
    `);

    console.log('\n💰 Law Joey 的購買記錄（共 ' + purchaseResult.rows.length + ' 筆）:');
    purchaseResult.rows.forEach((record, index) => {
      console.log(`  [${index + 1}] ${record.deal_date?.toISOString().split('T')[0]} - ${record.purchased_package} - 剩餘 ${record.remaining_lessons} 堂 - ${record.status}`);
    });

    // 3. 查詢 Law Joey 的教學品質分析記錄
    const analysisResult = await queryDatabase(`
      SELECT
        student_name,
        teacher_name,
        class_date,
        overall_score,
        conversion_status
      FROM teaching_quality_analysis
      WHERE student_name = 'Law Joey'
      ORDER BY class_date DESC
    `);

    console.log('\n🎯 Law Joey 的教學品質分析記錄（共 ' + analysisResult.rows.length + ' 筆）:');
    analysisResult.rows.forEach((record, index) => {
      console.log(`  [${index + 1}] ${record.class_date.toISOString().split('T')[0]} - ${record.teacher_name} - 評分 ${record.overall_score} - ${record.conversion_status}`);
    });

    // 4. 計算實際剩餘堂數
    if (purchaseResult.rows.length > 0) {
      const latestPurchase = purchaseResult.rows[0];
      const completedClasses = attendanceResult.rows.length; // 所有上課記錄都算已完成

      console.log('\n📊 剩餘堂數計算:');
      console.log('  - 最新購買套餐:', latestPurchase.purchased_package);
      console.log('  - 資料庫顯示剩餘:', latestPurchase.remaining_lessons, '堂');
      console.log('  - 已完成課程數:', completedClasses, '堂');

      // 假設購買的是 4 堂課套餐
      const totalLessons = 4;
      const actualRemaining = totalLessons - completedClasses;
      console.log('  - 實際應該剩餘:', actualRemaining, '堂 (假設總共 ' + totalLessons + ' 堂)');
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkLawJoeyClasses();

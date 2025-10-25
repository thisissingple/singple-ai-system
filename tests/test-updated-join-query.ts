import 'dotenv/config';
import { queryDatabase } from '../server/services/pg-client';

async function testUpdatedJoinQuery() {
  console.log('\n🔍 測試更新後的 JOIN 查詢...\n');

  try {
    const analysisId = 'fb1dbdd0-283b-4a04-b8fd-b3e944375660';

    // Test the updated JOIN query
    const result = await queryDatabase(`
      SELECT tqa.id,
        tqa.student_name,
        tqa.class_date,
        tcp.package_name as purchased_package,
        tcp.student_email as purchase_email,
        tca.student_email as attendance_email
      FROM teaching_quality_analysis tqa
      LEFT JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
      LEFT JOIN trial_class_purchases tcp ON tcp.student_email = tca.student_email
      WHERE tqa.id = $1
    `, [analysisId]);

    if (result.rows.length === 0) {
      console.log('❌ 查詢失敗');
      return;
    }

    const analysis = result.rows[0];
    console.log('📊 更新後的 JOIN 查詢結果:');
    console.log('   student_name:', analysis.student_name);
    console.log('   class_date:', analysis.class_date);
    console.log('   purchased_package:', analysis.purchased_package);
    console.log('   purchase_email:', analysis.purchase_email);
    console.log('   attendance_email:', analysis.attendance_email);

    if (analysis.purchased_package) {
      console.log('\n✅ 成功！購課資訊已找到');

      // Calculate remaining lessons
      let totalLessons = 4;
      if (analysis.purchased_package.includes('pro')) {
        totalLessons = 2;
      } else if (analysis.purchased_package.includes('終極')) {
        totalLessons = 1;
      }

      console.log('\n📐 計算剩餘堂數:');
      console.log('   套餐:', analysis.purchased_package);
      console.log('   總堂數:', totalLessons);

      const attendanceCountResult = await queryDatabase(`
        SELECT COUNT(*) as count
        FROM trial_class_attendance
        WHERE student_email = $1
          AND class_date <= $2
      `, [analysis.attendance_email, analysis.class_date]);

      const classesBeforeOrOn = parseInt(attendanceCountResult.rows[0]?.count || '0', 10);
      const remaining = Math.max(0, totalLessons - classesBeforeOrOn);

      console.log('   該日期前已上課:', classesBeforeOrOn);
      console.log('   剩餘堂數:', remaining);
    } else {
      console.log('\n❌ 購課資訊仍為 null');
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

testUpdatedJoinQuery();

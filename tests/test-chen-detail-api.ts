import 'dotenv/config';
import { queryDatabase } from '../server/services/pg-client';

async function testChenDetailAPI() {
  console.log('\n🔍 測試陳冠霖的詳情 API 資料...\n');

  try {
    // 找到陳冠霖的分析記錄 ID
    const analysisResult = await queryDatabase(`
      SELECT id, student_name, class_date, attendance_id
      FROM teaching_quality_analysis
      WHERE student_name = '陳冠霖'
      LIMIT 1
    `);

    if (analysisResult.rows.length === 0) {
      console.log('❌ 找不到陳冠霖的分析記錄');
      return;
    }

    const analysisId = analysisResult.rows[0].id;
    console.log('✅ 找到分析記錄 ID:', analysisId);
    console.log('   class_date:', analysisResult.rows[0].class_date);
    console.log('   attendance_id:', analysisResult.rows[0].attendance_id);

    // 模擬 API 查詢
    const result = await queryDatabase(`
      SELECT tqa.*,
        tcp.package_name as purchased_package,
        tcp.student_email as purchase_email,
        tca.student_email as attendance_email
      FROM teaching_quality_analysis tqa
      LEFT JOIN trial_class_purchases tcp ON tqa.student_name = tcp.student_name
      LEFT JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
      WHERE tqa.id = $1
    `, [analysisId]);

    if (result.rows.length === 0) {
      console.log('❌ 查詢失敗');
      return;
    }

    const analysis = result.rows[0];
    console.log('\n📊 API 回傳資料:');
    console.log('   student_name:', analysis.student_name);
    console.log('   class_date:', analysis.class_date);
    console.log('   purchased_package:', analysis.purchased_package);
    console.log('   purchase_email:', analysis.purchase_email);
    console.log('   attendance_email:', analysis.attendance_email);

    // 計算剩餘堂數
    if (analysis.purchased_package && analysis.attendance_email) {
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
      console.log('\n❌ 無法計算剩餘堂數');
      console.log('   purchased_package:', analysis.purchased_package);
      console.log('   attendance_email:', analysis.attendance_email);
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

testChenDetailAPI();

import 'dotenv/config';
import { queryDatabase } from '../server/services/pg-client';

async function checkAllStudentsPurchases() {
  console.log('\n🔍 檢查所有學員的購買記錄與上課記錄...\n');

  try {
    // 查詢所有有分析記錄的學員
    const analysesResult = await queryDatabase(`
      SELECT DISTINCT
        tqa.student_name,
        tca.student_email,
        COUNT(tca.id) OVER (PARTITION BY tca.student_email) as total_classes
      FROM teaching_quality_analysis tqa
      LEFT JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
      ORDER BY tqa.student_name
    `);

    console.log(`📊 共有 ${analysesResult.rows.length} 位學員有分析記錄\n`);

    for (const student of analysesResult.rows) {
      // 查詢購買記錄
      const purchaseResult = await queryDatabase(`
        SELECT package_name, student_email
        FROM trial_class_purchases
        WHERE student_name = $1 OR student_email = $2
        LIMIT 1
      `, [student.student_name, student.student_email]);

      console.log(`👤 ${student.student_name}`);
      console.log(`   Email: ${student.student_email || '無'}`);
      console.log(`   上課次數: ${student.total_classes}`);

      if (purchaseResult.rows.length > 0) {
        console.log(`   ✅ 有購買記錄: ${purchaseResult.rows[0].package_name}`);
        console.log(`   購買記錄 email: ${purchaseResult.rows[0].student_email}`);
      } else {
        console.log(`   ❌ 無購買記錄`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

checkAllStudentsPurchases();

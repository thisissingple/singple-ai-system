import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';

async function checkRemainingLessonsLogic() {
  const pool = createPool();

  console.log('\n🔍 檢查剩餘堂數邏輯...\n');

  try {
    // 查詢所有學員的購買記錄和上課記錄
    const result = await queryDatabase(`
      SELECT
        tcp.student_name,
        tcp.student_email,
        tcp.package_name,
        tcp.remaining_classes,
        COUNT(tca.id) as total_classes_attended
      FROM trial_class_purchases tcp
      LEFT JOIN trial_class_attendance tca ON tcp.student_email = tca.student_email
      GROUP BY tcp.student_name, tcp.student_email, tcp.package_name, tcp.remaining_classes
      ORDER BY tcp.student_name
    `);

    console.log('📊 學員購買記錄與上課次數對比:\n');
    result.rows.forEach((row) => {
      console.log(`👤 ${row.student_name}`);
      console.log(`   Email: ${row.student_email}`);
      console.log(`   套餐: ${row.package_name || '未購買'}`);
      console.log(`   資料庫 remaining_classes: ${row.remaining_classes}`);
      console.log(`   已上課次數: ${row.total_classes_attended}\n`);
    });

    // 特別檢查 Law Joey
    console.log('\n🔍 Law Joey 詳細資訊:\n');
    const lawJoeyPurchase = await queryDatabase(`
      SELECT * FROM trial_class_purchases WHERE student_name = 'Law Joey'
    `);

    const lawJoeyAttendance = await queryDatabase(`
      SELECT class_date, teacher_name FROM trial_class_attendance
      WHERE student_name = 'Law Joey'
      ORDER BY class_date
    `);

    if (lawJoeyPurchase.rows.length > 0) {
      const purchase = lawJoeyPurchase.rows[0];
      console.log('購買記錄:');
      console.log('  - package_name:', purchase.package_name);
      console.log('  - remaining_classes:', purchase.remaining_classes);
    }

    console.log('\n上課記錄（' + lawJoeyAttendance.rows.length + ' 筆）:');
    lawJoeyAttendance.rows.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.class_date.toISOString().split('T')[0]} - ${record.teacher_name}`);
    });

    // 計算應該剩餘的堂數
    // 假設購買 4 堂課，已上 3 堂，應剩 1 堂
    console.log('\n📐 計算邏輯:');
    console.log('  假設購買套餐: 4 堂課');
    console.log('  已上課次數: ' + lawJoeyAttendance.rows.length);
    console.log('  應該剩餘: ' + (4 - lawJoeyAttendance.rows.length) + ' 堂');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkRemainingLessonsLogic();

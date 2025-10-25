import 'dotenv/config';
import { queryDatabase } from '../server/services/pg-client';

async function checkChenPurchaseByEmail() {
  console.log('\n🔍 檢查 ssaa.42407@gmail.com 的購課記錄...\n');

  try {
    // 1. 檢查 trial_class_purchases 表
    const purchaseResult = await queryDatabase(`
      SELECT * FROM trial_class_purchases
      WHERE student_email = 'ssaa.42407@gmail.com'
    `);

    console.log('📊 trial_class_purchases 查詢結果:');
    console.log('   筆數:', purchaseResult.rows.length);
    if (purchaseResult.rows.length > 0) {
      purchaseResult.rows.forEach((row, index) => {
        console.log(`\n   [record ${index + 1}]`);
        console.log('   - student_name:', row.student_name);
        console.log('   - student_email:', row.student_email);
        console.log('   - package_name:', row.package_name);
        console.log('   - remaining_classes:', row.remaining_classes);
      });
    } else {
      console.log('   ❌ 找不到購課記錄');
    }

    // 2. 檢查所有包含 "陳" 的購課記錄
    const chenRecords = await queryDatabase(`
      SELECT student_name, student_email, package_name
      FROM trial_class_purchases
      WHERE student_name LIKE '%陳%'
    `);

    console.log('\n\n📊 所有姓陳的購課記錄:');
    console.log('   筆數:', chenRecords.rows.length);
    chenRecords.rows.forEach((row, index) => {
      console.log(`   [record ${index + 1}] ${row.student_name} - ${row.student_email} - ${row.package_name}`);
    });

    // 3. 檢查 trial_class_attendance 的 email
    const attendanceResult = await queryDatabase(`
      SELECT student_name, student_email
      FROM trial_class_attendance
      WHERE student_name = '陳冠霖'
    `);

    console.log('\n\n📊 trial_class_attendance 的陳冠霖記錄:');
    console.log('   筆數:', attendanceResult.rows.length);
    attendanceResult.rows.forEach((row, index) => {
      console.log(`   [record ${index + 1}] ${row.student_name} - ${row.student_email}`);
    });

  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

checkChenPurchaseByEmail();

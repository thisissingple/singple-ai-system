/**
 * 檢查體驗課購買資料和出席記錄
 */
import { createPool } from '../server/services/pg-client';

async function debugPurchaseData() {
  const pool = createPool();

  try {
    console.log('🔍 檢查購買記錄和出席資料...\n');

    // 1. 查看有購買記錄的學員
    const purchaseResult = await pool.query(`
      SELECT
        student_email,
        student_name,
        package_name,
        purchase_date,
        remaining_classes,
        created_at
      FROM trial_class_purchases
      ORDER BY student_email, purchase_date
      LIMIT 20
    `);

    console.log('📦 購買記錄（前20筆）:');
    console.table(purchaseResult.rows);

    // 2. 選一個有多次購買的學員
    const emailCountResult = await pool.query(`
      SELECT student_email, COUNT(*) as purchase_count
      FROM trial_class_purchases
      GROUP BY student_email
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `);

    console.log('\n👥 有多次購買的學員（前5名）:');
    console.table(emailCountResult.rows);

    if (emailCountResult.rows.length > 0) {
      const testEmail = emailCountResult.rows[0].student_email;
      console.log(`\n🎯 測試學員: ${testEmail}`);

      // 3. 該學員的所有購買記錄
      const studentPurchases = await pool.query(`
        SELECT
          package_name,
          purchase_date,
          remaining_classes,
          created_at
        FROM trial_class_purchases
        WHERE student_email = $1
        ORDER BY purchase_date, created_at
      `, [testEmail]);

      console.log('\n📦 該學員的購買記錄:');
      console.table(studentPurchases.rows);

      // 4. 該學員的出席記錄
      const studentAttendance = await pool.query(`
        SELECT
          class_date,
          teacher_name,
          is_showed,
          created_at
        FROM trial_class_attendance
        WHERE student_email = $1
        ORDER BY class_date, created_at
      `, [testEmail]);

      console.log('\n📅 該學員的出席記錄:');
      console.table(studentAttendance.rows);
    }

    // 5. 查看 eods_for_closers 成交記錄
    const eodsResult = await pool.query(`
      SELECT
        student_email,
        student_name,
        plan,
        actual_amount,
        package_price,
        consultation_date
      FROM eods_for_closers
      WHERE student_email IN (
        SELECT DISTINCT student_email
        FROM trial_class_purchases
        LIMIT 10
      )
      ORDER BY student_email
      LIMIT 20
    `);

    console.log('\n💰 成交記錄（eods_for_closers）:');
    console.table(eodsResult.rows);

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

debugPurchaseData();

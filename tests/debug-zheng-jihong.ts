/**
 * Debug script to check 鄭吉宏's complete data
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function debugStudent() {
  const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    const email = 'jitw331@gmail.com';
    console.log('\n=== 鄭吉宏 完整資料檢查 ===\n');

    // 1. Purchase record
    const purchaseQuery = `
      SELECT
        student_name,
        student_email,
        package_name,
        remaining_classes,
        current_status,
        purchase_date
      FROM trial_class_purchases
      WHERE student_email = $1
    `;
    const purchaseResult = await pool.query(purchaseQuery, [email]);

    console.log('📦 購買記錄:');
    if (purchaseResult.rows.length > 0) {
      const p = purchaseResult.rows[0];
      console.log(`  姓名: ${p.student_name}`);
      console.log(`  方案: ${p.package_name}`);
      console.log(`  剩餘堂數: ${p.remaining_classes}`);
      console.log(`  current_status: ${p.current_status}`);
      console.log(`  購買日期: ${p.purchase_date}`);
    } else {
      console.log('  ❌ 無購買記錄');
    }

    // 2. Attendance records
    const attendanceQuery = `
      SELECT
        class_date,
        teacher_name,
        class_transcript IS NOT NULL as has_transcript
      FROM trial_class_attendance
      WHERE student_email = $1
      ORDER BY class_date DESC
    `;
    const attendanceResult = await pool.query(attendanceQuery, [email]);

    console.log(`\n📋 出席記錄 (${attendanceResult.rows.length} 筆):`);
    attendanceResult.rows.forEach((a, idx) => {
      console.log(`  ${idx + 1}. ${a.class_date.toISOString().split('T')[0]} - ${a.teacher_name} ${a.has_transcript ? '(有逐字稿)' : ''}`);
    });

    // 3. High-level deal records
    const dealQuery = `
      SELECT
        id,
        student_name,
        student_email,
        deal_amount,
        package_name,
        purchase_date,
        created_at
      FROM high_level_deals
      WHERE student_email = $1
    `;
    const dealResult = await pool.query(dealQuery, [email]);

    console.log(`\n💰 高階成交記錄 (${dealResult.rows.length} 筆):`);
    if (dealResult.rows.length > 0) {
      dealResult.rows.forEach((d, idx) => {
        console.log(`  ${idx + 1}. ID: ${d.id}`);
        console.log(`     金額: $${d.deal_amount}`);
        console.log(`     方案: ${d.package_name}`);
        console.log(`     購買日期: ${d.purchase_date}`);
        console.log('');
      });
    } else {
      console.log('  ❌ 無高階成交記錄');
    }

    // 4. 根據 total-report-service 邏輯計算狀態
    console.log('\n🤖 根據 total-report-service 邏輯計算:\n');

    const hasHighLevelDeal = dealResult.rows.length > 0 && dealResult.rows.some(d => d.deal_amount > 0);
    const hasAttendance = attendanceResult.rows.length > 0;
    const remainingClasses = purchaseResult.rows[0]?.remaining_classes;
    const noRemainingClasses = remainingClasses === 0 || remainingClasses === '0 堂';

    console.log(`  hasHighLevelDeal (成交金額 > 0): ${hasHighLevelDeal}`);
    console.log(`  hasAttendance (有出席記錄): ${hasAttendance}`);
    console.log(`  remainingClasses: ${remainingClasses}`);
    console.log(`  noRemainingClasses: ${noRemainingClasses}`);

    let calculatedStatus = '';
    if (hasHighLevelDeal) {
      calculatedStatus = '已轉高';
    } else if (noRemainingClasses && hasAttendance) {
      calculatedStatus = '未轉高';
    } else if (hasAttendance) {
      calculatedStatus = '體驗中';
    } else {
      calculatedStatus = '未開始';
    }

    console.log(`\n  ➡️  計算結果: ${calculatedStatus}`);
    console.log(`  📊 資料庫中的 current_status: ${purchaseResult.rows[0]?.current_status || 'null'}`);

    if (calculatedStatus !== purchaseResult.rows[0]?.current_status) {
      console.log(`\n  ⚠️  不一致！計算結果與資料庫不同`);
    } else {
      console.log(`\n  ✅ 一致`);
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
    console.log('\n✅ 除錯完成\n');
  }
}

debugStudent();

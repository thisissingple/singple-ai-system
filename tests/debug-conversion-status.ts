/**
 * Debug script to check trial_class_purchases data
 * This script will help us understand why conversion status is not syncing
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function debugConversionStatus() {
  const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    console.log('\n=== 檢查 trial_class_purchases 資料 ===\n');

    // 1. Check 鄭吉宏's purchase record
    const studentEmail = '鄭吉宏'; // We'll search by name first
    console.log(`🔍 查詢學員: ${studentEmail}\n`);

    // First, find the student's email from attendance records
    const attendanceQuery = `
      SELECT DISTINCT student_name, student_email
      FROM trial_class_attendance
      WHERE student_name ILIKE $1
      LIMIT 5
    `;
    const attendanceResult = await pool.query(attendanceQuery, [`%${studentEmail}%`]);

    console.log(`📋 找到 ${attendanceResult.rows.length} 筆出席記錄:\n`);
    attendanceResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. 姓名: ${row.student_name}, Email: ${row.student_email}`);
    });

    if (attendanceResult.rows.length === 0) {
      console.log('❌ 找不到學員的出席記錄');
      await pool.end();
      return;
    }

    // Get the first email found
    const email = attendanceResult.rows[0].student_email;
    console.log(`\n✅ 使用 Email: ${email}\n`);

    // 2. Check purchase record with this email
    const purchaseQuery = `
      SELECT
        id,
        student_name,
        student_email,
        package_name,
        remaining_classes,
        current_status,
        purchase_date,
        created_at
      FROM trial_class_purchases
      WHERE student_email = $1
    `;
    const purchaseResult = await pool.query(purchaseQuery, [email]);

    console.log(`\n📦 購買記錄 (${purchaseResult.rows.length} 筆):\n`);
    purchaseResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ID: ${row.id}`);
      console.log(`     姓名: ${row.student_name}`);
      console.log(`     Email: ${row.student_email}`);
      console.log(`     方案: ${row.package_name}`);
      console.log(`     剩餘堂數: ${row.remaining_classes}`);
      console.log(`     轉換狀態: ${row.current_status || '(null)'}`);
      console.log(`     購買日期: ${row.purchase_date}`);
      console.log(`     建立時間: ${row.created_at}`);
      console.log('');
    });

    // 3. Check case-insensitive matching
    console.log('\n🔍 測試大小寫不敏感查詢:\n');
    const caseInsensitiveQuery = `
      SELECT
        student_email,
        current_status,
        LOWER(student_email) as lower_email
      FROM trial_class_purchases
      WHERE LOWER(student_email) = LOWER($1)
    `;
    const caseResult = await pool.query(caseInsensitiveQuery, [email]);

    console.log(`找到 ${caseResult.rows.length} 筆記錄 (大小寫不敏感):\n`);
    caseResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. Email: ${row.student_email}`);
      console.log(`     Lower Email: ${row.lower_email}`);
      console.log(`     狀態: ${row.current_status || '(null)'}`);
      console.log('');
    });

    // 4. Check all unique current_status values
    console.log('\n📊 所有可能的 current_status 值:\n');
    const statusQuery = `
      SELECT
        current_status,
        COUNT(*) as count
      FROM trial_class_purchases
      GROUP BY current_status
      ORDER BY count DESC
    `;
    const statusResult = await pool.query(statusQuery);

    statusResult.rows.forEach((row) => {
      console.log(`  "${row.current_status || '(null)'}": ${row.count} 筆`);
    });

    // 5. Sample records with different statuses
    console.log('\n\n📝 各狀態的範例記錄:\n');
    const sampleQuery = `
      SELECT
        student_name,
        student_email,
        current_status
      FROM trial_class_purchases
      WHERE current_status IS NOT NULL
      LIMIT 10
    `;
    const sampleResult = await pool.query(sampleQuery);

    sampleResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. ${row.student_name} (${row.student_email}): ${row.current_status}`);
    });

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
    console.log('\n✅ 除錯完成\n');
  }
}

debugConversionStatus();

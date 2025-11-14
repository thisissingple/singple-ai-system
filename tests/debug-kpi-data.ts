/**
 * Debug KPI Data - 檢查資料庫實際數據
 * 用於診斷 KPI 計算錯誤的原因
 */

import { createPool } from '../server/services/pg-client';

async function debugKPIData() {
  const pool = createPool();

  try {
    console.log('🔍 開始檢查資料庫資料...\n');

    // 1. 檢查體驗課上課記錄
    console.log('📚 1. 體驗課上課記錄 (trial_class_attendance)');
    const attendance = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT student_email) as unique_students
      FROM trial_class_attendance
      WHERE student_email IS NOT NULL AND student_email != ''
    `);
    console.log('   總筆數:', attendance.rows[0].total);
    console.log('   唯一學生數:', attendance.rows[0].unique_students);
    console.log('');

    // 2. 檢查體驗課購買記錄和狀態
    console.log('📋 2. 體驗課購買記錄 (trial_class_purchases)');
    const purchases = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT student_email) as unique_students
      FROM trial_class_purchases
      WHERE student_email IS NOT NULL AND student_email != ''
    `);
    console.log('   總筆數:', purchases.rows[0].total);
    console.log('   唯一學生數:', purchases.rows[0].unique_students);

    // 檢查狀態分布
    const statusDist = await pool.query(`
      SELECT status, COUNT(*) as count,
             COUNT(DISTINCT student_email) as unique_students
      FROM trial_class_purchases
      WHERE student_email IS NOT NULL AND student_email != ''
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log('   狀態分布:');
    statusDist.rows.forEach(row => {
      console.log(`     ${row.status || '(空白)'}: ${row.count} 筆 (${row.unique_students} 個唯一學生)`);
    });
    console.log('');

    // 3. 檢查成交記錄
    console.log('💰 3. 成交記錄 (eods_for_closers)');
    const deals = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(DISTINCT student_email) as unique_students
      FROM eods_for_closers
      WHERE student_email IS NOT NULL AND student_email != ''
    `);
    console.log('   總筆數:', deals.rows[0].total);
    console.log('   唯一學生數:', deals.rows[0].unique_students);

    // 檢查有 deal_date 和 deal_amount 的記錄
    const validDeals = await pool.query(`
      SELECT COUNT(*) as count
      FROM eods_for_closers
      WHERE deal_date IS NOT NULL
        AND actual_amount IS NOT NULL
        AND actual_amount > 0
    `);
    console.log('   有效成交記錄 (有日期+金額):', validDeals.rows[0].count);

    // 檢查方案分布
    const planDist = await pool.query(`
      SELECT plan, COUNT(*) as count,
             SUM(CAST(COALESCE(actual_amount, 0) AS NUMERIC)) as total_amount
      FROM eods_for_closers
      WHERE student_email IS NOT NULL AND student_email != ''
      GROUP BY plan
      ORDER BY count DESC
      LIMIT 10
    `);
    console.log('   方案分布 (前10):');
    planDist.rows.forEach(row => {
      console.log(`     ${row.plan || '(空白)'}: ${row.count} 筆, 金額: NT$ ${parseFloat(row.total_amount || 0).toLocaleString()}`);
    });
    console.log('');

    // 4. 交叉檢查：體驗課學生在成交記錄中的情況
    console.log('🔗 4. 體驗課學生 → 成交記錄交叉分析');
    const crossCheck = await pool.query(`
      WITH trial_students AS (
        SELECT DISTINCT LOWER(TRIM(student_email)) as email
        FROM trial_class_purchases
        WHERE student_email IS NOT NULL AND student_email != ''
      )
      SELECT
        COUNT(DISTINCT e.student_email) as converted_students,
        COUNT(*) as total_deals,
        SUM(CAST(COALESCE(e.actual_amount, 0) AS NUMERIC)) as total_revenue
      FROM eods_for_closers e
      INNER JOIN trial_students t ON LOWER(TRIM(e.student_email)) = t.email
      WHERE e.plan LIKE '%高階一對一%' OR e.plan LIKE '%高音%'
    `);
    console.log('   體驗課學生成交高階方案:');
    console.log('     學生數:', crossCheck.rows[0].converted_students);
    console.log('     成交筆數:', crossCheck.rows[0].total_deals);
    console.log('     總收益: NT$', parseFloat(crossCheck.rows[0].total_revenue || 0).toLocaleString());
    console.log('');

    // 5. 樣本資料檢查
    console.log('🔬 5. 樣本資料檢查 (前3筆購買記錄)');
    const samplePurchases = await pool.query(`
      SELECT id, student_name, student_email, status, purchase_date, plan
      FROM trial_class_purchases
      ORDER BY created_at DESC
      LIMIT 3
    `);
    samplePurchases.rows.forEach((row, idx) => {
      console.log(`   [${idx + 1}] ${row.student_name || 'N/A'}`);
      console.log(`       Email: ${row.student_email || 'N/A'}`);
      console.log(`       狀態: ${row.status || 'N/A'}`);
      console.log(`       購買日期: ${row.purchase_date || 'N/A'}`);
      console.log(`       方案: ${row.plan || 'N/A'}`);
    });
    console.log('');

    console.log('✅ 資料檢查完成');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

debugKPIData();

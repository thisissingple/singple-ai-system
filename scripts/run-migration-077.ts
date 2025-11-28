/**
 * Run Migration 077: Add unique constraints to all sync tables
 */

import dotenv from 'dotenv';
dotenv.config();

import { queryDatabase } from '../server/services/pg-client';

async function runMigration() {
  console.log('🚀 Running Migration 077: Add unique constraints to sync tables\n');

  try {
    // ============================================================================
    // Step 1: income_expense_records
    // ============================================================================
    console.log('='.repeat(60));
    console.log('📊 Step 1: income_expense_records');
    console.log('='.repeat(60));

    // 1.1 檢查重複
    const incomeDups = await queryDatabase(`
      SELECT transaction_date, customer_email, income_item, expense_item, amount_twd, COUNT(*) as count
      FROM income_expense_records
      GROUP BY transaction_date, customer_email, income_item, expense_item, amount_twd
      HAVING COUNT(*) > 1
    `, [], 'session');
    console.log(`\n發現 ${incomeDups.rows.length} 組重複資料`);

    // 1.2 刪除重複
    if (incomeDups.rows.length > 0) {
      console.log('🗑️  刪除重複記錄...');
      const deleteResult = await queryDatabase(`
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY transaction_date, customer_email, income_item, expense_item, amount_twd
                   ORDER BY created_at DESC NULLS LAST, id DESC
                 ) as rn
          FROM income_expense_records
        )
        DELETE FROM income_expense_records
        WHERE id IN (
          SELECT id FROM ranked WHERE rn > 1
        )
      `, [], 'session');
      console.log(`✅ 已刪除 ${deleteResult.rowCount || 0} 筆重複記錄`);
    }

    // 1.3 檢查索引是否存在
    const incomeIndexCheck = await queryDatabase(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'income_expense_records'
        AND indexname = 'idx_income_expense_unique_record'
    `, [], 'session');

    if (incomeIndexCheck.rows.length > 0) {
      console.log('⚠️  唯一索引已存在，跳過建立');
    } else {
      console.log('🔧 建立唯一索引...');
      await queryDatabase(`
        CREATE UNIQUE INDEX idx_income_expense_unique_record
        ON income_expense_records (transaction_date, customer_email, income_item, expense_item, amount_twd)
      `, [], 'session');
      console.log('✅ 唯一索引建立成功');
    }

    // ============================================================================
    // Step 2: trial_class_purchases
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('📊 Step 2: trial_class_purchases');
    console.log('='.repeat(60));

    // 2.1 檢查重複
    const purchaseDups = await queryDatabase(`
      SELECT student_email, package_name, purchase_date, COUNT(*) as count
      FROM trial_class_purchases
      WHERE student_email IS NOT NULL
        AND package_name IS NOT NULL
        AND purchase_date IS NOT NULL
      GROUP BY student_email, package_name, purchase_date
      HAVING COUNT(*) > 1
    `, [], 'session');
    console.log(`\n發現 ${purchaseDups.rows.length} 組重複資料`);

    // 2.2 刪除重複
    if (purchaseDups.rows.length > 0) {
      console.log('🗑️  刪除重複記錄...');
      const deleteResult = await queryDatabase(`
        WITH ranked AS (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY student_email, package_name, purchase_date
                   ORDER BY created_at DESC NULLS LAST, id DESC
                 ) as rn
          FROM trial_class_purchases
          WHERE student_email IS NOT NULL
            AND package_name IS NOT NULL
            AND purchase_date IS NOT NULL
        )
        DELETE FROM trial_class_purchases
        WHERE id IN (
          SELECT id FROM ranked WHERE rn > 1
        )
      `, [], 'session');
      console.log(`✅ 已刪除 ${deleteResult.rowCount || 0} 筆重複記錄`);
    }

    // 2.3 檢查索引是否存在
    const purchaseIndexCheck = await queryDatabase(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'trial_class_purchases'
        AND indexname = 'idx_trial_purchases_unique_record'
    `, [], 'session');

    if (purchaseIndexCheck.rows.length > 0) {
      console.log('⚠️  唯一索引已存在，跳過建立');
    } else {
      console.log('🔧 建立唯一索引 (partial)...');
      await queryDatabase(`
        CREATE UNIQUE INDEX idx_trial_purchases_unique_record
        ON trial_class_purchases (student_email, package_name, purchase_date)
        WHERE student_email IS NOT NULL
          AND package_name IS NOT NULL
          AND purchase_date IS NOT NULL
      `, [], 'session');
      console.log('✅ 唯一索引建立成功');
    }

    // ============================================================================
    // Step 3: 驗證
    // ============================================================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ Step 3: 驗證結果');
    console.log('='.repeat(60));

    const incomeCount = await queryDatabase('SELECT COUNT(*) as count FROM income_expense_records', [], 'session');
    const purchaseCount = await queryDatabase('SELECT COUNT(*) as count FROM trial_class_purchases', [], 'session');

    console.log(`\n📊 最終資料統計:`);
    console.log(`   - income_expense_records: ${incomeCount.rows[0].count} 筆`);
    console.log(`   - trial_class_purchases: ${purchaseCount.rows[0].count} 筆`);

    // 列出所有唯一索引
    const allIndexes = await queryDatabase(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('eods_for_closers', 'income_expense_records', 'trial_class_purchases')
        AND indexdef LIKE '%UNIQUE%'
    `, [], 'session');

    console.log(`\n📋 所有 Google Sheets 同步表的唯一索引:`);
    for (const idx of allIndexes.rows) {
      console.log(`   - ${idx.tablename}: ${idx.indexname}`);
    }

    console.log('\n🎉 Migration 077 完成!');

  } catch (error: any) {
    console.error('\n❌ Migration 失敗:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();

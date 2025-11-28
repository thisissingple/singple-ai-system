/**
 * Run Migration 076: Add unique constraint to eods_for_closers
 */

import dotenv from 'dotenv';
dotenv.config();

import { queryDatabase } from '../server/services/pg-client';

async function runMigration() {
  console.log('🚀 Running Migration 076: Add unique constraint to eods_for_closers\n');

  try {
    // Step 1: 查看目前的重複資料數量
    console.log('📊 Step 1: 檢查目前的重複資料...');
    const duplicateCheck = await queryDatabase(`
      SELECT student_email, consultation_date, closer_name, COUNT(*) as count
      FROM eods_for_closers
      WHERE student_email IS NOT NULL
        AND consultation_date IS NOT NULL
        AND closer_name IS NOT NULL
      GROUP BY student_email, consultation_date, closer_name
      HAVING COUNT(*) > 1
      LIMIT 10
    `, [], 'session');

    console.log(`   發現 ${duplicateCheck.rows.length} 組重複資料（顯示前 10 組）`);
    if (duplicateCheck.rows.length > 0) {
      duplicateCheck.rows.forEach((row: any) => {
        console.log(`   - ${row.student_email} / ${row.consultation_date} / ${row.closer_name}: ${row.count} 筆`);
      });
    }

    // Step 2: 清除重複資料（保留最新的一筆）
    console.log('\n🗑️  Step 2: 清除重複資料（保留最新）...');

    // 使用 CTE 找出要刪除的記錄
    const deleteResult = await queryDatabase(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY student_email, consultation_date, closer_name
                 ORDER BY created_at DESC
               ) as rn
        FROM eods_for_closers
        WHERE student_email IS NOT NULL
          AND consultation_date IS NOT NULL
          AND closer_name IS NOT NULL
      )
      DELETE FROM eods_for_closers
      WHERE id IN (
        SELECT id FROM ranked WHERE rn > 1
      )
    `, [], 'session');

    console.log(`   ✅ 已刪除 ${deleteResult.rowCount || 0} 筆重複記錄`);

    // Step 3: 檢查是否已存在唯一索引
    console.log('\n🔍 Step 3: 檢查是否已存在唯一索引...');
    const indexCheck = await queryDatabase(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'eods_for_closers'
        AND indexname = 'idx_eods_unique_consultation'
    `, [], 'session');

    if (indexCheck.rows.length > 0) {
      console.log('   ⚠️ 唯一索引已存在，跳過建立');
    } else {
      // Step 4: 建立唯一索引
      console.log('\n🔧 Step 4: 建立唯一索引...');
      await queryDatabase(`
        CREATE UNIQUE INDEX idx_eods_unique_consultation
        ON eods_for_closers (student_email, consultation_date, closer_name)
        WHERE student_email IS NOT NULL
          AND consultation_date IS NOT NULL
          AND closer_name IS NOT NULL
      `, [], 'session');
      console.log('   ✅ 唯一索引建立成功');
    }

    // Step 5: 驗證
    console.log('\n✅ Step 5: 驗證...');
    const totalCount = await queryDatabase(`
      SELECT COUNT(*) as count FROM eods_for_closers
    `, [], 'session');
    console.log(`   總記錄數: ${totalCount.rows[0].count}`);

    const uniqueCount = await queryDatabase(`
      SELECT COUNT(DISTINCT (student_email, consultation_date, closer_name)) as count
      FROM eods_for_closers
      WHERE student_email IS NOT NULL
        AND consultation_date IS NOT NULL
        AND closer_name IS NOT NULL
    `, [], 'session');
    console.log(`   唯一組合數: ${uniqueCount.rows[0].count}`);

    console.log('\n🎉 Migration 076 完成！');
    console.log('   唯一鍵: (student_email, consultation_date, closer_name)');

  } catch (error: any) {
    console.error('❌ Migration 失敗:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

runMigration();

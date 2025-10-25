/**
 * 檢查為什麼 97 筆購買記錄只有 96 個學生
 */

import { createPool, queryDatabase } from '../server/services/pg-client';
import { resolveField } from '../server/services/reporting/field-mapping-v2';

async function checkStudentCount() {
  const pool = createPool();

  try {
    console.log('🔍 檢查購買記錄中的學生數量...\n');

    // 查詢所有購買記錄
    const purchaseQuery = `
      SELECT id, data
      FROM data_storage
      WHERE source = '體驗課購買表'
      ORDER BY created_at DESC
    `;

    const purchases = await queryDatabase(pool, purchaseQuery);
    console.log(`📊 購買記錄總數: ${purchases.length}\n`);

    // 提取所有 email
    const emailCounts = new Map<string, number>();
    const emptyEmails: any[] = [];

    purchases.forEach((row, index) => {
      const email = (
        resolveField(row.data, 'studentEmail') ||
        row.data?.學員信箱 ||
        row.data?.email ||
        ''
      ).toLowerCase().trim();

      if (email) {
        emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
      } else {
        emptyEmails.push({ index: index + 1, id: row.id, data: row.data });
      }
    });

    console.log(`✅ 有 email 的記錄: ${purchases.length - emptyEmails.length}`);
    console.log(`❌ 沒有 email 的記錄: ${emptyEmails.length}`);
    console.log(`👥 唯一 email 數量: ${emailCounts.size}\n`);

    // 檢查重複的 email
    const duplicateEmails = Array.from(emailCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    if (duplicateEmails.length > 0) {
      console.log('🔄 重複購買的學生:');
      duplicateEmails.forEach(([email, count]) => {
        console.log(`  - ${email}: ${count} 次購買`);
      });
      console.log();
    }

    // 顯示沒有 email 的記錄
    if (emptyEmails.length > 0) {
      console.log('⚠️  沒有 email 的購買記錄:');
      emptyEmails.forEach((record) => {
        console.log(`  - 記錄 #${record.index} (ID: ${record.id})`);
        console.log(`    姓名: ${record.data?.學員姓名 || record.data?.studentName || '未知'}`);
        console.log(`    狀態: ${record.data?.目前狀態 || record.data?.currentStatus || '未知'}`);
        console.log();
      });
    }

    // 總結
    console.log('📋 總結:');
    console.log(`  購買記錄總數: ${purchases.length}`);
    console.log(`  唯一學生數: ${emailCounts.size}`);
    console.log(`  差異: ${purchases.length - emailCounts.size} 筆`);

    if (duplicateEmails.length > 0) {
      const duplicateCount = duplicateEmails.reduce((sum, [_, count]) => sum + (count - 1), 0);
      console.log(`  原因: ${duplicateCount} 筆重複購買 ${emptyEmails.length > 0 ? `+ ${emptyEmails.length} 筆無 email` : ''}`);
    } else if (emptyEmails.length > 0) {
      console.log(`  原因: ${emptyEmails.length} 筆購買記錄沒有 email`);
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkStudentCount();

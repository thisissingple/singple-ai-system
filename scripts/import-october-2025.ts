/**
 * 匯入 2025 年 10 月收支記錄到 income_expense_records 表
 */

import { createPool } from '../server/services/pg-client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.join(__dirname, '../archive/data/google-sheets/收支情形 - 收支表單.csv');

interface CSVRow {
  Date: string;
  Month: string;
  Year: string;
  顧客購買媒介: string;
  付款方式: string;
  訂單編號: string;
  收入項目: string;
  數量: string;
  收支類別: string;
  課程類別: string;
  授課教練: string;
  支出項目: string;
  '商家姓名/顧客姓名': string;
  顧客Email: string;
  備註: string;
  期數: string;
  '第幾期': string;
  總期數: string;
  姓名類別: string;
  '金額（台幣）': string;
  '金額（人民幣）': string;
  '金額（換算台幣）': string;
  '業績歸屬人 1': string;
  '業績歸屬人 2': string;
  填表人: string;
  成交方式: string;
}

// 解析金額（移除 $ 和 , 符號）
function parseAmount(amountStr: string): number {
  if (!amountStr) return 0;
  return parseFloat(amountStr.replace(/[\$,]/g, ''));
}

// 解析日期 (MM/DD/YYYY -> YYYY-MM-DD)
function parseDate(dateStr: string): string {
  const [month, day, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

async function importOctoberData() {
  const pool = createPool();

  try {
    console.log('📖 讀取 CSV 檔案...');
    const csvContent = fs.readFileSync(CSV_FILE, 'utf-8');

    // 使用 papaparse 解析 CSV
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    const allRecords = parseResult.data as CSVRow[];
    console.log(`✅ 找到 ${allRecords.length} 筆記錄`);

    // 篩選 2025 年 10 月的資料
    const octoberRecords: any[] = [];

    for (const row of allRecords) {
      // 檢查是否為 10 月 2025 年
      if (!row.Date?.startsWith('10/') || !row.Year?.includes('2025')) continue;

      const dateStr = row.Date;
      const transactionType = row['收支類別'];
      const itemName = row['收入項目'] || row['支出項目'];
      const customerName = row['商家姓名/顧客姓名'];
      const customerEmail = row['顧客Email'];
      const amountStr = row['金額（台幣）'];
      const notes = row['備註'];
      const paymentMethod = row['付款方式'];
      const courseType = row['課程類別'];

      if (!dateStr || !transactionType || !amountStr) continue;

      const amount = parseAmount(amountStr);
      if (amount === 0 || isNaN(amount)) continue;

      octoberRecords.push({
        transaction_date: parseDate(dateStr),
        transaction_type: transactionType === '收入' ? 'income' : 'expense',
        category: transactionType === '收入' ? '課程收入' : '支出',
        item_name: itemName || '未指定',
        amount: Math.abs(amount),
        currency: 'TWD',
        student_name: customerName,
        student_email: customerEmail,
        notes: notes,
        payment_method: paymentMethod || null,
        course_type: courseType || null,
        source: 'imported',
        is_confirmed: true,
      });
    }

    console.log(`\n✅ 篩選出 ${octoberRecords.length} 筆 2025 年 10 月記錄`);

    if (octoberRecords.length === 0) {
      console.log('❌ 沒有找到 10 月資料');
      return;
    }

    // 插入資料
    console.log('\n💾 開始匯入資料...');
    let insertedCount = 0;

    for (const record of octoberRecords) {
      try {
        const query = `
          INSERT INTO income_expense_records (
            transaction_date,
            transaction_type,
            category,
            item_name,
            amount,
            currency,
            student_name,
            student_email,
            notes,
            payment_method,
            course_type,
            source,
            is_confirmed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `;

        await pool.query(query, [
          record.transaction_date,
          record.transaction_type,
          record.category,
          record.item_name,
          record.amount,
          record.currency,
          record.student_name,
          record.student_email,
          record.notes,
          record.payment_method,
          record.course_type,
          record.source,
          record.is_confirmed,
        ]);

        insertedCount++;
        console.log(`✅ [${insertedCount}/${octoberRecords.length}] ${record.transaction_date} - ${record.item_name} - NT$${record.amount}`);
      } catch (error: any) {
        console.error(`❌ 匯入失敗: ${record.item_name}`, error.message);
      }
    }

    console.log(`\n🎉 匯入完成！成功匯入 ${insertedCount} 筆記錄`);

  } catch (error) {
    console.error('❌ 匯入過程發生錯誤:', error);
  } finally {
    await pool.end();
  }
}

// 執行匯入
importOctoberData();

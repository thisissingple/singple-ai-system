/**
 * 使用直接 SQL 導入體驗課購買記錄（繞過 PostgREST schema cache 問題）
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import pg from 'pg';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    const cleaned = dateStr.replace(/[上下]午/g, '').trim();
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function parseNumber(numStr: string): number | null {
  if (!numStr) return null;
  const cleaned = numStr.toString().replace(/[NT$,\s堂第週]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.floor(num);
}

async function importPurchases() {
  console.log('📂 匯入：體驗課購買記錄表（使用直接 SQL）');
  console.log('='.repeat(60));

  const csvDir = path.join(__dirname, '../excisting_csv');
  const filePath = path.join(csvDir, '教練組KPI - 體驗課購買記錄表.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });

  console.log(`✓ 讀取到 ${parsed.data.length} 筆資料`);

  // 清空舊資料
  console.log('🗑️  清空舊資料...');
  await pool.query("DELETE FROM trial_class_purchase WHERE id != '00000000-0000-0000-0000-000000000000'");

  // 逐筆插入
  let inserted = 0;
  for (const row of parsed.data as any[]) {
    const sql = `
      INSERT INTO trial_class_purchase (
        student_name,
        student_email,
        age,
        occupation,
        package_name,
        trial_classes_total,
        remaining_classes,
        purchase_date,
        current_status,
        updated_date,
        last_class_date,
        notes,
        raw_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;

    const values = [
      row['姓名'] || null,
      row['email'] || null,
      parseNumber(row['年齡']),
      row['職業'] || null,
      row['方案名稱'] || null,
      parseNumber(row['體驗堂數']),
      parseNumber(row['剩餘堂數（自動計算）']),
      parseDate(row['體驗課購買日期']),
      row['目前狀態（自動計算）'] || null,
      parseDate(row['更新日期']),
      parseDate(row['最近一次上課日期']),
      row['備註'] || null,
      JSON.stringify(row)
    ];

    try {
      await pool.query(sql, values);
      inserted++;
      if (inserted % 10 === 0) {
        console.log(`✓ 已匯入 ${inserted} / ${parsed.data.length} 筆`);
      }
    } catch (error: any) {
      console.error(`❌ 匯入失敗:`, error.message);
      console.error('資料:', row);
    }
  }

  console.log(`🎉 完成！總共 ${inserted} 筆\n`);
}

async function main() {
  try {
    await importPurchases();
  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

main();

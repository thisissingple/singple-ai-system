/**
 * 直接匯入 CSV 到 Supabase（欄位名稱一模一樣）
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getSupabaseClient } from '../server/services/supabase-client';

const csvDir = path.join(process.cwd(), 'excisting_csv');

// 解析日期
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const year = parts[0].padStart(4, '0');
      const month = parts[1].padStart(2, '0');
      const day = parts[2].split(' ')[0].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return dateStr;
  } catch (error) {
    return null;
  }
}

// 解析數字
function parseNumber(numStr: string): number | null {
  if (!numStr || numStr.trim() === '') return null;
  try {
    const cleaned = numStr.replace(/[NT$,\s堂第週]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch (error) {
    return null;
  }
}

// 解析時間戳記
function parseTimestamp(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    // 移除 "上午"、"下午" 等文字
    const cleaned = dateStr.replace(/[上下]午/g, '').trim();

    // 處理 "2021/8/25" 或 "2024/12/4 16:03" 格式
    const parts = cleaned.split(' ').filter(p => p.trim());
    const datePart = parts[0].split('/');

    if (datePart.length === 3) {
      const year = datePart[0].padStart(4, '0');
      const month = datePart[1].padStart(2, '0');
      const day = datePart[2].padStart(2, '0');

      if (parts.length > 1 && parts[1].includes(':')) {
        // 有時間部分
        const timePart = parts[1];
        // 如果時間格式正確（HH:MM）就加 :00
        if (timePart.split(':').length === 2) {
          return `${year}-${month}-${day} ${timePart}:00`;
        }
      }
      // 只有日期
      return `${year}-${month}-${day}`;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function importTable1() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase 未連接');
    return;
  }

  console.log('\n📂 匯入：體驗課上課記錄表');
  console.log('=' .repeat(60));

  const filePath = path.join(csvDir, '教練組KPI - 體驗課上課記錄表.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });

  const records = (parsed.data as any[]).map(row => ({
    '姓名': row['姓名'] || null,
    'email': row['email'] || null,
    '上課日期': parseDate(row['上課日期']),
    '授課老師': row['授課老師'] || null,
    '是否已評價': row['是否已評價'] || null,
    '未轉單原因': row['未轉單原因'] || null,
    '體驗課文字檔': row['體驗課文字檔'] || null,
    'raw_data': row
  }));

  console.log(`✓ 讀取到 ${records.length} 筆資料`);

  // 清空舊資料
  console.log('🗑️  清空舊資料...');
  await supabase.from('trial_class_attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 批次匯入
  const batchSize = 500;
  let totalInserted = 0;

  console.log('💾 開始匯入...');
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase.from('trial_class_attendance').insert(batch).select();

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message);
    } else {
      totalInserted += batch.length;
      console.log(`✓ 已匯入 ${totalInserted} / ${records.length} 筆`);
    }
  }

  console.log(`🎉 完成！總共 ${totalInserted} 筆\n`);
}

async function importTable2() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  console.log('\n📂 匯入：購課記錄表');
  console.log('='.repeat(60));

  const filePath = path.join(csvDir, '教練組KPI - 體驗課購買記錄表.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });

  const records = (parsed.data as any[]).map(row => ({
    'student_name': row['姓名'] || null,
    'student_email': row['email'] || null,
    'age': parseNumber(row['年齡']),
    'occupation': row['職業'] || null,
    'package_name': row['方案名稱'] || null,
    'trial_classes_total': parseNumber(row['體驗堂數']),
    'remaining_classes': parseNumber(row['剩餘堂數（自動計算）']),
    'purchase_date': parseDate(row['體驗課購買日期']),
    'current_status': row['目前狀態（自動計算）'] || null,
    'updated_date': parseDate(row['更新日期']),
    'last_class_date': parseDate(row['最近一次上課日期']),
    'notes': row['備註'] || null,
    'raw_data': row
  }));

  console.log(`✓ 讀取到 ${records.length} 筆資料`);

  console.log('🗑️  清空舊資料...');
  await supabase.from('trial_class_purchase').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const batchSize = 500;
  let totalInserted = 0;

  console.log('💾 開始匯入...');
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase.from('trial_class_purchase').insert(batch).select();

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message);
    } else {
      totalInserted += batch.length;
      console.log(`✓ 已匯入 ${totalInserted} / ${records.length} 筆`);
    }
  }

  console.log(`🎉 完成！總共 ${totalInserted} 筆\n`);
}

async function importTable3() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  console.log('\n📂 匯入：EODs for Closers');
  console.log('='.repeat(60));

  const filePath = path.join(csvDir, '電話、諮詢每日紀錄表 - EODs for Closers.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });

  const records = (parsed.data as any[]).map(row => ({
    'Name': row['Name'] || null,
    'Email': row['Email'] || null,
    '電話負責人': row['（諮詢）電話負責人'] || null,
    '諮詢人員': row['（諮詢）諮詢人員'] || null,
    '是否上線': row['（諮詢）是否上線'] || null,
    '名單來源': row['（諮詢）名單來源'] || null,
    '諮詢結果': row['（諮詢）諮詢結果'] || null,
    '成交方案': row['（諮詢）成交方案'] || null,
    '方案數量': parseNumber(row['（諮詢）方案數量']),
    '付款方式': row['（諮詢）付款方式'] || null,
    '分期期數': parseNumber(row['（諮詢）分期期數']),
    '方案價格': parseNumber(row['（諮詢）方案價格']),
    '實收金額': parseNumber(row['（諮詢）實收金額']),
    '諮詢日期': parseDate(row['（諮詢）諮詢日期']),
    '成交日期': parseDate(row['（諮詢）成交日期']),
    '備註': row['（諮詢）備註'] || null,
    '提交表單時間': parseTimestamp(row['提交表單時間']),
    '月份': parseNumber(row['月份']),
    '年份': parseNumber(row['年份']),
    '週別': parseNumber(row['週別']),
    'raw_data': row
  }));

  console.log(`✓ 讀取到 ${records.length} 筆資料`);

  console.log('🗑️  清空舊資料...');
  await supabase.from('eods_for_closers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const batchSize = 500;
  let totalInserted = 0;

  console.log('💾 開始匯入...');
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const { data, error } = await supabase.from('eods_for_closers').insert(batch).select();

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message);
      console.error('範例資料:', batch[0]);
    } else {
      totalInserted += batch.length;
      console.log(`✓ 已匯入 ${totalInserted} / ${records.length} 筆`);
    }
  }

  console.log(`🎉 完成！總共 ${totalInserted} 筆\n`);
}

async function main() {
  console.log('🚀 開始匯入 CSV 資料（欄位名稱直接對應）\n');
  console.log('='.repeat(60));

  await importTable1();
  await importTable2();
  await importTable3();

  console.log('\n' + '='.repeat(60));
  console.log('✅ 全部匯入完成！');
  console.log('\n📊 Supabase 表格的欄位順序現在跟 CSV 一模一樣了！');
}

main().catch(console.error);

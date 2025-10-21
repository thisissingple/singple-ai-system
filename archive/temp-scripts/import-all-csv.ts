/**
 * 匯入所有 CSV 資料到 Supabase
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { getSupabaseClient } from './server/services/supabase-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function parseTimestamp(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  try {
    const cleaned = dateStr.replace(/[上下]午/g, '').trim();
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
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
  console.log('\n📂 1/3 匯入：體驗課購買記錄表');
  console.log('='.repeat(60));

  const csvPath = path.join(__dirname, 'excisting_csv', '教練組KPI - 體驗課購買記錄表.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

  console.log(`✓ 讀取到 ${parsed.data.length} 筆資料`);

  const client = getSupabaseClient();
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < parsed.data.length; i += batchSize) {
    const batch = (parsed.data as any[]).slice(i, i + batchSize);
    const records = batch.map(row => ({
      姓名: row['姓名'] || null,
      email: row['email'] || null,
      年齡: parseNumber(row['年齡']),
      職業: row['職業'] || null,
      方案名稱: row['方案名稱'] || null,
      體驗堂數: parseNumber(row['體驗堂數']),
      '剩餘堂數（自動計算）': row['剩餘堂數（自動計算）'] || null,
      體驗課購買日期: parseDate(row['體驗課購買日期']),
      '目前狀態（自動計算）': row['目前狀態（自動計算）'] || null,
      更新日期: parseTimestamp(row['更新日期']),
      最近一次上課日期: parseDate(row['最近一次上課日期']),
      備註: row['備註'] || null
    }));

    const { error } = await client.from('trial_class_purchases').insert(records);

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message);
    } else {
      inserted += records.length;
      console.log(`  ✓ 已匯入 ${inserted} / ${parsed.data.length} 筆`);
    }
  }

  const { count } = await client
    .from('trial_class_purchases')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ 完成！資料庫中有 ${count} 筆記錄\n`);
}

async function importAttendance() {
  console.log('\n📂 2/3 匯入：體驗課上課記錄表');
  console.log('='.repeat(60));

  const csvPath = path.join(__dirname, 'excisting_csv', '教練組KPI - 體驗課上課記錄表.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

  console.log(`✓ 讀取到 ${parsed.data.length} 筆資料`);

  const client = getSupabaseClient();
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < parsed.data.length; i += batchSize) {
    const batch = (parsed.data as any[]).slice(i, i + batchSize);
    const records = batch.map(row => ({
      姓名: row['姓名'] || null,
      email: row['email'] || null,
      上課日期: parseDate(row['上課日期']),
      授課老師: row['授課老師'] || null,
      是否已評價: row['是否已評價'] || null,
      未轉單原因: row['未轉單原因'] || null,
      體驗課文字檔: row['體驗課文字檔'] || null
    }));

    const { error } = await client.from('trial_class_attendance').insert(records);

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message);
    } else {
      inserted += records.length;
      console.log(`  ✓ 已匯入 ${inserted} / ${parsed.data.length} 筆`);
    }
  }

  const { count } = await client
    .from('trial_class_attendance')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ 完成！資料庫中有 ${count} 筆記錄\n`);
}

async function importEODs() {
  console.log('\n📂 3/3 匯入：EODs for Closers');
  console.log('='.repeat(60));

  const csvPath = path.join(__dirname, 'excisting_csv', '電話、諮詢每日紀錄表 - EODs for Closers.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });

  console.log(`✓ 讀取到 ${parsed.data.length} 筆資料`);

  const client = getSupabaseClient();
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < parsed.data.length; i += batchSize) {
    const batch = (parsed.data as any[]).slice(i, i + batchSize);
    const records = batch.map(row => ({
      name: row['Name'] || null,
      email: row['Email'] || null,
      電話負責人: row['（諮詢）電話負責人'] || null,
      諮詢人員: row['（諮詢）諮詢人員'] || null,
      是否上線: row['（諮詢）是否上線'] || null,
      名單來源: row['（諮詢）名單來源'] || null,
      諮詢結果: row['（諮詢）諮詢結果'] || null,
      成交方案: row['（諮詢）成交方案'] || null,
      方案數量: row['（諮詢）方案數量'] || null,
      付款方式: row['（諮詢）付款方式'] || null,
      分期期數: row['（諮詢）分期期數'] || null,
      方案價格: row['（諮詢）方案價格'] || null,
      實收金額: row['（諮詢）實收金額'] || null,
      諮詢日期: parseDate(row['（諮詢）諮詢日期']),
      成交日期: parseDate(row['（諮詢）成交日期']),
      備註: row['（諮詢）備註'] || null,
      提交表單時間: parseTimestamp(row['提交表單時間']),
      月份: row['月份'] || null,
      年份: row['年份'] || null,
      週別: row['週別'] || null,
      是否為首次填寫: row['是否為首次填寫'] || null,
      是否為首次成交: row['是否為首次成交'] || null
    }));

    const { error } = await client.from('eods_for_closers').insert(records);

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error.message);
    } else {
      inserted += records.length;
      if (inserted % 500 === 0 || inserted === parsed.data.length) {
        console.log(`  ✓ 已匯入 ${inserted} / ${parsed.data.length} 筆`);
      }
    }
  }

  const { count } = await client
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ 完成！資料庫中有 ${count} 筆記錄\n`);
}

async function main() {
  console.log('🚀 開始匯入所有 CSV 資料到 Supabase\n');

  try {
    await importPurchases();
    await importAttendance();
    await importEODs();

    console.log('\n🎉 全部匯入完成！');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('❌ 匯入失敗:', error);
  }
}

main();

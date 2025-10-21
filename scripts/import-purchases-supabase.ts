/**
 * 使用 Supabase Client 導入體驗課購買記錄
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Papa from 'papaparse';
import { getSupabaseClient } from '../server/services/supabase-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseDate(dateStr: string): string | null {
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
  console.log('📂 匯入：體驗課購買記錄表（使用 Supabase Client）');
  console.log('='.repeat(60));

  const csvDir = path.join(__dirname, '../excisting_csv');
  const filePath = path.join(csvDir, '教練組KPI - 體驗課購買記錄表.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true
  });

  console.log(`✓ 讀取到 ${parsed.data.length} 筆資料`);

  const client = getSupabaseClient();

  // 清空舊資料
  console.log('🗑️  清空舊資料...');
  const { error: deleteError } = await client
    .from('trial_class_purchase')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (deleteError) {
    console.error('刪除失敗:', deleteError);
  }

  // 批次插入（每次 100 筆）
  const batchSize = 100;
  let inserted = 0;

  for (let i = 0; i < parsed.data.length; i += batchSize) {
    const batch = (parsed.data as any[]).slice(i, i + batchSize);

    const records = batch.map(row => ({
      student_name: row['姓名'] || null,
      student_email: row['email'] || null,
      age: parseNumber(row['年齡']),
      occupation: row['職業'] || null,
      package_name: row['方案名稱'] || null,
      trial_classes_total: parseNumber(row['體驗堂數']),
      remaining_classes: parseNumber(row['剩餘堂數（自動計算）']),
      purchase_date: parseDate(row['體驗課購買日期']),
      current_status: row['目前狀態（自動計算）'] || null,
      updated_date: parseDate(row['更新日期']),
      last_class_date: parseDate(row['最近一次上課日期']),
      notes: row['備註'] || null,
      raw_data: row
    }));

    const { data, error } = await client
      .from('trial_class_purchase')
      .insert(records);

    if (error) {
      console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 失敗:`, error);
    } else {
      inserted += records.length;
      console.log(`✓ 已匯入 ${inserted} / ${parsed.data.length} 筆`);
    }
  }

  console.log(`🎉 完成！總共 ${inserted} 筆`);

  // 驗證
  const { count } = await client
    .from('trial_class_purchase')
    .select('*', { count: 'exact', head: true });

  console.log(`✅ 驗證：資料庫中有 ${count} 筆記錄\n`);

  // 顯示狀態分布
  const { data: statusData } = await client
    .from('trial_class_purchase')
    .select('current_status');

  if (statusData) {
    const statusCount: Record<string, number> = {};
    statusData.forEach((row: any) => {
      const status = row.current_status || '未知';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    console.log('📊 狀態分布:');
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} 人`);
    });
  }
}

async function main() {
  try {
    await importPurchases();
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

main();

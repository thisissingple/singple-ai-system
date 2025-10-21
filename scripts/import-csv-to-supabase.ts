/**
 * 直接從 CSV 匯入資料到 Supabase
 * 會先清空舊資料，再匯入新資料
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { getSupabaseClient } from '../server/services/supabase-client';

const csvDir = path.join(process.cwd(), 'excisting_csv');

// CSV 檔案對應的 Supabase 表格
const csvToTableMapping = {
  '教練組KPI - 體驗課上課記錄表.csv': {
    table: 'trial_class_attendance',
    fieldMapping: {
      '姓名': 'student_name',
      'email': 'student_email',
      '上課日期': 'class_date',
      '授課老師': 'teacher_name',
      '是否已評價': 'is_reviewed',
      '未轉單原因': 'no_conversion_reason',
      '體驗課文字檔': 'class_transcript'
    }
  },
  '教練組KPI - 體驗課購買記錄表.csv': {
    table: 'trial_class_purchase',
    fieldMapping: {
      '姓名': 'student_name',
      'email': 'student_email',
      '年齡': 'age',
      '職業': 'occupation',
      '方案名稱': 'package_name',
      '體驗堂數': 'trial_classes_total',
      '剩餘堂數（自動計算）': 'remaining_classes',
      '體驗課購買日期': 'purchase_date',
      '目前狀態（自動計算）': 'current_status',
      '更新日期': 'updated_date',
      '最近一次上課日期': 'last_class_date',
      '備註': 'notes'
    }
  },
  '電話、諮詢每日紀錄表 - EODs for Closers.csv': {
    table: 'eods_for_closers',
    fieldMapping: {
      'Name': 'student_name',
      'Email': 'student_email',
      '（諮詢）電話負責人': 'caller_name',
      '（諮詢）諮詢人員': 'closer_name',
      '（諮詢）是否上線': 'is_online',
      '（諮詢）名單來源': 'lead_source',
      '（諮詢）諮詢結果': 'consultation_result',
      '（諮詢）成交方案': 'deal_package',
      '（諮詢）方案數量': 'package_quantity',
      '（諮詢）付款方式': 'payment_method',
      '（諮詢）分期期數': 'installment_periods',
      '（諮詢）方案價格': 'package_price',
      '（諮詢）實收金額': 'actual_amount',
      '（諮詢）諮詢日期': 'consultation_date',
      '（諮詢）成交日期': 'deal_date',
      '（諮詢）備註': 'notes',
      '提交表單時間': 'form_submitted_at',
      '月份': 'month',
      '年份': 'year',
      '週別': 'week_number'
    }
  }
};

// 解析日期（支援多種格式）
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;

  try {
    // 嘗試解析 2024/6/16 格式
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const year = parts[0].padStart(4, '0');
      const month = parts[1].padStart(2, '0');
      const day = parts[2].split(' ')[0].padStart(2, '0'); // 移除時間部分
      return `${year}-${month}-${day}`;
    }

    // 其他格式直接返回
    return dateStr;
  } catch (error) {
    console.warn(`無法解析日期: ${dateStr}`);
    return null;
  }
}

// 解析數字（移除符號和逗號）
function parseNumber(numStr: string): number | null {
  if (!numStr || numStr.trim() === '') return null;

  try {
    // 移除 NT$, $, 逗號, 空格, "堂", "第", "週" 等符號
    const cleaned = numStr.replace(/[NT$,\s堂第週]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  } catch (error) {
    return null;
  }
}

// 轉換布林值
function parseBoolean(value: string): boolean | null {
  if (!value || value.trim() === '') return null;

  const lower = value.toLowerCase().trim();
  if (lower === '是' || lower === 'true' || lower === '已上線') return true;
  if (lower === '否' || lower === 'false') return false;
  return null;
}

// 轉換單行資料
function transformRow(row: Record<string, string>, fieldMapping: Record<string, string>, tableName: string): Record<string, any> {
  const transformed: Record<string, any> = {};

  // 儲存原始資料到 raw_data
  transformed.raw_data = { ...row };

  // 對應欄位
  for (const [csvField, dbField] of Object.entries(fieldMapping)) {
    const value = row[csvField];

    // 日期欄位
    if (dbField.includes('date') || dbField.includes('_at')) {
      transformed[dbField] = parseDate(value);
    }
    // 數字欄位
    else if (dbField === 'age' || dbField === 'package_quantity' ||
             dbField === 'installment_periods' || dbField === 'package_price' ||
             dbField === 'actual_amount' || dbField === 'trial_classes_total' ||
             dbField === 'remaining_classes' || dbField === 'month' ||
             dbField === 'year' || dbField === 'week_number') {
      transformed[dbField] = parseNumber(value);
    }
    // 布林欄位
    else if (dbField === 'is_reviewed' || dbField === 'is_online') {
      transformed[dbField] = parseBoolean(value);
    }
    // 文字欄位
    else {
      transformed[dbField] = value && value.trim() !== '' ? value.trim() : null;
    }
  }

  return transformed;
}

async function importCSV(fileName: string, config: { table: string; fieldMapping: Record<string, string> }) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase 未連接');
    return;
  }

  console.log(`\n📂 處理檔案: ${fileName}`);
  console.log(`📊 目標表格: ${config.table}`);

  try {
    // 1. 讀取 CSV 檔案
    const filePath = path.join(csvDir, fileName);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 2. 解析 CSV（使用 Papa Parse 處理複雜格式）
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    const records = parsed.data as Record<string, string>[];

    console.log(`✓ 讀取到 ${records.length} 筆資料`);

    // 3. 清空舊資料
    console.log(`🗑️  清空 ${config.table} 舊資料...`);
    const { error: deleteError } = await supabase
      .from(config.table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 刪除所有資料

    if (deleteError) {
      console.error('刪除舊資料失敗:', deleteError);
    } else {
      console.log('✓ 舊資料已清空');
    }

    // 4. 轉換資料
    console.log('🔄 轉換資料格式...');
    const transformedRecords = records.map((row: any) =>
      transformRow(row, config.fieldMapping, config.table)
    );

    // 5. 批次匯入（每次 500 筆）
    const batchSize = 500;
    let totalInserted = 0;

    console.log('💾 開始匯入資料...');
    for (let i = 0; i < transformedRecords.length; i += batchSize) {
      const batch = transformedRecords.slice(i, i + batchSize);

      const { data, error } = await supabase
        .from(config.table)
        .insert(batch)
        .select();

      if (error) {
        console.error(`❌ 批次 ${Math.floor(i / batchSize) + 1} 匯入失敗:`, error.message);
        console.error('失敗的資料範例:', batch[0]);
      } else {
        totalInserted += batch.length;
        console.log(`✓ 已匯入 ${totalInserted} / ${transformedRecords.length} 筆`);
      }
    }

    console.log(`🎉 ${fileName} 匯入完成！總共 ${totalInserted} 筆`);

  } catch (error: any) {
    console.error(`❌ 處理 ${fileName} 時發生錯誤:`, error.message);
  }
}

async function main() {
  console.log('🚀 開始匯入 CSV 資料到 Supabase...\n');
  console.log('=' .repeat(60));

  // 依序匯入 3 個檔案
  for (const [fileName, config] of Object.entries(csvToTableMapping)) {
    await importCSV(fileName, config);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 全部匯入完成！');
  console.log('\n請重新整理儀表板，數據應該已更新 🎉');
}

main().catch(console.error);

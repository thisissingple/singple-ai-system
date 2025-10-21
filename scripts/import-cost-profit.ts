import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as csv from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface CostProfitRow {
  分類名稱: string;
  項目名稱: string;
  費用: string;
  備註: string;
  月份: string;
  年份: string;
  已確認: string;
}

function parseAmount(amountStr: string): number | null {
  if (!amountStr || amountStr.trim() === '') {
    return null;
  }

  // 移除 $ 符號和逗號
  const cleaned = amountStr.replace(/[\$,]/g, '').trim();

  // 檢查是否為數字
  if (cleaned === '' || isNaN(Number(cleaned))) {
    return null;
  }

  return parseFloat(cleaned);
}

function parseBoolean(value: string): boolean {
  if (!value || value.trim() === '') {
    return false;
  }
  return value.trim().toUpperCase() === 'TRUE';
}

async function importCostProfitData() {
  console.log('開始匯入成本獲利資料...\n');

  // 讀取 CSV 檔案
  const csvPath = path.join(__dirname, '../excisting_csv/成本_獲利計算 - raw data.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');

  // 解析 CSV
  const records = csv.parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true // 處理 UTF-8 BOM
  }) as CostProfitRow[];

  console.log(`讀取到 ${records.length} 筆資料\n`);

  // 過濾掉空白行
  const validRecords = records.filter(record => {
    return record.分類名稱 && record.分類名稱.trim() !== '';
  });

  console.log(`有效資料: ${validRecords.length} 筆\n`);

  // 轉換資料格式
  const costProfitData = validRecords.map(record => ({
    category_name: record.分類名稱,
    item_name: record.項目名稱,
    amount: parseAmount(record.費用),
    notes: record.備註 || null,
    month: record.月份,
    year: parseInt(record.年份) || 2025,
    is_confirmed: parseBoolean(record.已確認)
  }));

  // 批次匯入資料 (每次 100 筆)
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < costProfitData.length; i += batchSize) {
    const batch = costProfitData.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from('cost_profit')
      .insert(batch);

    if (error) {
      console.error(`批次 ${Math.floor(i / batchSize) + 1} 匯入失敗:`, error.message);
      errorCount += batch.length;
    } else {
      successCount += batch.length;
      console.log(`✓ 批次 ${Math.floor(i / batchSize) + 1}: 成功匯入 ${batch.length} 筆`);
    }
  }

  console.log('\n=== 匯入完成 ===');
  console.log(`成功: ${successCount} 筆`);
  console.log(`失敗: ${errorCount} 筆`);

  // 驗證資料
  const { count, error: countError } = await supabase
    .from('cost_profit')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('\n驗證失敗:', countError.message);
  } else {
    console.log(`\n資料表總筆數: ${count}`);
  }

  // 顯示分類統計
  const { data: categoryStats, error: statsError } = await supabase
    .from('cost_profit')
    .select('category_name, month, year')
    .order('month')
    .order('year');

  if (!statsError && categoryStats) {
    const categoryCounts = categoryStats.reduce((acc, row) => {
      const key = row.category_name;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n=== 分類統計 ===');
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`${category}: ${count} 筆`);
    });
  }
}

// 執行匯入
importCostProfitData()
  .then(() => {
    console.log('\n✓ 匯入作業完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 匯入作業失敗:', error);
    process.exit(1);
  });

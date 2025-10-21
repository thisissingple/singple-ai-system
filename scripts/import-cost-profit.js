import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import pkg from 'pg';

const { Client } = pkg;

const DB_URL = process.env.SUPABASE_DB_URL;

if (!DB_URL) {
  console.error('缺少 SUPABASE_DB_URL，請先在環境變數或 .env 中設定。');
  process.exit(1);
}

const csvPath = path.resolve('excisting_csv/成本_獲利計算 - raw data.csv');

if (!fs.existsSync(csvPath)) {
  console.error(`找不到 CSV 檔案：${csvPath}`);
  process.exit(1);
}

function parseAmount(rawValue) {
  if (!rawValue) return null;
  const cleaned = rawValue.toString().replace(/[\$,]/g, '').trim();
  if (cleaned === '' || Number.isNaN(Number(cleaned))) {
    return null;
  }
  return Number.parseFloat(cleaned);
}

function parseBoolean(rawValue) {
  if (!rawValue) return false;
  return rawValue.toString().trim().toLowerCase() === 'true';
}

async function importCostProfit() {
  console.log('開始匯入成本獲利資料...');
  console.log(`讀取 CSV：${csvPath}`);

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const rawRecords = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
  });

  const records = rawRecords
    .filter((record) => record['分類名稱'] && record['分類名稱'].trim() !== '')
    .map((record) => ({
      category_name: record['分類名稱'].trim(),
      item_name: (record['項目名稱'] || '').trim(),
      amount: parseAmount(record['費用']),
      notes: record['備註'] ? record['備註'].trim() || null : null,
      month: (record['月份'] || '').trim(),
      year: Number.parseInt(record['年份'], 10) || 2025,
      is_confirmed: parseBoolean(record['已確認']),
    }));

  if (records.length === 0) {
    console.log('CSV 內沒有有效資料，匯入中止。');
    return;
  }

  console.log(`有效資料共 ${records.length} 筆。`);

  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query('BEGIN');
    console.log('清空 cost_profit 資料表...');
    await client.query('TRUNCATE TABLE cost_profit RESTART IDENTITY');

    console.log('插入資料...');
    const insertText = `
      INSERT INTO cost_profit
      (category_name, item_name, amount, notes, month, year, is_confirmed)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (let i = 0; i < records.length; i += 1) {
      const record = records[i];
      await client.query(insertText, [
        record.category_name,
        record.item_name,
        record.amount,
        record.notes,
        record.month,
        record.year,
        record.is_confirmed,
      ]);

      if ((i + 1) % 10 === 0) {
        console.log(`已插入 ${i + 1} 筆...`);
      }
    }

    await client.query('COMMIT');
    console.log('匯入完成。');

    const { rows } = await client.query('SELECT month, year, COUNT(*) AS count FROM cost_profit GROUP BY month, year ORDER BY year DESC, month DESC');
    console.log('月份統計：');
    rows.forEach((row) => {
      console.log(` - ${row.year} ${row.month}: ${row.count} 筆`);
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('匯入失敗：', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importCostProfit()
  .then(() => {
    console.log('✅ 成本獲利資料匯入完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 匯入過程發生錯誤：', error);
    process.exit(1);
  });


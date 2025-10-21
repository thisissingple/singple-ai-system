import pkg from 'pg';
const { Pool } = pkg;
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as csv from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

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
  const client = await pool.connect();

  try {
    console.log('開始匯入成本獲利資料...\n');

    // 讀取 CSV 檔案
    const csvPath = path.join(__dirname, '../excisting_csv/成本_獲利計算 - raw data.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    // 解析 CSV
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    }) as CostProfitRow[];

    console.log(`讀取到 ${records.length} 筆資料\n`);

    // 過濾掉空白行
    const validRecords = records.filter(record => {
      return record.分類名稱 && record.分類名稱.trim() !== '';
    });

    console.log(`有效資料: ${validRecords.length} 筆\n`);

    // 開始交易
    await client.query('BEGIN');

    let successCount = 0;
    let errorCount = 0;

    for (const record of validRecords) {
      try {
        const amount = parseAmount(record.費用);
        const year = parseInt(record.年份) || 2025;
        const isConfirmed = parseBoolean(record.已確認);

        await client.query(
          `INSERT INTO cost_profit
           (category_name, item_name, amount, notes, month, year, is_confirmed)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            record.分類名稱,
            record.項目名稱,
            amount,
            record.備註 || null,
            record.月份,
            year,
            isConfirmed
          ]
        );

        successCount++;
        if (successCount % 10 === 0) {
          console.log(`已處理 ${successCount} 筆...`);
        }
      } catch (error) {
        console.error(`匯入失敗:`, record, error);
        errorCount++;
      }
    }

    // 提交交易
    await client.query('COMMIT');

    console.log('\n=== 匯入完成 ===');
    console.log(`成功: ${successCount} 筆`);
    console.log(`失敗: ${errorCount} 筆`);

    // 驗證資料
    const countResult = await client.query('SELECT COUNT(*) FROM cost_profit');
    console.log(`\n資料表總筆數: ${countResult.rows[0].count}`);

    // 顯示分類統計
    const statsResult = await client.query(`
      SELECT category_name, COUNT(*) as count
      FROM cost_profit
      GROUP BY category_name
      ORDER BY category_name
    `);

    console.log('\n=== 分類統計 ===');
    for (const row of statsResult.rows) {
      console.log(`${row.category_name}: ${row.count} 筆`);
    }

    // 顯示月份統計
    const monthStats = await client.query(`
      SELECT month, year, COUNT(*) as count
      FROM cost_profit
      GROUP BY month, year
      ORDER BY year, month
    `);

    console.log('\n=== 月份統計 ===');
    for (const row of monthStats.rows) {
      console.log(`${row.year} ${row.month}: ${row.count} 筆`);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// 執行匯入
importCostProfitData()
  .then(() => {
    console.log('\n✓ 匯入作業完成');
    pool.end();
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ 匯入作業失敗:', error);
    pool.end();
    process.exit(1);
  });

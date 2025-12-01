/**
 * 找出 Google Sheets 中的 27 筆重複記錄
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

interface SheetMapping {
  id: string;
  source_id: string;
  worksheet_name: string;
  target_table: string;
  field_mappings: Array<{ googleColumn: string; supabaseColumn: string }>;
  sheet_id: string;
}

async function findDuplicates() {
  // 1. 連接資料庫取得 mapping 資訊
  const connStr = process.env.SUPABASE_DB_URL?.replace(':5432/', ':6543/') || '';
  const pool = new Pool({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // 2. 取得 sheet_id
    const mappingResult = await pool.query(`
      SELECT sm.*, gs.sheet_id
      FROM sheet_mappings sm
      JOIN google_sheets_sources gs ON sm.source_id = gs.id
      WHERE sm.id = '43c2f863-c1dc-48d4-9e8a-4781490cf605'
    `);

    if (mappingResult.rows.length === 0) {
      console.log('找不到 mapping');
      return;
    }

    const mapping = mappingResult.rows[0];
    console.log('📋 Worksheet:', mapping.worksheet_name);
    console.log('📋 Sheet ID:', mapping.sheet_id);

    // 3. 使用 Google Sheets API 讀取原始資料
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS || '{}';

    // 動態載入 Google Sheets API
    const { GoogleSheetsAPI } = await import('../server/services/sheets/google-sheets-api');
    const api = new GoogleSheetsAPI(credentials);

    console.log('\n🔄 正在從 Google Sheets 讀取資料...');
    const rawData = await api.getWorksheetData(mapping.sheet_id, mapping.worksheet_name);

    console.log(`📊 取得 ${rawData.length - 1} 筆記錄（不含標題）`);

    // 4. 轉換並找出重複
    const [headers, ...rows] = rawData;

    // 找出欄位索引
    const dateIdx = headers.indexOf('Date');
    const nameIdx = headers.indexOf('商家姓名/顧客姓名');
    const emailIdx = headers.indexOf('顧客Email');
    const amountIdx = headers.indexOf('金額（換算台幣）');
    const incomeItemIdx = headers.indexOf('收入項目');
    const expenseItemIdx = headers.indexOf('支出項目');

    console.log('\n欄位索引:', { dateIdx, nameIdx, emailIdx, amountIdx, incomeItemIdx, expenseItemIdx });

    // 建立唯一鍵 map
    const keyMap = new Map<string, any[]>();

    rows.forEach((row, idx) => {
      const date = row[dateIdx] || '1900-01-01';
      const name = row[nameIdx] || row[emailIdx] || '(未填寫)';
      const amount = row[amountIdx] || 0;
      const itemKey = row[incomeItemIdx] || row[expenseItemIdx] || '(無項目)';

      const key = `${date}|${name}|${amount}|${itemKey}`;

      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }
      keyMap.get(key)!.push({
        rowNum: idx + 2, // +2 因為標題行 + 0-indexed
        date,
        name,
        amount,
        itemKey,
        incomeItem: row[incomeItemIdx],
        expenseItem: row[expenseItemIdx],
      });
    });

    // 5. 找出重複的
    const duplicates: any[] = [];
    keyMap.forEach((records, key) => {
      if (records.length > 1) {
        duplicates.push({
          key,
          count: records.length,
          records,
        });
      }
    });

    console.log('\n========================================');
    console.log(`📊 找到 ${duplicates.length} 組重複（共 ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)} 筆多餘）`);
    console.log('========================================\n');

    duplicates.forEach((dup, i) => {
      console.log(`${i + 1}. ${dup.key}`);
      console.log(`   重複 ${dup.count} 次，在 Google Sheets 行號：`);
      dup.records.forEach((r: any) => {
        console.log(`   - 行 ${r.rowNum}: 日期=${r.date}, 姓名=${r.name}, 金額=${r.amount}, 項目=${r.itemKey}`);
      });
      console.log('');
    });

  } catch (error) {
    console.error('錯誤:', error);
  } finally {
    await pool.end();
  }
}

findDuplicates();

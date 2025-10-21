import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { queryDatabase } from '../server/services/pg-client.js';

interface IncomeExpenseRow {
  'Date': string;
  'Month': string;
  'Year': string;
  '顧客購買媒介': string;
  '付款方式': string;
  '訂單編號': string;
  '收入項目': string;
  '數量': string;
  '收支類別': string;
  '課程類別': string;
  '授課教練': string;
  '支出項目': string;
  '商家姓名/顧客姓名': string;
  '顧客Email': string;
  '備註': string;
  '期數': string;
  '第幾期': string;
  '總期數': string;
  '姓名類別': string;
  '金額（台幣）': string;
  '金額（人民幣）': string;
  '金額（換算台幣）': string;
  '業績歸屬人 1': string;
  '業績歸屬人 2': string;
  '填表人': string;
  '成交方式': string;
  'RMB即時匯率': string;
}

// 清理金額字串
function cleanAmount(amountStr: string): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[\$,]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.abs(num); // 取絕對值
}

// 解析日期
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  try {
    // 格式: 6/21/2018 或 1/1/2019
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('日期解析失敗:', dateStr, error);
  }

  return null;
}

// 判斷交易類型
function getTransactionType(row: IncomeExpenseRow): 'income' | 'expense' | 'refund' {
  const category = row['收支類別'];
  if (category === '收入') return 'income';
  if (category === '支出') return 'expense';
  if (category?.includes('退款')) return 'refund';

  // 從金額判斷
  const amountTWD = row['金額（台幣）'];
  if (amountTWD && amountTWD.includes('-')) return 'expense';

  return 'income';
}

// 取得項目名稱
function getItemName(row: IncomeExpenseRow): string {
  const income = row['收入項目'];
  const expense = row['支出項目'];
  return income || expense || '未分類';
}

// 取得分類
function getCategory(row: IncomeExpenseRow): string {
  const courseType = row['課程類別'];
  const category = row['收支類別'];

  if (courseType) return courseType;
  if (category) return category;
  return '未分類';
}

async function importAllIncomeExpense() {
  console.log('🚀 開始匯入完整收支記錄 (2018-2025)...\n');

  // 測試資料庫連線
  try {
    const testResult = await queryDatabase('SELECT NOW() as current_time');
    console.log('✅ 資料庫連線成功:', testResult.rows[0].current_time);
  } catch (error) {
    console.error('❌ 資料庫連線失敗:', error);
    process.exit(1);
  }

  // 先清理舊的匯入資料
  console.log('\n🧹 清理舊的匯入資料...');
  try {
    const deleteResult = await queryDatabase(
      "DELETE FROM income_expense_records WHERE source IN ('imported', 'cost_profit_summary')"
    );
    console.log(`✅ 已刪除 ${deleteResult.rowCount} 筆舊資料\n`);
  } catch (error) {
    console.error('⚠️  清理舊資料失敗（可能沒有舊資料）:', error);
  }

  const records: any[] = [];
  const csvPath = './google sheet/收支情形 - 收支表單.csv';

  console.log('📖 讀取 CSV 檔案...');

  // 讀取 CSV
  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relaxColumnCount: true, // 允許欄位數不一致
    })
  );

  let lineNumber = 0;
  for await (const row of parser as AsyncIterable<IncomeExpenseRow>) {
    lineNumber++;

    try {
      // 跳過無效行
      if (!row['Date'] && !row['金額（台幣）'] && !row['金額（人民幣）']) {
        continue;
      }

      const transactionDate = parseDate(row['Date']);
      if (!transactionDate) {
        continue; // 跳過沒有日期的記錄
      }

      const transactionType = getTransactionType(row);
      const itemName = getItemName(row);
      const category = getCategory(row);

      // 判斷幣別和金額
      let amount = 0;
      let currency = 'TWD';
      let exchangeRate: number | null = null;
      let amountInTWD = 0;

      const amountTWD = cleanAmount(row['金額（台幣）']);
      const amountRMB = cleanAmount(row['金額（人民幣）']);
      const rmbRate = parseFloat(row['RMB即時匯率']) || null;

      if (amountRMB > 0) {
        // 人民幣交易
        currency = 'RMB';
        amount = amountRMB;
        exchangeRate = rmbRate;
        amountInTWD = amountRMB * (rmbRate || 4.3); // 預設匯率 4.3
      } else if (amountTWD > 0) {
        // 台幣交易
        currency = 'TWD';
        amount = amountTWD;
        amountInTWD = amountTWD;
      } else {
        continue; // 跳過金額為 0 的記錄
      }

      // 建立記錄
      const record = {
        transaction_date: transactionDate,
        transaction_type: transactionType,
        category: category,
        item_name: itemName,
        amount: amount,
        currency: currency,
        exchange_rate_used: exchangeRate,
        amount_in_twd: amountInTWD,
        customer_name: row['商家姓名/顧客姓名'] || null,
        customer_email: row['顧客Email'] || null,
        payment_method: row['付款方式'] || null,
        notes: row['備註'] || null,
        teacher_name: row['授課教練'] || null, // 暫存教練名稱，之後可對應 ID
        sales_person_name: row['業績歸屬人 1'] || null,
        consultant_name: row['業績歸屬人 2'] || null,
        created_by_name: row['填表人'] || null,
        source: 'imported',
      };

      records.push(record);
    } catch (error) {
      console.error(`  ⚠️  第 ${lineNumber} 行解析失敗:`, error);
    }
  }

  console.log(`✅ CSV 讀取完成，共解析 ${records.length} 筆有效記錄\n`);

  // 逐筆插入資料庫
  let successCount = 0;
  let errorCount = 0;

  console.log('📝 開始寫入資料庫...\n');

  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    try {
      const sql = `
        INSERT INTO income_expense_records (
          transaction_date,
          transaction_type,
          category,
          item_name,
          amount,
          currency,
          exchange_rate_used,
          amount_in_twd,
          student_name,
          student_email,
          payment_method,
          notes,
          source,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      `;

      const params = [
        record.transaction_date,
        record.transaction_type,
        record.category,
        record.item_name,
        record.amount,
        record.currency,
        record.exchange_rate_used,
        record.amount_in_twd,
        record.customer_name,
        record.customer_email,
        record.payment_method,
        record.notes,
        record.source,
      ];

      await queryDatabase(sql, params);
      successCount++;

      if (successCount % 500 === 0) {
        console.log(`  ✓ 已匯入 ${successCount}/${records.length} 筆記錄 (${Math.round(successCount/records.length*100)}%)`);
      }
    } catch (error) {
      errorCount++;
      if (errorCount <= 5) { // 只顯示前 5 個錯誤
        console.error(`  ✗ 第 ${i + 1} 筆匯入失敗:`, record.item_name, error);
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 匯入完成統計：');
  console.log(`  ✅ 成功: ${successCount} 筆`);
  console.log(`  ❌ 失敗: ${errorCount} 筆`);
  console.log(`  📄 總計: ${records.length} 筆`);
  console.log(`  📈 成功率: ${Math.round(successCount/records.length*100)}%`);
  console.log('='.repeat(60));

  // 顯示匯入後的統計
  console.log('\n📈 資料庫統計：\n');

  const stats = await queryDatabase(`
    SELECT
      transaction_type,
      COUNT(*) as count,
      SUM(amount_in_twd) as total_amount
    FROM income_expense_records
    WHERE source = 'imported'
    GROUP BY transaction_type
    ORDER BY transaction_type
  `);

  stats.rows.forEach((row: any) => {
    const type = row.transaction_type === 'income' ? '收入' :
                 row.transaction_type === 'expense' ? '支出' : '退款';
    const amount = parseInt(row.total_amount).toLocaleString();
    console.log(`  ${type}: ${row.count} 筆，總額 $${amount}`);
  });

  // 年度統計
  console.log('\n📅 年度統計：\n');

  const yearStats = await queryDatabase(`
    SELECT
      EXTRACT(YEAR FROM transaction_date) as year,
      COUNT(*) as count,
      SUM(CASE WHEN transaction_type = 'income' THEN amount_in_twd ELSE 0 END) as total_income,
      SUM(CASE WHEN transaction_type = 'expense' THEN amount_in_twd ELSE 0 END) as total_expense
    FROM income_expense_records
    WHERE source = 'imported'
    GROUP BY year
    ORDER BY year DESC
  `);

  yearStats.rows.forEach((row: any) => {
    const income = parseInt(row.total_income).toLocaleString();
    const expense = parseInt(row.total_expense).toLocaleString();
    const net = parseInt(row.total_income - row.total_expense).toLocaleString();
    console.log(`  ${row.year}: ${row.count} 筆 | 收入 $${income} | 支出 $${expense} | 淨利 $${net}`);
  });

  console.log('\n✅ 匯入完成！');
  process.exit(0);
}

// 執行匯入
importAllIncomeExpense().catch((error) => {
  console.error('❌ 匯入失敗:', error);
  process.exit(1);
});

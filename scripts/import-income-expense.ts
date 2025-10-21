import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { queryDatabase } from '../server/services/pg-client.js';

interface CostProfitRow {
  '分類名稱': string;
  '項目名稱': string;
  '費用': string;
  '備註': string;
  '月份': string;
  '年份': string;
  '已確認': string;
}

// 月份轉換
const MONTH_MAP: Record<string, string> = {
  'January': '01', 'February': '02', 'March': '03', 'April': '04',
  'May': '05', 'June': '06', 'July': '07', 'August': '08',
  'September': '09', 'October': '10', 'November': '11', 'December': '12',
};

// 分類映射到交易類型
function mapTransactionType(category: string): 'income' | 'expense' | 'refund' {
  if (category.includes('收入') || category === '收入金額') {
    return 'income';
  }
  if (category.includes('退款')) {
    return 'refund';
  }
  return 'expense';
}

// 清理金額字串
function cleanAmount(amountStr: string): number {
  if (!amountStr) return 0;
  // 移除 $, 逗號，並轉換為數字
  const cleaned = amountStr.replace(/[\$,]/g, '').trim();
  return parseFloat(cleaned) || 0;
}

async function importIncomeExpense() {
  console.log('📊 開始匯入收支記錄...\n');

  // 測試資料庫連線
  try {
    const testResult = await queryDatabase('SELECT NOW() as current_time');
    console.log('✅ 資料庫連線成功:', testResult.rows[0].current_time);
  } catch (error) {
    console.error('❌ 資料庫連線失敗:', error);
    process.exit(1);
  }

  const records: any[] = [];
  const csvPath = './excisting_csv/成本_獲利計算 - raw data.csv';

  // 讀取 CSV
  const parser = createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  for await (const row of parser as AsyncIterable<CostProfitRow>) {
    try {
      const category = row['分類名稱'] || '';
      const itemName = row['項目名稱'] || '';
      const amountStr = row['費用'] || '';
      const notes = row['備註'] || '';
      const month = row['月份'] || '';
      const year = row['年份'] || '';
      const isConfirmed = row['已確認']?.trim() !== '';

      // 跳過空行
      if (!category && !itemName && !amountStr) continue;

      // 建立交易日期（使用該月的第一天）
      const monthNum = MONTH_MAP[month] || '01';
      const transactionDate = `${year}-${monthNum}-01`;

      // 判斷交易類型
      const transactionType = mapTransactionType(category);

      // 清理金額
      const amount = cleanAmount(amountStr);

      // 建立記錄
      const record = {
        transaction_date: transactionDate,
        transaction_type: transactionType,
        category: category,
        item_name: itemName || category,
        amount: amount,
        currency: 'TWD',
        amount_in_twd: amount,
        notes: notes,
        is_confirmed: isConfirmed,
        source: 'imported',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      records.push(record);
    } catch (error) {
      console.error('處理列時發生錯誤:', row, error);
    }
  }

  console.log(`✅ CSV 讀取完成，共 ${records.length} 筆記錄\n`);

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
          amount_in_twd,
          notes,
          is_confirmed,
          source,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;

      const params = [
        record.transaction_date,
        record.transaction_type,
        record.category,
        record.item_name,
        record.amount,
        record.currency,
        record.amount_in_twd,
        record.notes || null,
        record.is_confirmed,
        record.source,
        record.created_at,
        record.updated_at,
      ];

      await queryDatabase(sql, params);
      successCount++;

      if (successCount % 50 === 0) {
        console.log(`  ✓ 已匯入 ${successCount}/${records.length} 筆記錄`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ 第 ${i + 1} 筆匯入失敗:`, record.item_name, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 匯入完成統計：');
  console.log(`  ✅ 成功: ${successCount} 筆`);
  console.log(`  ❌ 失敗: ${errorCount} 筆`);
  console.log(`  📄 總計: ${records.length} 筆`);
  console.log('='.repeat(60));

  // 顯示匯入後的統計
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

  console.log('\n📈 匯入資料統計：');
  stats.rows.forEach((row: any) => {
    const type = row.transaction_type === 'income' ? '收入' :
                 row.transaction_type === 'expense' ? '支出' : '退款';
    console.log(`  ${type}: ${row.count} 筆，總額 $${parseInt(row.total_amount).toLocaleString()}`);
  });

  process.exit(0);
}

// 執行匯入
importIncomeExpense().catch((error) => {
  console.error('❌ 匯入失敗:', error);
  process.exit(1);
});

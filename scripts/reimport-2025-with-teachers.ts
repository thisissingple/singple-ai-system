import { parse } from 'csv-parse/sync';
import * as fs from 'fs';
import { createPool, queryDatabase } from '../server/services/pg-client';

interface IncomeExpenseRow {
  [key: string]: string;
}

async function reimport2025WithTeachers() {
  console.log('🚀 重新匯入 2025 年收支記錄（包含教練與業績歸屬人）...\n');

  const pool = createPool();

  try {
    console.log('✅ 資料庫連線成功:', new Date().toISOString());

    // 清理舊的匯入資料
    console.log('\n🧹 清理舊的匯入資料...');
    const deleteResult = await queryDatabase(
      `DELETE FROM income_expense_records WHERE source IN ('imported', 'cost_profit_summary')`
    );
    console.log(`✅ 已刪除 ${deleteResult.rowCount} 筆舊資料`);

    // 讀取 CSV
    console.log('\n📖 讀取 CSV 檔案...');
    const csvPath = './google sheet/收支情形 - 收支表單.csv';
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const allRecords = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as IncomeExpenseRow[];

    // 只保留 2025 年的記錄
    const records2025 = allRecords.filter(row => {
      const year = row['Year'];
      return year === '2025';
    });

    console.log(`✅ 找到 ${records2025.length} 筆 2025 年記錄\n`);

    // 寫入資料庫
    console.log('📝 開始寫入資料庫...\n');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < records2025.length; i++) {
      const row = records2025[i];

      try {
        // 解析日期 (使用 Date 欄位)
        const dateStr = row['Date'];
        if (!dateStr) continue;

        const parts = dateStr.split('/');
        const month = parts[0].padStart(2, '0');
        const day = parts[1].padStart(2, '0');
        const year = row['Year'];
        const transactionDate = `${year}-${month}-${day}`;

        // 判斷交易類型 (使用「收支類別」欄位)
        let transactionType = 'expense';
        const category = row['收支類別'] || '';
        if (category.includes('收入')) {
          transactionType = 'income';
        } else if (category.includes('退款')) {
          transactionType = 'refund';
        }

        // 處理金額 (欄位名稱帶有全形括號)
        const amountTWDStr = (row['金額（台幣）'] || '0').replace(/[\$,]/g, '');
        const amountRMBStr = (row['金額（人民幣）'] || '0').replace(/[\$,]/g, '');
        const amountTWD = parseFloat(amountTWDStr);
        const amountRMB = parseFloat(amountRMBStr);
        const rmbRate = parseFloat(row['RMB即時匯率'] || '0');

        let currency = 'TWD';
        let amount = 0;
        let exchangeRate = null;
        let amountInTWD = 0;

        if (amountRMB > 0) {
          currency = 'RMB';
          amount = amountRMB;
          exchangeRate = rmbRate || 4.3;
          amountInTWD = amountRMB * exchangeRate;
        } else if (amountTWD > 0) {
          currency = 'TWD';
          amount = amountTWD;
          amountInTWD = amountTWD;
        }

        if (amount === 0) continue;

        // 項目名稱：收入用「收入項目」，支出用「支出項目」
        const itemName = (transactionType === 'income' ? row['收入項目'] : row['支出項目']) || '';
        const courseCategory = row['課程類別'] || '';

        // 取得教練和業績歸屬人資訊
        const teacherName = row['授課教練'] || null;
        const salesPerson = row['業績歸屬人 1'] || null;
        const consultant = row['業績歸屬人 2'] || null;
        const createdByName = row['填表人'] || null;

        // 插入資料（暫時使用 notes 欄位儲存教練名稱，之後可以建立對應關係）
        // 由於 teacher_id, sales_person_id, consultant_id 都是 UUID 外鍵，我們先將名稱放在 notes 中
        const notesData = {
          original_notes: row['備註'] || '',
          teacher_name: teacherName,
          sales_person_name: salesPerson,
          consultant_name: consultant,
          created_by_name: createdByName,
        };

        await queryDatabase(
          `INSERT INTO income_expense_records (
            transaction_date, transaction_type, category, item_name,
            amount, currency, exchange_rate_used, amount_in_twd,
            student_name, student_email, payment_method,
            course_type, notes,
            source, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
          [
            transactionDate,
            transactionType,
            courseCategory,
            itemName,
            amount,
            currency,
            exchangeRate,
            amountInTWD,
            row['商家姓名/顧客姓名'] || null,
            row['顧客Email'] || null,
            row['付款方式'] || null,
            courseCategory, // course_type
            JSON.stringify(notesData), // 將所有備註資訊存成 JSON
            'imported'
          ]
        );

        successCount++;

        if ((successCount) % 100 === 0) {
          console.log(`  ✓ 已匯入 ${successCount}/${records2025.length} 筆記錄`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  ✗ 第 ${i + 1} 筆匯入失敗:`, error);
      }
    }

    console.log(`\n✅ 匯入完成！`);
    console.log(`   成功: ${successCount} 筆`);
    console.log(`   失敗: ${errorCount} 筆\n`);

    // 顯示統計
    const stats = await queryDatabase(
      `SELECT
        transaction_type,
        COUNT(*) as count,
        SUM(amount_in_twd) as total_amount
      FROM income_expense_records
      WHERE source = 'imported'
      GROUP BY transaction_type
      ORDER BY transaction_type`
    );

    console.log('📈 2025 年收支統計：\n');
    stats.rows.forEach((row: any) => {
      const type = row.transaction_type === 'income' ? '收入' :
                   row.transaction_type === 'expense' ? '支出' : '退款';
      const amount = parseInt(row.total_amount).toLocaleString();
      console.log(`   ${type}: ${row.count} 筆, 總計 NT$ ${amount}`);
    });

    // 統計教練資料
    console.log('\n👨‍🏫 教練統計：\n');
    const teacherStats = await queryDatabase(
      `SELECT
        notes::jsonb->>'teacher_name' as teacher_name,
        COUNT(*) as count,
        SUM(amount_in_twd) as total
      FROM income_expense_records
      WHERE source = 'imported'
        AND transaction_type = 'income'
        AND notes::jsonb->>'teacher_name' IS NOT NULL
        AND notes::jsonb->>'teacher_name' != ''
      GROUP BY notes::jsonb->>'teacher_name'
      ORDER BY total DESC`
    );

    teacherStats.rows.forEach((row: any) => {
      const total = parseInt(row.total).toLocaleString();
      console.log(`   ${row.teacher_name}: ${row.count} 筆, NT$ ${total}`);
    });

  } catch (error) {
    console.error('❌ 匯入過程發生錯誤:', error);
  } finally {
    await pool.end();
    console.log('\n✅ 資料庫連線已關閉');
  }
}

reimport2025WithTeachers();

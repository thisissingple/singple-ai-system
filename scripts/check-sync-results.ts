/**
 * Check sync results for income_expense_records
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    // Check synced records
    console.log('\n📊 檢查收支記錄同步狀態:');
    console.log('===============================================');

    const recordsQuery = `
      SELECT
        COUNT(*) as total_records,
        COUNT(CASE WHEN source = 'google_sheets' THEN 1 END) as synced_from_sheets,
        MAX(created_at) as latest_sync
      FROM income_expense_records
    `;

    const recordsResult = await pool.query(recordsQuery);
    const record = recordsResult.rows[0];

    console.log(`總記錄數: ${record.total_records}`);
    console.log(`從 Google Sheets 同步: ${record.synced_from_sheets}`);
    console.log(`最新同步時間: ${record.latest_sync || '(尚未同步)'}`);

    // Check sync logs
    console.log('\n📋 最近的同步記錄:');
    console.log('===============================================');

    const logsQuery = `
      SELECT
        sl.id,
        sl.status,
        sl.records_synced,
        sl.error_message,
        sl.synced_at,
        sm.worksheet_name,
        sm.target_table
      FROM sync_logs sl
      JOIN sheet_mappings sm ON sl.mapping_id = sm.id
      WHERE sm.target_table = 'income_expense_records'
      ORDER BY sl.synced_at DESC
      LIMIT 5
    `;

    const logsResult = await pool.query(logsQuery);

    if (logsResult.rows.length === 0) {
      console.log('❌ 沒有任何同步記錄');
    } else {
      logsResult.rows.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.worksheet_name} → ${log.target_table}`);
        console.log(`   狀態: ${log.status}`);
        console.log(`   同步筆數: ${log.records_synced}`);
        console.log(`   時間: ${log.synced_at}`);
        if (log.error_message) {
          console.log(`   錯誤訊息: ${log.error_message}`);
        }
      });
    }

    // Check sample records if any exist
    if (parseInt(record.synced_from_sheets) > 0) {
      console.log('\n📝 樣本記錄（前 3 筆）:');
      console.log('===============================================');

      const sampleQuery = `
        SELECT
          transaction_date,
          customer_email,
          customer_name,
          amount_twd,
          payment_method,
          created_at
        FROM income_expense_records
        WHERE source = 'google_sheets'
        ORDER BY created_at DESC
        LIMIT 3
      `;

      const sampleResult = await pool.query(sampleQuery);
      sampleResult.rows.forEach((row, index) => {
        console.log(`\n${index + 1}.`);
        console.log(`   交易日期: ${row.transaction_date}`);
        console.log(`   顧客Email: ${row.customer_email || '(無)'}`);
        console.log(`   顧客姓名: ${row.customer_name || '(無)'}`);
        console.log(`   金額: ${row.amount_twd}`);
        console.log(`   付款方式: ${row.payment_method || '(無)'}`);
        console.log(`   同步時間: ${row.created_at}`);
      });
    }

    console.log('\n===============================================\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

main();

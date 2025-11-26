/**
 * 更新收支表單的欄位映射（18個欄位）
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    console.log('\n🔄 更新收支表單映射配置...');
    console.log('===============================================');

    // 完整的 18 個欄位映射
    const fieldMappings = [
      { googleColumn: 'Date', supabaseColumn: 'transaction_date' },
      { googleColumn: '付款方式', supabaseColumn: 'payment_method' },
      { googleColumn: '收入項目', supabaseColumn: 'income_item' },
      { googleColumn: '支出項目', supabaseColumn: 'expense_item' },
      { googleColumn: '數量', supabaseColumn: 'quantity' },
      { googleColumn: '收支類別', supabaseColumn: 'transaction_category' },
      { googleColumn: '商家類別', supabaseColumn: 'customer_type' },
      { googleColumn: '授課教練', supabaseColumn: 'teacher_name' },
      { googleColumn: '商家姓名/顧客姓名', supabaseColumn: 'customer_name' },
      { googleColumn: '顧客Email', supabaseColumn: 'customer_email' },
      { googleColumn: '備註', supabaseColumn: 'notes' },
      { googleColumn: '金額（換算台幣）', supabaseColumn: 'amount_twd' },
      { googleColumn: '業績歸屬人 1', supabaseColumn: 'closer' },
      { googleColumn: '業績歸屬人 2', supabaseColumn: 'setter' },
      { googleColumn: '填表人', supabaseColumn: 'form_filler' },
      { googleColumn: '成交方式', supabaseColumn: 'deal_method' },
      { googleColumn: '諮詢來源', supabaseColumn: 'consultation_source' },
      { googleColumn: '提交時間', supabaseColumn: 'submitted_at' },
    ];

    // 找到收支表單的 mapping ID
    const findMappingQuery = `
      SELECT id
      FROM sheet_mappings
      WHERE target_table = 'income_expense_records'
      LIMIT 1
    `;

    const result = await pool.query(findMappingQuery);

    if (result.rows.length === 0) {
      console.log('❌ 找不到收支表單的映射配置');
      return;
    }

    const mappingId = result.rows[0].id;

    // 更新映射配置
    const updateQuery = `
      UPDATE sheet_mappings
      SET field_mappings = $1, updated_at = NOW()
      WHERE id = $2
    `;

    await pool.query(updateQuery, [JSON.stringify(fieldMappings), mappingId]);

    console.log(`✅ 映射配置已更新！`);
    console.log(`   Mapping ID: ${mappingId}`);
    console.log(`   欄位數量: ${fieldMappings.length}`);
    console.log('');
    console.log('📋 已配置的欄位映射：');
    console.log('===============================================');
    fieldMappings.forEach((mapping, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${mapping.googleColumn.padEnd(25)} → ${mapping.supabaseColumn}`);
    });
    console.log('===============================================\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

main();

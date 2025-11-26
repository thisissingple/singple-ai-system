/**
 * Check field mappings for income_expense_records
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    // Check the field mappings
    const query = `
      SELECT
        id,
        worksheet_name,
        target_table,
        field_mappings,
        is_enabled
      FROM sheet_mappings
      WHERE target_table = 'income_expense_records'
    `;

    const result = await pool.query(query);

    console.log('\n📋 Field Mappings for income_expense_records:');
    console.log('===============================================');

    if (result.rows.length === 0) {
      console.log('❌ No mappings found');
    } else {
      result.rows.forEach((mapping) => {
        console.log(`\nWorksheet: ${mapping.worksheet_name}`);
        console.log(`Enabled: ${mapping.is_enabled}`);
        console.log(`\nField Mappings:`);
        const mappings = mapping.field_mappings as any[];
        if (mappings.length === 0) {
          console.log('  ❌ No field mappings configured!');
        } else {
          mappings.forEach((fm, index) => {
            console.log(`  ${index + 1}. ${fm.googleColumn} → ${fm.supabaseColumn}`);
          });
        }
      });
    }

    // Check required columns in income_expense_records
    console.log('\n📊 Required Columns in income_expense_records:');
    console.log('===============================================');

    const columnsQuery = `
      SELECT
        column_name,
        is_nullable,
        column_default,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'income_expense_records'
        AND is_nullable = 'NO'
        AND column_default IS NULL
      ORDER BY ordinal_position
    `;

    const columnsResult = await pool.query(columnsQuery);
    if (columnsResult.rows.length > 0) {
      console.log('\n❗ These columns are required (NOT NULL, no default):');
      columnsResult.rows.forEach((col) => {
        console.log(`  - ${col.column_name} (${col.data_type})`);
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

/**
 * Check income expense data source configuration
 */

import { createPool } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  try {
    // Check data source
    const sourceQuery = `
      SELECT id, name, sheet_id, sheet_url, created_at
      FROM google_sheets_sources
      WHERE name = '收支表單'
    `;

    const sourceResult = await pool.query(sourceQuery);

    console.log('\n📊 收支表單資料來源設定:');
    console.log('===============================================');

    if (sourceResult.rows.length === 0) {
      console.log('❌ 找不到「收支表單」資料來源');
      console.log('\n💡 建議：需要先建立資料來源');
    } else {
      const source = sourceResult.rows[0];
      console.log(`ID: ${source.id}`);
      console.log(`名稱: ${source.name}`);
      console.log(`Sheet ID: ${source.sheet_id || '(未設定)'}`);
      console.log(`Sheet URL: ${source.sheet_url || '(未設定)'}`);
      console.log(`建立時間: ${source.created_at}`);

      // Check mappings
      const mappingQuery = `
        SELECT id, worksheet_name, target_table, is_enabled
        FROM sheet_mappings
        WHERE source_id = $1
      `;

      const mappingResult = await pool.query(mappingQuery, [source.id]);

      console.log('\n📋 映射設定:');
      console.log('===============================================');

      if (mappingResult.rows.length === 0) {
        console.log('❌ 沒有任何映射設定');
      } else {
        mappingResult.rows.forEach((mapping, index) => {
          console.log(`\n${index + 1}. ${mapping.worksheet_name} → ${mapping.target_table}`);
          console.log(`   ID: ${mapping.id}`);
          console.log(`   狀態: ${mapping.is_enabled ? '已啟用' : '未啟用'}`);
        });
      }
    }

    console.log('\n===============================================\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

main();

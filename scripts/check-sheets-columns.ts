/**
 * Check all columns in 收支表單 worksheet
 */

import { GoogleSheetsAPI } from '../server/services/sheets/google-sheets-api';
import { getGoogleCredentials } from '../server/services/sheets/credentials';

async function main() {
  try {
    const api = new GoogleSheetsAPI(getGoogleCredentials());
    const sheetId = '1T_iliIsqgAmoTvjKUBJk-yC9rA92KI4UB0RDp_HD6m8';
    const worksheetName = '收支表單';

    console.log('\n📊 正在讀取 Google Sheets 欄位...');
    console.log('===============================================');

    const data = await api.getWorksheetData(sheetId, worksheetName);

    if (data.length === 0) {
      console.log('❌ 工作表中沒有資料');
      return;
    }

    const headers = data[0];
    console.log(`\n找到 ${headers.length} 個欄位：\n`);

    headers.forEach((header, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${header}`);
    });

    // Sample data from first row
    if (data.length > 1) {
      console.log('\n\n📝 第一筆資料範例：');
      console.log('===============================================');
      const firstRow = data[1];
      headers.forEach((header, index) => {
        const value = firstRow[index] || '(空)';
        console.log(`${header}: ${value}`);
      });
    }

    console.log('\n===============================================\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  }
}

main();

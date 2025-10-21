#!/usr/bin/env tsx
/**
 * Google Sheets 欄位盤點工具
 * 用於分析 Google Sheets 資料表結構，自動產生 schema 文件
 *
 * 使用方式：npm run introspect-sheets
 */

import { google } from 'googleapis';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

interface FieldAnalysis {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'empty';
  occurrences: number;
  samples: string[];
  nullCount: number;
}

interface SheetAnalysis {
  sheetName: string;
  spreadsheetId: string;
  totalRows: number;
  fields: FieldAnalysis[];
  lastAnalyzed: string;
}

const SHEETS_CONFIG = [
  {
    name: '體驗課上課記錄表（上課打卡）',
    spreadsheetId: process.env.TRIAL_CLASS_ATTENDANCE_SHEET_ID || '',
    range: 'A1:Z50',
  },
  {
    name: '體驗課購買記錄表（體驗課學員名單）',
    spreadsheetId: process.env.TRIAL_CLASS_PURCHASE_SHEET_ID || '',
    range: 'A1:Z50',
  },
  {
    name: 'EODs for Closers（升高階學員名單）',
    spreadsheetId: process.env.EODS_FOR_CLOSERS_SHEET_ID || '',
    range: 'A1:Z50',
  },
];

/**
 * 推測欄位型別
 */
function inferType(value: any): 'string' | 'number' | 'date' | 'boolean' | 'empty' {
  if (value === null || value === undefined || value === '') {
    return 'empty';
  }

  const stringValue = String(value).trim();

  // Boolean check
  if (stringValue.toLowerCase() === 'true' || stringValue.toLowerCase() === 'false') {
    return 'boolean';
  }

  // Number check
  if (!isNaN(Number(stringValue)) && stringValue !== '') {
    return 'number';
  }

  // Date check (ISO, Taiwan format, etc.)
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}/, // ISO: 2024-01-01
    /^\d{2}\/\d{2}\/\d{4}/, // US: 01/31/2024
    /^\d{4}\/\d{2}\/\d{2}/, // Taiwan: 2024/01/31
    /^\d{2}-\d{2}-\d{4}/, // 01-31-2024
  ];

  for (const pattern of datePatterns) {
    if (pattern.test(stringValue)) {
      return 'date';
    }
  }

  return 'string';
}

/**
 * 分析欄位
 */
function analyzeFields(rows: any[][]): FieldAnalysis[] {
  if (rows.length === 0) return [];

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  return headers.map((header, colIndex) => {
    const columnValues = dataRows.map(row => row[colIndex]);
    const nonEmptyValues = columnValues.filter(v => v !== null && v !== undefined && v !== '');

    // Type inference
    const typeCounter: Record<string, number> = {
      string: 0,
      number: 0,
      date: 0,
      boolean: 0,
      empty: 0,
    };

    columnValues.forEach(value => {
      const type = inferType(value);
      typeCounter[type]++;
    });

    // Determine dominant type
    let dominantType: FieldAnalysis['type'] = 'string';
    let maxCount = 0;

    for (const [type, count] of Object.entries(typeCounter)) {
      if (type !== 'empty' && count > maxCount) {
        dominantType = type as FieldAnalysis['type'];
        maxCount = count;
      }
    }

    // Sample values (取前3個非空值)
    const samples = nonEmptyValues.slice(0, 3).map(v => String(v));

    return {
      name: header || `Column_${colIndex}`,
      type: dominantType,
      occurrences: nonEmptyValues.length,
      samples,
      nullCount: typeCounter.empty,
    };
  });
}

/**
 * 分析單一工作表
 */
async function analyzeSheet(
  sheets: any,
  config: { name: string; spreadsheetId: string; range: string }
): Promise<SheetAnalysis | null> {
  try {
    if (!config.spreadsheetId) {
      console.warn(`⚠️  跳過 "${config.name}": 未設定 spreadsheetId`);
      return null;
    }

    console.log(`📊 正在分析: ${config.name}...`);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.spreadsheetId,
      range: config.range,
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      console.warn(`⚠️  "${config.name}" 無資料`);
      return null;
    }

    const fields = analyzeFields(rows);

    return {
      sheetName: config.name,
      spreadsheetId: config.spreadsheetId,
      totalRows: rows.length - 1, // 扣除 header
      fields,
      lastAnalyzed: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ 分析 "${config.name}" 失敗:`, error);
    return null;
  }
}

/**
 * 產生 Markdown 文件
 */
function generateMarkdown(analyses: SheetAnalysis[]): string {
  let md = `# Google Sheets Schema 文件\n\n`;
  md += `> 自動產生於 ${new Date().toLocaleString('zh-TW')}\n\n`;
  md += `此文件記錄專案使用的 Google Sheets 資料表結構。\n\n`;
  md += `## 資料表清單\n\n`;

  analyses.forEach((analysis, index) => {
    md += `### ${index + 1}. ${analysis.sheetName}\n\n`;
    md += `- **Spreadsheet ID**: \`${analysis.spreadsheetId}\`\n`;
    md += `- **總資料筆數**: ${analysis.totalRows} 筆\n`;
    md += `- **最後分析時間**: ${new Date(analysis.lastAnalyzed).toLocaleString('zh-TW')}\n\n`;

    md += `#### 欄位定義\n\n`;
    md += `| 欄位名稱 | 型別 | 出現次數 | 空值數 | 範例值 | 用途備註 |\n`;
    md += `|---------|------|---------|--------|--------|----------|\n`;

    analysis.fields.forEach(field => {
      const samples = field.samples.length > 0
        ? field.samples.map(s => `\`${s}\``).join(', ')
        : '無資料';

      md += `| ${field.name} | ${field.type} | ${field.occurrences} | ${field.nullCount} | ${samples} | - |\n`;
    });

    md += `\n`;
  });

  md += `## 如何使用\n\n`;
  md += `1. 執行 \`npm run introspect-sheets\` 更新此文件\n`;
  md += `2. 根據欄位定義調整前端/後端的型別定義\n`;
  md += `3. 在 "用途備註" 欄位手動補充業務邏輯說明\n\n`;

  return md;
}

/**
 * 主函式
 */
async function main() {
  console.log('🚀 開始 Google Sheets 欄位盤點...\n');

  // 檢查憑證
  const credentials = JSON.parse(
    process.env.GOOGLE_SHEETS_CREDENTIALS ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    '{}'
  );

  if (!credentials.client_email || !credentials.private_key) {
    console.error('❌ 錯誤: 未設定 Google Sheets 憑證');
    console.log('\n請設定以下環境變數之一:');
    console.log('  - GOOGLE_SHEETS_CREDENTIALS');
    console.log('  - GOOGLE_APPLICATION_CREDENTIALS\n');
    console.log('💡 目前將產生空白報告供參考\n');

    // 產生空白報告
    const emptyReport: SheetAnalysis[] = [];
    const markdown = generateMarkdown(emptyReport);

    await mkdir(join(process.cwd(), 'docs'), { recursive: true });
    await writeFile(
      join(process.cwd(), 'docs', 'google-sheets-schema.md'),
      markdown
    );
    console.log('✅ 已產生空白文件: docs/google-sheets-schema.md');
    return;
  }

  // 初始化 Google Sheets API
  if (typeof credentials.private_key === 'string') {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 分析所有工作表
  const analyses: SheetAnalysis[] = [];

  for (const config of SHEETS_CONFIG) {
    const analysis = await analyzeSheet(sheets, config);
    if (analysis) {
      analyses.push(analysis);
    }
  }

  if (analyses.length === 0) {
    console.warn('\n⚠️  警告: 無法分析任何工作表\n');
  }

  // 產生 JSON 報告
  const jsonReport = {
    generatedAt: new Date().toISOString(),
    totalSheets: analyses.length,
    sheets: analyses,
  };

  await mkdir(join(process.cwd(), 'docs'), { recursive: true });

  await writeFile(
    join(process.cwd(), 'docs', 'google-sheets-schema.json'),
    JSON.stringify(jsonReport, null, 2)
  );

  console.log(`\n✅ JSON 報告已儲存: docs/google-sheets-schema.json`);

  // 產生 Markdown 文件
  const markdown = generateMarkdown(analyses);

  await writeFile(
    join(process.cwd(), 'docs', 'google-sheets-schema.md'),
    markdown
  );

  console.log('✅ Markdown 文件已儲存: docs/google-sheets-schema.md');

  console.log(`\n📋 總結:`);
  console.log(`  - 分析工作表數量: ${analyses.length}`);
  console.log(`  - 總資料筆數: ${analyses.reduce((sum, a) => sum + a.totalRows, 0)}`);
  console.log(`  - 總欄位數: ${analyses.reduce((sum, a) => sum + a.fields.length, 0)}\n`);

  console.log('🎉 完成!\n');
}

// 執行
main().catch(error => {
  console.error('❌ 執行失敗:', error);
  process.exit(1);
});

/**
 * Introspect Service
 * Handles field analysis for Google Sheets
 */

import { google } from 'googleapis';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { storage } from '../legacy/storage';

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

interface IntrospectResult {
  generatedAt: string;
  totalSheets: number;
  sheets: SheetAnalysis[];
}

// Legacy: fallback to environment variables if no spreadsheets in storage
const LEGACY_SHEETS_CONFIG = [
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

export class IntrospectService {
  private async initGoogleSheets() {
    const credentials = JSON.parse(
      process.env.GOOGLE_SHEETS_CREDENTIALS ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      '{}'
    );

    if (!credentials.client_email || !credentials.private_key) {
      return null;
    }

    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
  }

  private inferType(value: any): FieldAnalysis['type'] {
    if (value === null || value === undefined || value === '') {
      return 'empty';
    }

    const stringValue = String(value).trim();

    if (stringValue.toLowerCase() === 'true' || stringValue.toLowerCase() === 'false') {
      return 'boolean';
    }

    if (!isNaN(Number(stringValue)) && stringValue !== '') {
      return 'number';
    }

    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/,
      /^\d{2}\/\d{2}\/\d{4}/,
      /^\d{4}\/\d{2}\/\d{2}/,
      /^\d{2}-\d{2}-\d{4}/,
    ];

    for (const pattern of datePatterns) {
      if (pattern.test(stringValue)) {
        return 'date';
      }
    }

    return 'string';
  }

  private analyzeFields(rows: any[][]): FieldAnalysis[] {
    if (rows.length === 0) return [];

    const headers = rows[0] as string[];
    const dataRows = rows.slice(1);

    return headers.map((header, colIndex) => {
      const columnValues = dataRows.map(row => row[colIndex]);
      const nonEmptyValues = columnValues.filter(v => v !== null && v !== undefined && v !== '');

      const typeCounter: Record<string, number> = {
        string: 0,
        number: 0,
        date: 0,
        boolean: 0,
        empty: 0,
      };

      columnValues.forEach(value => {
        const type = this.inferType(value);
        typeCounter[type]++;
      });

      let dominantType: FieldAnalysis['type'] = 'string';
      let maxCount = 0;

      for (const [type, count] of Object.entries(typeCounter)) {
        if (type !== 'empty' && count > maxCount) {
          dominantType = type as FieldAnalysis['type'];
          maxCount = count;
        }
      }

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

  private async analyzeSheet(
    sheets: any,
    config: { name: string; spreadsheetId: string; range: string }
  ): Promise<SheetAnalysis | null> {
    try {
      if (!config.spreadsheetId) {
        console.warn(`Skipping "${config.name}": No spreadsheetId`);
        return null;
      }

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.spreadsheetId,
        range: config.range,
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        console.warn(`"${config.name}" has no data`);
        return null;
      }

      const fields = this.analyzeFields(rows);

      return {
        sheetName: config.name,
        spreadsheetId: config.spreadsheetId,
        totalRows: rows.length - 1,
        fields,
        lastAnalyzed: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Failed to analyze "${config.name}":`, error);
      return null;
    }
  }

  private generateMarkdown(analyses: SheetAnalysis[]): string {
    let md = `# Google Sheets Schema 文件\n\n`;
    md += `> 自動產生於 ${new Date().toLocaleString('zh-TW')}\n\n`;

    analyses.forEach((analysis, index) => {
      md += `### ${index + 1}. ${analysis.sheetName}\n\n`;
      md += `- **Spreadsheet ID**: \`${analysis.spreadsheetId}\`\n`;
      md += `- **總資料筆數**: ${analysis.totalRows} 筆\n`;
      md += `- **最後分析時間**: ${new Date(analysis.lastAnalyzed).toLocaleString('zh-TW')}\n\n`;

      md += `#### 欄位定義\n\n`;
      md += `| 欄位名稱 | 型別 | 出現次數 | 空值數 | 範例值 |\n`;
      md += `|---------|------|---------|--------|---------|\n`;

      analysis.fields.forEach(field => {
        const samples = field.samples.length > 0
          ? field.samples.map(s => `\`${s}\``).join(', ')
          : '無資料';
        md += `| ${field.name} | ${field.type} | ${field.occurrences} | ${field.nullCount} | ${samples} |\n`;
      });

      md += `\n`;
    });

    return md;
  }

  async runIntrospection(): Promise<IntrospectResult> {
    const sheets = await this.initGoogleSheets();

    if (!sheets) {
      throw new Error('Google Sheets credentials not configured');
    }

    // Get spreadsheet configs from storage (registered Google Sheets)
    const registeredSpreadsheets = await storage.listSpreadsheets();
    console.log(`📊 Found ${registeredSpreadsheets.length} registered spreadsheets`);

    let sheetsConfig: Array<{ name: string; spreadsheetId: string; range: string }> = [];

    if (registeredSpreadsheets.length > 0) {
      // Use registered spreadsheets from storage
      sheetsConfig = registeredSpreadsheets.map(s => ({
        name: s.name,
        spreadsheetId: s.spreadsheetId,
        range: s.range || 'A1:Z50',
      }));
      console.log('✓ Using registered spreadsheets from storage');
    } else {
      // Fallback to legacy environment variables
      sheetsConfig = LEGACY_SHEETS_CONFIG.filter(c => c.spreadsheetId);
      console.log('⚠️  No registered spreadsheets, using legacy env vars');
    }

    const analyses: SheetAnalysis[] = [];

    for (const config of sheetsConfig) {
      const analysis = await this.analyzeSheet(sheets, config);
      if (analysis) {
        analyses.push(analysis);
      }
    }

    const result: IntrospectResult = {
      generatedAt: new Date().toISOString(),
      totalSheets: analyses.length,
      sheets: analyses,
    };

    // Save files
    const docsDir = join(process.cwd(), 'docs');
    await mkdir(docsDir, { recursive: true });

    await writeFile(
      join(docsDir, 'google-sheets-schema.json'),
      JSON.stringify(result, null, 2)
    );

    const markdown = this.generateMarkdown(analyses);
    await writeFile(
      join(docsDir, 'google-sheets-schema.md'),
      markdown
    );

    return result;
  }

  async getLatestIntrospection(): Promise<IntrospectResult | null> {
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(
        join(process.cwd(), 'docs', 'google-sheets-schema.json'),
        'utf-8'
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}

export const introspectService = new IntrospectService();

// ================================================
// Supabase Database Introspection (for Form Builder)
// ================================================

import { createPool } from '../pg-client';

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface TableInfo {
  table_name: string;
  columns: TableColumn[];
}

/**
 * 列出所有使用者自訂的表（排除系統表）
 */
export async function listSupabaseTables(): Promise<string[]> {
  const client = createPool();

  const result = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE 'sql_%'
    ORDER BY table_name
  `);

  return result.rows.map(row => row.table_name);
}

/**
 * 取得特定表的欄位資訊
 */
export async function getTableColumns(tableName: string): Promise<TableColumn[]> {
  const client = createPool();

  const result = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  return result.rows;
}

/**
 * 取得所有表的完整資訊（表名 + 欄位）
 */
export async function getAllTablesInfo(): Promise<TableInfo[]> {
  const tables = await listSupabaseTables();

  const tablesInfo: TableInfo[] = [];

  for (const tableName of tables) {
    const columns = await getTableColumns(tableName);
    tablesInfo.push({
      table_name: tableName,
      columns
    });
  }

  return tablesInfo;
}

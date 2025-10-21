/**
 * Sheet Mapping Service
 *
 * 提供欄位對應管理的業務邏輯：
 * - 識別 sheet 類型
 * - 解析欄位值
 * - 產生 unique key
 * - 型別轉換
 */

import { storage } from '../legacy/storage';
import {
  SheetFieldMapping,
  SheetType,
  SheetMappingTransform,
  SheetKeyStrategy,
  SheetMappingField,
} from '../../../configs/sheet-mapping-defaults';

/**
 * 根據 spreadsheet 名稱識別 sheet 類型
 *
 * @param spreadsheetName - 工作表名稱
 * @param headers - (可選) 欄位標題陣列，用於 fallback 識別
 */
export function identifySheetType(
  spreadsheetName: string,
  headers?: string[]
): SheetType | null {
  const lowerName = spreadsheetName.toLowerCase();

  const mappings = [
    { type: 'trial_attendance' as SheetType, patterns: ['體驗課上課', 'attendance', '上課打卡'] },
    { type: 'trial_purchase' as SheetType, patterns: ['體驗課購買', 'purchase', '學員轉單'] },
    { type: 'eods' as SheetType, patterns: ['eod', '成交', 'closer'] },
  ];

  // 優先：根據工作表名稱關鍵字識別
  for (const { type, patterns } of mappings) {
    if (patterns.some((pattern) => lowerName.includes(pattern.toLowerCase()))) {
      return type;
    }
  }

  // Fallback：根據欄位結構智能識別
  if (headers && headers.length > 0) {
    const lowerHeaders = headers.map(h => h.toLowerCase());

    // 判斷是否為「體驗課上課記錄」
    const hasAttendanceFields = [
      '上課日期', 'class date', '授課老師', 'teacher', '是否已確認', 'attended'
    ].some(keyword => lowerHeaders.some(h => h.includes(keyword.toLowerCase())));

    if (hasAttendanceFields) {
      console.log(`✓ Identified as trial_attendance based on headers: ${headers.slice(0, 5).join(', ')}`);
      return 'trial_attendance';
    }

    // 判斷是否為「體驗課購買記錄」
    const hasPurchaseFields = [
      '購買日期', 'purchase date', '體驗課', 'trial'
    ].some(keyword => lowerHeaders.some(h => h.includes(keyword.toLowerCase())));

    if (hasPurchaseFields) {
      console.log(`✓ Identified as trial_purchase based on headers: ${headers.slice(0, 5).join(', ')}`);
      return 'trial_purchase';
    }

    // 判斷是否為「成交記錄 (EODs)」
    const hasEodsFields = [
      '成交金額', 'deal amount', '成交日期', 'deal date', 'closer'
    ].some(keyword => lowerHeaders.some(h => h.includes(keyword.toLowerCase())));

    if (hasEodsFields) {
      console.log(`✓ Identified as eods based on headers: ${headers.slice(0, 5).join(', ')}`);
      return 'eods';
    }

    console.log(`⚠️  Could not identify sheet type from name "${spreadsheetName}" or headers: ${headers.slice(0, 5).join(', ')}`);
  }

  return null;
}

/**
 * 取得指定 sheet 類型的 mapping 配置
 */
export async function getMappingForSheet(sheetType: SheetType): Promise<SheetFieldMapping | null> {
  const mapping = await storage.getSheetMapping(sheetType);
  return mapping || null;
}

/**
 * 解析欄位值：根據別名從原始資料中找到對應的值
 */
export function resolveFieldValue(
  rawData: Record<string, any>,
  field: SheetMappingField
): any {
  // 建立大小寫不敏感的查找 Map
  const normalizedEntries = Object.entries(rawData).map(([key, value]) => [
    key.trim().toLowerCase(),
    value
  ]);
  const normalizedMap = new Map(normalizedEntries);

  // 嘗試用每個別名找值
  for (const alias of field.aliases) {
    const trimmedAlias = alias.trim();

    // 先用原始大小寫嘗試（精確匹配）
    const exactValue = rawData[trimmedAlias];
    if (exactValue !== undefined && exactValue !== null && exactValue !== '') {
      return exactValue;
    }

    // Fallback: 大小寫不敏感查找
    const normalizedValue = normalizedMap.get(trimmedAlias.toLowerCase());
    if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
      return normalizedValue;
    }
  }

  return null;
}

/**
 * 套用型別轉換
 */
export function applyTransform(value: any, transform: SheetMappingTransform): any {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  switch (transform) {
    case 'date':
      return parseDateField(value);
    case 'number':
      return parseNumberField(value);
    case 'boolean':
      return parseBooleanField(value);
    default:
      return value;
  }
}

/**
 * 日期解析
 */
function parseDateField(value: any): string | null {
  if (!value) return null;

  try {
    // 如果已經是 Date 物件
    if (value instanceof Date) {
      return value.toISOString();
    }

    // 如果是字串
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;

      // 嘗試解析各種日期格式
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }

    // 如果是數字（可能是 Excel 序列號）
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  } catch (error) {
    console.warn('Failed to parse date:', value, error);
  }

  return null;
}

/**
 * 數字解析
 * 支援格式: "NT$86,000", "$4,000.00", "1,234.56", "1234"
 */
function parseNumberField(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // 移除貨幣符號 (NT$, $)、千分位符號、空格
    const cleaned = value
      .replace(/NT\$/gi, '')  // 移除 NT$
      .replace(/\$/g, '')      // 移除 $
      .replace(/,/g, '')       // 移除千分位符號
      .replace(/\s/g, '');     // 移除空格

    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

/**
 * 布林值解析
 */
function parseBooleanField(value: any): boolean | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    if (['true', 'yes', '是', '有', '1', 'y', 't'].includes(lower)) {
      return true;
    }
    if (['false', 'no', '否', '無', '0', 'n', 'f'].includes(lower)) {
      return false;
    }
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return null;
}

/**
 * 根據策略產生 unique key
 */
export function generateUniqueKey(
  record: Record<string, any>,
  strategy: SheetKeyStrategy
): string {
  if (strategy === 'spreadsheet_row') {
    // 策略 1: spreadsheet_id + row_index
    if (record.source_spreadsheet_id && record.origin_row_index !== undefined) {
      return `${record.source_spreadsheet_id}:${record.origin_row_index}`;
    }
    throw new Error('Cannot generate spreadsheet_row key: missing source_spreadsheet_id or origin_row_index');
  }

  if (strategy === 'email_date') {
    // 策略 2: email + date
    const email = record.student_email;
    const date = record.class_date || record.purchase_date || record.deal_date;

    if (email && date) {
      const dateStr = typeof date === 'string' ? date : date.toISOString();
      return `${email}:${dateStr.split('T')[0]}`;
    }
    throw new Error('Cannot generate email_date key: missing student_email or date field');
  }

  throw new Error(`Unknown key strategy: ${strategy}`);
}

/**
 * 將原始資料轉換為 Supabase 記錄
 */
export async function transformToSupabaseRecord(
  rawData: Record<string, any>,
  sheetType: SheetType,
  spreadsheetId: string,
  rowIndex: number
): Promise<{
  record: Record<string, any> | null;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const mapping = await getMappingForSheet(sheetType);

  if (!mapping) {
    warnings.push(`No mapping found for sheet type: ${sheetType}`);
    return { record: null, warnings };
  }

  const record: Record<string, any> = {
    source_spreadsheet_id: spreadsheetId,
    origin_row_index: rowIndex,
    raw_data: rawData,
    synced_at: new Date().toISOString(),
  };

  // 套用欄位對應
  for (const field of mapping.fields) {
    const rawValue = resolveFieldValue(rawData, field);

    if (rawValue !== null) {
      const transformedValue = field.transform
        ? applyTransform(rawValue, field.transform)
        : rawValue;

      if (transformedValue !== null) {
        record[field.supabaseColumn] = transformedValue;
      }
    } else if (field.required) {
      warnings.push(
        `Missing required field: ${field.supabaseColumn} (aliases: ${field.aliases.join(', ')})`
      );
    }
  }

  // 檢查必填欄位
  const missingRequired = mapping.fields
    .filter((f) => f.required && !record[f.supabaseColumn])
    .map((f) => f.supabaseColumn);

  if (missingRequired.length > 0) {
    return {
      record: null,
      warnings: [...warnings, `Missing required fields: ${missingRequired.join(', ')}`],
    };
  }

  return { record, warnings };
}

/**
 * 批次轉換與驗證
 */
export async function batchTransformAndValidate(
  rawDataArray: any[][],
  headers: string[],
  sheetType: SheetType,
  spreadsheetId: string
): Promise<{
  validRecords: Record<string, any>[];
  invalidRecords: { rowIndex: number; warnings: string[] }[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
  };
}> {
  const validRecords: Record<string, any>[] = [];
  const invalidRecords: { rowIndex: number; warnings: string[] }[] = [];

  for (let index = 0; index < rawDataArray.length; index++) {
    const row = rawDataArray[index];

    // 將 row array 轉換為物件
    const rowData: Record<string, any> = {};
    headers.forEach((header, headerIndex) => {
      rowData[header] = row[headerIndex] || '';
    });

    // 轉換為 Supabase 記錄
    const { record, warnings } = await transformToSupabaseRecord(
      rowData,
      sheetType,
      spreadsheetId,
      index
    );

    if (record) {
      validRecords.push(record);
      if (warnings.length > 0) {
        console.warn(`Row ${index} has warnings:`, warnings);
      }
    } else {
      invalidRecords.push({
        rowIndex: index,
        warnings,
      });
    }
  }

  return {
    validRecords,
    invalidRecords,
    stats: {
      total: rawDataArray.length,
      valid: validRecords.length,
      invalid: invalidRecords.length,
    },
  };
}

/**
 * Google Sheets → Supabase Field Mapping Configuration
 *
 * 定義三種工作表的欄位如何對應到 Supabase 資料表
 * 包含欄位別名、資料轉換、以及 unique key 定義
 *
 * NOTE: 此模組現在使用動態 mapping (從 storage 讀取)，支援前端即時修改欄位對應。
 */

import { resolveField, parseDateField, parseNumberField } from './field-mapping-v2';
import * as sheetMappingService from './sheetMappingService';
import { SheetType } from '../../../configs/sheet-mapping-defaults';

/**
 * Supabase 表名稱
 */
export const SUPABASE_TABLES = {
  TRIAL_CLASS_ATTENDANCE: 'trial_class_attendance',
  TRIAL_CLASS_PURCHASE: 'trial_class_purchase',
  EODS_FOR_CLOSERS: 'eods_for_closers',
} as const;

export type SupabaseTableName = typeof SUPABASE_TABLES[keyof typeof SUPABASE_TABLES];

/**
 * 工作表識別規則
 * 根據 spreadsheet 名稱判斷應該同步到哪張 Supabase 表
 * NOTE: 現在透過 sheetMappingService 識別，支援前端動態修改 patterns
 *
 * @param spreadsheetName - 工作表名稱
 * @param headers - (可選) 欄位標題陣列，用於智能識別
 */
export function identifyTargetTable(
  spreadsheetName: string,
  headers?: string[]
): SupabaseTableName | null {
  const sheetType = sheetMappingService.identifySheetType(spreadsheetName, headers);
  if (!sheetType) return null;

  // Map sheetType to SupabaseTableName
  const typeToTable: Record<SheetType, SupabaseTableName> = {
    'trial_attendance': SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE,
    'trial_purchase': SUPABASE_TABLES.TRIAL_CLASS_PURCHASE,
    'eods': SUPABASE_TABLES.EODS_FOR_CLOSERS,
  };

  return typeToTable[sheetType] || null;
}

/**
 * 欄位對應配置
 * 定義每張表的標準欄位如何從原始資料中提取
 */
export interface FieldMapping {
  supabaseColumn: string;
  standardKey: string; // 對應到 field-mapping-v2.ts 的 FIELD_ALIASES
  transform?: (value: any) => any;
  required?: boolean;
}

/**
 * 共用欄位對應（所有表都有的欄位）
 */
const COMMON_FIELDS: FieldMapping[] = [
  {
    supabaseColumn: 'student_name',
    standardKey: 'studentName',
  },
  {
    supabaseColumn: 'student_email',
    standardKey: 'studentEmail',
    required: true, // 用於判斷是否為有效記錄
  },
  {
    supabaseColumn: 'teacher_name',
    standardKey: 'teacher',
  },
  {
    supabaseColumn: 'course_type',
    standardKey: 'courseType',
  },
  {
    supabaseColumn: 'status',
    standardKey: 'status',
  },
  {
    supabaseColumn: 'intent_score',
    standardKey: 'intentScore',
    transform: parseNumberField,
  },
];

/**
 * 體驗課上課記錄表 - 特有欄位
 */
const ATTENDANCE_SPECIFIC_FIELDS: FieldMapping[] = [
  {
    supabaseColumn: 'class_date',
    standardKey: 'classDate',
    transform: parseDateField,
  },
  {
    supabaseColumn: 'satisfaction',
    standardKey: 'satisfaction',
    transform: parseNumberField,
  },
  {
    supabaseColumn: 'attended',
    standardKey: 'attended',
    transform: (value: any) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        const lower = value.toLowerCase();
        return lower === 'true' || lower === '是' || lower === 'yes' || lower === '有';
      }
      return null;
    },
  },
];

/**
 * 體驗課購買記錄表 - 特有欄位
 */
const PURCHASE_SPECIFIC_FIELDS: FieldMapping[] = [
  {
    supabaseColumn: 'purchase_date',
    standardKey: 'purchaseDate',
    transform: parseDateField,
  },
  {
    supabaseColumn: 'plan',
    standardKey: 'courseType', // 方案也可能在 courseType 別名中
  },
];

/**
 * EODs 成交記錄表 - 特有欄位
 */
const EODS_SPECIFIC_FIELDS: FieldMapping[] = [
  {
    supabaseColumn: 'deal_date',
    standardKey: 'dealDate',
    transform: parseDateField,
  },
  {
    supabaseColumn: 'deal_amount',
    standardKey: 'dealAmount',
    transform: parseNumberField,
  },
  {
    supabaseColumn: 'closer_name',
    standardKey: 'closer',
  },
  {
    supabaseColumn: 'setter_name',
    standardKey: 'setter',
  },
];

/**
 * 取得指定表的完整欄位對應
 */
export function getFieldMappings(tableName: SupabaseTableName): FieldMapping[] {
  const mappings = [...COMMON_FIELDS];

  switch (tableName) {
    case SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE:
      mappings.push(...ATTENDANCE_SPECIFIC_FIELDS);
      break;
    case SUPABASE_TABLES.TRIAL_CLASS_PURCHASE:
      mappings.push(...PURCHASE_SPECIFIC_FIELDS);
      break;
    case SUPABASE_TABLES.EODS_FOR_CLOSERS:
      mappings.push(...EODS_SPECIFIC_FIELDS);
      break;
  }

  return mappings;
}

/**
 * 將 Google Sheets 原始資料轉換為 Supabase 記錄
 *
 * @param rawData - 原始資料（key 為 Google Sheets 的欄位名稱）
 * @param tableName - 目標 Supabase 表名
 * @param spreadsheetId - 來源 spreadsheet ID
 * @param rowIndex - 原始資料的行號
 * @returns Supabase 記錄物件 + 警告訊息
 *
 * NOTE: 現在使用動態 mapping，支援前端即時修改欄位對應
 */
export async function transformToSupabaseRecord(
  rawData: Record<string, any>,
  tableName: SupabaseTableName,
  spreadsheetId: string,
  rowIndex: number
): Promise<{ record: Record<string, any> | null; warnings: string[] }> {
  const warnings: string[] = [];

  // 將 SupabaseTableName 轉為 SheetType
  const tableToType: Record<SupabaseTableName, SheetType> = {
    [SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE]: 'trial_attendance',
    [SUPABASE_TABLES.TRIAL_CLASS_PURCHASE]: 'trial_purchase',
    [SUPABASE_TABLES.EODS_FOR_CLOSERS]: 'eods',
  };

  const sheetType = tableToType[tableName];
  if (!sheetType) {
    warnings.push(`Unknown table name: ${tableName}`);
    return { record: null, warnings };
  }

  // 使用 sheetMappingService 進行轉換
  const result = await sheetMappingService.transformToSupabaseRecord(
    rawData,
    sheetType,
    spreadsheetId,
    rowIndex
  );

  return result;
}

/**
 * 產生唯一鍵 (unique key) 用於判斷是更新還是插入
 *
 * 策略：
 * - 優先使用：spreadsheet_id + row_index（最精確）
 * - 備選：student_email + class_date（適用於同步來自不同來源的相同學生資料）
 *
 * @param record - Supabase 記錄
 * @returns 唯一鍵字串
 */
export function generateUniqueKey(record: Record<string, any>): string {
  // 策略 1: spreadsheet_id + row_index
  if (record.source_spreadsheet_id && record.origin_row_index !== undefined) {
    return `${record.source_spreadsheet_id}:${record.origin_row_index}`;
  }

  // 策略 2: email + date (fallback)
  const email = record.student_email;
  const date = record.class_date || record.purchase_date || record.deal_date;

  if (email && date) {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    return `${email}:${dateStr.split('T')[0]}`;
  }

  // 策略 3: 無法產生唯一鍵（此筆資料可能無效）
  throw new Error('Cannot generate unique key: missing required fields');
}

/**
 * 驗證記錄是否有效（必填欄位檢查）
 *
 * @param record - Supabase 記錄
 * @param tableName - 目標表名
 * @returns 是否有效
 */
export function validateRecord(
  record: Record<string, any>,
  tableName: SupabaseTableName
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const mappings = getFieldMappings(tableName);

  // 檢查必填欄位
  for (const mapping of mappings) {
    if (mapping.required) {
      const value = record[mapping.supabaseColumn];
      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required field: ${mapping.supabaseColumn} (${mapping.standardKey})`);
      }
    }
  }

  // 檢查 raw_data
  if (!record.raw_data || Object.keys(record.raw_data).length === 0) {
    errors.push('Missing raw_data');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 批次轉換與驗證
 *
 * @param rawDataArray - 原始資料陣列
 * @param tableName - 目標表名
 * @param spreadsheetId - 來源 spreadsheet ID
 * @returns 轉換結果（包含有效記錄、錯誤記錄、統計）
 *
 * NOTE: 現在使用動態 mapping，支援前端即時修改欄位對應
 */
export async function batchTransformAndValidate(
  rawDataArray: any[][],
  headers: string[],
  tableName: SupabaseTableName,
  spreadsheetId: string
): Promise<{
  validRecords: Record<string, any>[];
  invalidRecords: { rowIndex: number; errors: string[] }[];
  stats: {
    total: number;
    valid: number;
    invalid: number;
  };
}> {
  // 將 SupabaseTableName 轉為 SheetType
  const tableToType: Record<SupabaseTableName, SheetType> = {
    [SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE]: 'trial_attendance',
    [SUPABASE_TABLES.TRIAL_CLASS_PURCHASE]: 'trial_purchase',
    [SUPABASE_TABLES.EODS_FOR_CLOSERS]: 'eods',
  };

  const sheetType = tableToType[tableName];
  if (!sheetType) {
    return {
      validRecords: [],
      invalidRecords: rawDataArray.map((_, index) => ({
        rowIndex: index,
        errors: [`Unknown table name: ${tableName}`],
      })),
      stats: {
        total: rawDataArray.length,
        valid: 0,
        invalid: rawDataArray.length,
      },
    };
  }

  // 使用 sheetMappingService 進行批次轉換
  const result = await sheetMappingService.batchTransformAndValidate(
    rawDataArray,
    headers,
    sheetType,
    spreadsheetId
  );

  return {
    validRecords: result.validRecords,
    invalidRecords: result.invalidRecords.map((item) => ({
      rowIndex: item.rowIndex,
      errors: item.warnings, // sheetMappingService 使用 'warnings' 而非 'errors'
    })),
    stats: result.stats,
  };
}

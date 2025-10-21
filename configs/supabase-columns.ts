/**
 * Supabase 欄位定義 - 從 schema 取得實際欄位列表
 *
 * 這個檔案定義每個 Supabase 表的實際欄位，用於檢測未映射的欄位
 */

import { EXPECTED_INSERT_FIELDS } from './supabase-schema-authority';
import { trialClassAttendance, trialClassPurchase, eodsForClosers } from '../shared/schema';

/**
 * 從 Drizzle schema 提取欄位名稱的輔助函數
 */
function getColumnNamesFromDrizzleTable(table: any): string[] {
  // Drizzle table 物件的結構會有一個 _ 屬性包含 columns
  if (table && table._ && table._.columns) {
    return Object.keys(table._.columns);
  }
  return [];
}

/**
 * 每個 Supabase 表的實際欄位清單
 *
 * 來源順序：
 * 1. 優先使用 supabase-schema-authority.ts 的定義（權威來源）
 * 2. Fallback 到 Drizzle schema（開發環境）
 */
export const SUPABASE_COLUMNS = {
  trial_class_attendance: [
    'id',
    ...Array.from(EXPECTED_INSERT_FIELDS.trial_class_attendance),
    'created_at',
    'updated_at',
    // 新增從 shared/schema.ts 發現的額外欄位
    'is_reviewed',
    'no_conversion_reason',
    'class_transcript',
  ],

  trial_class_purchase: [
    'id',
    ...Array.from(EXPECTED_INSERT_FIELDS.trial_class_purchase),
    'created_at',
    'updated_at',
    // 新增從 shared/schema.ts 發現的額外欄位
    'age',
    'occupation',
    'trial_classes_total',
    'remaining_classes',
    'current_status',
    'updated_date',
    'last_class_date',
  ],

  eods_for_closers: [
    'id',
    ...Array.from(EXPECTED_INSERT_FIELDS.eods_for_closers),
    'created_at',
    'updated_at',
    // 新增從 shared/schema.ts 發現的額外欄位
    'caller_name',
    'is_online',
    'lead_source',
    'consultation_result',
    'deal_package',
    'package_quantity',
    'payment_method',
    'installment_periods',
    'package_price',
    'actual_amount',
    'consultation_date',
    'form_submitted_at',
    'month',
    'year',
    'week_number',
  ],
} as const;

/**
 * 系統自動管理的欄位（不需要從 Google Sheets 映射）
 */
export const SYSTEM_MANAGED_COLUMNS = [
  'id',
  'created_at',
  'updated_at',
  'source_worksheet_id',
  'origin_row_index',
  'synced_at',
  'raw_data',
] as const;

/**
 * 舊有業務邏輯欄位（通常為空或由其他系統填入）
 */
export const LEGACY_BUSINESS_COLUMNS = [
  'teacher_id',
  'sales_id',
  'department_id',
  'closer_id',
  'setter_id',
  'report_date',
] as const;

/**
 * 取得指定表的所有 Supabase 欄位
 */
export function getSupabaseColumns(tableName: string): string[] {
  switch (tableName) {
    case 'trial_class_attendance':
      return Array.from(SUPABASE_COLUMNS.trial_class_attendance);
    case 'trial_class_purchase':
      return Array.from(SUPABASE_COLUMNS.trial_class_purchase);
    case 'eods_for_closers':
      return Array.from(SUPABASE_COLUMNS.eods_for_closers);
    default:
      throw new Error(`Unknown table: ${tableName}`);
  }
}

/**
 * 取得需要從 Google Sheets 映射的欄位（排除系統欄位與舊有欄位）
 */
export function getMappableColumns(tableName: string): string[] {
  const allColumns = getSupabaseColumns(tableName);
  const excludeColumns = new Set([
    ...SYSTEM_MANAGED_COLUMNS,
    ...LEGACY_BUSINESS_COLUMNS,
  ]);

  return allColumns.filter(col => !excludeColumns.has(col as any));
}

/**
 * 檢查欄位是否為系統管理欄位
 */
export function isSystemManagedColumn(columnName: string): boolean {
  return SYSTEM_MANAGED_COLUMNS.includes(columnName as any);
}

/**
 * 檢查欄位是否為舊有業務欄位
 */
export function isLegacyBusinessColumn(columnName: string): boolean {
  return LEGACY_BUSINESS_COLUMNS.includes(columnName as any);
}

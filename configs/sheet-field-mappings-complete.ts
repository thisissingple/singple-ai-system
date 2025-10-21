/**
 * Google Sheets 欄位對應設定 - 完整版
 *
 * 此檔案定義所有 Google Sheets 欄位到 Supabase 欄位的完整映射
 * 包含所有業務欄位，確保資料完整性
 *
 * 更新日期: 2025-10-04
 * 參考文件: docs/FIELD_MAPPING_COMPLETE.md
 */

import { getMappableColumns, isSystemManagedColumn, isLegacyBusinessColumn } from './supabase-columns';

export interface FieldMapping {
  googleSheetColumn: string;  // Google Sheets 中文欄位名
  supabaseColumn: string;      // Supabase 英文欄位名
  dataType: 'text' | 'number' | 'boolean' | 'date' | 'timestamp' | 'decimal' | 'integer';
  required?: boolean;          // 是否為必填欄位
  transform?: (value: any) => any;  // 可選的轉換函數
  description?: string;        // 欄位說明
  label?: string;              // 中文欄位說明，用於顯示缺失欄位提示
}

/**
 * Transform 函數庫
 */
export const Transforms = {
  /**
   * 將任何值轉換為 ISO date 字串 (YYYY-MM-DD)
   */
  toDate: (value: any): string | null => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  },

  /**
   * 將任何值轉換為 ISO timestamp 字串
   */
  toTimestamp: (value: any): string | null => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  },

  /**
   * 將任何值轉換為整數
   */
  toInteger: (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(String(value).replace(/,/g, ''), 10);
    return isNaN(num) ? null : num;
  },

  /**
   * 將任何值轉換為小數
   */
  toDecimal: (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(String(value).replace(/,/g, ''));
    return isNaN(num) ? null : num;
  },

  /**
   * 將任何值轉換為布林值
   */
  toBoolean: (value: any): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase().trim();
      return lower === 'true' || lower === 'yes' || lower === '是' || lower === '1' || lower === 'y';
    }
    if (typeof value === 'number') return value !== 0;
    return Boolean(value);
  },

  /**
   * 清理文字（移除前後空白）
   */
  cleanText: (value: any): string | null => {
    if (value === null || value === undefined) return null;
    const cleaned = String(value).trim();
    return cleaned === '' ? null : cleaned;
  },
};

/**
 * 體驗課上課記錄表 (trial_class_attendance)
 *
 * Google Sheets: 體驗課上課記錄
 * 用途: 追蹤學員體驗課上課情況、老師評價、轉換情況
 */
export const TRIAL_CLASS_ATTENDANCE_MAPPING: FieldMapping[] = [
  // === 必填欄位 ===
  {
    googleSheetColumn: '姓名',
    supabaseColumn: 'student_name',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '學生姓名',
    label: '學生姓名'
  },
  {
    googleSheetColumn: 'email',
    supabaseColumn: 'student_email',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '學生 Email（跨表 JOIN 鍵）',
    label: '學生 Email'
  },
  {
    googleSheetColumn: '上課日期',
    supabaseColumn: 'class_date',
    dataType: 'date',
    required: true,
    transform: Transforms.toDate,
    description: '體驗課上課日期',
    label: '上課日期'
  },
  {
    googleSheetColumn: '授課老師',
    supabaseColumn: 'teacher_name',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '授課老師姓名',
    label: '授課老師'
  },

  // === 業務欄位 ===
  {
    googleSheetColumn: '是否已確認',
    supabaseColumn: 'is_reviewed',
    dataType: 'boolean',
    transform: Transforms.toBoolean,
    description: '是否已完成課後確認',
    label: '是否已確認'
  },
  {
    googleSheetColumn: '未聯繫原因',
    supabaseColumn: 'no_conversion_reason',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '未聯繫到學生的原因',
    label: '未聯繫原因'
  },
  {
    googleSheetColumn: '體驗課文字檔',
    supabaseColumn: 'class_transcript',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '體驗課文字檔記錄',
    label: '體驗課文字檔'
  },
];

/**
 * 體驗課購買記錄表 (trial_class_purchase)
 *
 * Google Sheets: 體驗課購買記錄
 * 用途: 追蹤學員購買方案、付款資訊、課程進度
 */
export const TRIAL_CLASS_PURCHASE_MAPPING: FieldMapping[] = [
  // === 必填欄位 ===
  {
    googleSheetColumn: '姓名',
    supabaseColumn: 'student_name',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '學生姓名',
    label: '學生姓名'
  },
  {
    googleSheetColumn: 'email',
    supabaseColumn: 'student_email',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '學生 Email（跨表 JOIN 鍵）',
    label: '學生 Email'
  },
  {
    googleSheetColumn: '課程類型',
    supabaseColumn: 'package_name',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '購買的課程類型/方案名稱',
    label: '課程類型'
  },
  {
    googleSheetColumn: '購買日期',
    supabaseColumn: 'purchase_date',
    dataType: 'date',
    required: true,
    transform: Transforms.toDate,
    description: '購買日期',
    label: '購買日期'
  },

  // === 業務欄位 ===
  {
    googleSheetColumn: '價格',
    supabaseColumn: 'package_price',
    dataType: 'integer',
    transform: Transforms.toInteger,
    description: '方案價格（新台幣）',
    label: '價格'
  },
];

/**
 * EODs for Closers (eods_for_closers)
 *
 * Google Sheets: EODs for Closers
 * 用途: 追蹤諮詢師業績、電訪轉換、成交資訊
 */
export const EODS_FOR_CLOSERS_MAPPING: FieldMapping[] = [
  // === 必填欄位 ===
  {
    googleSheetColumn: 'Name',
    supabaseColumn: 'student_name',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '學生姓名',
    label: '學生姓名'
  },
  {
    googleSheetColumn: 'Email',
    supabaseColumn: 'student_email',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '學生 Email（跨表 JOIN 鍵）',
    label: '學生 Email'
  },
  {
    googleSheetColumn: '（諮詢）諮詢人員',
    supabaseColumn: 'closer_name',
    dataType: 'text',
    required: true,
    transform: Transforms.cleanText,
    description: '諮詢師姓名（closer）',
    label: '諮詢人員'
  },

  // === 日期欄位 ===
  {
    googleSheetColumn: '（諮詢）成交日期',
    supabaseColumn: 'deal_date',
    dataType: 'date',
    transform: Transforms.toDate,
    description: '成交日期',
    label: '成交日期'
  },
  {
    googleSheetColumn: '（諮詢）諮詢日期',
    supabaseColumn: 'consultation_date',
    dataType: 'date',
    transform: Transforms.toDate,
    description: '諮詢日期',
    label: '諮詢日期'
  },
  {
    googleSheetColumn: '提交表單時間',
    supabaseColumn: 'form_submitted_at',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: 'Google Form 提交時間（如：2025/9/23 15:27）',
    label: '表單提交時間'
  },

  // === 業務欄位 ===
  {
    googleSheetColumn: '（諮詢）備註',
    supabaseColumn: 'notes',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '備註說明',
    label: '備註'
  },
  {
    googleSheetColumn: '（諮詢）電話負責人',
    supabaseColumn: 'caller_name',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '電訪人員姓名',
    label: '電話負責人'
  },
  {
    googleSheetColumn: '（諮詢）是否上線',
    supabaseColumn: 'is_online',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '是否已上線（已上線/未上線）',
    label: '是否上線'
  },
  {
    googleSheetColumn: '（諮詢）名單來源',
    supabaseColumn: 'lead_source',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '潛在客戶來源',
    label: '名單來源'
  },
  {
    googleSheetColumn: '（諮詢）諮詢結果',
    supabaseColumn: 'consultation_result',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '諮詢結果（已成交/未成交/待追蹤等）',
    label: '諮詢結果'
  },
  {
    googleSheetColumn: '（諮詢）成交方案',
    supabaseColumn: 'deal_package',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '成交的方案名稱',
    label: '成交方案'
  },
  {
    googleSheetColumn: '（諮詢）方案數量',
    supabaseColumn: 'package_quantity',
    dataType: 'integer',
    transform: Transforms.toInteger,
    description: '購買方案數量',
    label: '方案數量'
  },
  {
    googleSheetColumn: '（諮詢）付款方式',
    supabaseColumn: 'payment_method',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '付款方式（信用卡/匯款等）',
    label: '付款方式'
  },
  {
    googleSheetColumn: '（諮詢）分期期數',
    supabaseColumn: 'installment_periods',
    dataType: 'integer',
    transform: Transforms.toInteger,
    description: '分期期數',
    label: '分期期數'
  },
  {
    googleSheetColumn: '（諮詢）方案價格',
    supabaseColumn: 'package_price',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '方案原價（含貨幣符號，如 $4,000.00）',
    label: '方案價格'
  },
  {
    googleSheetColumn: '（諮詢）實收金額',
    supabaseColumn: 'actual_amount',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '實際成交金額（含貨幣符號，如 $4,000.00）',
    label: '實收金額'
  },

  // === 統計維度欄位 ===
  {
    googleSheetColumn: '月份',
    supabaseColumn: 'month',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '成交月份（如：9月）',
    label: '月份'
  },
  {
    googleSheetColumn: '年份',
    supabaseColumn: 'year',
    dataType: 'integer',
    transform: Transforms.toInteger,
    description: '成交年份 (YYYY)',
    label: '年份'
  },
  {
    googleSheetColumn: '週別',
    supabaseColumn: 'week_number',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '成交週別（如：第39週）',
    label: '週別'
  },
];

/**
 * 根據 Supabase 表名取得對應的欄位映射
 */
export function getFieldMapping(supabaseTable: string): FieldMapping[] {
  switch (supabaseTable) {
    case 'trial_class_attendance':
      return TRIAL_CLASS_ATTENDANCE_MAPPING;
    case 'trial_class_purchase':
      return TRIAL_CLASS_PURCHASE_MAPPING;
    case 'eods_for_closers':
      return EODS_FOR_CLOSERS_MAPPING;
    default:
      throw new Error(`Unknown Supabase table: ${supabaseTable}`);
  }
}

/**
 * 取得表的必填欄位列表
 */
export function getRequiredFields(supabaseTable: string): string[] {
  const mapping = getFieldMapping(supabaseTable);
  return mapping
    .filter(field => field.required)
    .map(field => field.supabaseColumn);
}

/**
 * 驗證必填欄位是否都有值
 */
export function validateRequiredFields(
  data: Record<string, any>,
  supabaseTable: string
): { isValid: boolean; missingFields: string[] } {
  const requiredFields = getRequiredFields(supabaseTable);
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === null || value === undefined || value === '';
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * 將 Google Sheets 的一列資料轉換為 Supabase 格式
 *
 * 重要：所有 Google Sheets 欄位都會被儲存到 raw_data JSONB 欄位
 * 這樣未來新增欄位時不需要更新 Schema！
 */
export function transformRowData(
  rowData: Record<string, any>,
  supabaseTable: string
): Record<string, any> {
  const mapping = getFieldMapping(supabaseTable);
  const transformed: Record<string, any> = {};

  // 🔑 把所有 Google Sheets 原始資料都存入 raw_data（不只是 mapping 中的欄位）
  transformed.raw_data = { ...rowData };

  // 遍歷對應表，轉換已知欄位到對應的 Supabase 欄位
  for (const field of mapping) {
    const googleValue = rowData[field.googleSheetColumn];

    // 轉換並儲存到對應的 Supabase 欄位（用於快速查詢和 JOIN）
    if (googleValue !== undefined && googleValue !== null && googleValue !== '') {
      transformed[field.supabaseColumn] = field.transform
        ? field.transform(googleValue)
        : googleValue;
    } else {
      // 即使沒有值，也要設為 null（確保批次插入時欄位一致）
      transformed[field.supabaseColumn] = null;
    }
  }

  return transformed;
}

/**
 * 批次轉換多列資料
 */
export function transformBatchData(
  rows: Record<string, any>[],
  supabaseTable: string
): Record<string, any>[] {
  return rows.map(row => transformRowData(row, supabaseTable));
}

/**
 * 取得所有 Supabase 欄位名稱（包含系統欄位）
 */
export function getAllSupabaseColumns(supabaseTable: string): string[] {
  const mapping = getFieldMapping(supabaseTable);
  const mappedColumns = mapping.map(field => field.supabaseColumn);

  // 系統欄位（所有表都有）
  const systemColumns = [
    'id',
    'raw_data',
    'source_worksheet_id',
    'origin_row_index',
    'synced_at',
    'created_at',
    'updated_at',
  ];

  // 表特定的系統欄位
  const tableSpecificColumns: Record<string, string[]> = {
    trial_class_attendance: ['teacher_id', 'sales_id', 'department_id'],
    trial_class_purchase: ['teacher_id', 'sales_id', 'department_id'],
    eods_for_closers: ['closer_id', 'setter_id', 'department_id', 'report_date'],
  };

  return [
    ...systemColumns,
    ...mappedColumns,
    ...(tableSpecificColumns[supabaseTable] || []),
  ];
}

/**
 * 缺失欄位資訊
 */
export interface MissingFieldInfo {
  supabaseColumn: string;
  googleSheetColumn: string;
  label: string;
  required: boolean;
}

/**
 * 檢測缺失的欄位映射
 *
 * 比對 Sheet headers 與設定的欄位映射，找出無法映射的欄位
 *
 * @param sheetHeaders - Google Sheets 的實際表頭
 * @param supabaseTable - Supabase 表名
 * @returns 缺失的欄位資訊陣列
 */
export function detectMissingMappings(
  sheetHeaders: string[],
  supabaseTable: string
): MissingFieldInfo[] {
  const mapping = getFieldMapping(supabaseTable);
  const missingMappings: MissingFieldInfo[] = [];

  // 標準化 headers（去除空白）
  const normalizedHeaders = sheetHeaders.map(h => h.trim());

  for (const field of mapping) {
    // 檢查 Google Sheets 欄位是否存在
    const headerExists = normalizedHeaders.includes(field.googleSheetColumn);

    if (!headerExists) {
      missingMappings.push({
        supabaseColumn: field.supabaseColumn,
        googleSheetColumn: field.googleSheetColumn,
        label: field.label || field.description || field.supabaseColumn,
        required: field.required || false,
      });
    }
  }

  return missingMappings;
}

/**
 * 未映射的 Supabase 欄位資訊
 */
export interface UnmappedSupabaseColumnInfo {
  supabaseColumn: string;    // Supabase 欄位名
  dataType: string;           // 資料型別
  isSystemManaged: boolean;   // 是否為系統管理欄位
  isLegacyBusiness: boolean;  // 是否為舊有業務欄位
}

/**
 * 檢測未映射的 Supabase 欄位
 *
 * 找出「Supabase 有欄位，但 mapping 裡沒有」的項目
 *
 * @param supabaseTable - Supabase 表名
 * @returns 未映射的 Supabase 欄位資訊
 */
export function detectUnmappedSupabaseColumns(
  supabaseTable: string
): UnmappedSupabaseColumnInfo[] {
  const mapping = getFieldMapping(supabaseTable);
  const mappedSupabaseColumns = new Set(mapping.map(f => f.supabaseColumn));

  const allSupabaseColumns = getMappableColumns(supabaseTable);
  const unmappedColumns: UnmappedSupabaseColumnInfo[] = [];

  for (const column of allSupabaseColumns) {
    if (!mappedSupabaseColumns.has(column)) {
      unmappedColumns.push({
        supabaseColumn: column,
        dataType: 'unknown', // 可以從 schema 取得，但這裡簡化處理
        isSystemManaged: isSystemManagedColumn(column),
        isLegacyBusiness: isLegacyBusinessColumn(column),
      });
    }
  }

  return unmappedColumns;
}

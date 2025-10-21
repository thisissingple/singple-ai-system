/**
 * Google Sheets 欄位對應設定 - 精簡版
 *
 * 目標：穩定同步三張表到 Supabase
 * 原則：只映射必要欄位，其餘存入 raw_data
 */

export interface FieldMapping {
  googleSheetColumn: string;
  supabaseColumn: string;
  dataType: 'text' | 'number' | 'boolean' | 'date' | 'timestamp';
  required?: boolean;
  transform?: (value: any) => any;
  label?: string; // 中文欄位說明，用於顯示缺失欄位提示
}

// ============================================
// Transform 函數
// ============================================

const toDate = (value: any): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
};

const toTimestamp = (value: any): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

const toInteger = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const num = parseInt(String(value).replace(/,/g, ''), 10);
  return isNaN(num) ? null : num;
};

const toBoolean = (value: any): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '是' || lower === '1' || lower === 'y';
  }
  return Boolean(value);
};

const cleanText = (value: any): string | null => {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).trim();
  return cleaned === '' ? null : cleaned;
};

// ============================================
// 1. trial_class_attendance (體驗課上課記錄)
// ============================================

export const TRIAL_CLASS_ATTENDANCE_MAPPING: FieldMapping[] = [
  // 必填欄位
  { googleSheetColumn: '姓名', supabaseColumn: 'student_name', dataType: 'text', required: true, transform: cleanText, label: '學生姓名' },
  { googleSheetColumn: 'email', supabaseColumn: 'student_email', dataType: 'text', required: true, transform: cleanText, label: '學生 Email' },
  { googleSheetColumn: '上課日期', supabaseColumn: 'class_date', dataType: 'date', required: true, transform: toDate, label: '上課日期' },
  { googleSheetColumn: '授課老師', supabaseColumn: 'teacher_name', dataType: 'text', required: true, transform: cleanText, label: '授課老師' },

  // 業務欄位（選填）
  { googleSheetColumn: '是否已審核', supabaseColumn: 'is_reviewed', dataType: 'boolean', transform: toBoolean, label: '是否已審核' },
  { googleSheetColumn: '未轉換原因', supabaseColumn: 'no_conversion_reason', dataType: 'text', transform: cleanText, label: '未轉換原因' },
  { googleSheetColumn: '備註', supabaseColumn: 'notes', dataType: 'text', transform: cleanText, label: '備註' },
];

// ============================================
// 2. trial_class_purchase (體驗課購買記錄)
// ============================================

export const TRIAL_CLASS_PURCHASE_MAPPING: FieldMapping[] = [
  // 必填欄位
  { googleSheetColumn: '姓名', supabaseColumn: 'student_name', dataType: 'text', required: true, transform: cleanText, label: '學生姓名' },
  { googleSheetColumn: 'email', supabaseColumn: 'student_email', dataType: 'text', required: true, transform: cleanText, label: '學生 Email' },
  { googleSheetColumn: '方案名稱', supabaseColumn: 'package_name', dataType: 'text', required: true, transform: cleanText, label: '方案名稱' },
  { googleSheetColumn: '體驗課購買日期', supabaseColumn: 'purchase_date', dataType: 'date', required: true, transform: toDate, label: '體驗課購買日期' },

  // 業務欄位（選填）
  { googleSheetColumn: '方案價格', supabaseColumn: 'package_price', dataType: 'number', transform: toInteger, label: '方案價格' },
  { googleSheetColumn: '備註', supabaseColumn: 'notes', dataType: 'text', transform: cleanText, label: '備註' },
  { googleSheetColumn: '年齡', supabaseColumn: 'age', dataType: 'number', transform: toInteger, label: '年齡' },
  { googleSheetColumn: '職業', supabaseColumn: 'occupation', dataType: 'text', transform: cleanText, label: '職業' },
];

// ============================================
// 3. eods_for_closers (咨詢師業績記錄)
// ============================================

export const EODS_FOR_CLOSERS_MAPPING: FieldMapping[] = [
  // 必填欄位
  { googleSheetColumn: 'Name', supabaseColumn: 'student_name', dataType: 'text', required: true, transform: cleanText, label: '學生姓名' },
  { googleSheetColumn: 'Email', supabaseColumn: 'student_email', dataType: 'text', required: true, transform: cleanText, label: '學生 Email' },
  { googleSheetColumn: '（諮詢）諮詢人員', supabaseColumn: 'closer_name', dataType: 'text', required: true, transform: cleanText, label: '諮詢人員' },

  // 業務欄位（選填）
  { googleSheetColumn: '（諮詢）成交日期', supabaseColumn: 'deal_date', dataType: 'date', transform: toDate, label: '成交日期' },
  { googleSheetColumn: '諮詢日期', supabaseColumn: 'consultation_date', dataType: 'date', transform: toDate, label: '諮詢日期' },
  { googleSheetColumn: '（諮詢）備註', supabaseColumn: 'notes', dataType: 'text', transform: cleanText, label: '備註' },
  { googleSheetColumn: '電訪人員', supabaseColumn: 'caller_name', dataType: 'text', transform: cleanText, label: '電訪人員' },
  { googleSheetColumn: '是否線上', supabaseColumn: 'is_online', dataType: 'boolean', transform: toBoolean, label: '是否線上' },
  { googleSheetColumn: '咨詢結果', supabaseColumn: 'consultation_result', dataType: 'text', transform: cleanText, label: '咨詢結果' },
  { googleSheetColumn: '實際金額', supabaseColumn: 'actual_amount', dataType: 'number', transform: toInteger, label: '實際金額' },
  { googleSheetColumn: '方案價格', supabaseColumn: 'package_price', dataType: 'number', transform: toInteger, label: '方案價格' },
];

// ============================================
// 輔助函數
// ============================================

export function getFieldMapping(supabaseTable: string): FieldMapping[] {
  switch (supabaseTable) {
    case 'trial_class_attendance':
      return TRIAL_CLASS_ATTENDANCE_MAPPING;
    case 'trial_class_purchase':
      return TRIAL_CLASS_PURCHASE_MAPPING;
    case 'eods_for_closers':
      return EODS_FOR_CLOSERS_MAPPING;
    default:
      throw new Error(`Unknown table: ${supabaseTable}`);
  }
}

export function getRequiredFields(supabaseTable: string): string[] {
  return getFieldMapping(supabaseTable)
    .filter(f => f.required)
    .map(f => f.supabaseColumn);
}

/**
 * 轉換 Google Sheets 資料為 Supabase 格式
 *
 * 重要：所有原始欄位都會保存在 raw_data
 */
export function transformRowData(
  rowData: Record<string, any>,
  supabaseTable: string
): Record<string, any> {
  const mapping = getFieldMapping(supabaseTable);
  const transformed: Record<string, any> = {};

  // 1. 保存所有原始資料到 raw_data
  transformed.raw_data = { ...rowData };

  // 2. 映射已知欄位
  for (const field of mapping) {
    const googleValue = rowData[field.googleSheetColumn];

    if (googleValue !== undefined && googleValue !== null && googleValue !== '') {
      transformed[field.supabaseColumn] = field.transform
        ? field.transform(googleValue)
        : googleValue;
    } else {
      transformed[field.supabaseColumn] = null;
    }
  }

  return transformed;
}

/**
 * 驗證必填欄位
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
        label: field.label || field.supabaseColumn,
        required: field.required || false,
      });
    }
  }

  return missingMappings;
}

/**
 * Field Mapping Configuration V2
 * Enhanced mapping with utility functions
 */

export const FIELD_ALIASES: Record<string, string[]> = {
  studentName: ['studentName', '姓名', '學生姓名', 'name', 'student', '學員姓名', 'Name'],
  studentEmail: ['studentEmail', '學員信箱', 'email', 'mail', '信箱', 'student_email', 'Email'],
  teacher: ['teacher', '教師', '老師', 'teacherName', '教師姓名', 'instructor'],
  closer: ['closer', '諮詢人員', '（諮詢）諮詢人員', 'consultant'],
  setter: ['setter', '電話負責人', '（諮詢）電話負責人', 'caller'],
  classDate: ['classDate', '上課日期', 'date', '日期', 'class_date', 'trialDate', '體驗日期', '（諮詢）諮詢日期'],
  purchaseDate: ['purchaseDate', '購買日期', 'buyDate', '成交日期', 'purchase_date', '體驗課購買日期'],
  dealDate: ['dealDate', '成交日期', 'closedDate', 'deal_date', 'closed_at', '（諮詢）成交日期'],
  courseType: ['courseType', '課程類型', 'course', '類型', 'plan', '方案', 'subject', '方案名稱', '（諮詢）成交方案'],
  dealAmount: ['dealAmount', '成交金額', 'amount', '金額', 'price', 'revenue', '收入', '（諮詢）實收金額', '（諮詢）方案價格'],
  attended: ['attended', '出席', 'present', '是否出席', 'attendance'],
  status: ['status', '狀態', 'state', 'stage', '階段', '目前狀態（自動計算）', '（諮詢）諮詢結果'],
  intentScore: ['intentScore', '意向分數', 'intent', '意願分數', 'score'],
  satisfaction: ['satisfaction', '滿意度', 'rating', '評分'],
};

/**
 * Resolve field value using aliases
 */
export function resolveField(row: Record<string, any>, standardKey: string): any {
  const aliases = FIELD_ALIASES[standardKey];
  if (!aliases) return undefined;

  for (const alias of aliases) {
    const value = row[alias];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

/**
 * Parse date field
 */
export function parseDateField(value: any): Date | null {
  if (!value) return null;

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch {
    return null;
  }
}

/**
 * Parse number field
 * Supports: 86000, "86000", "NT$86,000", "NT$ 86,000", "$86,000" etc.
 */
export function parseNumberField(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;

  // If already a number
  if (typeof value === 'number') {
    return isNaN(value) ? null : value;
  }

  // Convert to string and clean
  const str = String(value)
    .replace(/NT\$/gi, '')  // Remove NT$
    .replace(/\$/g, '')     // Remove $
    .replace(/,/g, '')      // Remove commas
    .replace(/\s/g, '')     // Remove spaces
    .trim();

  if (str === '') return null;

  const num = Number(str);
  return isNaN(num) ? null : num;
}

/**
 * Get all available fields from data
 */
export function getAvailableFields(data: Record<string, any>[]): string[] {
  const fieldsSet = new Set<string>();

  data.forEach(row => {
    Object.keys(row).forEach(key => fieldsSet.add(key));
  });

  return Array.from(fieldsSet).sort();
}

/**
 * Extract standard fields from row
 */
export function extractStandardFields(rawData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [standardKey] of Object.entries(FIELD_ALIASES)) {
    const value = resolveField(rawData, standardKey);
    if (value !== undefined) {
      result[standardKey] = value;
    }
  }

  return result;
}

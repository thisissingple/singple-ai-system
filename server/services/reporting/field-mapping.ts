/**
 * Field Mapping Configuration
 * Maps common field names to standardized keys
 */

export interface FieldMapping {
  standardKey: string;
  possibleNames: string[];
  type: 'string' | 'number' | 'date' | 'boolean';
}

export const FIELD_MAPPINGS: Record<string, FieldMapping> = {
  // Student fields
  studentName: {
    standardKey: 'studentName',
    possibleNames: ['studentName', '學生姓名', '姓名', 'name', 'student', '學員姓名'],
    type: 'string',
  },
  studentEmail: {
    standardKey: 'studentEmail',
    possibleNames: ['studentEmail', '學員信箱', 'email', 'mail', '信箱', 'student_email'],
    type: 'string',
  },

  // Teacher fields
  teacher: {
    standardKey: 'teacher',
    possibleNames: ['teacher', '教師', '老師', 'teacherName', '教師姓名', 'instructor'],
    type: 'string',
  },

  // Date fields
  classDate: {
    standardKey: 'classDate',
    possibleNames: ['classDate', '上課日期', 'date', '日期', 'class_date', 'trialDate'],
    type: 'date',
  },
  purchaseDate: {
    standardKey: 'purchaseDate',
    possibleNames: ['purchaseDate', '購買日期', 'buyDate', '成交日期', 'purchase_date'],
    type: 'date',
  },
  dealDate: {
    standardKey: 'dealDate',
    possibleNames: ['dealDate', '成交日期', 'closedDate', 'deal_date', 'closed_at'],
    type: 'date',
  },

  // Course fields
  courseType: {
    standardKey: 'courseType',
    possibleNames: ['courseType', '課程類型', 'course', '類型', 'plan', '方案', 'subject'],
    type: 'string',
  },

  // Financial fields
  dealAmount: {
    standardKey: 'dealAmount',
    possibleNames: ['dealAmount', '成交金額', 'amount', '金額', 'price', 'revenue', '收入'],
    type: 'number',
  },

  // Status fields
  attended: {
    standardKey: 'attended',
    possibleNames: ['attended', '出席', 'present', '是否出席', 'attendance'],
    type: 'boolean',
  },
  status: {
    standardKey: 'status',
    possibleNames: ['status', '狀態', 'state', 'stage', '階段'],
    type: 'string',
  },
};

/**
 * Find matching field name in data
 */
export function findField(data: Record<string, any>, standardKey: string): any {
  const mapping = FIELD_MAPPINGS[standardKey];
  if (!mapping) return undefined;

  for (const possibleName of mapping.possibleNames) {
    const value = data[possibleName];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

/**
 * Extract standardized data from raw row
 */
export function extractStandardFields(rawData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [standardKey] of Object.entries(FIELD_MAPPINGS)) {
    const value = findField(rawData, standardKey);
    if (value !== undefined) {
      result[standardKey] = value;
    }
  }

  return result;
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

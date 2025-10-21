/**
 * ETL Transform Module
 *
 * 負責將 Google Sheets 資料轉換為 Supabase 格式
 */

import {
  transformRowData,
  validateRequiredFields,
  getFieldMapping,
} from '../../../configs/sheet-field-mappings-complete';
import type { Worksheet } from '../../../shared/schema';
import type { ExtractedData } from './extract';

export interface TransformedRecord {
  data: Record<string, any>;
  originRowIndex: number;
  isValid: boolean;
  validationErrors: string[];
}

export interface TransformResult {
  worksheet: Worksheet;
  tableName: string;
  records: TransformedRecord[];
  validCount: number;
  invalidCount: number;
  transformedAt: Date;
}

export interface TransformOptions {
  requireStudentEmail?: boolean;
  addTrackingFields?: boolean;
  addSystemFields?: boolean;
}

/**
 * 系統欄位列表（每個表都有）
 */
const SYSTEM_FIELDS: Record<string, Record<string, any>> = {
  trial_class_attendance: {
    teacher_id: null,
    sales_id: null,
    department_id: null,
  },
  trial_class_purchase: {
    teacher_id: null,
    sales_id: null,
    department_id: null,
  },
  eods_for_closers: {
    closer_id: null,
    setter_id: null,
    department_id: null,
    report_date: null,
  },
};

/**
 * 轉換抽取的資料為 Supabase 格式
 */
export function transformData(
  extractedData: ExtractedData,
  options: TransformOptions = {}
): TransformResult {
  const {
    requireStudentEmail = true,
    addTrackingFields = true,
    addSystemFields = true,
  } = options;

  const { worksheet, rows } = extractedData;
  const tableName = worksheet.supabaseTable!;

  // 驗證 field mapping 是否存在
  try {
    getFieldMapping(tableName);
  } catch (error) {
    throw new Error(`No field mapping found for table: ${tableName}`);
  }

  const transformedRecords: TransformedRecord[] = [];
  let validCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowData = rows[i];
    const record: TransformedRecord = {
      data: {},
      originRowIndex: i,
      isValid: true,
      validationErrors: [],
    };

    try {
      // 使用 field mapping 轉換資料
      const transformed = transformRowData(rowData, tableName);

      // 加入追蹤欄位
      if (addTrackingFields) {
        transformed.source_worksheet_id = worksheet.id;
        transformed.origin_row_index = i;
        transformed.synced_at = new Date().toISOString();
      }

      // 補充系統欄位
      if (addSystemFields) {
        const systemFields = SYSTEM_FIELDS[tableName] || {};
        Object.entries(systemFields).forEach(([key, defaultValue]) => {
          if (transformed[key] === undefined) {
            transformed[key] = defaultValue;
          }
        });
      }

      // 驗證必填欄位
      const validation = validateRequiredFields(transformed, tableName);

      if (!validation.isValid) {
        record.isValid = false;
        record.validationErrors.push(
          `Missing required fields: ${validation.missingFields.join(', ')}`
        );
      }

      // 額外驗證：student_email
      if (requireStudentEmail) {
        if (!transformed.student_email || transformed.student_email.trim() === '') {
          record.isValid = false;
          record.validationErrors.push('Missing student_email (required for cross-table JOIN)');
        }
      }

      record.data = transformed;

      if (record.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
    } catch (error) {
      record.isValid = false;
      record.validationErrors.push(
        `Transform error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      invalidCount++;
    }

    transformedRecords.push(record);
  }

  return {
    worksheet,
    tableName,
    records: transformedRecords,
    validCount,
    invalidCount,
    transformedAt: new Date(),
  };
}

/**
 * 過濾出有效的記錄
 */
export function getValidRecords(transformResult: TransformResult): Record<string, any>[] {
  return transformResult.records
    .filter(record => record.isValid)
    .map(record => record.data);
}

/**
 * 取得無效記錄的詳細資訊（用於錯誤報告）
 */
export function getInvalidRecords(transformResult: TransformResult): {
  rowIndex: number;
  errors: string[];
  data: Record<string, any>;
}[] {
  return transformResult.records
    .filter(record => !record.isValid)
    .map(record => ({
      rowIndex: record.originRowIndex,
      errors: record.validationErrors,
      data: record.data,
    }));
}

/**
 * 標準化記錄（確保所有記錄有相同的欄位）
 *
 * PostgREST 批次插入要求所有物件有相同的 keys
 */
export function standardizeRecords(records: Record<string, any>[]): Record<string, any>[] {
  if (records.length === 0) {
    return [];
  }

  // 收集所有欄位
  const allKeys = new Set<string>();
  records.forEach(record => {
    Object.keys(record).forEach(key => allKeys.add(key));
  });

  // 標準化每個記錄
  return records.map(record => {
    const standardized: Record<string, any> = {};
    allKeys.forEach(key => {
      standardized[key] = record[key] !== undefined ? record[key] : null;
    });
    return standardized;
  });
}

/**
 * 生成轉換摘要報告
 */
export function generateTransformSummary(transformResult: TransformResult): string {
  const { tableName, validCount, invalidCount } = transformResult;
  const invalidRecords = getInvalidRecords(transformResult);

  let summary = `📊 Transform Summary for ${tableName}\n`;
  summary += `✅ Valid records: ${validCount}\n`;
  summary += `❌ Invalid records: ${invalidCount}\n`;

  if (invalidRecords.length > 0) {
    summary += `\n⚠️  Invalid Records Details:\n`;
    invalidRecords.slice(0, 5).forEach(({ rowIndex, errors }) => {
      summary += `  Row ${rowIndex}: ${errors.join(', ')}\n`;
    });

    if (invalidRecords.length > 5) {
      summary += `  ... and ${invalidRecords.length - 5} more invalid records\n`;
    }
  }

  return summary;
}

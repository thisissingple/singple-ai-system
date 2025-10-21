/**
 * ETL Extract Module
 *
 * 負責從 Google Sheets 抽取資料
 */

import type { Worksheet } from '../../../shared/schema';
import {
  detectMissingMappings,
  detectUnmappedSupabaseColumns,
  type MissingFieldInfo,
  type UnmappedSupabaseColumnInfo,
} from '../../../configs/sheet-field-mappings-complete';

export interface ExtractedData {
  worksheet: Worksheet;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  extractedAt: Date;
  missingMappings?: MissingFieldInfo[]; // 缺失的欄位映射（Sheet 缺欄位）
  unmappedSupabaseColumns?: UnmappedSupabaseColumnInfo[]; // 未映射的 Supabase 欄位
}

export interface ExtractOptions {
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  detectMissingFields?: boolean; // 是否檢測缺失欄位（Sheet 缺欄位）
  detectUnmappedColumns?: boolean; // 是否檢測未映射的 Supabase 欄位
}

/**
 * 從 Google Sheets 抽取資料
 *
 * @param worksheet 工作表資訊
 * @param headers 欄位標題
 * @param dataRows 資料列（二維陣列）
 * @param options 抽取選項
 * @returns 結構化的抽取結果
 */
export function extractFromSheets(
  worksheet: Worksheet,
  headers: string[],
  dataRows: any[][],
  options: ExtractOptions = {}
): ExtractedData {
  const { skipEmptyRows = true, trimValues = true, detectMissingFields = true, detectUnmappedColumns = true } = options;

  const rows: Record<string, any>[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowData: Record<string, any> = {};
    let hasAnyValue = false;

    // 建立 header → value 的對應
    headers.forEach((header, index) => {
      let value = row[index];

      // 清理值
      if (value !== undefined && value !== null) {
        if (trimValues && typeof value === 'string') {
          value = value.trim();
        }
        if (value !== '') {
          hasAnyValue = true;
        }
      }

      rowData[header] = value === undefined ? '' : value;
    });

    // 跳過空列
    if (skipEmptyRows && !hasAnyValue) {
      continue;
    }

    rows.push(rowData);
  }

  const result: ExtractedData = {
    worksheet,
    headers,
    rows,
    totalRows: rows.length,
    extractedAt: new Date(),
  };

  // 檢測缺失的欄位映射（Sheet 缺欄位）
  if (detectMissingFields && worksheet.supabaseTable) {
    try {
      const missingMappings = detectMissingMappings(headers, worksheet.supabaseTable);
      if (missingMappings.length > 0) {
        result.missingMappings = missingMappings;
      }
    } catch (error) {
      // 如果表格不支援，則忽略
      console.warn(`Failed to detect missing mappings for ${worksheet.supabaseTable}:`, error);
    }
  }

  // 檢測未映射的 Supabase 欄位
  if (detectUnmappedColumns && worksheet.supabaseTable) {
    try {
      const unmappedColumns = detectUnmappedSupabaseColumns(worksheet.supabaseTable);
      if (unmappedColumns.length > 0) {
        result.unmappedSupabaseColumns = unmappedColumns;
      }
    } catch (error) {
      console.warn(`Failed to detect unmapped Supabase columns for ${worksheet.supabaseTable}:`, error);
    }
  }

  return result;
}

/**
 * 驗證抽取的資料格式
 */
export function validateExtractedData(data: ExtractedData): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.worksheet || !data.worksheet.id) {
    errors.push('Invalid worksheet: missing id');
  }

  if (!data.headers || data.headers.length === 0) {
    errors.push('No headers found in extracted data');
  }

  if (!data.rows) {
    errors.push('No rows array in extracted data');
  }

  if (data.totalRows < 0) {
    errors.push('Invalid totalRows count');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

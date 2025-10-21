/**
 * Dynamic Transform Service
 * 動態欄位轉換服務
 *
 * 使用儲存在資料庫的欄位對應設定來轉換資料
 */

import { getSupabaseClient } from '../supabase-client';

// 欄位對應介面
interface FieldMapping {
  id: string;
  worksheet_id: string;
  google_column: string;
  supabase_column: string;
  data_type: string;
  transform_function: string | null;
  is_required: boolean;
  ai_confidence: number;
  is_active: boolean;
}

// 轉換函數集合
const Transforms = {
  cleanText: (value: any): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  },

  toDate: (value: any): string | null => {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0]; // YYYY-MM-DD
    } catch {
      return null;
    }
  },

  toTimestamp: (value: any): string | null => {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch {
      return null;
    }
  },

  toInteger: (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseInt(String(value).replace(/[^0-9-]/g, ''), 10);
    return isNaN(num) ? null : num;
  },

  toDecimal: (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  },

  toBoolean: (value: any): boolean | null => {
    if (value === null || value === undefined || value === '') return null;
    const str = String(value).toLowerCase().trim();
    if (['true', 'yes', '是', '1', 'y'].includes(str)) return true;
    if (['false', 'no', '否', '0', 'n'].includes(str)) return false;
    return null;
  }
};

// 對應快取
const mappingCache = new Map<string, FieldMapping[]>();
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

/**
 * 取得工作表的欄位對應設定
 */
export async function getFieldMappings(worksheetId: string): Promise<FieldMapping[]> {
  // 檢查快取
  const cached = mappingCache.get(worksheetId);
  if (cached) {
    return cached;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase not available');
  }

  const { data, error } = await supabase
    .from('field_mappings')
    .select('*')
    .eq('worksheet_id', worksheetId)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to fetch field mappings: ${error.message}`);
  }

  const mappings = data as FieldMapping[];

  // 快取結果
  mappingCache.set(worksheetId, mappings);
  setTimeout(() => mappingCache.delete(worksheetId), CACHE_TTL);

  return mappings;
}

/**
 * 使用動態對應轉換資料
 */
export async function transformWithDynamicMapping(
  worksheetId: string,
  googleData: Record<string, any>[]
): Promise<Record<string, any>[]> {
  try {
    // 取得欄位對應
    const mappings = await getFieldMappings(worksheetId);

    if (mappings.length === 0) {
      console.warn(`No field mappings found for worksheet ${worksheetId}, using original data`);
      return googleData;
    }

    // 建立對應表
    const mappingMap = new Map<string, FieldMapping>();
    mappings.forEach(m => mappingMap.set(m.google_column, m));

    console.log(`✓ Loaded ${mappings.length} field mappings for worksheet ${worksheetId}`);

    // 轉換每一筆資料
    const transformed = googleData.map((row, index) => {
      const transformedRow: Record<string, any> = {
        // 保留原始資料
        raw_data: row,
        // 追蹤欄位
        origin_row_index: index + 2, // +2 因為第一列是標題
        synced_at: new Date().toISOString()
      };

      // 根據對應轉換欄位
      for (const [googleCol, mapping] of mappingMap.entries()) {
        const rawValue = row[googleCol];

        // 如果是必填欄位但值為空，記錄警告
        if (mapping.is_required && (rawValue === null || rawValue === undefined || rawValue === '')) {
          console.warn(`Missing required field: ${googleCol} (row ${index + 2})`);
        }

        // 應用轉換函數
        let transformedValue = rawValue;
        if (mapping.transform_function && Transforms[mapping.transform_function as keyof typeof Transforms]) {
          const transformFn = Transforms[mapping.transform_function as keyof typeof Transforms];
          transformedValue = transformFn(rawValue);
        }

        // 設定轉換後的值
        transformedRow[mapping.supabase_column] = transformedValue;
      }

      return transformedRow;
    });

    console.log(`✓ Transformed ${transformed.length} rows using dynamic mapping`);
    return transformed;

  } catch (error) {
    console.error('Error in dynamic transform:', error);
    throw error;
  }
}

/**
 * 清除特定工作表的對應快取
 */
export function clearMappingCache(worksheetId?: string) {
  if (worksheetId) {
    mappingCache.delete(worksheetId);
    console.log(`✓ Cleared mapping cache for worksheet ${worksheetId}`);
  } else {
    mappingCache.clear();
    console.log('✓ Cleared all mapping cache');
  }
}

/**
 * 驗證對應設定是否完整
 */
export async function validateMappings(worksheetId: string): Promise<{
  valid: boolean;
  missingRequired: string[];
  warnings: string[];
}> {
  const mappings = await getFieldMappings(worksheetId);

  const missingRequired: string[] = [];
  const warnings: string[] = [];

  // 檢查必填欄位
  const requiredColumns = ['student_name', 'student_email']; // 基本必填欄位
  for (const col of requiredColumns) {
    const hasmapping = mappings.some(m => m.supabase_column === col && m.is_required);
    if (!hasmapping) {
      missingRequired.push(col);
    }
  }

  // 檢查信心分數低的對應
  const lowConfidenceMappings = mappings.filter(m => m.ai_confidence < 0.5);
  if (lowConfidenceMappings.length > 0) {
    warnings.push(`${lowConfidenceMappings.length} 個對應的信心分數低於 50%`);
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    warnings
  };
}

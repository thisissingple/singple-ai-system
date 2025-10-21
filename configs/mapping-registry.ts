/**
 * Mapping Registry - 統一的欄位映射來源管理
 *
 * 讀取順序：
 * 1. 自定義 mapping (custom-field-mappings.json) - 前端可寫入
 * 2. 靜態 mapping (sheet-field-mappings-complete.ts) - 預設配置
 *
 * 這個模組提供統一的介面來取得欄位映射，未來可擴展到資料庫或其他來源
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getFieldMapping as getStaticFieldMapping,
  type FieldMapping,
  Transforms,
} from './sheet-field-mappings-complete';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 自定義欄位映射的介面（JSON 檔案格式）
 */
export interface CustomFieldMappingConfig {
  version: string;
  lastUpdated: string;
  mappings: {
    trial_class_attendance: CustomFieldMapping[];
    trial_class_purchase: CustomFieldMapping[];
    eods_for_closers: CustomFieldMapping[];
  };
}

export interface CustomFieldMapping {
  googleSheetColumn: string;
  supabaseColumn: string;
  dataType: string;
  required?: boolean;
  label?: string;
  description?: string;
  transformFunction?: 'toDate' | 'toTimestamp' | 'toInteger' | 'toDecimal' | 'toBoolean' | 'cleanText';
  createdAt?: string;
  createdBy?: string;
}

const CUSTOM_MAPPINGS_FILE = path.join(__dirname, 'custom-field-mappings.json');

/**
 * 讀取自定義欄位映射
 */
export function loadCustomMappings(): CustomFieldMappingConfig | null {
  try {
    if (fs.existsSync(CUSTOM_MAPPINGS_FILE)) {
      const content = fs.readFileSync(CUSTOM_MAPPINGS_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('Failed to load custom mappings:', error);
  }
  return null;
}

/**
 * 將自定義映射轉換為 FieldMapping 格式
 */
function convertToFieldMapping(custom: CustomFieldMapping): FieldMapping {
  // 根據 transformFunction 名稱選擇對應的函數
  let transformFn: ((value: any) => any) | undefined;

  if (custom.transformFunction) {
    switch (custom.transformFunction) {
      case 'toDate':
        transformFn = Transforms.toDate;
        break;
      case 'toTimestamp':
        transformFn = Transforms.toTimestamp;
        break;
      case 'toInteger':
        transformFn = Transforms.toInteger;
        break;
      case 'toDecimal':
        transformFn = Transforms.toDecimal;
        break;
      case 'toBoolean':
        transformFn = Transforms.toBoolean;
        break;
      case 'cleanText':
        transformFn = Transforms.cleanText;
        break;
    }
  }

  return {
    googleSheetColumn: custom.googleSheetColumn,
    supabaseColumn: custom.supabaseColumn,
    dataType: custom.dataType as any,
    required: custom.required,
    label: custom.label,
    description: custom.description,
    transform: transformFn,
  };
}

/**
 * 取得合併後的欄位映射
 *
 * 優先順序：
 * 1. 自定義 mapping（如果存在）
 * 2. 靜態 mapping（預設）
 */
export function getFieldMapping(supabaseTable: string): FieldMapping[] {
  // 1. 嘗試讀取自定義 mapping
  const customMappings = loadCustomMappings();

  if (customMappings && customMappings.mappings[supabaseTable as keyof typeof customMappings.mappings]) {
    const customFields = customMappings.mappings[supabaseTable as keyof typeof customMappings.mappings];

    if (customFields.length > 0) {
      console.log(`✅ Using custom mappings for ${supabaseTable} (${customFields.length} custom fields)`);

      // 合併自定義與靜態 mapping
      const staticMappings = getStaticFieldMapping(supabaseTable);
      const customFieldMappings = customFields.map(convertToFieldMapping);

      // 建立一個 Map 以 supabaseColumn 為 key
      const mappingMap = new Map<string, FieldMapping>();

      // 先加入靜態 mapping
      staticMappings.forEach(m => mappingMap.set(m.supabaseColumn, m));

      // 自定義 mapping 覆蓋靜態 mapping
      customFieldMappings.forEach(m => mappingMap.set(m.supabaseColumn, m));

      return Array.from(mappingMap.values());
    }
  }

  // 2. Fallback 到靜態 mapping
  return getStaticFieldMapping(supabaseTable);
}

/**
 * 儲存自定義欄位映射
 *
 * @param supabaseTable - 表名
 * @param mappings - 欄位映射陣列
 * @param userId - 操作者 ID（可選）
 */
export function saveCustomMappings(
  supabaseTable: string,
  mappings: CustomFieldMapping[],
  userId?: string
): void {
  const config = loadCustomMappings() || {
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    mappings: {
      trial_class_attendance: [],
      trial_class_purchase: [],
      eods_for_closers: [],
    },
  };

  // 更新指定表的 mapping
  config.mappings[supabaseTable as keyof typeof config.mappings] = mappings.map(m => ({
    ...m,
    createdAt: m.createdAt || new Date().toISOString(),
    createdBy: m.createdBy || userId || 'system',
  }));

  config.lastUpdated = new Date().toISOString();

  // 寫入檔案
  fs.writeFileSync(CUSTOM_MAPPINGS_FILE, JSON.stringify(config, null, 2), 'utf-8');
  console.log(`✅ Custom mappings saved for ${supabaseTable}`);
}

/**
 * 新增單一自定義欄位映射
 */
export function addCustomMapping(
  supabaseTable: string,
  mapping: CustomFieldMapping,
  userId?: string
): void {
  const config = loadCustomMappings();
  const existingMappings = config?.mappings[supabaseTable as keyof typeof config.mappings] || [];

  // 檢查是否已存在
  const exists = existingMappings.some(
    m => m.supabaseColumn === mapping.supabaseColumn || m.googleSheetColumn === mapping.googleSheetColumn
  );

  if (exists) {
    throw new Error(`Mapping already exists for ${mapping.supabaseColumn} or ${mapping.googleSheetColumn}`);
  }

  existingMappings.push(mapping);
  saveCustomMappings(supabaseTable, existingMappings, userId);
}

/**
 * 刪除自定義欄位映射
 */
export function removeCustomMapping(
  supabaseTable: string,
  supabaseColumn: string
): void {
  const config = loadCustomMappings();
  if (!config) return;

  const existingMappings = config.mappings[supabaseTable as keyof typeof config.mappings] || [];
  const filtered = existingMappings.filter(m => m.supabaseColumn !== supabaseColumn);

  saveCustomMappings(supabaseTable, filtered);
}

/**
 * 清空指定表的自定義映射
 */
export function clearCustomMappings(supabaseTable: string): void {
  saveCustomMappings(supabaseTable, []);
}

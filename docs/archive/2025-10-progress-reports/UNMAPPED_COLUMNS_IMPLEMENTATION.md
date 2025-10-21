# 未映射欄位檢測功能實作總結

## 📋 任務概述

在原有的「Sheet 缺欄位檢測」基礎上，新增「Supabase 有但 mapping 沒定義」的欄位檢測功能，並建立可寫入的 mapping registry，為未來前端手動 mapping 介面鋪路。

## ✅ 實作內容

### 1. 建立 Supabase 欄位定義模組

**檔案**: `configs/supabase-columns.ts`

定義每個 Supabase 表的實際欄位列表，來源包括：
- `supabase-schema-authority.ts` 的 EXPECTED_INSERT_FIELDS（權威來源）
- `shared/schema.ts` 的 Drizzle schema 定義

**關鍵函數**:
```typescript
// 取得指定表的所有 Supabase 欄位
export function getSupabaseColumns(tableName: string): string[]

// 取得需要映射的欄位（排除系統欄位與舊有欄位）
export function getMappableColumns(tableName: string): string[]

// 檢查欄位類型
export function isSystemManagedColumn(columnName: string): boolean
export function isLegacyBusinessColumn(columnName: string): boolean
```

**欄位分類**:
- **系統管理欄位**: id, created_at, updated_at, source_worksheet_id, origin_row_index, synced_at, raw_data
- **舊有業務欄位**: teacher_id, sales_id, department_id, closer_id, setter_id, report_date
- **可映射欄位**: 其他業務欄位

### 2. 實作未映射欄位檢測

**檔案**: `configs/sheet-field-mappings-complete.ts`

新增介面與函數：

```typescript
export interface UnmappedSupabaseColumnInfo {
  supabaseColumn: string;    // Supabase 欄位名
  dataType: string;           // 資料型別
  isSystemManaged: boolean;   // 是否為系統管理欄位
  isLegacyBusiness: boolean;  // 是否為舊有業務欄位
}

export function detectUnmappedSupabaseColumns(
  supabaseTable: string
): UnmappedSupabaseColumnInfo[]
```

**檢測邏輯**:
1. 取得指定表的 field mapping
2. 取得該表的所有可映射 Supabase 欄位
3. 比對找出未在 mapping 中的欄位
4. 標記欄位類型（系統/舊有/需映射）

### 3. 建立可寫入的 Mapping Registry

**檔案結構**:
- `configs/custom-field-mappings.json` - 自定義 mapping 資料
- `configs/custom-field-mappings.schema.json` - JSON Schema 驗證
- `configs/mapping-registry.ts` - Registry 管理模組

**Registry API**:
```typescript
// 讀取自定義 mapping
export function loadCustomMappings(): CustomFieldMappingConfig | null

// 取得合併後的 mapping（自定義 > 靜態）
export function getFieldMapping(supabaseTable: string): FieldMapping[]

// 儲存自定義 mapping
export function saveCustomMappings(
  supabaseTable: string,
  mappings: CustomFieldMapping[],
  userId?: string
): void

// 新增單一 mapping
export function addCustomMapping(
  supabaseTable: string,
  mapping: CustomFieldMapping,
  userId?: string
): void

// 刪除 mapping
export function removeCustomMapping(
  supabaseTable: string,
  supabaseColumn: string
): void

// 清空 mapping
export function clearCustomMappings(supabaseTable: string): void
```

**讀取優先順序**:
1. 自定義 mapping (`custom-field-mappings.json`) - 前端可寫入
2. 靜態 mapping (`sheet-field-mappings-complete.ts`) - 預設配置

### 4. 更新 ETL Pipeline

#### 4.1 Extract 階段

**檔案**: `server/services/etl/extract.ts`

**擴充介面**:
```typescript
export interface ExtractedData {
  worksheet: Worksheet;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  extractedAt: Date;
  missingMappings?: MissingFieldInfo[];              // Sheet 缺欄位
  unmappedSupabaseColumns?: UnmappedSupabaseColumnInfo[]; // Supabase 未映射欄位
}

export interface ExtractOptions {
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  detectMissingFields?: boolean;      // Sheet 缺欄位檢測（預設 true）
  detectUnmappedColumns?: boolean;    // Supabase 未映射檢測（預設 true）
}
```

**檢測邏輯**:
```typescript
// 檢測 Sheet 缺欄位
if (detectMissingFields && worksheet.supabaseTable) {
  const missingMappings = detectMissingMappings(headers, worksheet.supabaseTable);
  if (missingMappings.length > 0) {
    result.missingMappings = missingMappings;
  }
}

// 檢測 Supabase 未映射欄位
if (detectUnmappedColumns && worksheet.supabaseTable) {
  const unmappedColumns = detectUnmappedSupabaseColumns(worksheet.supabaseTable);
  if (unmappedColumns.length > 0) {
    result.unmappedSupabaseColumns = unmappedColumns;
  }
}
```

#### 4.2 ETL 主流程

**檔案**: `server/services/etl/index.ts`

**擴充 ETLResult**:
```typescript
export interface ETLResult {
  success: boolean;
  worksheet: Worksheet;
  tableName: string;
  extractedRows: number;
  validRows: number;
  invalidRows: number;
  insertedRows: number;
  deletedRows: number;
  errors: string[];
  warnings: string[];
  missingMappings?: MissingFieldInfo[];                    // Sheet 缺欄位
  unmappedSupabaseColumns?: UnmappedSupabaseColumnInfo[];  // Supabase 未映射欄位
  duration: number;
}
```

**處理與 Warnings 生成**:
```typescript
// 處理 Sheet 缺欄位
if (extractedData.missingMappings && extractedData.missingMappings.length > 0) {
  result.missingMappings = extractedData.missingMappings;

  const requiredMissing = extractedData.missingMappings.filter(m => m.required);
  const optionalMissing = extractedData.missingMappings.filter(m => !m.required);

  if (requiredMissing.length > 0) {
    result.warnings.push(`⚠️  Sheet 缺少必填欄位：${...}`);
  }

  if (optionalMissing.length > 0) {
    result.warnings.push(`ℹ️  Sheet 缺少選填欄位：${...}`);
  }
}

// 處理 Supabase 未映射欄位
if (extractedData.unmappedSupabaseColumns && extractedData.unmappedSupabaseColumns.length > 0) {
  result.unmappedSupabaseColumns = extractedData.unmappedSupabaseColumns;

  const userMappableColumns = extractedData.unmappedSupabaseColumns.filter(
    col => !col.isSystemManaged && !col.isLegacyBusiness
  );

  if (userMappableColumns.length > 0) {
    result.warnings.push(`📋 Supabase 有未映射欄位：${...}`);
  }
}
```

#### 4.3 SyncResult

**檔案**: `server/services/sheet-sync-service-v2.ts`

**擴充介面**:
```typescript
export interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  missingMappings?: MissingFieldInfo[];                    // Sheet 缺欄位
  unmappedSupabaseColumns?: UnmappedSupabaseColumnInfo[];  // Supabase 未映射欄位
  duration: number;
}
```

## 📊 資料流程

```
Google Sheets Headers
    ↓
Extract Phase
    ├─ detectMissingMappings()          → missingMappings (Sheet 缺欄位)
    └─ detectUnmappedSupabaseColumns()  → unmappedSupabaseColumns (Supabase 未映射)
    ↓
ExtractedData { missingMappings, unmappedSupabaseColumns }
    ↓
ETL Pipeline (生成區分的 warnings)
    ├─ ⚠️  Sheet 缺少必填欄位：...
    ├─ ℹ️  Sheet 缺少選填欄位：...
    └─ 📋 Supabase 有未映射欄位：...
    ↓
ETLResult { missingMappings, unmappedSupabaseColumns, warnings }
    ↓
SyncResult { missingMappings, unmappedSupabaseColumns, warnings }
    ↓
前端（處理兩種檢測結果）
```

## 🧪 測試

### 測試 1: 未映射欄位檢測

**檔案**: `scripts/test-unmapped-columns.ts`

```bash
npx tsx scripts/test-unmapped-columns.ts
```

**測試項目**:
- ✅ detectUnmappedSupabaseColumns() 可正確檢測未映射欄位
- ✅ 可區分系統管理、舊有業務、需映射欄位
- ✅ 支援三張表的欄位檢測

### 測試 2: ETL 完整測試

**檔案**: `scripts/test-etl-unmapped-complete.ts`

```bash
npx tsx scripts/test-etl-unmapped-complete.ts
```

**測試項目**:
- ✅ Extract 階段能檢測 Sheet 缺欄位 (missingMappings)
- ✅ Extract 階段能檢測 Supabase 未映射欄位 (unmappedSupabaseColumns)
- ✅ ETL Pipeline 能傳遞兩種檢測結果到 ETLResult
- ✅ ETL Pipeline 能生成區分的 warnings 訊息
- ✅ Mapping Registry 可讀取自定義配置
- ✅ Mapping Registry 可 fallback 到靜態 mapping

## 🎯 使用方式

### 後端使用

```typescript
import { syncWorksheetToSupabase } from './server/services/sheet-sync-service-v2';

const result = await syncWorksheetToSupabase(worksheet, headers, dataRows);

// 1. 檢查 Sheet 缺欄位
if (result.missingMappings && result.missingMappings.length > 0) {
  const required = result.missingMappings.filter(m => m.required);
  const optional = result.missingMappings.filter(m => !m.required);

  console.log('Sheet 必填缺失:', required.map(m => m.label));
  console.log('Sheet 選填缺失:', optional.map(m => m.label));
}

// 2. 檢查 Supabase 未映射欄位
if (result.unmappedSupabaseColumns && result.unmappedSupabaseColumns.length > 0) {
  const needMapping = result.unmappedSupabaseColumns.filter(
    c => !c.isSystemManaged && !c.isLegacyBusiness
  );

  console.log('Supabase 需映射:', needMapping.map(c => c.supabaseColumn));
}

// 3. 或直接從 warnings 取得格式化訊息
console.log(result.warnings);
// [
//   "⚠️  Sheet 缺少必填欄位：上課日期 (上課日期)",
//   "ℹ️  Sheet 缺少選填欄位：備註 (備註)",
//   "📋 Supabase 有未映射欄位：is_reviewed、class_transcript"
// ]
```

### 前端使用 - 顯示檢測結果

```typescript
interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  missingMappings?: MissingFieldInfo[];              // Sheet 缺欄位
  unmappedSupabaseColumns?: UnmappedSupabaseColumnInfo[];  // Supabase 未映射
  duration: number;
}

function displaySyncWarnings(result: SyncResult) {
  // 1. Sheet 缺欄位警告
  if (result.missingMappings && result.missingMappings.length > 0) {
    const required = result.missingMappings.filter(m => m.required);
    const optional = result.missingMappings.filter(m => !m.required);

    if (required.length > 0) {
      showAlert('error', `Sheet 缺少必填欄位：${required.map(m => m.label).join('、')}`);
    }

    if (optional.length > 0) {
      showInfo(`Sheet 缺少選填欄位：${optional.map(m => m.label).join('、')}`);
    }
  }

  // 2. Supabase 未映射欄位提示
  if (result.unmappedSupabaseColumns && result.unmappedSupabaseColumns.length > 0) {
    const needMapping = result.unmappedSupabaseColumns.filter(
      c => !c.isSystemManaged && !c.isLegacyBusiness
    );

    if (needMapping.length > 0) {
      showInfo(
        `Supabase 有 ${needMapping.length} 個欄位尚未映射：${needMapping.map(c => c.supabaseColumn).join('、')}`,
        {
          action: '前往設定',
          onClick: () => navigateToMappingSettings()
        }
      );
    }
  }
}
```

### 使用 Mapping Registry

```typescript
import {
  getFieldMapping,
  addCustomMapping,
  saveCustomMappings,
  loadCustomMappings,
} from './configs/mapping-registry';

// 1. 讀取 mapping（自動 fallback）
const mapping = getFieldMapping('trial_class_attendance');
// 如果有自定義 mapping 會使用，否則使用靜態 mapping

// 2. 新增自定義 mapping
addCustomMapping('trial_class_attendance', {
  googleSheetColumn: '學員評價',
  supabaseColumn: 'student_rating',
  dataType: 'integer',
  label: '學員評價',
  transformFunction: 'toInteger',
}, 'user-id-123');

// 3. 批次儲存
saveCustomMappings('trial_class_attendance', [
  {
    googleSheetColumn: '學員評價',
    supabaseColumn: 'student_rating',
    dataType: 'integer',
    label: '學員評價',
  },
  {
    googleSheetColumn: '課程難度',
    supabaseColumn: 'class_difficulty',
    dataType: 'text',
    label: '課程難度',
  },
], 'user-id-123');

// 4. 讀取自定義配置
const config = loadCustomMappings();
console.log(config?.mappings.trial_class_attendance);
```

## 📦 更新的檔案清單

### 核心實作
1. ✅ `configs/supabase-columns.ts` - Supabase 欄位定義
2. ✅ `configs/sheet-field-mappings-complete.ts` - 新增 detectUnmappedSupabaseColumns
3. ✅ `configs/custom-field-mappings.json` - 自定義 mapping 資料
4. ✅ `configs/custom-field-mappings.schema.json` - JSON Schema
5. ✅ `configs/mapping-registry.ts` - Mapping Registry 管理
6. ✅ `server/services/etl/extract.ts` - 整合未映射欄位檢測
7. ✅ `server/services/etl/index.ts` - 處理與生成 warnings
8. ✅ `server/services/sheet-sync-service-v2.ts` - 更新 SyncResult

### 測試檔案
9. ✅ `scripts/test-unmapped-columns.ts` - 未映射欄位檢測測試
10. ✅ `scripts/test-etl-unmapped-complete.ts` - ETL 完整測試

### 文檔
11. ✅ `UNMAPPED_COLUMNS_IMPLEMENTATION.md` - 本實作總結文件

## 🔑 關鍵特點

1. **雙向檢測**: 同時檢測「Sheet 缺欄位」與「Supabase 未映射欄位」
2. **清晰分類**: 區分系統管理、舊有業務、需映射欄位
3. **靈活擴展**: Mapping Registry 支援前端動態管理
4. **向後相容**: 保持原有 API 不變，僅擴充新欄位
5. **優先順序**: 自定義 mapping > 靜態 mapping
6. **錯誤處理**: 檢測失敗不中斷流程

## 📝 Warnings 訊息格式

### Sheet 缺欄位
```
⚠️  Sheet 缺少必填欄位：上課日期 (上課日期)、授課老師 (授課老師)
ℹ️  Sheet 缺少選填欄位：備註 (備註)、是否已審核 (是否已審核)
```

### Supabase 未映射欄位
```
📋 Supabase 有未映射欄位：is_reviewed、no_conversion_reason、class_transcript
```

## 🚀 未來擴展

### 1. 前端 UI
- 視覺化顯示兩種檢測結果
- 提供手動 mapping 介面
- 支援拖拽映射

### 2. Mapping Registry
- 儲存到資料庫
- 支援多版本管理
- 權限控制

### 3. 自動建議
- 根據欄位名稱相似度自動建議 mapping
- 學習歷史 mapping 模式

## ✅ 完成狀態

- [x] 建立 Supabase 欄位定義模組
- [x] 實作 detectUnmappedSupabaseColumns
- [x] 建立可寫入的 Mapping Registry
- [x] 更新 ETL Extract 階段
- [x] 更新 ETL 主流程與 SyncResult
- [x] 撰寫測試腳本
- [x] 執行測試驗證
- [x] 撰寫實作總結文件

---

**實作日期**: 2025-10-05
**測試狀態**: ✅ 全部通過
**版本**: ETL Pipeline v2 + Unmapped Columns Detection

# ETL 缺欄位檢測功能實作總結

## 📋 任務概述

將舊版同步服務的缺欄位檢測邏輯移植到新版 ETL pipeline，使兩版本能輸出一致的缺欄位警告訊息，方便前端統一處理。

## ✅ 實作內容

### 1. 補充 `sheet-field-mappings-complete.ts` 的 `label` 欄位

**檔案**: `configs/sheet-field-mappings-complete.ts`

- 在 `FieldMapping` 介面新增 `label?: string` 欄位
- 為所有三張表的欄位映射補上中文 `label`：
  - `trial_class_attendance`: 8 個欄位（4 必填 + 4 選填）
  - `trial_class_purchase`: 13 個欄位（4 必填 + 9 選填）
  - `eods_for_closers`: 20 個欄位（3 必填 + 17 選填）

**範例**:
```typescript
{
  googleSheetColumn: '姓名',
  supabaseColumn: 'student_name',
  dataType: 'text',
  required: true,
  transform: Transforms.cleanText,
  description: '學生姓名',
  label: '學生姓名'  // ← 新增
}
```

### 2. 加入 `detectMissingMappings` 函數

**檔案**: `configs/sheet-field-mappings-complete.ts`

新增以下內容：

```typescript
export interface MissingFieldInfo {
  supabaseColumn: string;
  googleSheetColumn: string;
  label: string;
  required: boolean;
}

export function detectMissingMappings(
  sheetHeaders: string[],
  supabaseTable: string
): MissingFieldInfo[]
```

**功能**:
- 比對 Google Sheets 實際表頭與欄位映射定義
- 自動標準化表頭（去除空白）
- 回傳缺失欄位資訊（含 label 與 required 標記）

### 3. 更新 ETL Extract 模組

**檔案**: `server/services/etl/extract.ts`

**變更內容**:

1. 匯入 `detectMissingMappings`：
```typescript
import { detectMissingMappings, type MissingFieldInfo } from '../../../configs/sheet-field-mappings-complete';
```

2. 擴充 `ExtractedData` 介面：
```typescript
export interface ExtractedData {
  worksheet: Worksheet;
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
  extractedAt: Date;
  missingMappings?: MissingFieldInfo[]; // ← 新增
}
```

3. 新增檢測選項：
```typescript
export interface ExtractOptions {
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  detectMissingFields?: boolean; // ← 新增（預設 true）
}
```

4. 在 `extractFromSheets()` 中執行檢測：
```typescript
// 檢測缺失的欄位映射
if (detectMissingFields && worksheet.supabaseTable) {
  try {
    const missingMappings = detectMissingMappings(headers, worksheet.supabaseTable);
    if (missingMappings.length > 0) {
      result.missingMappings = missingMappings;
    }
  } catch (error) {
    console.warn(`Failed to detect missing mappings for ${worksheet.supabaseTable}:`, error);
  }
}
```

### 4. 更新 ETL 主流程

**檔案**: `server/services/etl/index.ts`

**變更內容**:

1. 擴充 `ETLResult` 介面：
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
  missingMappings?: MissingFieldInfo[]; // ← 新增
  duration: number;
}
```

2. 在 `runETL()` 中處理缺失欄位資訊：
```typescript
// 處理缺失的欄位映射
if (extractedData.missingMappings && extractedData.missingMappings.length > 0) {
  result.missingMappings = extractedData.missingMappings;

  // 分類必填與選填
  const requiredMissing = extractedData.missingMappings.filter(m => m.required);
  const optionalMissing = extractedData.missingMappings.filter(m => !m.required);

  if (requiredMissing.length > 0) {
    const missingLabels = requiredMissing.map(m => `${m.label} (${m.googleSheetColumn})`).join('、');
    result.warnings.push(`⚠️  缺少必填欄位：${missingLabels}`);
    console.log(`⚠️  缺少必填欄位：${missingLabels}`);
  }

  if (optionalMissing.length > 0) {
    const missingLabels = optionalMissing.map(m => `${m.label} (${m.googleSheetColumn})`).join('、');
    result.warnings.push(`ℹ️  缺少選填欄位：${missingLabels}`);
    console.log(`ℹ️  缺少選填欄位：${missingLabels}`);
  }
} else {
  console.log(`✅ All field mappings found in Sheet headers`);
}
```

### 5. 更新 SyncResult 介面

**檔案**: `server/services/sheet-sync-service-v2.ts`

**變更內容**:

1. 擴充 `SyncResult` 介面：
```typescript
export interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  missingMappings?: MissingFieldInfo[]; // ← 新增
  duration: number;
}
```

2. 傳遞 `missingMappings` 到 SyncResult：
```typescript
return {
  success: etlResult.success,
  insertedCount: etlResult.insertedRows,
  invalidCount: etlResult.invalidRows,
  errors: etlResult.errors,
  warnings: etlResult.warnings,
  missingMappings: etlResult.missingMappings, // ← 新增
  duration: etlResult.duration,
};
```

## 🧪 測試驗證

### 測試 1: 基本缺欄位檢測

**檔案**: `scripts/test-missing-field-detection.ts`

- 更新為比較新舊兩版的檢測結果
- 驗證 `label` 欄位正確顯示
- 驗證必填/選填分類正確

**執行結果**: ✅ 通過

### 測試 2: ETL Pipeline 整合測試

**檔案**: `scripts/test-etl-missing-mappings.ts`

測試項目：
1. ✅ Extract 階段能檢測缺失欄位
2. ✅ Extract 階段能分類必填/選填
3. ✅ Extract 階段能處理完整欄位（無缺失）
4. ✅ ETL Pipeline 能傳遞 missingMappings 到 ETLResult
5. ✅ ETL Pipeline 能生成中文 warnings 訊息
6. ✅ 新版 ETL 支援三張表的欄位檢測
7. ✅ 與舊版行為一致（含 label、required 分類）

**執行命令**:
```bash
npx tsx scripts/test-etl-missing-mappings.ts
```

**測試輸出範例**:
```
⚠️  缺少必填欄位：方案名稱 (方案名稱)、體驗課購買日期 (體驗課購買日期)
ℹ️  缺少選填欄位：方案價格 (方案價格)、備註 (備註)、年齡 (年齡)、職業 (職業)...
```

### 測試 3: Jest 單元測試

**檔案**: `tests/etl/missing-mappings.test.ts`

包含以下測試案例：
- 檢測缺失的必填欄位
- 檢測缺失的選填欄位
- 完整欄位時不應該有缺失
- 正確處理帶空白的欄位名
- Full ETL Pipeline 傳遞 missingMappings
- Warnings 包含缺失欄位訊息

## 📊 新舊版本對比

### 舊版 (sheet-sync-service.ts)

```typescript
// 使用 sheet-field-mappings.ts
import { detectMissingMappings } from '../../configs/sheet-field-mappings';

// 在同步流程中檢測
const missingMappings = detectMissingMappings(headers, tableName);

// 直接寫入 SyncResult
result.missingMappings = missingMappings;
```

### 新版 (sheet-sync-service-v2.ts + ETL)

```typescript
// 使用 sheet-field-mappings-complete.ts
import { detectMissingMappings } from '../../../configs/sheet-field-mappings-complete';

// 在 Extract 階段檢測
const extractedData = extractFromSheets(worksheet, headers, dataRows);
// extractedData.missingMappings 已包含缺欄位資訊

// 在 ETL 主流程中處理並生成 warnings
if (extractedData.missingMappings && extractedData.missingMappings.length > 0) {
  result.missingMappings = extractedData.missingMappings;
  // 生成中文警告訊息
}

// 傳遞到 SyncResult
return {
  ...
  missingMappings: etlResult.missingMappings,
};
```

## 🔄 資料流程

```
Google Sheets
    ↓
Extract (detectMissingMappings)
    ↓
ExtractedData { missingMappings }
    ↓
ETL Pipeline (處理並生成 warnings)
    ↓
ETLResult { missingMappings, warnings }
    ↓
SyncResult { missingMappings, warnings }
    ↓
前端（統一處理缺欄位提醒）
```

## 📦 更新的檔案清單

### 核心實作
1. ✅ `configs/sheet-field-mappings-complete.ts` - 新增 label 欄位與 detectMissingMappings 函數
2. ✅ `server/services/etl/extract.ts` - 整合缺欄位檢測
3. ✅ `server/services/etl/index.ts` - 處理缺欄位資訊與生成 warnings
4. ✅ `server/services/sheet-sync-service-v2.ts` - 更新 SyncResult 介面

### 測試檔案
5. ✅ `scripts/test-missing-field-detection.ts` - 更新為比較兩版本
6. ✅ `scripts/test-etl-missing-mappings.ts` - 新增 ETL 整合測試
7. ✅ `tests/etl/missing-mappings.test.ts` - 新增 Jest 單元測試

### 文檔
8. ✅ `ETL_MISSING_MAPPINGS_IMPLEMENTATION.md` - 本實作總結文件

## 🎯 使用方式

### 後端使用

```typescript
import { syncWorksheetToSupabase } from './server/services/sheet-sync-service-v2';

const result = await syncWorksheetToSupabase(worksheet, headers, dataRows);

// 檢查缺失欄位
if (result.missingMappings && result.missingMappings.length > 0) {
  const requiredMissing = result.missingMappings.filter(m => m.required);
  const optionalMissing = result.missingMappings.filter(m => !m.required);

  console.log('必填缺失:', requiredMissing.map(m => m.label));
  console.log('選填缺失:', optionalMissing.map(m => m.label));
}

// 或直接從 warnings 取得格式化訊息
console.log(result.warnings);
// 輸出: ["⚠️  缺少必填欄位：上課日期 (上課日期)", "ℹ️  缺少選填欄位：備註 (備註)"]
```

### 前端使用

```typescript
// SyncResult 介面
interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  missingMappings?: MissingFieldInfo[];
  duration: number;
}

// 顯示缺欄位警告
function displaySyncWarnings(result: SyncResult) {
  if (result.missingMappings && result.missingMappings.length > 0) {
    const required = result.missingMappings.filter(m => m.required);
    const optional = result.missingMappings.filter(m => !m.required);

    if (required.length > 0) {
      showAlert('warning', `缺少必填欄位：${required.map(m => m.label).join('、')}`);
    }

    if (optional.length > 0) {
      showInfo(`缺少選填欄位：${optional.map(m => m.label).join('、')}`);
    }
  }
}
```

## 🚀 執行測試指令

```bash
# 建置專案
npm run build

# 測試基本缺欄位檢測（比較新舊版本）
npx tsx scripts/test-missing-field-detection.ts

# 測試 ETL 整合
npx tsx scripts/test-etl-missing-mappings.ts

# 執行所有測試（如果有配置 Jest）
npm test
```

## ✨ 功能特點

1. **一致性**: 新舊版本輸出格式完全一致
2. **中文化**: 使用 `label` 欄位提供中文欄位名稱
3. **分類清晰**: 自動區分必填與選填欄位
4. **容錯性**: 自動處理空白字元
5. **可擴展**: 支援三張表，可輕鬆新增更多表格
6. **完整測試**: 包含單元測試與整合測試

## 📝 注意事項

1. **Mapping 統一**: 新版 ETL 統一使用 `sheet-field-mappings-complete.ts`
2. **向後相容**: `SyncResult` 介面保持向後相容
3. **錯誤處理**: 檢測失敗時會 log warning 但不中斷流程
4. **預設開啟**: `detectMissingFields` 預設為 `true`，可透過 options 關閉

## 🔗 相關文件

- [Sheet Field Mappings](configs/sheet-field-mappings.ts) - 舊版映射配置
- [Sheet Field Mappings Complete](configs/sheet-field-mappings-complete.ts) - 新版完整映射配置
- [ETL Extract](server/services/etl/extract.ts) - Extract 模組
- [ETL Index](server/services/etl/index.ts) - ETL 主流程
- [Sync Service V2](server/services/sheet-sync-service-v2.ts) - 新版同步服務

## ✅ 完成狀態

- [x] 補充 sheet-field-mappings-complete.ts 的 label 欄位
- [x] 移植 detectMissingMappings 到新版 mapping
- [x] 在 ETL Extract 階段整合缺欄位檢測
- [x] 更新 ETLResult 與 SyncResult 介面
- [x] 生成與舊版一致的 warnings 訊息
- [x] 撰寫與執行測試驗證
- [x] 撰寫實作總結文件

---

**實作日期**: 2025-10-05
**測試狀態**: ✅ 全部通過
**版本**: 新版 ETL Pipeline v2

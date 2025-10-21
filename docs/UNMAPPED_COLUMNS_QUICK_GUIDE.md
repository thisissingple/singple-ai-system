# 未映射欄位檢測 - 快速參考

## 🎯 功能概述

ETL 同步流程現在能檢測兩種欄位問題：

1. **Sheet 缺欄位** (`missingMappings`) - Google Sheets 缺少 mapping 定義的欄位
2. **Supabase 未映射欄位** (`unmappedSupabaseColumns`) - Supabase 有但 mapping 沒定義的欄位

## 📊 SyncResult 結構

```typescript
interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];                          // 包含格式化的警告訊息
  missingMappings?: MissingFieldInfo[];        // Sheet 缺欄位
  unmappedSupabaseColumns?: UnmappedSupabaseColumnInfo[];  // Supabase 未映射
  duration: number;
}
```

## 💡 Warnings 訊息

### Sheet 缺欄位
```
⚠️  Sheet 缺少必填欄位：上課日期 (上課日期)、授課老師 (授課老師)
ℹ️  Sheet 缺少選填欄位：備註 (備註)、是否已審核 (是否已審核)
```

### Supabase 未映射欄位
```
📋 Supabase 有未映射欄位：is_reviewed、class_transcript、no_conversion_reason
```

## 🔧 基本使用

```typescript
import { syncWorksheetToSupabase } from './server/services/sheet-sync-service-v2';

const result = await syncWorksheetToSupabase(worksheet, headers, dataRows);

// 方式 1: 直接讀取 warnings（最簡單）
result.warnings.forEach(warning => console.log(warning));

// 方式 2: 詳細處理
if (result.missingMappings) {
  // 處理 Sheet 缺欄位
}

if (result.unmappedSupabaseColumns) {
  // 處理 Supabase 未映射欄位
}
```

## 🎨 前端範例

### React 顯示警告

```tsx
function SyncWarnings({ result }: { result: SyncResult }) {
  const sheetMissingRequired = result.missingMappings?.filter(m => m.required) || [];
  const sheetMissingOptional = result.missingMappings?.filter(m => !m.required) || [];
  const supabaseUnmapped = result.unmappedSupabaseColumns?.filter(
    c => !c.isSystemManaged && !c.isLegacyBusiness
  ) || [];

  return (
    <div className="space-y-2">
      {/* Sheet 缺少必填欄位 - 錯誤級別 */}
      {sheetMissingRequired.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Sheet 缺少必填欄位</AlertTitle>
          <AlertDescription>
            {sheetMissingRequired.map(m => m.label).join('、')}
          </AlertDescription>
        </Alert>
      )}

      {/* Sheet 缺少選填欄位 - 資訊級別 */}
      {sheetMissingOptional.length > 0 && (
        <Alert>
          <AlertTitle>Sheet 缺少選填欄位</AlertTitle>
          <AlertDescription>
            {sheetMissingOptional.map(m => m.label).join('、')}
          </AlertDescription>
        </Alert>
      )}

      {/* Supabase 未映射欄位 - 提示可設定 */}
      {supabaseUnmapped.length > 0 && (
        <Alert>
          <AlertTitle>Supabase 有未映射欄位</AlertTitle>
          <AlertDescription>
            {supabaseUnmapped.map(c => c.supabaseColumn).join('、')}
            <Button onClick={navigateToMappingSettings}>前往設定</Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
```

### 簡單版本

```tsx
function SimpleSyncWarnings({ result }: { result: SyncResult }) {
  return (
    <div>
      {result.warnings.map((warning, i) => (
        <div key={i} className={getWarningClass(warning)}>
          {warning}
        </div>
      ))}
    </div>
  );
}

function getWarningClass(warning: string) {
  if (warning.includes('⚠️')) return 'text-red-600';
  if (warning.includes('ℹ️')) return 'text-blue-600';
  if (warning.includes('📋')) return 'text-purple-600';
  return 'text-gray-600';
}
```

## 🔄 Mapping Registry

### 讀取 Mapping

```typescript
import { getFieldMapping } from './configs/mapping-registry';

// 自動 fallback：自定義 > 靜態
const mapping = getFieldMapping('trial_class_attendance');
```

### 新增自定義 Mapping

```typescript
import { addCustomMapping } from './configs/mapping-registry';

addCustomMapping('trial_class_attendance', {
  googleSheetColumn: '學員評價',
  supabaseColumn: 'student_rating',
  dataType: 'integer',
  label: '學員評價',
  transformFunction: 'toInteger',
}, userId);
```

### 批次設定

```typescript
import { saveCustomMappings } from './configs/mapping-registry';

saveCustomMappings('trial_class_attendance', [
  {
    googleSheetColumn: '學員評價',
    supabaseColumn: 'student_rating',
    dataType: 'integer',
    label: '學員評價',
  },
  // ... 更多 mapping
], userId);
```

## 📂 關鍵檔案

### 配置檔
- `configs/supabase-columns.ts` - Supabase 欄位定義
- `configs/sheet-field-mappings-complete.ts` - 完整欄位映射 + 檢測函數
- `configs/custom-field-mappings.json` - 自定義 mapping（可寫入）
- `configs/mapping-registry.ts` - Registry 管理 API

### ETL 模組
- `server/services/etl/extract.ts` - Extract 階段（檢測）
- `server/services/etl/index.ts` - ETL 主流程（生成 warnings）
- `server/services/sheet-sync-service-v2.ts` - 同步服務

### 測試
- `scripts/test-unmapped-columns.ts` - 基本檢測測試
- `scripts/test-etl-unmapped-complete.ts` - 完整 ETL 測試

## 🧪 測試指令

```bash
# 建置專案
npm run build

# 測試未映射欄位檢測
npx tsx scripts/test-unmapped-columns.ts

# 完整 ETL 測試
npx tsx scripts/test-etl-unmapped-complete.ts
```

## ❓ 常見問題

### Q1: unmappedSupabaseColumns 為什麼有些欄位標記為系統管理？

A: 系統管理欄位（id, created_at, synced_at 等）由系統自動填入，不需要從 Google Sheets 映射。

### Q2: 如何關閉未映射欄位檢測？

A: 可在 ETL options 中設定：
```typescript
await runETL(worksheet, headers, dataRows, {
  extract: {
    detectUnmappedColumns: false
  }
});
```

### Q3: 自定義 mapping 儲存在哪裡？

A: 目前儲存在 `configs/custom-field-mappings.json`，未來可擴展到資料庫。

### Q4: 如何區分警告類型？

A: 透過 emoji 符號：
- ⚠️ = Sheet 缺少必填欄位（錯誤）
- ℹ️ = Sheet 缺少選填欄位（資訊）
- 📋 = Supabase 有未映射欄位（提示）

## 🔗 相關文檔

- [完整實作總結](../UNMAPPED_COLUMNS_IMPLEMENTATION.md)
- [ETL 缺欄位檢測](./ETL_MISSING_MAPPINGS_GUIDE.md)
- [欄位映射配置](../configs/sheet-field-mappings-complete.ts)

---

**更新日期**: 2025-10-05
**版本**: ETL Pipeline v2 + Unmapped Columns Detection

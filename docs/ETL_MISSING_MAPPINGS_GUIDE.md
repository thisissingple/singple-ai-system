# ETL 缺欄位檢測使用指南

## 📖 概述

新版 ETL Pipeline 已整合缺欄位檢測功能，能自動檢查 Google Sheets 表頭與欄位映射配置的差異，並提供清晰的中文警告訊息。

## 🚀 快速開始

### 基本使用

```typescript
import { syncWorksheetToSupabase } from './server/services/sheet-sync-service-v2';

// 同步工作表
const result = await syncWorksheetToSupabase(worksheet, headers, dataRows);

// 檢查結果
console.log('同步狀態:', result.success);
console.log('插入筆數:', result.insertedCount);
console.log('警告訊息:', result.warnings);

// 檢查缺失欄位
if (result.missingMappings) {
  console.log('缺失欄位:', result.missingMappings);
}
```

## 📊 SyncResult 介面

```typescript
interface SyncResult {
  success: boolean;           // 同步是否成功
  insertedCount: number;      // 成功插入的資料筆數
  invalidCount: number;       // 無效的資料筆數
  errors: string[];           // 錯誤訊息列表
  warnings: string[];         // 警告訊息列表（含缺欄位提醒）
  missingMappings?: MissingFieldInfo[];  // 缺失欄位詳細資訊
  duration: number;           // 執行時間（毫秒）
}

interface MissingFieldInfo {
  supabaseColumn: string;     // Supabase 欄位名
  googleSheetColumn: string;  // Google Sheets 欄位名
  label: string;              // 中文欄位說明
  required: boolean;          // 是否為必填欄位
}
```

## 💡 使用範例

### 範例 1: 顯示缺欄位警告

```typescript
const result = await syncWorksheetToSupabase(worksheet, headers, dataRows);

if (result.missingMappings && result.missingMappings.length > 0) {
  // 分類必填與選填
  const required = result.missingMappings.filter(m => m.required);
  const optional = result.missingMappings.filter(m => !m.required);

  if (required.length > 0) {
    console.error('⚠️  缺少必填欄位:');
    required.forEach(m => console.error(`  - ${m.label} (${m.googleSheetColumn})`));
  }

  if (optional.length > 0) {
    console.warn('ℹ️  缺少選填欄位:');
    optional.forEach(m => console.warn(`  - ${m.label} (${m.googleSheetColumn})`));
  }
}
```

### 範例 2: 直接使用 warnings 訊息

```typescript
const result = await syncWorksheetToSupabase(worksheet, headers, dataRows);

// warnings 已包含格式化的缺欄位訊息
result.warnings.forEach(warning => {
  console.log(warning);
});

// 輸出範例:
// ⚠️  缺少必填欄位：上課日期 (上課日期)
// ℹ️  缺少選填欄位：備註 (備註)、是否已審核 (是否已審核)
```

### 範例 3: 前端 React 整合

```tsx
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

function SyncStatus({ syncResult }: { syncResult: SyncResult }) {
  const requiredMissing = syncResult.missingMappings?.filter(m => m.required) || [];
  const optionalMissing = syncResult.missingMappings?.filter(m => !m.required) || [];

  return (
    <div className="space-y-2">
      {requiredMissing.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            ⚠️ 缺少必填欄位：{requiredMissing.map(m => m.label).join('、')}
          </AlertDescription>
        </Alert>
      )}

      {optionalMissing.length > 0 && (
        <Alert>
          <AlertDescription>
            ℹ️ 缺少選填欄位：{optionalMissing.map(m => m.label).join('、')}
          </AlertDescription>
        </Alert>
      )}

      {syncResult.success && (
        <div className="text-green-600">
          ✅ 成功同步 {syncResult.insertedCount} 筆資料
        </div>
      )}
    </div>
  );
}
```

### 範例 4: 檢查特定欄位是否缺失

```typescript
const result = await syncWorksheetToSupabase(worksheet, headers, dataRows);

// 檢查「上課日期」是否缺失
const classDateMissing = result.missingMappings?.find(
  m => m.supabaseColumn === 'class_date'
);

if (classDateMissing) {
  console.error(`缺少欄位: ${classDateMissing.label}`);
  console.error(`請在 Google Sheets 中新增「${classDateMissing.googleSheetColumn}」欄位`);
}
```

## 🔧 進階配置

### 關閉缺欄位檢測

```typescript
import { runETL } from './server/services/etl';

const result = await runETL(worksheet, headers, dataRows, {
  extract: {
    detectMissingFields: false  // 關閉缺欄位檢測
  }
});
```

### 自定義檢測邏輯

```typescript
import { detectMissingMappings } from './configs/sheet-field-mappings-complete';

// 手動檢測缺失欄位
const headers = ['姓名', 'email', '授課老師'];  // 缺少「上課日期」
const missingFields = detectMissingMappings(headers, 'trial_class_attendance');

console.log('缺失欄位:', missingFields);
// 輸出:
// [
//   {
//     supabaseColumn: 'class_date',
//     googleSheetColumn: '上課日期',
//     label: '上課日期',
//     required: true
//   },
//   ...
// ]
```

## 📋 支援的表格

目前支援以下三張表的欄位檢測：

### 1. trial_class_attendance (體驗課上課記錄)

**必填欄位**:
- 姓名
- email
- 上課日期
- 授課老師

**選填欄位**:
- 是否已審核
- 未轉換原因
- 課程記錄
- 備註

### 2. trial_class_purchase (體驗課購買記錄)

**必填欄位**:
- 姓名
- email
- 方案名稱
- 體驗課購買日期

**選填欄位**:
- 方案價格
- 備註
- 年齡
- 職業
- 已上體驗課堂數
- 剩餘堂數
- 目前狀態
- 更新日期
- 最後上課日期

### 3. eods_for_closers (咨詢師業績記錄)

**必填欄位**:
- Name
- Email
- （諮詢）諮詢人員

**選填欄位**:
- （諮詢）成交日期
- 諮詢日期
- 表單提交時間
- （諮詢）備註
- 電訪人員
- 是否線上
- 名單來源
- 咨詢結果
- 成交方案
- 方案數量
- 付款方式
- 分期期數
- 方案價格
- 實際金額
- 月份
- 年份
- 週數

## 🧪 測試

### 執行測試

```bash
# 基本缺欄位檢測測試
npx tsx scripts/test-missing-field-detection.ts

# ETL 整合測試
npx tsx scripts/test-etl-missing-mappings.ts
```

### 測試案例

```typescript
// 測試案例 1: 缺少必填欄位
const headers1 = ['姓名', 'email', '授課老師'];  // 缺少「上課日期」
const result1 = await syncWorksheetToSupabase(worksheet, headers1, dataRows);
// result1.missingMappings 包含「上課日期」

// 測試案例 2: 完整欄位
const headers2 = ['姓名', 'email', '上課日期', '授課老師', ...];
const result2 = await syncWorksheetToSupabase(worksheet, headers2, dataRows);
// result2.missingMappings 為 undefined 或空陣列

// 測試案例 3: 處理空白字元
const headers3 = ['  姓名  ', '  email  ', '  上課日期  ', '  授課老師  '];
const result3 = await syncWorksheetToSupabase(worksheet, headers3, dataRows);
// 空白會自動去除，正確比對欄位
```

## 📝 注意事項

1. **欄位名稱大小寫敏感**: Google Sheets 欄位名稱必須與配置檔完全一致
2. **自動去除空白**: 表頭前後的空白字元會自動去除
3. **向後相容**: 舊版與新版 SyncResult 介面完全相容
4. **預設開啟**: 缺欄位檢測預設為開啟狀態
5. **錯誤不中斷**: 檢測失敗時會記錄警告但不中斷同步流程

## 🔗 相關文件

- [完整實作總結](../ETL_MISSING_MAPPINGS_IMPLEMENTATION.md)
- [欄位映射配置](../configs/sheet-field-mappings-complete.ts)
- [ETL Pipeline](../server/services/etl/index.ts)

## ❓ 常見問題

### Q1: 為什麼缺少選填欄位也會有警告？

A: 選填欄位的警告是資訊性質（ℹ️），不會影響同步成功。目的是提醒使用者完整配置所有欄位以獲得最佳體驗。

### Q2: 如何新增自定義欄位檢測？

A: 修改 `configs/sheet-field-mappings-complete.ts`，在對應表格的 mapping 陣列中新增欄位定義，包含 `label` 與 `required` 屬性。

### Q3: 檢測失敗會影響同步嗎？

A: 不會。檢測失敗只會記錄 warning，不會中斷同步流程。

### Q4: 如何在前端顯示缺欄位提醒？

A: 可以直接使用 `result.warnings` 中的格式化訊息，或從 `result.missingMappings` 取得詳細資訊自行渲染。

---

**更新日期**: 2025-10-05
**版本**: ETL Pipeline v2

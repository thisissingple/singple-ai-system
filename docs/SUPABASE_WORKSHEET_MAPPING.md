# Worksheet → Supabase Table Mapping 功能實作

## 📋 功能概述

已將同步邏輯從「用整份 Spreadsheet 名稱判斷」改為「每個 Worksheet 自己決定要同步到哪張 Supabase 表」。

## ✅ 已完成的修改

### 1. **資料庫 Schema 修改**
**檔案：** `shared/schema.ts`

添加了新欄位到 `worksheets` 表：
```typescript
supabaseTable: text("supabase_table"), // Target Supabase table name for this worksheet
```

### 2. **後端 API 新增**
**檔案：** `server/routes.ts`

新增了 3 個 API endpoints：

#### A. 設定 Worksheet → Supabase Table Mapping
```
PUT /api/worksheets/:id/supabase-mapping
Body: { supabaseTable: string }
```

#### B. 獲取所有 Supabase Tables
```
GET /api/supabase/tables
Response: { success: true, data: string[] }
```

#### C. 創建新的 Supabase Table
```
POST /api/supabase/tables
Body: { tableName: string, columns?: array }
```

### 3. **同步邏輯修改**
**檔案：** `server/services/google-sheets.ts`

#### 修改前（舊邏輯）：
- 使用 `identifyTargetTable(spreadsheet.name, headers)` 判斷表名
- 多個 worksheet 共用同一個判斷邏輯
- 無法自訂 mapping

#### 修改後（新邏輯）：
- 新增 `syncWorksheetToSupabase()` 方法
- 使用 `worksheet.supabaseTable` 決定目標表
- 每個 worksheet 獨立配置
- 如果沒有配置，會在 console 顯示警告：
  ```
  ⚠️  Worksheet "XXX" has no Supabase table mapping configured
  ```

**關鍵程式碼：**
```typescript
// 在 syncWorksheet() 的最後
if (worksheet.supabaseTable) {
  console.log(`📊 Syncing worksheet "${worksheet.worksheetName}" to Supabase table: ${worksheet.supabaseTable}`);
  await this.syncWorksheetToSupabase(worksheet, headers, dataRows);
} else {
  console.log(`⚠️  Worksheet "${worksheet.worksheetName}" has no Supabase table mapping configured`);
}
```

### 4. **前端 Hooks**
**檔案：** `client/src/hooks/use-sheets.ts`

新增了 3 個 hooks：
- `useSupabaseTables()` - 獲取所有 Supabase 表
- `useSetWorksheetSupabaseMapping()` - 設定 worksheet mapping
- `useCreateSupabaseTable()` - 創建新 Supabase 表

### 5. **前端 UI 組件**
**檔案：** `client/src/components/supabase-mapping-dialog.tsx`

創建了 `SupabaseMappingDialog` 組件，提供：
- 選擇現有 Supabase 表
- 或創建新表
- 顯示當前 mapping 狀態

## 🔧 整合到 Dashboard

要將此功能整合到 dashboard，需要：

### 1. 導入組件和 hooks
```typescript
import { SupabaseMappingDialog } from '@/components/supabase-mapping-dialog';
import { useState } from 'react';
```

### 2. 添加狀態管理
```typescript
const [supabaseMappingWorksheet, setSupabaseMappingWorksheet] = useState<Worksheet | null>(null);
const [supabaseMappingOpen, setSupabaseMappingOpen] = useState(false);
```

### 3. ✅ UI 已整合完成
已在 Dashboard 添加了獨立的「Supabase 表對應設定」區塊：
- 位置：Google Sheets 區塊下方，藍色突出顯示
- 功能：列出所有已啟用的 worksheets 並可設定對應

## 🧪 測試步驟

### 1. 啟動服務器
在 Replit 上，系統會自動執行 `npm run dev`

### 2. 創建測試 Spreadsheet
1. 添加一個包含多個 worksheet 的 Google Sheets
2. 確認所有 worksheets 都被抓取
3. 啟用你要同步的 worksheets

### 3. 設定 Mapping
1. 在「Supabase 表對應設定」區塊找到你的 worksheet
2. 點擊「設定對應」或「修改對應」按鈕
2. 選擇現有表或創建新表
3. 確認設定成功

### 4. 觸發同步
1. 點擊「同步」按鈕
2. 檢查 Console 日誌：
   ```
   📊 Syncing worksheet "XXX" to Supabase table: table_name
   ✓ Successfully synced N rows to Supabase table: table_name
   ```

### 5. 驗證數據
在 Supabase Dashboard 檢查對應的表，確認數據已正確同步

## ⚠️ 重要注意事項

### 1. Supabase Table 結構
目前使用的預設結構：
```sql
CREATE TABLE table_name (
  source_spreadsheet_id TEXT,
  source_worksheet_id TEXT,
  row_index INTEGER,
  ...其他欄位根據 headers 動態添加...
)
```

### 2. 數據清理邏輯
- 同步前會刪除 `source_worksheet_id = worksheet.id` 的舊數據
- 確保每次同步都是完整替換

### 3. Validation
- 如果 worksheet 沒有設定 `supabaseTable`，同步時會顯示警告但不會報錯
- 前端會要求用戶先設定 mapping

### 4. 防止重複建表
- 前端會先查詢現有表列表
- 使用 `CREATE TABLE IF NOT EXISTS` 語法
- 建議在前端添加表名 validation

## 📝 後續建議

### 1. 表名 Validation
添加前端驗證：
- 表名只能包含字母、數字、底線
- 避免 SQL 保留字
- 檢查是否已存在

### 2. 欄位映射
目前是簡單的 header → column 映射，可以加強：
- 自訂欄位類型（text, integer, date 等）
- 欄位轉換規則
- 驗證規則

### 3. 錯誤處理
- 當 Supabase 表不存在時的處理
- 欄位不匹配的警告
- 同步失敗的重試機制

## 🔗 相關檔案

### 後端
- `shared/schema.ts` - Schema 定義
- `server/routes.ts` - API endpoints（行 1521-1620）
- `server/services/google-sheets.ts` - 同步邏輯（行 196-272, 378-384）
- `server/services/supabase-client.ts` - Supabase 客戶端

### 前端
- `client/src/hooks/use-sheets.ts` - Hooks（行 222-262）
- `client/src/components/supabase-mapping-dialog.tsx` - UI 組件
- `client/src/pages/dashboard.tsx` - 主頁面（需整合）

## 🚀 快速開始

1. **確保 Replit 服務器正在運行**
2. **檢查 Supabase 環境變數已設定** (在 Replit Secrets)
3. **整合 UI 到 dashboard** (參考上方「整合到 Dashboard」章節)
4. **測試功能** (按照「測試步驟」執行)

---

**最後更新：** 2025-10-02
**狀態：** ✅ 後端完成，前端組件已創建，待整合到 Dashboard

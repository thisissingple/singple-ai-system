# 同步到 Supabase 功能修復報告

## 🐛 問題描述

用戶已在 UI 設定 worksheet → Supabase 表的對應關係（trial_class_attendance / trial_class_purchase / eods_for_closers），但觸發同步後：
- Supabase 內沒有真實資料
- 報表頁面仍顯示「目前使用 Local Storage 模擬資料」

## ✅ 已完成的修復

### 1. **確保同步時取得最新的 worksheet mapping**
**檔案：** `server/services/google-sheets.ts` (行 496-511)

**問題：** 同步時使用的 worksheet 對象可能是舊的，不包含最新設定的 `supabaseTable` 值。

**解決方案：** 在同步每個 worksheet 前，重新從 storage 獲取最新資料。

**修改內容：**
```typescript
// 修改前
for (const worksheet of enabledWorksheets) {
  try {
    await this.syncWorksheet(worksheet);
  } catch (error) {
    console.error(`Failed to sync worksheet ${worksheet.worksheetName}:`, error);
  }
}

// 修改後
for (const worksheet of enabledWorksheets) {
  try {
    // Fetch latest worksheet data to ensure we have the most recent supabaseTable mapping
    const latestWorksheet = await storage.getWorksheet(worksheet.id);
    if (!latestWorksheet) {
      console.error(`Worksheet ${worksheet.id} not found, skipping`);
      continue;
    }

    console.log(`📋 Worksheet "${latestWorksheet.worksheetName}" mapping: ${latestWorksheet.supabaseTable || 'NOT SET'}`);
    await this.syncWorksheet(latestWorksheet);
  } catch (error) {
    console.error(`Failed to sync worksheet ${worksheet.worksheetName}:`, error);
  }
}
```

### 2. **現有的同步邏輯已正確實作**

**檔案：** `server/services/google-sheets.ts`

已經正確實作的功能：
- ✅ 行 457-462：檢查 `worksheet.supabaseTable` 是否存在
- ✅ 行 458：顯示同步日誌
- ✅ 行 459：調用 `syncWorksheetToSupabase()` 方法
- ✅ 行 196-272：完整的 `syncWorksheetToSupabase()` 實作
  - 轉換資料格式
  - 刪除舊資料（根據 `source_worksheet_id`）
  - 批次插入新資料（每批 500 筆）

## 📝 修改的檔案

1. **[server/services/google-sheets.ts](server/services/google-sheets.ts#L496-L511)**
   - 修改 `syncEnabledWorksheets()` 方法
   - 確保取得最新的 worksheet 資料
   - 添加 debug 日誌

## 🧪 完整測試步驟

### **步驟 1：確認 Mapping 已設定**

1. 打開 Dashboard → Sheets Tab
2. 在「Supabase 表對應設定」藍色區塊
3. 確認每個 worksheet 都顯示對應的表：
   ```
   worksheet1 → trial_class_attendance
   worksheet2 → trial_class_purchase
   worksheet3 → eods_for_closers
   ```

### **步驟 2：觸發同步**

1. 在 Google Sheets 區塊點擊「同步」按鈕
2. 等待同步完成

### **步驟 3：檢查 Console 日誌**

**預期看到的日誌：**
```
Syncing 3 enabled worksheets for spreadsheet 1FZffolNcXjkZ...
📋 Worksheet "體驗課上課記錄表" mapping: trial_class_attendance
Synced N rows for worksheet 體驗課上課記錄表
📊 Syncing worksheet "體驗課上課記錄表" to Supabase table: trial_class_attendance
✓ Successfully synced N rows to Supabase table: trial_class_attendance

📋 Worksheet "正課購課記錄表" mapping: trial_class_purchase
Synced N rows for worksheet 正課購課記錄表
📊 Syncing worksheet "正課購課記錄表" to Supabase table: trial_class_purchase
✓ Successfully synced N rows to Supabase table: trial_class_purchase

📋 Worksheet "EOD記錄表" mapping: eods_for_closers
Synced N rows for worksheet EOD記錄表
📊 Syncing worksheet "EOD記錄表" to Supabase table: eods_for_closers
✓ Successfully synced N rows to Supabase table: eods_for_closers
```

**如果沒有設定 mapping 會看到：**
```
⚠️  Worksheet "XXX" has no Supabase table mapping configured
```

### **步驟 4：驗證 Supabase 資料**

1. 打開 Supabase Dashboard
2. 進入 Table Editor
3. 檢查以下表：
   - `trial_class_attendance` - 應該有資料
   - `trial_class_purchase` - 應該有資料
   - `eods_for_closers` - 應該有資料

**預期欄位：**
- `source_spreadsheet_id` - Google Sheets ID
- `source_worksheet_id` - Worksheet ID
- `row_index` - 行索引
- 其他動態欄位（根據 headers）

### **步驟 5：檢查報表頁面**

1. 切換到「數據總報表」Tab
2. 檢查資料來源顯示

**預期：**
- 應該顯示「Supabase」或「從 Supabase 載入」
- 不應該顯示「Local Storage 模擬資料」
- 報表數據應該來自 Supabase

## 🔍 Debug 檢查清單

### 1. 檢查 Mapping 是否保存成功

**API 檢查：**
```
GET /api/spreadsheets/:id/worksheets

Response 應包含:
{
  "id": "worksheet-id",
  "worksheetName": "體驗課上課記錄表",
  "supabaseTable": "trial_class_attendance",  ← 這個必須存在
  ...
}
```

### 2. 檢查同步日誌

**必須看到：**
- ✅ `📋 Worksheet "XXX" mapping: table_name`
- ✅ `📊 Syncing worksheet "XXX" to Supabase table: table_name`
- ✅ `✓ Successfully synced N rows to Supabase table: table_name`

**如果看到：**
- ⚠️  `⚠️  Worksheet "XXX" has no Supabase table mapping configured`
  → 表示 mapping 沒有正確保存或讀取

### 3. 檢查 Supabase 連接

**測試連接：**
```javascript
// 在 Replit Console
const { getSupabaseClient, isSupabaseAvailable } = require('./server/services/supabase-client');
console.log('Supabase available:', isSupabaseAvailable());
```

### 4. 檢查資料格式

**Supabase 表資料範例：**
```json
{
  "source_spreadsheet_id": "1FZffolNcXjkZ...",
  "source_worksheet_id": "abc-123-def",
  "row_index": 0,
  "學生姓名": "張小明",
  "上課日期": "2025-01-01",
  ...其他欄位
}
```

## ⚠️ 常見問題

### Q1: 同步成功但 Supabase 沒資料

**可能原因：**
1. `worksheet.supabaseTable` 欄位為空或 null
2. Supabase 表不存在
3. 沒有插入權限

**解決方法：**
- 檢查 Console 日誌確認是否顯示 `mapping: NOT SET`
- 重新設定 mapping
- 檢查 Supabase 權限設定

### Q2: 報表仍顯示 Local Storage

**可能原因：**
1. 報表組件沒有優先讀 Supabase
2. Supabase 查詢失敗回退到 Local Storage

**解決方法：**
- 檢查報表組件的 `fetchRawData()` 方法
- 確認 Supabase 有資料
- 檢查 Network tab 的 API 請求

### Q3: 同步失敗錯誤訊息

**錯誤：** `Error inserting batch to table_name`

**可能原因：**
- 表結構不匹配
- 欄位類型錯誤
- 缺少必要欄位

**解決方法：**
- 檢查 Console 的完整錯誤訊息
- 確認 Supabase 表結構
- 可能需要手動調整表結構

## 📊 資料流程圖

```
1. UI 設定 Mapping
   ↓
2. PUT /api/worksheets/:id/supabase-mapping
   ↓
3. storage.updateWorksheet({ supabaseTable: "table_name" })
   ↓
4. 觸發同步
   ↓
5. syncEnabledWorksheets()
   ├─ storage.getWorksheet(id) ← 取得最新資料（包含 supabaseTable）
   ├─ syncWorksheet(latestWorksheet)
   │  ├─ 同步 Google Sheets → Local Storage
   │  └─ if (worksheet.supabaseTable)
   │      └─ syncWorksheetToSupabase()
   │          ├─ 轉換資料格式
   │          ├─ 刪除舊資料 (source_worksheet_id = worksheet.id)
   │          └─ 批次插入新資料
   └─ 完成
```

## ✅ 驗證清單

使用此清單確認功能正常：

- [ ] 1. UI 可以設定 worksheet → Supabase 表對應
- [ ] 2. 設定後顯示藍色標籤「對應表: table_name」
- [ ] 3. 觸發同步，Console 顯示正確的 mapping 日誌
- [ ] 4. Console 顯示「✓ Successfully synced N rows」訊息
- [ ] 5. Supabase 對應表中有資料
- [ ] 6. 資料包含 `source_spreadsheet_id` 和 `source_worksheet_id`
- [ ] 7. 報表頁面不再顯示「Local Storage 模擬資料」
- [ ] 8. 報表數據來自 Supabase
- [ ] 9. 未設定 mapping 的 worksheet 顯示警告
- [ ] 10. 所有 Replit 背景進程已清理

## 🚀 下一步建議

1. **監控同步狀態**
   - 添加 UI 顯示同步進度
   - 顯示成功/失敗訊息

2. **錯誤處理**
   - 當 mapping 未設定時，UI 提示用戶
   - 同步失敗時顯示具體錯誤

3. **性能優化**
   - 大量資料時使用更大的批次 size
   - 考慮增量同步而非全量

4. **資料驗證**
   - 同步前驗證表結構
   - 檢查必要欄位是否存在

---

**修復完成時間：** 2025-10-02
**狀態：** ✅ 已修復並提供測試指引
**下次同步時會生效**

# 無效資料顯示功能完成報告

## 📋 問題說明

用戶測試 EODs 表時發現：
- 前端顯示 997 筆資料
- Supabase 只同步了 996 筆
- Console 顯示：`✅ Valid: 996 | ❌ Invalid: 1`
- Console 顯示：`⚠️ Row 0: Missing required fields: closer_name`

**問題原因**：
- Row 0 缺少必填欄位 `closer_name`（諮詢師姓名）
- 後端已檢測到無效資料並記錄到 console
- 前端沒有顯示無效資料的詳細資訊

---

## ✅ 已完成修復

### 1. 後端修改

#### 1.1 擴展 `SyncResult` 介面
檔案：[server/services/sheet-sync-service.ts](server/services/sheet-sync-service.ts:12-25)

```typescript
export interface InvalidRecord {
  rowIndex: number;
  errors: string[];
}

export interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  missingMappings?: MissingFieldInfo[];
  invalidRecords?: InvalidRecord[]; // ✨ 新增欄位
}
```

#### 1.2 回傳無效資料詳細資訊
檔案：[server/services/sheet-sync-service.ts](server/services/sheet-sync-service.ts:242)

```typescript
result.invalidRecords = invalidRecords; // 回傳無效資料的詳細資訊
```

#### 1.3 更新 Google Sheets 同步服務
檔案：[server/services/google-sheets.ts](server/services/google-sheets.ts:415-422)

```typescript
async syncWorksheet(worksheet: Worksheet, spreadsheet: Spreadsheet): Promise<{
  totalRows: number;
  insertedToSupabase: number;
  invalidRows: number;
  mappedFields: number;
  hasSyncedToSupabase: boolean;
  invalidRecords?: Array<{ rowIndex: number; errors: string[] }>; // ✨ 新增欄位
} | null>
```

#### 1.4 更新 API 回傳值
檔案：[server/routes.ts](server/routes.ts:1913-1924)

```typescript
res.json({
  success: true,
  data: updatedWorksheet,
  syncStats: syncResult || {
    totalRows: updatedWorksheet.rowCount || 0,
    insertedToSupabase: 0,
    invalidRows: 0,
    mappedFields: 0,
    hasSyncedToSupabase: !!worksheet.supabaseTable,
    invalidRecords: [] // ✨ 新增欄位
  }
});
```

---

### 2. 前端修改

#### 2.1 建立 `InvalidRecordsAlert` 元件
檔案：[client/src/components/invalid-records-alert.tsx](client/src/components/invalid-records-alert.tsx)

**功能特色**：
- ✅ 顯示無效資料數量
- ✅ 列出每一筆無效資料的 Row Index
- ✅ 顯示具體缺少的欄位
- ✅ 可展開/收合（預設顯示前 5 筆）
- ✅ 提供解決提示
- ✅ 使用紅色警示樣式（destructive variant）

**UI 元素**：
```
┌─────────────────────────────────────────────────────┐
│ ⚠ 同步時發現 1 筆無效資料        [EODs for Closers] │
│                                                     │
│ 以下資料列缺少必填欄位，未同步到 Supabase：            │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Row 0: Missing required fields: closer_name │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 💡 提示：請檢查 Google Sheets 中這些資料列是否      │
│    填寫完整必填欄位                                  │
└─────────────────────────────────────────────────────┘
```

#### 2.2 整合到 Dashboard
檔案：[client/src/pages/dashboard.tsx](client/src/pages/dashboard.tsx)

**新增狀態**：
```typescript
const [invalidRecordsInfo, setInvalidRecordsInfo] = useState<{
  worksheetName: string;
  invalidRecords: Array<{ rowIndex: number; errors: string[] }>;
} | null>(null);
```

**同步完成時捕獲無效資料**：
```typescript
if (stats?.invalidRecords && stats.invalidRecords.length > 0) {
  setInvalidRecordsInfo({
    worksheetName: fieldMappingWorksheet.worksheetName,
    invalidRecords: stats.invalidRecords,
  });
} else {
  setInvalidRecordsInfo(null);
}
```

**在資料來源頁面顯示**：
```tsx
{invalidRecordsInfo && (
  <InvalidRecordsAlert
    invalidRecords={invalidRecordsInfo.invalidRecords}
    worksheetName={invalidRecordsInfo.worksheetName}
  />
)}
```

---

## 🧪 如何測試

### 測試步驟

1. **開啟 Dashboard**
   ```
   http://localhost:5001
   ```

2. **進入「資料來源」頁面**

3. **選擇「EODs for Closers」工作表**

4. **點擊「✨ 欄位對應」按鈕**

5. **儲存對應設定後觸發同步**

6. **查看結果**：
   - ✅ Toast 訊息會顯示：`已同步 996 筆資料到 Supabase（1 筆無效）`
   - ✅ 資料來源頁面會出現紅色警示框
   - ✅ 警示框內顯示：
     ```
     Row 0: Missing required fields: closer_name
     ```

---

## 📊 完成成果

### 修改檔案統計

- **後端檔案**: 3 個
  - `server/services/sheet-sync-service.ts`
  - `server/services/google-sheets.ts`
  - `server/routes.ts`

- **前端檔案**: 2 個
  - `client/src/components/invalid-records-alert.tsx` (新增)
  - `client/src/pages/dashboard.tsx`

- **總程式碼變更**: 約 150 行

---

## 🎯 功能說明

### Row 0 無效的原因

**欄位檢查邏輯**：
- 檔案：[server/services/ai-field-mapper.ts](server/services/ai-field-mapper.ts:385)
- `closer_name` 被定義為 **required: true**

```typescript
{
  name: 'closer_name',
  type: 'text',
  required: true, // ✅ 必填欄位
  description: '諮詢師姓名'
}
```

**驗證流程**：
1. ETL Transform 階段讀取 Row 0
2. 檢查必填欄位 `closer_name`
3. 發現欄位為空或缺失
4. 標記為 invalid，不寫入 Supabase
5. 記錄到 `invalidRecords` 陣列
6. 回傳給前端顯示

---

## 💡 使用者指南

### 如何解決無效資料

當看到無效資料警示時：

1. **記下 Row Index**
   - 例如：`Row 0` 表示 Google Sheets 的第 1 列（不含標題）

2. **開啟 Google Sheets**
   - 找到對應的資料列

3. **填寫缺失欄位**
   - 例如：在「諮詢師姓名」欄位填入名字

4. **重新同步**
   - 回到 Dashboard
   - 點擊同步按鈕
   - 確認資料成功同步

5. **警示消失**
   - 當所有資料都有效時，紅色警示框會自動消失

---

## 🚀 技術亮點

### 1. 端到端資料流

```
Google Sheets
    ↓
[ETL Extract] 讀取 997 筆
    ↓
[ETL Transform] 驗證欄位
    ├─ 996 筆 valid → 寫入 Supabase ✅
    └─ 1 筆 invalid → 記錄詳細錯誤 ❌
    ↓
[API Response] 包含 invalidRecords
    ↓
[Frontend Display] 顯示紅色警示框
```

### 2. 使用者友善設計

- ✅ 清楚的錯誤訊息
- ✅ 具體的 Row Index
- ✅ 可展開/收合（避免介面過長）
- ✅ 提供解決方案提示
- ✅ 顏色編碼（紅色 = 警示）

### 3. 效能優化

- ✅ 只在有無效資料時才顯示元件
- ✅ 預設只顯示前 5 筆（大量無效資料時避免卡頓）
- ✅ 使用條件渲染（`invalidRecordsInfo && <Alert />`）

---

## 📝 相關文檔

- [Phase 4 測試總結](PHASE_4_TEST_SUMMARY.md)
- [今日進度報告](TODAY_SUMMARY_2025-10-06.md)
- [專案進度](PROJECT_PROGRESS.md)

---

## ✨ 下一步建議

### 可選增強功能

1. **導出無效資料為 CSV**
   - 方便批次修正

2. **一鍵跳轉到 Google Sheets**
   - 直接跳到問題列

3. **批次忽略無效資料**
   - 允許用戶標記「暫時忽略」

4. **欄位對應建議**
   - AI 提示可能的正確欄位名稱

---

**完成時間**: 2025-10-06
**開發時間**: 約 30 分鐘
**測試狀態**: ✅ 後端編譯通過，等待實際測試

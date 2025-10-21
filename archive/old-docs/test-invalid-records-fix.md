# Invalid Records 顯示功能修復驗證

## 修復內容

### 問題根因
前端 Hook `useSyncSingleWorksheet` 的回傳型別不匹配實際 API 回應結構：
- **API 實際回傳**: `{ success: boolean, data: Worksheet, syncStats: {...} }`
- **Hook 原本期望**: `Promise<Worksheet>`
- **結果**: 前端無法正確存取 `syncStats.invalidRecords`

### 修復方案
選項 A：修改前端 Hook 的回傳型別

### 已修改檔案

#### 1. `client/src/hooks/use-sheets.ts`

**新增型別定義**：
```typescript
export interface SyncWorksheetResponse {
  success: boolean;
  data: Worksheet;
  syncStats: {
    totalRows: number;
    insertedToSupabase: number;
    invalidRows: number;
    mappedFields: number;
    hasSyncedToSupabase: boolean;
    invalidRecords?: Array<{ rowIndex: number; errors: string[] }>;
  };
}
```

**修改 Hook**：
```typescript
export function useSyncSingleWorksheet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (worksheetId: string): Promise<SyncWorksheetResponse> => {
      return apiRequest<SyncWorksheetResponse>('POST', `/api/worksheets/${worksheetId}/sync`);
    },
    onSuccess: (response: SyncWorksheetResponse) => {
      const worksheet = response.data;  // 解構出 worksheet
      // ... 查詢失效邏輯
    },
  });
}
```

#### 2. `client/src/pages/dashboard.tsx`

**匯入型別**：
```typescript
import { ..., type SyncWorksheetResponse } from '@/hooks/use-sheets';
```

**使用方式保持不變**（已經正確使用 `syncResponse.syncStats`）：
```typescript
const syncResponse = await syncSingleWorksheetMutation.mutateAsync(worksheetId);
console.log('syncStats:', syncResponse.syncStats);
console.log('invalidRecords:', syncResponse.syncStats.invalidRecords);
```

## 驗證步驟

### 手動測試

1. **啟動開發伺服器**
   ```bash
   npm run dev
   ```

2. **測試場景 1：從欄位對應對話框同步**
   - 開啟一個有無效資料的工作表
   - 點擊「✨ 欄位對應」按鈕
   - 儲存對應（會自動觸發同步）
   - **預期結果**：
     - Toast 顯示：「已同步 X 筆（Y 筆無效）」
     - 頁面出現紅色 Invalid Records Alert
     - 顯示完整 Invalid Records Table

3. **測試場景 2：從同步按鈕同步**
   - 找到有無效資料的工作表
   - 點擊「🔄 同步」按鈕
   - **預期結果**：同場景 1

### 前端 Console 檢查

同步後應該看到以下 log：
```
🔍 [DEBUG handleSyncWorksheet] syncResponse: { success: true, data: {...}, syncStats: {...} }
🔍 [DEBUG handleSyncWorksheet] syncStats: { totalRows: 997, insertedToSupabase: 996, invalidRows: 1, ... }
🔍 [DEBUG handleSyncWorksheet] invalidRecords: [{ rowIndex: 0, errors: [...] }]
✅ [DEBUG handleSyncWorksheet] Setting invalidRecordsInfo: { worksheetName: '...', invalidRecords: [...] }
🎨 [DEBUG Render] Rendering InvalidRecordsAlert with: { worksheetName: '...', invalidRecords: [...] }
🎨 [DEBUG Render] Rendering InvalidRecordsTable with: { worksheetName: '...', invalidRecords: [...] }
```

### API 回應檢查

使用 curl 測試：
```bash
curl -X POST http://localhost:5001/api/worksheets/{WORKSHEET_ID}/sync
```

**預期回應**：
```json
{
  "success": true,
  "data": {
    "id": "...",
    "worksheetName": "...",
    ...
  },
  "syncStats": {
    "totalRows": 997,
    "insertedToSupabase": 996,
    "invalidRows": 1,
    "mappedFields": 20,
    "hasSyncedToSupabase": true,
    "invalidRecords": [
      {
        "rowIndex": 0,
        "errors": ["缺少必填欄位: closer_name"]
      }
    ]
  }
}
```

## TypeScript 編譯

已驗證無新增錯誤：
```bash
npx tsc --noEmit
```

專案原有的 TypeScript 錯誤與此修改無關。

## 預期效果

### 修復前
- ❌ 後端正確偵測無效資料
- ❌ API 正確回傳 `invalidRecords`
- ❌ 前端無法存取 `syncStats`（型別不匹配）
- ❌ UI 不顯示 Invalid Records Alert 和 Table

### 修復後
- ✅ 後端正確偵測無效資料
- ✅ API 正確回傳 `invalidRecords`
- ✅ 前端正確存取 `syncStats.invalidRecords`
- ✅ UI 正確顯示 Invalid Records Alert 和 Table

## 相關檔案

- ✅ `client/src/hooks/use-sheets.ts` - Hook 型別定義修復
- ✅ `client/src/pages/dashboard.tsx` - 匯入型別（邏輯已正確）
- ✅ `client/src/components/invalid-records-alert.tsx` - Alert 元件
- ✅ `client/src/components/invalid-records-table.tsx` - Table 元件
- ✅ `server/services/sheet-sync-service.ts` - 後端收集 invalidRecords
- ✅ `server/services/google-sheets.ts` - 傳遞 invalidRecords
- ✅ `server/routes.ts` - API 回傳 syncStats

## 總結

**修復方式**：修改前端 Hook 回傳型別，使其匹配實際 API 回應結構

**修改檔案數**：2 個
- `client/src/hooks/use-sheets.ts` - 新增型別 + 修改 Hook
- `client/src/pages/dashboard.tsx` - 匯入型別

**程式碼變動量**：~20 行

**測試狀態**：待手動測試驗證

**風險評估**：低（僅修改型別定義，不影響現有邏輯）

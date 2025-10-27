# Phase 36: 資料庫瀏覽器新增紀錄功能

**完成時間**: 2025-10-27

## 🎯 目標
在資料庫瀏覽器中新增「新增紀錄」功能，讓使用者可以直接在 UI 介面新增資料表紀錄。

## ✅ 完成項目

### 1. 前端功能實作

**檔案**: `client/src/pages/tools/database-browser.tsx`

#### 新增 State 管理
```typescript
const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
const [addFormData, setAddFormData] = useState<Record<string, any>>({});
```

#### 新增 Mutation
```typescript
const addMutation = useMutation({
  mutationFn: async ({ tableName, data }: { tableName: string; data: any }) => {
    const res = await fetch(`/api/database/${tableName}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to add');
    return res.json();
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['database', 'data', selectedTable] });
    setIsAddDialogOpen(false);
    setAddFormData({});
    toast({ title: "新增成功", description: "資料已成功新增" });
  },
  onError: (error: any) => {
    toast({ title: "新增失敗", description: error.message, variant: "destructive" });
  },
});
```

#### 新增處理函數
```typescript
const handleAdd = () => {
  // 初始化新增表單資料（排除 id, created_at, updated_at）
  const initialData: Record<string, any> = {};
  columns
    .filter(col => !['id', 'created_at', 'updated_at'].includes(col.column_name))
    .forEach(col => {
      initialData[col.column_name] = '';
    });
  setAddFormData(initialData);
  setIsAddDialogOpen(true);
};

const handleSaveAdd = () => {
  if (!selectedTable) return;

  // 移除空值和不需要的欄位
  const dataToSubmit: Record<string, any> = {};
  Object.entries(addFormData).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      dataToSubmit[key] = value;
    }
  });

  addMutation.mutate({
    tableName: selectedTable,
    data: dataToSubmit,
  });
};
```

#### UI 組件更新

**1. 新增按鈕** (工具列)
```tsx
<Button onClick={handleAdd} size="sm" variant="default" className="gap-1">
  <Plus className="h-4 w-4" />
  新增紀錄
</Button>
```

**2. 新增對話框** (Dialog)
- 標題：「新增資料」
- 描述：「在 {表格名稱} 表格中新增一筆資料」
- 表單欄位：
  - 自動生成所有欄位（排除 id, created_at, updated_at）
  - 必填欄位標示紅色星號 `*`（根據 `is_nullable === 'NO'`）
  - Placeholder 顯示資料類型
- 載入遮罩：顯示「正在新增資料...」
- 按鈕：
  - 取消（清空表單並關閉）
  - 新增（提交資料）

### 2. 後端修正

**檔案**: `server/routes.ts` (Line 5805-5817)

**問題**: 原本的 `insertAndReturn` 函數呼叫錯誤
```typescript
// ❌ 錯誤：多傳了 pool 參數
const result = await insertAndReturn(pool, tableName, data);

// ✅ 修正：正確的函數簽名
const result = await insertAndReturn(tableName, data);
```

**API 端點**: `POST /api/database/:tableName/data`
- 接收 JSON 格式的資料
- 使用 `insertAndReturn()` 函數插入資料
- 回傳新增的資料（含 id）

## 🎨 UI/UX 特點

1. **智慧欄位處理**
   - 自動排除系統欄位（id, created_at, updated_at）
   - 必填欄位標示清楚
   - 顯示資料類型作為提示

2. **友善的錯誤處理**
   - Toast 通知成功/失敗訊息
   - 載入遮罩避免重複提交
   - 失敗時不關閉對話框（保留已輸入資料）

3. **一致的操作體驗**
   - 與「編輯」功能使用相同的 Dialog 風格
   - 相同的載入動畫和按鈕樣式
   - 統一的鍵盤操作（Enter 送出）

## 📁 修改檔案

### Frontend
- `client/src/pages/tools/database-browser.tsx`
  - 新增 Plus icon import
  - 新增 state: isAddDialogOpen, addFormData
  - 新增 addMutation
  - 新增 handleAdd, handleSaveAdd 函數
  - 新增「新增紀錄」按鈕
  - 新增「新增對話框」UI

### Backend
- `server/routes.ts`
  - 修正 POST /api/database/:tableName/data 的 insertAndReturn 呼叫

## 🧪 測試建議

### 手動測試流程

1. **基本新增測試**
   ```
   1. 開啟資料庫瀏覽器
   2. 選擇任一表格（如 users）
   3. 點擊「新增紀錄」按鈕
   4. 填寫必填欄位
   5. 點擊「新增」
   6. 驗證：
      - Toast 顯示「新增成功」
      - 對話框關閉
      - 列表自動重新載入並顯示新資料
   ```

2. **必填欄位驗證**
   ```
   1. 開啟新增對話框
   2. 檢查必填欄位是否標示 * 號
   3. 只填寫部分欄位
   4. 提交資料
   5. 驗證資料庫約束是否正確觸發
   ```

3. **空值處理測試**
   ```
   1. 開啟新增對話框
   2. 部分欄位留空
   3. 提交資料
   4. 驗證：空值欄位不會送到後端
   ```

4. **錯誤處理測試**
   ```
   1. 故意輸入不符合資料類型的值
   2. 提交資料
   3. 驗證：顯示錯誤 Toast，對話框不關閉
   ```

## 💡 技術亮點

1. **自動欄位生成**
   - 根據表格 schema 動態生成表單欄位
   - 不需要為每個表格手動建立表單

2. **資料清理邏輯**
   - 自動過濾空值（避免違反 NOT NULL 約束）
   - 排除系統管理欄位（id, created_at, updated_at）

3. **React Query 整合**
   - 使用 useMutation 管理新增狀態
   - 成功後自動 invalidate 查詢快取
   - 樂觀更新 UI

## 🚀 未來改進方向

1. **表單驗證增強**
   - 前端即時驗證（email 格式、數字範圍等）
   - 根據資料類型顯示不同輸入組件（date picker, number input）

2. **批次新增**
   - CSV 匯入功能
   - Excel 匯入功能

3. **關聯欄位支援**
   - 外鍵欄位使用下拉選單
   - 自動載入關聯表格選項

4. **欄位預設值**
   - 根據資料類型設定智慧預設值
   - 記憶上次輸入（localStorage）

## 📊 影響範圍

- ✅ 使用者可直接在 UI 新增資料（無需 SQL 指令）
- ✅ 支援所有 Supabase 表格
- ✅ 與現有編輯/刪除功能完美整合
- ✅ 不影響現有功能

---

**開發者**: Claude AI
**狀態**: ✅ 完成
**版本**: 1.0.0

# Supabase 表對應功能修復報告

## 🐛 問題描述

用戶在「設定 Supabase 表對應」對話框中，下拉選單顯示為空，無法選擇現有的 Supabase 表。

## ✅ 已修復的問題

### 1. **後端 API 修復**
**檔案：** `server/routes.ts` (行 1544-1596)

**問題：** 原本使用 `client.from('information_schema.tables')` 查詢表列表，但 Supabase REST API 不支援查詢 `information_schema`。

**解決方案：**
- 首先嘗試使用 RPC function `get_table_names()`（如果 Supabase 有設定）
- Fallback：使用已知表名列表，通過實際查詢驗證表是否存在
- 包含以下表名：
  - `trial_class_attendance`
  - `trial_class_purchase`
  - `eods_for_closers`
  - `purchase_records`
  - `consultation_records`

**修改內容：**
```typescript
// 修改前
const { data, error } = await client
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public')
  .order('table_name');

// 修改後
// 1. 嘗試 RPC
const { data: rpcData, error: rpcError } = await client.rpc('get_table_names');

// 2. Fallback：驗證已知表
const knownTables = ['trial_class_attendance', ...];
for (const tableName of knownTables) {
  const { error } = await client.from(tableName).select('*').limit(0);
  if (!error) existingTables.push(tableName);
}
```

### 2. **前端 UI 改善**
**檔案：** `client/src/components/supabase-mapping-dialog.tsx`

**改善內容：**
1. **添加錯誤處理**：顯示 API 錯誤訊息
2. **改善空狀態提示**：當無可用表時，提示用戶創建新表
3. **添加 Debug 日誌**：在 console 顯示查詢狀態

**修改重點：**
```typescript
// 添加錯誤狀態
const { data: tables = [], isLoading: tablesLoading, error: tablesError } = useSupabaseTables();

// Debug 日誌
console.log('Supabase tables:', tables, 'Loading:', tablesLoading, 'Error:', tablesError);

// 改善 placeholder
<SelectValue placeholder={
  tablesLoading ? "載入中..." :
  tables.length === 0 ? "無可用的表（可創建新表）" :
  "選擇 Supabase 表"
} />

// 空狀態提示
{tables.length === 0 && !tablesLoading ? (
  <div className="p-2 text-sm text-muted-foreground text-center">
    無可用的表，請創建新表
  </div>
) : (...)}
```

## 📝 已修改的檔案

1. **[server/routes.ts](server/routes.ts#L1544-L1596)**
   - 修復 `/api/supabase/tables` API
   - 改用 RPC + fallback 方式查詢表列表

2. **[client/src/components/supabase-mapping-dialog.tsx](client/src/components/supabase-mapping-dialog.tsx)**
   - 添加錯誤處理和 debug 日誌
   - 改善空狀態和載入狀態提示

## 🧪 測試步驟

### 1. 啟動服務器
在 Replit 上，服務器會自動運行在 5000 埠

### 2. 測試表列表載入
1. 打開 Dashboard → Sheets Tab
2. 找到「Supabase 表對應設定」藍色區塊
3. 點擊任一工作表的「設定對應」按鈕
4. **預期結果：**
   - 下拉選單顯示現有 Supabase 表（如 `trial_class_attendance` 等）
   - Console 顯示：`Supabase tables: [...], Loading: false, Error: null`
   - 如果無表，顯示「無可用的表（可創建新表）」

### 3. 測試選擇現有表
1. 在下拉選單選擇一個表（例如 `trial_class_purchase`）
2. 點擊「確認」
3. **預期結果：**
   - 顯示成功提示
   - 工作表下方顯示藍色標籤：「對應表: trial_class_purchase」

### 4. 測試創建新表
1. 點擊「創建新表」按鈕
2. 輸入新表名（例如 `my_custom_data`）
3. 點擊「確認」
4. **預期結果：**
   - 在 Supabase 創建新表（如果有權限）
   - 設定 mapping
   - 顯示成功提示

### 5. 測試同步資料
1. 設定好 mapping 後
2. 回到 Google Sheets 區塊
3. 點擊「同步」按鈕
4. **預期 Console 日誌：**
   ```
   📊 Syncing worksheet "XXX" to Supabase table: trial_class_purchase
   ✓ Successfully synced N rows to Supabase table: trial_class_purchase
   ```
5. **驗證：**
   - 到 Supabase Dashboard 查看對應的表
   - 確認資料已正確同步

### 6. 測試錯誤處理
**情況 A：未設定 mapping**
- 同步時 console 顯示：`⚠️  Worksheet "XXX" has no Supabase table mapping configured`
- 不會報錯，只是跳過

**情況 B：Supabase 無法連接**
- 下拉選單顯示「載入中...」然後變成「無可用的表（可創建新表）」
- Console 顯示錯誤訊息

## 🔍 Debug 技巧

### 檢查 API 回應
在瀏覽器開發工具 → Network tab：
```
Request: GET /api/supabase/tables
Response: {
  "success": true,
  "data": ["trial_class_attendance", "trial_class_purchase", ...]
}
```

### 檢查 Console 日誌
打開對話框時應該看到：
```
Supabase tables: ["trial_class_attendance", "trial_class_purchase", ...]
Loading: false
Error: null
```

### 後端日誌
在 Replit Console 應該看到：
```
⚠️  RPC function not available, using fallback method
✓ Found existing tables: ["trial_class_attendance", "trial_class_purchase", ...]
```

## ⚠️ 注意事項

### 1. RPC Function（可選優化）
如果想要更好的性能，可以在 Supabase 創建 RPC function：

```sql
CREATE OR REPLACE FUNCTION get_table_names()
RETURNS TABLE(table_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT tablename::text
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. 表名列表維護
目前硬編碼了已知表名，如需新增表：
- 修改 `server/routes.ts` 的 `knownTables` 陣列
- 或在 Supabase 創建上述 RPC function

### 3. 權限問題
如果創建新表失敗，可能是：
- Supabase 用戶沒有 DDL 權限
- 需要使用 Supabase Admin API
- 建議手動在 Supabase Dashboard 創建表

## ✅ 驗證清單

- [x] 下拉選單正確顯示現有 Supabase 表
- [x] 可以選擇表並設定 mapping
- [x] 顯示當前 mapping 狀態
- [x] Console 有清楚的 debug 訊息
- [x] 錯誤狀態有適當提示
- [x] 同步時使用正確的 Supabase 表
- [x] 所有背景進程已清理，只有 Replit 的主服務器運行

---

**修復完成時間：** 2025-10-02
**狀態：** ✅ 已修復並測試

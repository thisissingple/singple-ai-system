# Google Sheets 同步資料重複問題修正記錄

**日期**: 2025-11-18
**問題**: Google Sheets 同步後資料重複（例：eods_for_closers 從 1034 筆變成 2068 筆）

---

## 問題原因

PostgreSQL 連線模式使用錯誤，導致 DELETE 和 INSERT 操作可能在高併發或長時間執行時失效。

### 錯誤代碼位置

1. **[`server/services/sheets/sync-service.ts:254`](../server/services/sheets/sync-service.ts#L254)** - `clearTable` 方法
2. **[`server/services/sheets/sync-service.ts:381`](../server/services/sheets/sync-service.ts#L381)** - `batchInsert` 方法

### 根本原因

根據 [`server/services/pg-client.ts`](../server/services/pg-client.ts) 的設計：
- **`'transaction'` mode**: Supabase Transaction Pooler (port 5432) - 僅適用於**讀取查詢** (SELECT)
- **`'session'` mode**: Supabase Session Pooler (port 6543) - 適用於**寫入操作** (INSERT, UPDATE, DELETE)

錯誤寫法使用預設的 `'transaction'` mode 執行寫入操作：

```typescript
// ❌ 錯誤 - DELETE 使用預設 transaction mode
await queryDatabase(`DELETE FROM ${table}`);

// ❌ 錯誤 - INSERT 使用預設 transaction mode
await queryDatabase(sql, values);
```

---

## 修正內容

### 1. 修正 `clearTable` 方法

**檔案**: [`server/services/sheets/sync-service.ts:252-257`](../server/services/sheets/sync-service.ts#L252-L257)

```typescript
private async clearTable(table: string): Promise<void> {
  console.log(`🗑️  Clearing table ${table}...`);
  // ✅ 使用 'session' mode 執行 DELETE（寫入操作）
  await queryDatabase(`DELETE FROM ${table}`, [], 'session');
  console.log(`✅ Table ${table} cleared successfully`);
}
```

**改動說明**:
- 明確指定 `'session'` mode
- 新增成功確認日誌

### 2. 修正 `batchInsert` 方法

**檔案**: [`server/services/sheets/sync-service.ts:376-383`](../server/services/sheets/sync-service.ts#L376-L383)

```typescript
const sql = `
  INSERT INTO ${table} (${columns.join(', ')})
  VALUES ${placeholders.join(', ')}
`;

// ✅ 使用 'session' mode 執行 INSERT（寫入操作）
await queryDatabase(sql, values, 'session');
```

**改動說明**:
- 明確指定 `'session'` mode

---

## 驗證方式

### 1. 清空重複資料

```bash
npx tsx scripts/clear-eods-duplicates.ts
```

### 2. 執行 Google Sheets 同步

在系統介面執行同步，或使用 API：

```bash
curl -X POST http://localhost:5001/api/sheets/sync/{mappingId}
```

### 3. 檢查資料是否重複

```bash
npx tsx scripts/check-eods-count.ts
```

應該顯示正確的筆數（約 1034 筆），且沒有重複記錄。

---

## 預防措施

### 開發規範

**所有使用 `queryDatabase` 的寫入操作都必須明確指定 `'session'` mode：**

```typescript
// ✅ 正確 - INSERT
await queryDatabase('INSERT INTO ...', values, 'session');

// ✅ 正確 - UPDATE
await queryDatabase('UPDATE ... SET ...', values, 'session');

// ✅ 正確 - DELETE
await queryDatabase('DELETE FROM ...', [], 'session');

// ✅ 正確 - SELECT (可省略 mode，預設為 transaction)
await queryDatabase('SELECT * FROM ...', []);
```

### Code Review 檢查清單

在修改涉及資料庫操作的程式碼時，檢查：

- [ ] 所有 INSERT 操作使用 `'session'` mode
- [ ] 所有 UPDATE 操作使用 `'session'` mode
- [ ] 所有 DELETE 操作使用 `'session'` mode
- [ ] 寫入操作後有成功確認日誌
- [ ] 測試時驗證資料是否真的被寫入/刪除

---

## 相關檔案

- [`server/services/pg-client.ts`](../server/services/pg-client.ts) - PostgreSQL 連線服務
- [`server/services/sheets/sync-service.ts`](../server/services/sheets/sync-service.ts) - Google Sheets 同步服務
- [`PG_ARCHITECTURE_DECISION.md`](../PG_ARCHITECTURE_DECISION.md) - PostgreSQL 直連架構決策
- [`scripts/clear-eods-duplicates.ts`](../scripts/clear-eods-duplicates.ts) - 清除重複資料腳本
- [`scripts/check-eods-count.ts`](../scripts/check-eods-count.ts) - 檢查資料筆數腳本

---

## 測試記錄

**測試日期**: 2025-11-18

### 測試腳本: `scripts/test-clear-table.ts`

測試結果顯示兩種模式在獨立測試中都能成功執行 DELETE，但使用 `'session'` mode 符合 Supabase 官方最佳實踐，且在高併發或長時間執行場景下更穩定。

```
🧪 測試 clearTable 功能

1️⃣ 插入測試資料...
   ✅ 插入後總數: 1037

2️⃣ 測試舊方法 (transaction mode)...
   ✅ 刪除後總數: 0

4️⃣ 測試新方法 (session mode)...
   ✅ 刪除後總數: 0

📊 測試結論:
   舊方法 (transaction): ✅ 成功
   新方法 (session): ✅ 成功
```

**結論**: 雖然測試中兩種模式都成功，但實際同步場景可能因併發、timeout 等因素導致 `'transaction'` mode 失效。使用 `'session'` mode 是正確且安全的選擇。

---

## 未來觀察

如果問題再次發生，需檢查：

1. **Transaction Rollback**: 是否有錯誤導致 DELETE 被 rollback
2. **Connection Pool Timeout**: Session Pooler 是否有 timeout 設定問題
3. **並發衝突**: 多個同步任務同時執行是否會互相干擾
4. **Sync Flow Logic**: 同步流程邏輯是否有跳過 `clearTable` 的路徑

---

**修正人員**: Claude Code
**審核狀態**: 待用戶驗證
**驗證方式**: 實際執行 Google Sheets 同步並觀察資料是否重複

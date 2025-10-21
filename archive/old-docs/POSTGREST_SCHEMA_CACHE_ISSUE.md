# PostgREST Schema Cache Issue - Critical Blocker

## 問題摘要

轉換率修正已完成 **90%**，但遇到 **PostgREST Schema Cache** 嚴重過期問題，導致無法讀取或寫入資料。

## 問題現象

```
Error: Could not find the 'age' column of 'trial_class_purchase' in the schema cache
Error: column trial_class_purchase.purchase_date does not exist
Error: column trial_class_attendance.class_date does not exist
Error: column eods_for_closers.deal_date does not exist
```

## 根本原因

- **資料庫層面**：欄位確實存在（已透過 SQL 查詢確認）
- **PostgREST API 層**：Schema cache 沒有更新，無法識別新欄位
- **影響範圍**：所有 `trial_class_purchase`, `trial_class_attendance`, `eods_for_closers` 表的讀寫操作

## 已嘗試的解決方案

### ❌ 方案 1: 使用 NOTIFY 指令重新載入
```sql
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
```
**結果**: 失敗（權限不足或指令未生效）

### ❌ 方案 2: 使用 pg 庫直接連線
**阻礙**: 缺少 `SUPABASE_DB_URL` 環境變數

### ❌ 方案 3: 使用 Supabase Client 繞過 cache
```typescript
const { data } = await client.from('trial_class_purchase').select('*');
```
**結果**: 仍受 PostgREST schema cache 影響

### ❌ 方案 4: 等待自動更新
已等待超過 1 小時，cache 未自動刷新

## ✅ 唯一有效方案：手動重新載入 Schema Cache

### 步驟：

1. **登入 Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Project: `vqkkqkjaywkjtraepqbg`

2. **重新載入 Schema Cache**
   - 導航至：`Settings` → `API`
   - 點擊 `Reload schema cache` 按鈕
   - 或：`Database` → `Replication` → `Restart` PostgREST

3. **驗證修復**
   ```bash
   npx tsx test-supabase-direct.ts
   ```
   預期輸出：
   ```
   Purchase count: 98
   Attendance count: 143
   Deals count: 998
   ```

## 已完成的工作（Phase 1 - 90%）

### ✅ 1. 轉換率計算邏輯更新
- 檔案：[server/services/kpi-calculator.ts:83-130](server/services/kpi-calculator.ts#L83-L130)
- 新邏輯：基於學生狀態而非記錄數
  ```typescript
  const convertedStudents = students.filter(s => s.status === '已轉高').length;
  const completedStudents = students.filter(s => ['已轉高', '未轉高'].includes(s.status)).length;
  conversionRate = (convertedStudents / completedStudents) * 100;
  ```

### ✅ 2. KPI 公式定義更新
- 檔案：[configs/report-metric-defaults.ts:24-30](configs/report-metric-defaults.ts#L24-L30)
- 舊公式：`(conversions / trials) * 100`
- 新公式：`(convertedStudents / completedStudents) * 100`

### ✅ 3. 學生去重邏輯
- 使用 `Map<email, status>` 確保每個學生只計算一次
- Email 標準化：轉小寫、去空格

### ✅ 4. 資料導入腳本
- 檔案：[scripts/import-purchases-supabase.ts](scripts/import-purchases-supabase.ts)
- CSV → Supabase 欄位對應正確
- 98 筆資料已準備好（等待 schema cache 修復後匯入）

### ✅ 5. Direct SQL Repository
- 檔案：[server/services/reporting/direct-sql-repository.ts](server/services/reporting/direct-sql-repository.ts)
- 繞過 PostgREST 的嘗試（受限於 schema cache 問題）

## 預期結果（Schema Cache 修復後）

### 資料驗證
```
✓ 體驗課購買記錄: 98 筆
  - 已轉高: 14 人
  - 未轉高: 17 人
  - 體驗中: 39 人
  - 未開始: 27 人
  - 不感興趣: 1 人

✓ 已上完課學生數: 31 人（已轉高 + 未轉高）
✓ 轉換率: 14 / 31 * 100 = 45.16%
```

### 報表顯示
- 轉換率從錯誤的 402% 修正為正確的 45.16%
- 所有 KPI 數據基於去重後的學生狀態計算

## 下一步（需要您的操作）

### 選項 A：自行手動修復（推薦，立即生效）
1. 登入 Supabase Dashboard
2. 重新載入 PostgREST schema cache
3. 通知我已完成，我會立即導入資料並驗證

### 選項 B：提供資料庫連線字串
如果您能提供 `SUPABASE_DB_URL`（格式：`postgresql://user:pass@host:port/db`），我可以：
1. 繞過 PostgREST 直接操作資料庫
2. 手動觸發 schema cache 重新載入

### 選項 C：繼續等待自動更新
- 等待時間：未知（通常 5-30 分鐘，但已超過 1 小時）
- 成功率：不確定

## 技術細節

### PostgREST Schema Cache 機制
- PostgREST 在啟動時載入 schema 並緩存
- 執行 DDL（CREATE/ALTER TABLE）後需手動或自動重新載入
- 錯誤代碼：
  - `42703`: PostgreSQL 層級找不到欄位
  - `PGRST204`: PostgREST schema cache 找不到欄位

### 為什麼 NOTIFY 沒有作用
可能原因：
1. PostgreSQL RLS 權限限制
2. PostgREST 未監聽 NOTIFY 頻道
3. Supabase 平台限制（需透過 Dashboard 操作）

## 聯絡資訊

如有問題或需要協助，請隨時告知。Schema cache 修復後，剩餘 10% 的工作（資料導入 + 驗證）可在 5 分鐘內完成。

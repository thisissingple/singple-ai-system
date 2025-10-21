# Neon → Supabase 完整遷移指南

## 📋 目標
將所有資料與同步流程從 Neon PostgreSQL 遷移到 Supabase，實現單一資料庫架構。

---

## 🔍 現況分析

### 遷移前狀態
- **Neon PostgreSQL**:
  - 使用 Drizzle ORM 管理 schema
  - 儲存：spreadsheets, worksheets, sheet_data, users, sessions, roles, custom_dashboards
  - 資料狀態：多數表格為空（僅 users 有 1 筆測試資料）
  - 使用 MemStorage（重啟後資料遺失）

- **Supabase**:
  - 目前僅儲存：trial_class_attendance, trial_class_purchase, eods_for_closers
  - 資料筆數：143 體驗課記錄、50 購買記錄、995 諮詢記錄

### 遷移後狀態
- **僅使用 Supabase**:
  - 所有 metadata（spreadsheets, worksheets, users, sessions）
  - 所有業務資料（attendance, purchases, deals）
  - Google OAuth tokens
  - Sync history
  - 使用 SupabaseStorage 取代 MemStorage（持久化儲存）

---

## ⚠️ 注意事項與潛在問題

### 1. 資料型別差異
**問題**：Supabase 的欄位型別可能與 Neon 不同
**解決方案**：
- ✅ 已在 `supabase/migrations/001_create_all_tables.sql` 中統一定義
- 使用 `uuid_generate_v4()` 產生 UUID
- 所有 timestamp 欄位使用 `TIMESTAMPTZ`
- JSONB 欄位用於彈性資料結構

### 2. Foreign Key 約束
**問題**：Supabase 需要先建立父表才能建立子表
**解決方案**：
- ✅ Migration SQL 已按正確順序排列
- 順序：users → sessions → spreadsheets → worksheets → sheet_data

### 3. Session 儲存
**問題**：Replit Auth 的 session 從 Neon 切換到 Supabase
**解決方案**：
- ✅ 已更新 `server/replitAuth.ts` 使用 `SUPABASE_DB_URL`
- Sessions 表已在 Supabase 建立
- ⚠️ 切換時所有使用者需要重新登入

### 4. OAuth Token 加密
**問題**：Google OAuth tokens 應加密儲存
**建議**：
- 目前以明文儲存（需要 service role key 才能存取）
- 未來可考慮使用 Supabase Vault 或應用層加密

### 5. RLS (Row Level Security)
**問題**：Supabase 預設啟用 RLS，可能阻擋 service role 操作
**解決方案**：
- ✅ Migration SQL 中對所有表格執行 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- ✅ 建立 `allow_service_role_all` policy 允許 service role 完全存取
- 使用 service_role key 時不受 RLS 限制

### 6. Google Sheets 同步邏輯
**問題**：目前 `server/services/google-sheets.ts` 有 18 處呼叫舊的 storage
**解決方案**：
- ✅ `server/storage.ts` 已改為 export `supabase-storage.ts`
- ✅ 所有 storage 呼叫自動路由到 Supabase
- ⚠️ OAuth 2.0 實作需另外處理（目前仍使用 service account）

---

## 📝 已完成的檔案修改

### ✅ 1. 建立 Supabase Storage 實作
**檔案**: `server/supabase-storage.ts`
- 實作 IStorage 介面的所有方法
- 使用 `getSupabaseClient()` 連接資料庫
- 600+ 行完整實作

### ✅ 2. 更新 Storage Export
**檔案**: `server/storage.ts:1541`
```typescript
// 從
export const storage = new MemStorage();

// 改為
export { storage } from './supabase-storage';
```

### ✅ 3. 更新 Drizzle Config
**檔案**: `drizzle.config.ts`
```typescript
// 優先使用 SUPABASE_DB_URL
url: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
```

### ✅ 4. 更新 Session 儲存
**檔案**: `server/replitAuth.ts:26-45`
```typescript
const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
```

### ✅ 5. 更新環境變數範例
**檔案**: `.env.example`
- 新增 `SUPABASE_DB_URL` 說明
- 標記 `DATABASE_URL` 為 DEPRECATED

### ✅ 6. 建立驗證腳本
**檔案**: `scripts/verify-supabase-migration.ts`
- 檢查 Supabase client 初始化
- 測試資料表存在性
- 驗證 Storage 介面
- 檢查資料筆數

---

## 🚀 遷移執行步驟

### Phase 1: 環境準備（5分鐘）

#### 1.1 更新 .env 檔案
```bash
# 編輯 .env，新增/更新以下變數：

# Supabase Database URL (for Drizzle)
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Supabase API (已存在，確認正確)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 註解掉舊的 Neon URL
# DATABASE_URL=postgresql://...neon.tech/...
```

**取得 SUPABASE_DB_URL 的方式**：
1. 登入 Supabase Dashboard
2. 選擇你的專案
3. Settings → Database
4. Connection String → Direct connection
5. 複製 URL（記得替換 `[YOUR-PASSWORD]`）

#### 1.2 執行 Migration SQL
```bash
# 方法 1: 使用 Supabase Dashboard (推薦)
# 1. 開啟 Supabase Dashboard → SQL Editor
# 2. 複製 supabase/migrations/001_create_all_tables.sql 內容
# 3. 貼上並執行

# 方法 2: 使用 psql
psql "$SUPABASE_DB_URL" -f supabase/migrations/001_create_all_tables.sql
```

---

### Phase 2: 驗證遷移（3分鐘）

#### 2.1 執行驗證腳本
```bash
npx tsx scripts/verify-supabase-migration.ts
```

**預期輸出**：
```
🔍 開始驗證 Supabase 遷移狀態...

1️⃣  檢查 Supabase Client...
2️⃣  測試 Supabase 連線...
3️⃣  檢查資料表結構...
4️⃣  測試 Storage 介面...
5️⃣  檢查 Neon 依賴...
6️⃣  檢查資料筆數...

============================================================
📊 驗證結果統計
============================================================
✅ 通過: 18 項
❌ 失敗: 0 項
⚠️  警告: 1 項
============================================================

🎉 遷移驗證成功！所有測試都通過了。
```

#### 2.2 手動驗證（可選）
```bash
# 測試 Storage 連接
npx tsx -e "
import { storage } from './server/storage';
(async () => {
  const spreadsheets = await storage.listSpreadsheets();
  console.log('Spreadsheets:', spreadsheets.length);
})();
"
```

---

### Phase 3: 測試應用功能（10分鐘）

#### 3.1 啟動應用
```bash
npm run dev
```

#### 3.2 測試清單

**✅ 登入/登出**
- [ ] 使用者可以正常登入（會建立 session 到 Supabase）
- [ ] 登出後 session 正確清除
- [ ] 重啟 server 後 session 仍然有效（表示 session 已持久化）

**✅ Google Sheets 同步**
- [ ] 開啟 Google Sheets 整合頁面
- [ ] 選擇 spreadsheet 並同步
- [ ] 同步後資料出現在 Supabase `sheet_data` 表
- [ ] 檢查 `spreadsheets` 和 `worksheets` 表是否有記錄

**✅ KPI 計算**
- [ ] 開啟 KPI Calculator 頁面
- [ ] 數據正確顯示（轉換率、平均轉換時間等）
- [ ] 資料來自 Supabase（檢查 Network tab 或 console）

**✅ 報表功能**
- [ ] 總報表頁面顯示正確
- [ ] Daily Battle Dashboard 正常運作
- [ ] 所有圖表和數據都正確

---

### Phase 4: 清理舊依賴（2分鐘）

#### 4.1 移除 Neon 環境變數
```bash
# 編輯 .env，完全移除這行（或保持註解）
# DATABASE_URL=postgresql://...neon.tech/...
```

#### 4.2 驗證沒有使用 Neon
```bash
# 重啟應用，確認沒有錯誤
npm run dev

# 檢查 console 輸出，應該看到：
# ✓ Supabase client 初始化成功
# ✓ Using database: postgresql://...supabase.co/...
```

#### 4.3 （可選）關閉 Neon 專案
- 登入 Neon Dashboard
- 暫停或刪除舊專案（確認不再需要後）

---

## 🔧 疑難排解

### 問題 1: "Supabase client not available"
**原因**: 環境變數未設定或錯誤
**解決**:
```bash
# 檢查 .env 檔案
cat .env | grep SUPABASE

# 確認這三個變數存在且正確：
# SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
# SUPABASE_DB_URL=postgresql://...
```

### 問題 2: "Failed to fetch data: relation does not exist"
**原因**: Migration SQL 尚未執行
**解決**:
```bash
# 使用 Supabase Dashboard 執行 SQL
# 或使用 psql
psql "$SUPABASE_DB_URL" -f supabase/migrations/001_create_all_tables.sql
```

### 問題 3: "Permission denied for table"
**原因**: 使用 anon key 而非 service_role key
**解決**:
```bash
# 確認使用的是 service_role key（以 eyJ 開頭，很長的字串）
# 不是 anon key
echo $SUPABASE_SERVICE_ROLE_KEY
```

### 問題 4: Session 無效/需要重新登入
**原因**: Session 儲存位置改變
**說明**: 這是正常的，使用者需要重新登入一次
**動作**: 無需處理，通知使用者即可

### 問題 5: Google Sheets 同步失敗
**檢查**:
```bash
# 1. 檢查 Storage 是否正常
npx tsx -e "
import { storage } from './server/storage';
console.log(await storage.listSpreadsheets());
"

# 2. 檢查 Google Sheets credentials
echo $GOOGLE_SHEETS_CREDENTIALS | jq .
```

---

## 📊 驗證清單

### ✅ 基礎驗證
- [ ] `SUPABASE_DB_URL` 已設定
- [ ] Migration SQL 已執行
- [ ] `npx tsx scripts/verify-supabase-migration.ts` 通過
- [ ] `DATABASE_URL` 已移除或註解

### ✅ 功能驗證
- [ ] 使用者可登入/登出
- [ ] Session 在重啟後仍有效
- [ ] Google Sheets 可以同步
- [ ] Spreadsheet 資料儲存在 Supabase
- [ ] KPI 計算正確
- [ ] 報表顯示正確

### ✅ 資料驗證
- [ ] `trial_class_attendance` 有資料（143+）
- [ ] `trial_class_purchase` 有資料（50+）
- [ ] `eods_for_closers` 有資料（995+）
- [ ] `spreadsheets` 表在同步後有記錄
- [ ] `worksheets` 表在同步後有記錄
- [ ] `sheet_data` 表在同步後有記錄

### ✅ 效能驗證
- [ ] 頁面載入速度正常
- [ ] 資料查詢速度正常
- [ ] 同步速度可接受

---

## 🎯 遷移完成檢查

當以下條件全部滿足時，遷移完成：

1. ✅ 所有驗證清單項目都通過
2. ✅ 應用程式運行正常，無錯誤
3. ✅ `DATABASE_URL` (Neon) 已從 .env 移除
4. ✅ 所有功能使用 Supabase 儲存資料
5. ✅ 重啟 server 後資料不會遺失

---

## 📚 參考資料

- [Supabase 官方文件](https://supabase.com/docs)
- [Drizzle ORM 文件](https://orm.drizzle.team/docs/overview)
- [已建立的檔案清單](#-已完成的檔案修改)
- [潛在問題與解決方案](#️-注意事項與潛在問題)

---

## 🆘 需要協助？

如果遇到問題：
1. 檢查上方的[疑難排解](#-疑難排解)章節
2. 執行驗證腳本：`npx tsx scripts/verify-supabase-migration.ts`
3. 檢查 server console 的錯誤訊息
4. 檢查 Supabase Dashboard → Logs

---

**最後更新**: 2025-10-04
**遷移狀態**: ✅ 程式碼已更新，待執行 Migration SQL

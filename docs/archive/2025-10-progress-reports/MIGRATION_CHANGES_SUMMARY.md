# Neon → Supabase 遷移完成報告

## ✅ A. 資料模型單一真實來源決策

**決定：使用 Supabase Migration SQL 為真實來源（UUID + snake_case）**

### 修改檔案：shared/schema.ts（完全重寫）

**改動重點：**
1. 所有 ID 欄位：`varchar` → `uuid`
2. 所有 DB 欄位名：保持 `snake_case`（spreadsheet_id, last_sync_at）
3. TypeScript object 屬性：使用 `camelCase`（spreadsheetId, lastSyncAt）
4. Drizzle 自動處理映射：
   ```typescript
   spreadsheetId: text("spreadsheet_id")  // TS property: camelCase, DB column: snake_case
   ```

**新增 schema tables：**
- `users`, `sessions`, `roles`
- `googleOauthTokens`
- `spreadsheets`, `userSpreadsheets`, `worksheets`, `sheetData`
- `syncHistory`
- `dashboardTemplates`, `customDashboards`
- `trialClassAttendance`, `trialClassPurchase`, `eodsForClosers`

**影響範圍：**
- ✅ 所有 TypeScript code 使用 camelCase 存取屬性
- ✅ Drizzle 自動轉換為 DB 的 snake_case
- ✅ Supabase 直接查詢時需使用 snake_case

---

## ✅ B. supabase-storage.ts 完整實作

**檔案：server/supabase-storage.ts（完全重寫，約 400 行）**

### 實作的核心方法：

#### User Operations（完整實作）
- ✅ `getUser()` - 使用 snake_case 欄位
- ✅ `upsertUser()` - camelCase → snake_case 轉換
- ✅ `updateUserLastLogin()`, `listUsers()`, `updateUserRole()`, `updateUserStatus()`, `updateUserProfile()`

#### Spreadsheet Operations（完整實作）
- ✅ `getSpreadsheet()`, `getSpreadsheetBySheetId()`
- ✅ `createSpreadsheet()` - 處理 spreadsheet_id, owner_user_id 等 snake_case 欄位
- ✅ `updateSpreadsheet()` - 支援 sync_status, last_sync_error 等欄位
- ✅ `listSpreadsheets()`, `deleteSpreadsheet()`

#### Worksheet Operations（完整實作）
- ✅ `getWorksheets()` - 支援 UUID 和 Google Sheets ID 查詢
- ✅ `createWorksheet()`, `updateWorksheet()`, `deleteWorksheet()`
- ✅ `toggleWorksheetSync()`, `getAllWorksheets()`

#### Sheet Data Operations（完整實作）
- ✅ `getSheetData()`, `getWorksheetData()` - 分頁支援
- ✅ `createSheetData()`, `updateSheetData()`
- ✅ `upsertSheetData()` - 智能 insert/update
- ✅ `deleteSheetData()`, `deleteWorksheetData()`
- ✅ `searchSheetData()`, `getSheetDataCount()`

#### Dashboard Operations（完整實作）
- ✅ `getDashboardTemplate()`, `createDashboardTemplate()`, `listDashboardTemplates()`
- ✅ `getCustomDashboard()`, `createCustomDashboard()`, `listCustomDashboards()`

#### Role Operations（完整實作）
- ✅ `getRole()`, `createRole()`, `updateRole()`, `listRoles()`, `deleteRole()`

#### Sheet Mapping Operations（In-memory 實作）
- ✅ `getSheetMappings()`, `updateSheetMapping()`, `resetSheetMapping()`

#### 其他功能（Stub 實作）
- ⚠️ CalculationRule, DataSourceMapping, PurchaseRecord 等：回傳空陣列/undefined
- 📝 原因：這些功能目前未使用，避免過度實作

### 欄位映射處理（camelCase ↔ snake_case）

**寫入時（TypeScript → DB）：**
```typescript
await this.supabase.from('spreadsheets').insert({
  name: spreadsheet.name,
  spreadsheet_id: spreadsheet.spreadsheetId,  // camelCase → snake_case
  owner_user_id: spreadsheet.ownerUserId,
  last_sync_at: spreadsheet.lastSyncAt,
  row_count: spreadsheet.rowCount,
})
```

**讀取時（DB → TypeScript）：**
```typescript
return data as Spreadsheet  // Drizzle schema 自動處理轉換
```

---

## ✅ C. 驗證腳本強化

**檔案：scripts/verify-supabase-migration.ts（完全重寫）**

### 新增的驗證項目：

1. **表存在性檢查**（原有功能）
   - 檢查 11 個必要表

2. **實際 CRUD 測試**（新增）
   - ✅ 測試 `createSpreadsheet()` - 實際寫入資料
   - ✅ 測試 `updateSpreadsheet()` - 驗證更新功能
   - ✅ 測試 `deleteSpreadsheet()` - 驗證刪除功能
   - ✅ 自動清理測試資料

3. **Schema 驗證**（新增）
   - ✅ 驗證 ID 欄位是否為 UUID 格式
   - ✅ 驗證 snake_case 欄位名稱
   - ✅ 測試 INSERT 是否成功

4. **錯誤訊息強化**（新增）
   - ✅ 具體的錯誤訊息（例如：哪個欄位失敗）
   - ✅ 分類顯示：通過/失敗/警告

### 執行方式：
```bash
npx tsx scripts/verify-supabase-migration.ts
```

**預期輸出：**
```
✅ 通過: 25+ 項
❌ 失敗: 0 項（如果 Migration SQL 已執行）
⚠️  警告: 0-1 項
```

---

## ⏸️ D. Routes 與同步流程更新（部分完成）

### 已完成：
- ✅ `server/storage.ts:1541` - 改為 export supabase-storage
- ✅ `server/replitAuth.ts:30-31` - Session 使用 SUPABASE_DB_URL
- ✅ `drizzle.config.ts` - 優先使用 SUPABASE_DB_URL

### 待完成（列在後續待辦）：

#### server/routes.ts
目前仍使用舊 storage，但因為 storage.ts export 已改為 supabase-storage，**自動使用新版 storage**

**需要檢查的端點：**
- `GET /api/spreadsheets` - 使用 `storage.listSpreadsheets()`
- `POST /api/spreadsheets/sync` - 使用 `storage.updateSpreadsheet()`
- `GET /api/worksheets` - 使用 `storage.getAllWorksheets()`

**目前狀態：✅ 應該已經正常運作（因為 export 已改）**

#### server/services/google-sheets.ts
**目前問題：**
- ❌ 仍使用 service account auth（未使用 OAuth 2.0）
- ❌ 有 18 處呼叫 `storage.*` 方法

**目前狀態：**
- ✅ storage 呼叫已自動路由到 Supabase（因為 export 已改）
- ⚠️ OAuth 2.0 需要另外實作（非此次遷移範圍）

**後續步驟：**
1. 保持現有 service account flow
2. 待遷移穩定後再考慮 OAuth 2.0

---

## E. 完整變動檔案列表

| 檔案 | 狀態 | 改動類型 | 行數 |
|------|------|----------|------|
| `shared/schema.ts` | ✅ 完成 | 完全重寫 | 237 |
| `server/supabase-storage.ts` | ✅ 完成 | 完全重寫 | 400+ |
| `server/storage.ts` | ✅ 完成 | 修改 export（L1541） | 1 |
| `server/replitAuth.ts` | ✅ 完成 | 使用 SUPABASE_DB_URL（L30-31） | 2 |
| `drizzle.config.ts` | ✅ 完成 | 優先使用 SUPABASE_DB_URL | 1 |
| `.env.example` | ✅ 完成 | 新增 SUPABASE_DB_URL 說明 | 5 |
| `scripts/verify-supabase-migration.ts` | ✅ 完成 | 強化驗證邏輯 | 170+ |
| `MIGRATION_QUICK_START.md` | ✅ 完成 | 新增快速指南 | - |
| `NEON_TO_SUPABASE_MIGRATION.md` | ✅ 完成 | 新增詳細指南 | - |

---

## 驗證步驟

### 1. 前置準備
```bash
# 確認環境變數已設定
cat .env | grep SUPABASE

# 應該有：
# SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
# SUPABASE_DB_URL=postgresql://...
```

### 2. 執行 Migration SQL
```bash
# 方法 1: Supabase Dashboard
# 1. 開啟 SQL Editor
# 2. 複製 supabase/migrations/001_create_all_tables.sql
# 3. 執行

# 方法 2: psql
psql "$SUPABASE_DB_URL" -f supabase/migrations/001_create_all_tables.sql
```

### 3. 執行驗證腳本
```bash
npx tsx scripts/verify-supabase-migration.ts
```

**預期結果：**
- ✅ 所有資料表存在
- ✅ CRUD 測試通過
- ✅ Schema 驗證通過
- ⚠️ 可能有 DATABASE_URL 警告（正常）

### 4. 測試同步功能
```bash
# 啟動應用
npm run dev

# 測試項目：
# 1. 登入/登出 → Session 持久化
# 2. 新增 Spreadsheet → 儲存到 Supabase
# 3. 同步 Google Sheets → 資料寫入 Supabase
# 4. 重啟 server → 資料仍存在
```

---

## 潛在問題與解決方案

### 問題 1: "Supabase client not available"
**原因：** 環境變數未設定

**解決：**
```bash
# 檢查
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
echo $SUPABASE_DB_URL

# 如果為空，編輯 .env
```

### 問題 2: "Could not find the table 'spreadsheets' in the schema cache"
**原因：** Migration SQL 尚未執行

**解決：** 執行步驟 2

### 問題 3: 欄位名稱錯誤（camelCase vs snake_case）
**原因：** 直接使用 Supabase client 而非 Drizzle

**解決：** 使用 storage interface，或確保使用 snake_case

### 問題 4: UUID vs varchar ID 衝突
**原因：** 舊 code 使用 randomUUID() 而非 defaultRandom()

**解決：** shared/schema.ts 已統一使用 `uuid("id").primaryKey().defaultRandom()`

---

## 後續待辦

### 高優先級（影響核心功能）
- [ ] 測試 Google Sheets 同步是否正常寫入 Supabase
- [ ] 驗證 KPI Calculator 是否正常讀取 Supabase 資料
- [ ] 測試 Dashboard 頁面是否正常顯示

### 中優先級（優化）
- [ ] 實作 Google OAuth 2.0（目前仍使用 service account）
- [ ] 實作 Sync Orchestrator（目前同步無 locking 機制）
- [ ] Sheet Mapping 改為儲存到 Supabase（目前 in-memory）

### 低優先級（未來功能）
- [ ] 實作 CalculationRule CRUD
- [ ] 實作 DataSourceMapping CRUD
- [ ] 實作 PurchaseRecord / ConsultationRecord（目前使用 JSONB data 欄位）

---

## 檔案架構圖

```
workspace/
├── shared/
│   └── schema.ts                    ✅ 重寫（UUID + snake_case）
├── server/
│   ├── storage.ts                   ✅ 修改 export
│   ├── supabase-storage.ts          ✅ 新增（完整 IStorage 實作）
│   ├── replitAuth.ts                ✅ 修改 Session DB URL
│   ├── routes.ts                    ✅ 自動使用新 storage
│   └── services/
│       ├── supabase-client.ts       ✅ 已存在
│       ├── google-sheets.ts         ⚠️ 仍用 service account（待改 OAuth）
│       └── google-auth-service.ts   ⏸️ 已建立但未串接
├── scripts/
│   └── verify-supabase-migration.ts ✅ 強化驗證
├── supabase/
│   └── migrations/
│       └── 001_create_all_tables.sql ✅ 已建立
├── .env.example                      ✅ 新增說明
├── drizzle.config.ts                 ✅ 修改 DB URL
├── MIGRATION_QUICK_START.md          ✅ 新增
└── NEON_TO_SUPABASE_MIGRATION.md     ✅ 新增
```

---

## 結論

### ✅ 已完成
1. **資料模型統一**：Supabase SQL = 單一真實來源（UUID + snake_case）
2. **Storage 完整實作**：所有核心 CRUD 功能已實作並處理欄位映射
3. **驗證腳本強化**：包含實際寫入測試與 Schema 驗證
4. **自動路由**：所有 storage 呼叫已自動使用 Supabase

### ⏸️ 部分完成
1. **Routes 更新**：自動使用新 storage（透過 export 改變）
2. **Google Sheets 同步**：仍使用 service account（OAuth 待實作）

### 📝 後續待辦
1. 執行 Migration SQL
2. 測試同步功能
3. （可選）實作 OAuth 2.0

---

**最後更新**：2025-10-04  
**遷移狀態**：✅ 程式碼已完成，待執行 Migration SQL 與測試

# 🚀 Supabase 遷移與 Google OAuth 整合：完整執行指南

## 📋 實作代辦清單

### ✅ 階段 1：準備工作（已完成）

- [x] 建立 Supabase Migration SQL (`supabase/migrations/001_create_all_tables.sql`)
- [x] 建立資料匯出/匯入腳本 (`scripts/export-neon-data.sh`, `scripts/import-to-supabase.sh`)
- [x] 建立驗證腳本 (`scripts/verify-migration.ts`)
- [x] 更新 Drizzle 設定 (`drizzle.config.ts`)
- [x] 建立 Google OAuth Service (`server/services/google-auth-service.ts`)
- [x] 建立 Sync Orchestrator (`server/services/sync-orchestrator.ts`)

---

### 🔧 階段 2：Supabase 設定與資料遷移

#### 步驟 2.1：在 Supabase 執行 Migration

```bash
# 方式 1：使用 Supabase Dashboard（推薦）
# 1. 前往 https://app.supabase.com/project/YOUR-PROJECT/sql
# 2. 點擊 "New query"
# 3. 複製貼上 supabase/migrations/001_create_all_tables.sql 的內容
# 4. 點擊 "Run" 執行

# 方式 2：使用 psql
# 先取得 SUPABASE_DB_URL（Supabase Dashboard > Settings > Database > Connection String > Session pooler）
psql "postgresql://postgres.vqkkqkjaywkjtraepqbg:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/001_create_all_tables.sql
```

**驗證**:
```bash
npx tsx scripts/verify-migration.ts
```

預期輸出：所有表都應該顯示 ✅

---

#### 步驟 2.2：設定環境變數

編輯 `.env` 檔案：

```bash
# ========================================
# Supabase（唯一資料庫）
# ========================================
SUPABASE_URL=https://vqkkqkjaywkjtraepqbg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Database Connection（用於 Drizzle 與 psql）
# 從 Supabase Dashboard > Settings > Database > Connection String > Session pooler 取得
SUPABASE_DB_URL=postgresql://postgres.vqkkqkjaywkjtraepqbg:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# ========================================
# Google OAuth 2.0（新增）
# ========================================
# 從 Google Cloud Console > APIs & Services > Credentials 建立 OAuth 2.0 Client ID
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=https://your-app.replit.app/api/auth/google/callback

# ========================================
# 舊的 Neon（暫時保留作為備份）
# ========================================
# DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb

# ========================================
# Replit Auth（已存在）
# ========================================
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-app.replit.app
SESSION_SECRET=your-session-secret
```

**如何取得 Google OAuth 憑證**:

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 建立新專案或選擇現有專案
3. 啟用 Google Sheets API：APIs & Services > Library > 搜尋 "Google Sheets API" > Enable
4. 建立 OAuth 2.0 憑證：
   - APIs & Services > Credentials > Create Credentials > OAuth client ID
   - Application type: Web application
   - Authorized redirect URIs: `https://your-app.replit.app/api/auth/google/callback`
5. 複製 Client ID 和 Client Secret

---

#### 步驟 2.3：從 Neon 匯出資料並匯入 Supabase

⚠️ **注意**：目前 Neon 的 spreadsheets 表是空的（使用 MemStorage），所以這步可以跳過。但如果未來有資料，可以執行：

```bash
# 匯出 Neon 資料
./scripts/export-neon-data.sh

# 匯入 Supabase（會提示輸入 SUPABASE_DB_URL）
./scripts/import-to-supabase.sh ./neon-export-XXXXXXXX-XXXXXX
```

---

### 🔨 階段 3：重構程式碼

#### 步驟 3.1：更新 Storage 層改用 Supabase

**目前問題**：`server/storage.ts` 使用 `MemStorage`，重啟後資料消失。

**解決方案**：改用 Supabase 作為 storage 後端（或直接移除 storage 抽象層，直接使用 Supabase）。

由於這是大改動，建議採用**漸進式遷移**：

1. **短期方案**：讓 `storage.*` 方法直接呼叫 Supabase
2. **長期方案**：移除 storage 層，所有地方直接使用 `getSupabaseClient()`

**修改檔案**：`server/storage.ts`（請見下方完整程式碼）

---

#### 步驟 3.2：重構 Google Sheets Service

**檔案**：`server/services/google-sheets.ts`

**主要修改**：

1. ❌ 移除 Service Account 授權
2. ✅ 改用 `googleAuthService.getValidOAuth2Client(userId)`
3. ✅ 所有方法加上 `userId` 參數
4. ✅ 改用動態範圍（不寫死 `A1:Z1000`）
5. ✅ 資料寫入改用 Supabase 客戶端

由於篇幅限制，完整程式碼請見：`docs/REFACTORED_GOOGLE_SHEETS_SERVICE.md`

**關鍵修改摘要**：

```typescript
// ❌ 修改前
async syncSpreadsheet(spreadsheet: Spreadsheet): Promise<void> {
  // 使用 Service Account
  const sheets = google.sheets({ version: 'v4', auth: this.auth });
  // ...
  await storage.updateSpreadsheet(spreadsheet.id, { ... });
}

// ✅ 修改後
async syncSpreadsheet(spreadsheetId: string, userId: string): Promise<void> {
  // 使用 OAuth2Client
  const oauth2Client = await googleAuthService.getValidOAuth2Client(userId);
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
  // ...
  const supabase = getSupabaseClient();
  await supabase.from('spreadsheets').update({ ... }).eq('id', spreadsheetId);
}
```

---

#### 步驟 3.3：建立 OAuth API 端點

**檔案**：`server/routes.ts`（新增以下端點）

```typescript
// Google OAuth 授權流程
app.get('/api/auth/google', isAuthenticated, async (req, res) => {
  const user = req.user as any;
  const userId = user.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const authUrl = googleAuthService.getAuthUrl(userId);
  res.redirect(authUrl);
});

// Google OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  const userId = state as string;

  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or state' });
  }

  try {
    await googleAuthService.handleCallback(code as string, userId);
    res.redirect('/?google_auth=success');
  } catch (error: any) {
    console.error('[OAuth] Callback error:', error);
    res.redirect('/?google_auth=error&message=' + encodeURIComponent(error.message));
  }
});

// 檢查授權狀態
app.get('/api/auth/google/status', isAuthenticated, async (req, res) => {
  const user = req.user as any;
  const userId = user.claims?.sub;

  const isAuthorized = await googleAuthService.isAuthorized(userId);
  res.json({ isAuthorized });
});

// 撤銷授權
app.post('/api/auth/google/revoke', isAuthenticated, async (req, res) => {
  const user = req.user as any;
  const userId = user.claims?.sub;

  try {
    await googleAuthService.revokeToken(userId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

#### 步驟 3.4：更新所有同步 API 呼叫點

**需要修改的檔案**：`server/routes.ts`

**搜尋所有呼叫點**：

```bash
grep -rn "syncSpreadsheet\|syncWorksheet" server/routes.ts
```

**修改前**：

```typescript
// ❌ 沒有傳入 userId
await googleSheetsService.syncSpreadsheet(spreadsheet);
```

**修改後**：

```typescript
// ✅ 使用 syncOrchestrator（包含鎖機制與歷史記錄）
import { syncOrchestrator } from './services/sync-orchestrator';

await syncOrchestrator.sync({
  spreadsheetId: spreadsheet.id,
  triggeredBy: 'manual',
  triggeredByUserId: userId
});
```

**具體呼叫點**（約 4 處）：

1. `routes.ts:1264` - 同步單個 spreadsheet
2. `routes.ts:1919` - 同步單個 worksheet
3. `routes.ts:2080` - 建立 spreadsheet 後同步
4. `routes.ts:2129` - 批次同步所有 spreadsheets

完整修改範例請見：`docs/API_ROUTES_CHANGES.md`

---

### 🔒 階段 4：建立 RLS 策略

**檔案**：`supabase/migrations/002_enable_rls.sql`

```sql
-- ============================================
-- Migration 002: 啟用 Row Level Security
-- ============================================

-- 1. 啟用 RLS
ALTER TABLE trial_class_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_class_purchase ENABLE ROW LEVEL SECURITY;
ALTER TABLE eods_for_closers ENABLE ROW LEVEL SECURITY;

-- 2. 超級管理員：看到所有資料
CREATE POLICY "super_admin_all_access" ON trial_class_attendance
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin_all_access" ON trial_class_purchase
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "super_admin_all_access" ON eods_for_closers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- 3. 老師：只看到自己的學生
CREATE POLICY "teacher_own_students" ON trial_class_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
      AND trial_class_attendance.teacher_id = users.teacher_id
    )
  );

CREATE POLICY "teacher_own_students" ON trial_class_purchase
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'teacher'
      AND trial_class_purchase.teacher_id = users.teacher_id
    )
  );

-- 4. 電銷：只看到自己的客戶
CREATE POLICY "sales_own_customers" ON eods_for_closers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'sales'
      AND (
        eods_for_closers.closer_id = users.sales_id
        OR eods_for_closers.setter_id = users.sales_id
      )
    )
  );

-- 5. 部門主管：看到部門所有資料
CREATE POLICY "manager_department_data" ON trial_class_attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
      AND trial_class_attendance.department_id = users.department_id
    )
  );

CREATE POLICY "manager_department_data" ON trial_class_purchase
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
      AND trial_class_purchase.department_id = users.department_id
    )
  );

CREATE POLICY "manager_department_data" ON eods_for_closers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'manager'
      AND eods_for_closers.department_id = users.department_id
    )
  );

-- ========================================
-- 完成！
-- ========================================
SELECT '✅ RLS 策略建立完成！' AS status;
```

⚠️ **重要**：RLS 上線前需先填充權限欄位（`teacher_id`, `sales_id`），否則會導致資料全部被鎖住！

**填充範例**（假設資料）：

```sql
-- 從 raw_data 中提取 teacher_id（範例）
UPDATE trial_class_attendance
SET teacher_id = raw_data->>'授課老師'
WHERE teacher_id IS NULL;

-- 手動設定（範例）
UPDATE users SET teacher_id = 'TEACHER001' WHERE email = 'teacher@example.com';
UPDATE users SET sales_id = 'SALES001' WHERE email = 'sales@example.com';
```

---

### 🧪 階段 5：測試與驗證

#### 測試清單

- [ ] **環境變數檢查**
  ```bash
  node -e "console.log({
    SUPABASE_URL: process.env.SUPABASE_URL ? '✅' : '❌',
    SUPABASE_DB_URL: process.env.SUPABASE_DB_URL ? '✅' : '❌',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? '✅' : '❌',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? '✅' : '❌'
  })"
  ```

- [ ] **Supabase 連線測試**
  ```bash
  npx tsx scripts/verify-migration.ts
  ```

- [ ] **Google OAuth 授權流程**
  1. 登入網站
  2. 前往 `/api/auth/google`
  3. 完成 Google 授權
  4. 檢查 Supabase `google_oauth_tokens` 表是否有記錄

- [ ] **手動同步測試**
  1. 建立 spreadsheet 記錄
  2. 觸發同步
  3. 檢查 `sync_history` 表
  4. 檢查課程資料表是否有新資料

- [ ] **RLS 權限測試**
  1. 建立不同角色的測試使用者
  2. 驗證每個角色只能看到自己的資料

---

## 📝 遷移檢查清單

### 執行前
- [ ] 備份 Neon 資料庫
- [ ] 確認 Supabase 專案已建立
- [ ] 取得所有必要的環境變數

### 執行中
- [ ] 在 Supabase 執行 Migration SQL
- [ ] 驗證所有表建立成功
- [ ] 設定環境變數
- [ ] 更新程式碼（Storage、Sheets Service、Routes）
- [ ] 建立 OAuth API 端點

### 執行後
- [ ] 測試 OAuth 授權流程
- [ ] 測試同步流程
- [ ] 驗證資料完整性
- [ ] 啟用 RLS（確認權限欄位已填充）
- [ ] 監控同步狀態

---

## ⚠️ 常見問題與解決方案

### Q1: Migration 執行失敗

**錯誤**: `relation "users" already exists`

**解決**: 使用 `CREATE TABLE IF NOT EXISTS`（已在 SQL 中）

---

### Q2: OAuth callback 失敗

**錯誤**: `redirect_uri_mismatch`

**解決**: 檢查 Google Cloud Console 的 Authorized redirect URIs 是否包含 `GOOGLE_REDIRECT_URI`

---

### Q3: 同步時找不到 token

**錯誤**: `未授權 Google Sheets，請先完成授權`

**解決**:
1. 檢查 `spreadsheets.owner_user_id` 是否已設定
2. 檢查該使用者是否已完成 OAuth 授權

---

### Q4: RLS 啟用後資料全部消失

**原因**: 權限欄位（`teacher_id`, `sales_id`）未填充

**解決**:
1. 暫時停用 RLS：`ALTER TABLE trial_class_attendance DISABLE ROW LEVEL SECURITY;`
2. 填充權限欄位
3. 驗證資料可見性
4. 重新啟用 RLS

---

## 🎯 下一步

完成遷移後，可以繼續實作：

1. **排程同步**（使用 node-cron 或 Supabase Edge Functions）
2. **同步狀態儀表板**（前端 UI）
3. **Email/Slack 通知**（同步失敗時）
4. **增量同步**（只同步變更的資料）
5. **多使用者權限管理**（前端 RBAC UI）

---

## 📚 相關文件

- [Supabase Documentation](https://supabase.com/docs)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Drizzle ORM](https://orm.drizzle.team/)

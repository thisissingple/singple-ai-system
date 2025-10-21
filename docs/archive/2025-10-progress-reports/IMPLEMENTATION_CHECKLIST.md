# 📋 實作代辦清單與檔案修改總覽

## ✅ 已完成的檔案

### 新增檔案

| 檔案 | 用途 | 狀態 |
|------|------|------|
| `supabase/migrations/001_create_all_tables.sql` | 建立所有 Supabase 表 | ✅ 已建立 |
| `scripts/export-neon-data.sh` | 從 Neon 匯出資料 | ✅ 已建立 |
| `scripts/import-to-supabase.sh` | 匯入資料到 Supabase | ✅ 已建立 |
| `scripts/verify-migration.ts` | 驗證 Supabase 表結構 | ✅ 已建立 |
| `server/services/google-auth-service.ts` | Google OAuth Token 管理 | ✅ 已建立 |
| `server/services/sync-orchestrator.ts` | 同步流程協調器 | ✅ 已建立 |
| `MIGRATION_GUIDE.md` | 完整遷移指南 | ✅ 已建立 |
| `IMPLEMENTATION_CHECKLIST.md` | 本檔案 | ✅ 已建立 |

### 已修改檔案

| 檔案 | 修改內容 | 狀態 |
|------|----------|------|
| `drizzle.config.ts` | 改用 SUPABASE_DB_URL | ✅ 已完成 |

---

## 🔨 待修改檔案

### 1. `shared/schema.ts`

**修改原因**: 統一 ID 型別為 UUID

**修改內容**:

```typescript
// ❌ 修改前
import { varchar } from "drizzle-orm/pg-core";
id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

// ✅ 修改後
import { uuid } from "drizzle-orm/pg-core";
id: uuid("id").primaryKey().defaultRandom(),
```

**需要修改的表**:
- `users`
- `spreadsheets`
- `worksheets`
- `sheetData`
- `googleOAuthTokens` (新增)
- `userSpreadsheets` (新增)
- `syncHistory` (新增)
- 所有其他使用 UUID 的表

**完整範例**:

```typescript
// 新增 Google OAuth Tokens 表
export const googleOAuthTokens = pgTable("google_oauth_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  tokenType: text("token_type").default("Bearer"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope").notNull(),
  isValid: boolean("is_valid").default(true),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 新增 User Spreadsheets 關聯表
export const userSpreadsheets = pgTable("user_spreadsheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  spreadsheetId: uuid("spreadsheet_id").notNull().references(() => spreadsheets.id, { onDelete: 'cascade' }),
  permission: text("permission").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 新增 Sync History 表
export const syncHistory = pgTable("sync_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  spreadsheetId: uuid("spreadsheet_id").references(() => spreadsheets.id, { onDelete: 'cascade' }),
  worksheetId: uuid("worksheet_id").references(() => worksheets.id, { onDelete: 'set null' }),
  triggeredBy: text("triggered_by").notNull(),
  triggeredByUserId: uuid("triggered_by_user_id").references(() => users.id, { onDelete: 'set null' }),
  syncType: text("sync_type").notNull(),
  status: text("status").notNull(),
  rowsSynced: integer("rows_synced").default(0),
  rowsFailed: integer("rows_failed").default(0),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  durationSeconds: integer("duration_seconds"),
  isLocked: boolean("is_locked").default(false),
  lockAcquiredAt: timestamp("lock_acquired_at"),
  lockExpiresAt: timestamp("lock_expires_at"),
});

// 更新 Spreadsheets 表
export const spreadsheets = pgTable("spreadsheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  spreadsheetId: text("spreadsheet_id").notNull().unique(),
  spreadsheetUrl: text("spreadsheet_url"),
  range: text("range").default("A1:Z1000"),
  ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: 'set null' }),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
  headers: jsonb("headers").$type<string[] | null>(),
  rowCount: integer("row_count").default(0),
  syncFrequencyMinutes: integer("sync_frequency_minutes").default(60),
  isAutoSyncEnabled: boolean("is_auto_sync_enabled").default(true),
  syncStatus: text("sync_status").default("pending"),
  lastSyncError: text("last_sync_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 型別匯出
export type GoogleOAuthToken = typeof googleOAuthTokens.$inferSelect;
export type UserSpreadsheet = typeof userSpreadsheets.$inferSelect;
export type SyncHistory = typeof syncHistory.$inferSelect;
```

**狀態**: ⏳ 待執行

---

### 2. `server/services/google-sheets.ts`

**修改原因**: 移除 Service Account，改用 OAuth2

**主要修改**:

1. ❌ 移除 `initializeAuth()`、`this.auth`、`this.sheets`
2. ✅ 改為每次呼叫時動態取得 OAuth2Client
3. ✅ 所有方法加上 `userId` 參數
4. ✅ 改用 `syncOrchestrator` 而非直接寫入

**修改前後對比**:

```typescript
// ❌ 修改前
export class GoogleSheetsService {
  private sheets: any;
  private auth: any;

  constructor() {
    this.authReady = this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    this.auth = new google.auth.GoogleAuth({ credentials, scopes: [...] });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async syncSpreadsheet(spreadsheet: Spreadsheet): Promise<void> {
    const sheets = this.sheets;
    // ...
    await storage.updateSpreadsheet(spreadsheet.id, { ... });
  }
}

// ✅ 修改後
import { googleAuthService } from './google-auth-service';
import { getSupabaseClient } from './supabase-client';

export class GoogleSheetsService {
  // 移除 this.sheets, this.auth, initializeAuth

  /**
   * ⚠️ 此方法已廢棄，請改用 syncOrchestrator.sync()
   * @deprecated
   */
  async syncSpreadsheet(spreadsheetId: string, userId: string): Promise<void> {
    console.warn('[GoogleSheetsService] syncSpreadsheet() is deprecated, use syncOrchestrator.sync() instead');

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase not available');

    // 取得 OAuth2Client
    const oauth2Client = await googleAuthService.getValidOAuth2Client(userId);
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    // 讀取資料
    const { data: spreadsheet } = await supabase
      .from('spreadsheets')
      .select('*')
      .eq('id', spreadsheetId)
      .single();

    if (!spreadsheet) throw new Error('Spreadsheet not found');

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheet.spreadsheet_id,
      range: spreadsheet.range || 'A1:Z1000',
    });

    // 更新資料（改用 Supabase）
    await supabase
      .from('spreadsheets')
      .update({
        headers: response.data.values?.[0] || [],
        row_count: (response.data.values?.length || 0) - 1,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', spreadsheetId);

    // ... 其餘邏輯
  }
}
```

**建議**: 由於 `google-sheets.ts` 過於複雜，建議**直接使用 `syncOrchestrator`**，不再修改此檔案。

**狀態**: ⏳ 待執行（或標記為 deprecated）

---

### 3. `server/routes.ts`

**修改原因**: 新增 OAuth API 端點、更新同步呼叫

**需要新增的端點**:

```typescript
// ========================================
// Google OAuth 授權
// ========================================

// 開始授權
app.get('/api/auth/google', isAuthenticated, async (req, res) => {
  const user = req.user as any;
  const userId = user.claims?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const authUrl = googleAuthService.getAuthUrl(userId);
  res.redirect(authUrl);
});

// OAuth Callback
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

**需要修改的同步呼叫**（約 4 處）:

```bash
# 搜尋所有呼叫點
grep -n "googleSheetsService.sync" server/routes.ts
```

**修改範例**:

```typescript
// ❌ 修改前（第 1264 行）
app.post('/api/spreadsheets/:id/sync', isAuthenticated, async (req, res) => {
  const spreadsheet = await storage.getSpreadsheet(req.params.id);
  await googleSheetsService.syncSpreadsheet(spreadsheet);
  res.json({ success: true });
});

// ✅ 修改後
import { syncOrchestrator } from './services/sync-orchestrator';

app.post('/api/spreadsheets/:id/sync', isAuthenticated, async (req, res) => {
  const user = req.user as any;
  const userId = user.claims?.sub;

  try {
    const result = await syncOrchestrator.sync({
      spreadsheetId: req.params.id,
      triggeredBy: 'manual',
      triggeredByUserId: userId
    });

    res.json({
      success: result.success,
      rowsSynced: result.rowsSynced,
      rowsFailed: result.rowsFailed
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

**其他呼叫點**（需要類似修改）:
- `routes.ts:1919` - 同步單個 worksheet
- `routes.ts:2080` - 建立 spreadsheet 後同步
- `routes.ts:2129` - 批次同步所有 spreadsheets

**狀態**: ⏳ 待執行

---

### 4. `server/storage.ts`

**修改原因**: 移除 MemStorage，改用 Supabase

**選項 1（推薦）**: 移除 storage 抽象層，直接使用 Supabase

**選項 2**: 讓 storage 方法內部呼叫 Supabase（保持 API 不變）

由於選項 2 工作量較大，建議採用**選項 1**：

**修改步驟**:

1. 搜尋所有 `storage.*` 呼叫
2. 改為直接使用 `getSupabaseClient()`

**範例**:

```typescript
// ❌ 修改前
await storage.updateSpreadsheet(spreadsheet.id, { ... });

// ✅ 修改後
const supabase = getSupabaseClient();
await supabase
  .from('spreadsheets')
  .update({ ... })
  .eq('id', spreadsheet.id);
```

**影響範圍**: `server/routes.ts` 中約 50+ 處

**狀態**: ⏳ 待執行（大工程）

---

### 5. `supabase/migrations/002_enable_rls.sql`

**修改原因**: 啟用 Row Level Security

**內容**: 請見 `MIGRATION_GUIDE.md` 的「階段 4：建立 RLS 策略」

**狀態**: ⏳ 待執行（需先填充權限欄位）

---

### 6. `.env`

**修改原因**: 新增 Supabase 與 Google OAuth 環境變數

**需要新增**:

```bash
# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
SUPABASE_DB_URL=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

**狀態**: ⏳ 待執行

---

## 📊 工作量估算

| 任務 | 預計時間 | 難度 | 優先級 |
|------|----------|------|--------|
| 執行 Migration SQL | 10 分鐘 | ⭐ | 🔴 高 |
| 設定環境變數 | 15 分鐘 | ⭐ | 🔴 高 |
| 修改 `shared/schema.ts` | 1 小時 | ⭐⭐ | 🔴 高 |
| 新增 OAuth API 端點 | 30 分鐘 | ⭐⭐ | 🔴 高 |
| 更新同步呼叫點 (4 處) | 30 分鐘 | ⭐⭐ | 🔴 高 |
| 重構 `storage.ts` (50+ 處) | 3-4 小時 | ⭐⭐⭐⭐ | 🟡 中 |
| 修改 `google-sheets.ts` | 2 小時 | ⭐⭐⭐ | 🟢 低（可廢棄） |
| 建立 RLS 策略 | 1 小時 | ⭐⭐⭐ | 🟡 中 |
| 測試與驗證 | 2 小時 | ⭐⭐ | 🔴 高 |

**總計**: 約 10-12 小時

---

## 🎯 建議執行順序

### Phase 1：基礎設定（必須完成）

1. ✅ 執行 `supabase/migrations/001_create_all_tables.sql`
2. ✅ 設定環境變數 (`.env`)
3. ✅ 驗證 Supabase 連線 (`npx tsx scripts/verify-migration.ts`)

### Phase 2：Schema 更新

4. ✅ 修改 `shared/schema.ts`（新增 OAuth、Sync History 表）
5. ✅ 執行 `npx drizzle-kit generate` 確認 schema 正確

### Phase 3：API 更新

6. ✅ 新增 OAuth API 端點到 `server/routes.ts`
7. ✅ 測試 OAuth 授權流程

### Phase 4：同步流程更新

8. ✅ 更新 4 個同步呼叫點（改用 `syncOrchestrator`）
9. ✅ 測試手動同步功能

### Phase 5：Storage 重構（可選）

10. ⏳ 逐步移除 `storage.*` 呼叫，改用 Supabase（大工程）

### Phase 6：權限控制

11. ⏳ 填充權限欄位（`teacher_id`, `sales_id`）
12. ⏳ 啟用 RLS 策略

---

## ✅ 驗收標準

### 基本功能

- [ ] 使用者可以完成 Google OAuth 授權
- [ ] OAuth Token 正確儲存到 Supabase
- [ ] Token 到期時自動刷新
- [ ] 手動同步可以正常執行
- [ ] 同步歷史正確記錄
- [ ] 同步鎖機制正常運作（併發同步會被阻擋）

### 資料完整性

- [ ] 同步後的資料正確寫入 Supabase 課程表
- [ ] `sync_history` 表記錄完整
- [ ] `spreadsheets` 的 `last_sync_at` 正確更新

### 權限控制

- [ ] 超級管理員可以看到所有資料
- [ ] 老師只能看到自己的學生
- [ ] 電銷只能看到自己的客戶

### 錯誤處理

- [ ] Token 失效時顯示錯誤訊息
- [ ] 同步失敗時記錄錯誤
- [ ] 併發同步時正確提示

---

## 📞 需要協助？

如果在執行過程中遇到問題，請檢查：

1. **環境變數是否正確設定**
2. **Migration SQL 是否成功執行**
3. **Google OAuth 憑證是否正確**
4. **Supabase 連線是否正常**

可以隨時執行驗證腳本：

```bash
npx tsx scripts/verify-migration.ts
```

---

## 🎉 完成後

完成所有步驟後，你將擁有：

✅ 統一的 Supabase 資料庫架構
✅ 完整的 Google OAuth 2.0 授權流程
✅ 自動 Token 刷新機制
✅ 併發安全的同步流程
✅ 完整的同步歷史追蹤
✅ 基於 RLS 的權限控制

**下一步**：實作排程同步、前端 UI、Email 通知等進階功能。

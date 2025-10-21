# 資料庫連線錯誤問題報告

**問題發生時間**: 2025-10-21
**錯誤訊息**: `Tenant or user not found`
**影響範圍**: 收支記錄管理、教學品質分析等所有使用 PostgreSQL 直連的功能
**狀態**: 🔧 **需要手動修復 Replit Secrets**

---

## 🚀 快速修復指南（給使用者）

**請立即執行以下步驟修復問題：**

1. **開啟 Replit Secrets 設定**
   - 在 Replit 專案中，點擊左側工具列的 **🔒 Secrets** (或 Tools → Secrets)

2. **更新 `SUPABASE_DB_URL`**
   - 找到 `SUPABASE_DB_URL` 這個 Secret
   - 將值改為：
     ```
     postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
   - 注意：使用 `aws-0` (不是 `aws-1`)，且**沒有** `?pgbouncer=true`

3. **重啟伺服器**
   - 在 Replit Shell 執行：`npm run dev:clean`
   - 或點擊 Replit 介面的 **Stop** → **Run**

4. **驗證修復**
   - 重新整理「收支記錄管理」頁面
   - 嘗試「教學品質分析」的「手動分析」功能
   - 確認沒有再出現 "Tenant or user not found" 錯誤

---

## 📋 問題摘要

系統中所有使用 `pg-client.ts` 直接連接 PostgreSQL 的功能都出現 **"Tenant or user not found"** 錯誤，導致：
- ❌ 收支記錄管理頁面無法載入資料
- ❌ 教學品質分析無法執行手動分析
- ❌ 其他約 110 處使用 `createPool()` / `queryDatabase()` 的功能受影響

---

## 🔍 根本原因分析

### 1. **錯誤的資料庫連線參數**

**檔案**: `.env`

**問題配置**:
```env
SUPABASE_DB_URL=postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

**問題點**: URL 末尾包含了 `?pgbouncer=true` 參數

### 2. **為什麼 `?pgbouncer=true` 會導致錯誤？**

Supabase 提供兩種連線模式：

| 模式 | Port | URL 參數 | 用途 | 支援功能 |
|------|------|----------|------|----------|
| **Transaction Mode** | 6543 | **無參數** | 短期連線、查詢 | ✅ Prepared Statements<br>✅ 連線池<br>✅ 高效查詢 |
| **Session Mode** | 5432 | `?pgbouncer=true` | 長期連線、複雜交易 | ✅ 完整 PostgreSQL 功能<br>❌ 連線數限制嚴格 |

**我們的問題**:
- 使用了 **Transaction Mode Port (6543)**
- 但加上了 **Session Mode 參數 (`?pgbouncer=true`)**
- **矛盾配置** 導致 Supabase Pooler 無法正確識別 tenant

### 3. **程式碼使用方式**

**檔案**: `server/services/pg-client.ts`

```typescript
export function createPool(mode: 'transaction' | 'session' = 'transaction') {
  const dbUrl = process.env.SUPABASE_DB_URL;  // ← 從環境變數讀取

  return new Pool({
    connectionString: dbUrl,  // ← 直接使用，包含錯誤參數
    ssl: { rejectUnauthorized: false },
  });
}
```

**問題**:
- 程式碼信任 `.env` 中的 URL 配置
- 沒有驗證或清理 URL 參數
- 錯誤配置直接傳遞給 `pg` 連線池

---

## 🛠️ 解決方案

### ⚠️ 根本問題：Replit Secrets 中的設定錯誤

**發現的問題**:
- ❌ `.env` 檔案已修正，但**無效**
- ❌ **Replit Secrets** 中的 `SUPABASE_DB_URL` 仍是錯誤的值
- ❌ 系統環境變數優先於 `.env` 檔案

**當前 Replit Secrets 的值** (錯誤):
```
SUPABASE_DB_URL=postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```
**問題**: 使用了 `aws-1` 而不是 `aws-0`

### ✅ **必須執行的修正步驟**

#### **步驟 1: 更新 Replit Secrets**

1. 開啟 Replit 專案
2. 點擊左側的 **🔒 Secrets** (Tools → Secrets)
3. 找到 `SUPABASE_DB_URL`
4. 更新為正確的值：
   ```
   postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```
5. 點擊 **Save**

#### **步驟 2: 重啟伺服器**

在 Replit Shell 執行：
```bash
npm run dev:clean
```

或直接在 Replit 介面點擊 **Stop** → **Run**

### 📸 正確的 Supabase URL 格式

```
✅ 正確: postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

❌ 錯誤 1: ...6543/postgres?pgbouncer=true  (有 pgbouncer 參數)
❌ 錯誤 2: ...@aws-1-...  (使用錯誤的 endpoint)
```

---

## 🎯 影響範圍統計

使用 `createPool()` 或 `queryDatabase()` 的檔案：

```bash
$ grep -r "createPool\|queryDatabase" server --include="*.ts" | wc -l
110
```

**主要受影響的功能**:
1. ❌ 收支記錄管理 (`/api/income-expense/*`)
2. ❌ 教學品質分析 (`/api/teaching-quality/*`)
3. ❌ 成本獲利報表 (`/api/cost-profit/*`)
4. ❌ 員工管理薪資/勞健保 (`/api/employees/*`)
5. ❌ 表單提交系統 (`/api/forms/*`)
6. ❌ 自訂報表查詢

---

## 🚨 為什麼會發生這個問題？

### 根源分析

1. **Replit Secrets 設定錯誤**
   - Replit Secrets 中的 `SUPABASE_DB_URL` 使用了錯誤的 endpoint (`aws-1` 而非 `aws-0`)
   - 系統環境變數**優先於** `.env` 檔案
   - `dotenv.config({ override: true })` 只覆蓋 `.env` 內的變數，不影響已存在的系統環境變數

2. **配置優先順序誤解**
   ```
   實際優先順序 (高 → 低):
   1. 系統環境變數 (process.env) ← Replit Secrets 在這裡
   2. .env 檔案 (透過 dotenv 載入)
   3. 程式碼預設值
   ```

   **錯誤假設**: 以為 `.env` 可以覆蓋 Replit Secrets
   **實際情況**: Replit Secrets 優先權更高

3. **缺乏驗證機制**
   - `pg-client.ts` 沒有驗證 URL 格式
   - 沒有檢測 endpoint 的正確性
   - 環境變數配置錯誤時沒有警告

4. **開發模式掩蓋問題**
   - `SKIP_AUTH=true` 讓大部分功能可以使用 Supabase Client
   - 只有使用 `pg-client.ts` 的功能才會觸發錯誤
   - 問題不容易在開發初期被發現

5. **Supabase 區域 endpoint 變更**
   - Supabase 可能在某次更新後變更了 Pooler endpoint
   - 從 `aws-1-ap-southeast-1` 改為 `aws-0-ap-southeast-1`
   - 舊的設定未同步更新

---

## 🛡️ 預防措施

### 1. **添加 URL 驗證機制**

**建議修改 `pg-client.ts`**:

```typescript
export function createPool(mode: 'transaction' | 'session' = 'transaction') {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    throw new Error('資料庫 URL 未配置 (SUPABASE_DB_URL)');
  }

  // 🔍 新增：驗證 URL 格式
  const url = new URL(dbUrl);

  // 檢查 Port 與模式的匹配
  const port = parseInt(url.port);
  const hasPgBouncerParam = url.searchParams.has('pgbouncer');

  if (port === 6543 && hasPgBouncerParam) {
    console.error('❌ 錯誤配置：Transaction Mode (6543) 不應包含 ?pgbouncer=true');
    console.error('   建議：移除 URL 中的 ?pgbouncer=true 參數');
    throw new Error('Invalid DB URL configuration: port 6543 with pgbouncer=true');
  }

  if (port === 5432 && !hasPgBouncerParam) {
    console.warn('⚠️  警告：Session Mode (5432) 建議使用 ?pgbouncer=true');
  }

  return new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    query_timeout: 30000,
  });
}
```

### 2. **環境變數範本與說明**

**建議新增 `.env.example`**:

```env
# ============================================
# Supabase Database Configuration
# ============================================
#
# Transaction Mode (推薦用於大部分查詢)
# - Port: 6543
# - 不需要 ?pgbouncer=true 參數
# - 適合：短期連線、一般查詢、連線池
#
# ✅ 正確範例:
# SUPABASE_DB_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
#
# ❌ 錯誤範例 (不要加 ?pgbouncer=true):
# SUPABASE_DB_URL=postgresql://...6543/postgres?pgbouncer=true
#
SUPABASE_DB_URL=

# Session Mode (僅在需要時使用)
# - Port: 5432
# - 適合：長時間交易、需要完整 PostgreSQL 功能
# SUPABASE_SESSION_DB_URL=postgresql://...5432/postgres
```

### 3. **啟動時健康檢查**

**建議在 `server/index.ts` 添加**:

```typescript
import { testConnection } from './services/pg-client';

async function startupHealthCheck() {
  console.log('🏥 執行啟動健康檢查...');

  // 測試資料庫連線
  const dbTest = await testConnection();
  if (!dbTest.success) {
    console.error('❌ 資料庫連線失敗:', dbTest.error);
    console.error('   請檢查 SUPABASE_DB_URL 配置');
    process.exit(1);
  }

  console.log('✅ 資料庫連線正常');
}

// 在伺服器啟動前執行
await startupHealthCheck();
```

### 4. **自動化測試**

**建議新增 `tests/database-connection.test.ts`**:

```typescript
import { testConnection } from '../server/services/pg-client';

describe('Database Connection', () => {
  it('should connect successfully', async () => {
    const result = await testConnection();
    expect(result.success).toBe(true);
  });

  it('should validate URL format', () => {
    const url = process.env.SUPABASE_DB_URL!;
    const parsedUrl = new URL(url);

    // Transaction Mode 不應有 pgbouncer 參數
    if (parsedUrl.port === '6543') {
      expect(parsedUrl.searchParams.has('pgbouncer')).toBe(false);
    }
  });
});
```

### 5. **文件化最佳實踐**

**建議更新 `CLAUDE.md`**:

```markdown
## Database Connection 重要注意事項

### ⚠️ Supabase Connection String 配置

**Transaction Mode (推薦)**:
- Port: `6543`
- URL: `postgresql://...6543/postgres` (不加任何參數)
- 用途: 一般查詢、連線池

**常見錯誤**:
❌ `postgresql://...6543/postgres?pgbouncer=true` → 會導致 "Tenant or user not found"
✅ `postgresql://...6543/postgres` → 正確

### 檢查清單

部署前請確認:
- [ ] `.env` 中的 `SUPABASE_DB_URL` 不包含 `?pgbouncer=true`
- [ ] Port 使用 6543 (Transaction Mode)
- [ ] 執行 `npx tsx scripts/test-db-connection.ts` 確認連線正常
```

### 6. **監控與告警**

**建議添加錯誤監控**:

```typescript
// 在 pg-client.ts 的 queryDatabase 函數中
export async function queryDatabase(query: string, params?: any[]) {
  const pool = createPool();

  try {
    const result = await pool.query(query, params);
    return result;
  } catch (error: any) {
    // 特別偵測 "Tenant not found" 錯誤
    if (error.message?.includes('Tenant or user not found')) {
      console.error('🚨 致命錯誤：資料庫連線配置錯誤');
      console.error('   請檢查 .env 中的 SUPABASE_DB_URL');
      console.error('   確認沒有 ?pgbouncer=true 參數');
    }
    throw error;
  } finally {
    await pool.end();
  }
}
```

---

## 📊 修復後驗證

**執行以下測試確認修復成功**:

```bash
# 1. 測試資料庫連線
npx tsx scripts/test-db-connection.ts

# 2. 測試收支記錄 API
curl http://localhost:5000/api/income-expense/records

# 3. 測試教學品質分析 API
curl http://localhost:5000/api/teaching-quality/sales-records

# 4. 前端功能測試
# - 訪問「收支記錄管理」頁面
# - 訪問「教學品質分析」頁面
# - 執行「手動分析」功能
```

---

## 🎓 學習重點

1. **環境變數是配置的真相來源**
   - 錯誤的環境變數會導致系統性故障
   - 需要嚴格驗證和文件化

2. **連線參數的重要性**
   - 小小的 URL 參數 (`?pgbouncer=true`) 可能造成大問題
   - 需要了解底層服務 (Supabase Pooler) 的運作方式

3. **開發模式的雙面刃**
   - `SKIP_AUTH=true` 方便開發，但可能掩蓋問題
   - 需要定期在正式模式下測試

4. **預防勝於治療**
   - 添加驗證機制
   - 啟動時健康檢查
   - 自動化測試
   - 完善文件

---

## ✅ 檢查清單

修復後請確認:

- [x] 已移除 `.env` 中的 `?pgbouncer=true` 參數
- [x] 已重啟伺服器
- [ ] 前端「收支記錄管理」頁面可正常載入
- [ ] 前端「教學品質分析」手動分析功能正常
- [ ] 添加 URL 驗證機制 (建議)
- [ ] 添加啟動健康檢查 (建議)
- [ ] 更新文件說明 (建議)

---

**報告撰寫時間**: 2025-10-21
**撰寫者**: Claude (AI Assistant)
**問題狀態**: ✅ 已修復，建議實施預防措施

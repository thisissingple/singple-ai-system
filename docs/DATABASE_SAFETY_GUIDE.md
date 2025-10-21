# 資料庫安全操作指南

**建立日期**: 2025-10-17
**最後更新**: 2025-10-17
**目的**: 防止連接到錯誤的資料庫，確保所有操作都在正確的 Supabase 資料庫上執行

---

## 🚨 為什麼需要這份指南？

### 歷史問題回顧

**問題**: 在 Phase 19.1 開發期間，曾經誤連到 **Neondb**（Replit 的測試資料庫），而非 **Supabase**（生產資料庫）

**影響**:
- Migration 腳本執行在錯誤的資料庫
- 建立的資料無法在應用程式中顯示
- 浪費時間除錯和重新執行

**根本原因**:
- 使用了 `DATABASE_URL` 環境變數（指向 Neondb）
- 沒有驗證目標資料庫是否為 Supabase
- 缺乏資料庫連線前的檢查機制

**詳細記錄**: 參見 [`PROJECT_PROGRESS.md`](../PROJECT_PROGRESS.md) 第 10-74 行

---

## ✅ 三層安全機制

為了防止再次發生，我們建立了三層安全防護：

### 第 1 層: 環境變數驗證

**規則**: ⚠️ **永遠使用 `$SUPABASE_DB_URL`，絕不使用 `DATABASE_URL`**

```bash
# ❌ 錯誤 - 會連到 Neondb (Replit 測試資料庫)
export DATABASE_URL="postgresql://..."
npx tsx scripts/my-migration.ts

# ✅ 正確 - 使用 Supabase 環境變數
export SUPABASE_DB_URL="postgresql://postgres.vqkkqkjaywkjtraepqbg:..."
npx tsx scripts/my-migration.ts
```

**在腳本中驗證**:
```typescript
// ✅ 好習慣：腳本開頭檢查環境變數
if (!process.env.SUPABASE_DB_URL) {
  console.error('❌ 錯誤：SUPABASE_DB_URL 環境變數未設定');
  console.error('請使用: export SUPABASE_DB_URL="..."');
  process.exit(1);
}
```

---

### 第 2 層: 安全執行腳本

**工具**: [`scripts/run-migration-safely.sh`](../scripts/run-migration-safely.sh)

**功能**:
1. 自動檢查 `$SUPABASE_DB_URL` 是否存在
2. 顯示連線資訊（隱藏密碼）
3. 要求使用者確認
4. 安全執行 migration

**使用方式**:
```bash
# ✅ 推薦方式
./scripts/run-migration-safely.sh scripts/my-migration.ts

# 腳本會自動執行以下檢查：
# 1. SUPABASE_DB_URL 環境變數存在？
# 2. 連線字串包含 "supabase.com"？
# 3. 使用者確認要執行？
```

**腳本內容範例**:
```bash
#!/bin/bash

# 檢查環境變數
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ 錯誤：SUPABASE_DB_URL 未設定"
  exit 1
fi

# 顯示連線資訊（隱藏密碼）
echo "📊 目標資料庫: ${SUPABASE_DB_URL:0:60}..."

# 確認執行
read -p "確定要執行嗎？(y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "取消執行"
  exit 1
fi

# 執行 migration
npx tsx "$1"
```

---

### 第 3 層: Migration 內建驗證

**規則**: 每個 migration 腳本都應該包含資料庫驗證邏輯

**驗證方式**: 檢查 Supabase 特有的表格是否存在

```typescript
/**
 * 驗證我們連線到正確的資料庫（Supabase，不是 Neondb）
 */
async function validateDatabase() {
  try {
    // 檢查 income_expense_records 表是否存在
    // 這是 Supabase 獨有的表格，Neondb 不會有
    const result = await queryDatabase(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'income_expense_records'
      ) as table_exists
    `);

    if (!result.rows[0].table_exists) {
      console.error('❌ 錯誤：找不到 income_expense_records 表');
      console.error('⚠️  你可能連到了錯誤的資料庫（Neondb 而非 Supabase）');
      console.error('請檢查 SUPABASE_DB_URL 環境變數');
      process.exit(1);
    }

    console.log('✅ 資料庫驗證通過 - 已連線到 Supabase');
  } catch (error) {
    console.error('❌ 資料庫驗證失敗:', error);
    process.exit(1);
  }
}

// 主函數開頭呼叫
async function main() {
  await validateDatabase(); // 第一件事：驗證資料庫

  // 繼續執行 migration...
}
```

**其他驗證方式**:
```typescript
// 方法 1: 檢查特定表格
SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')

// 方法 2: 檢查連線字串
if (!process.env.SUPABASE_DB_URL?.includes('supabase.com')) {
  console.error('❌ 連線字串不包含 supabase.com');
  process.exit(1);
}

// 方法 3: 檢查資料庫名稱
SELECT current_database(); -- 應該是 "postgres"
```

---

## 📋 執行前檢查清單

在執行任何資料庫操作（migration、腳本、SQL）之前，請完成以下檢查：

### 環境變數檢查
```bash
# 1. 檢查 SUPABASE_DB_URL 是否設定
echo $SUPABASE_DB_URL

# 2. 驗證連線字串包含 supabase.com
echo $SUPABASE_DB_URL | grep "supabase.com"

# 3. 顯示前 60 字元（確認是正確的）
echo "SUPABASE_DB_URL: ${SUPABASE_DB_URL:0:60}..."
```

### 連線測試
```bash
# 方法 1: 使用 psql 測試連線
SUPABASE_DB_URL="postgresql://..." psql -c "SELECT current_database();"

# 方法 2: 檢查特定表格
SUPABASE_DB_URL="postgresql://..." psql -c "SELECT COUNT(*) FROM income_expense_records;"
```

### 腳本執行
```bash
# ✅ 推薦：使用安全腳本
./scripts/run-migration-safely.sh scripts/my-migration.ts

# ✅ 手動執行（確保已設定 SUPABASE_DB_URL）
npx tsx scripts/my-migration.ts

# ❌ 避免：直接使用 DATABASE_URL
DATABASE_URL="..." npx tsx scripts/my-migration.ts
```

---

## 🛠️ 實際案例

### 案例 1: 建立歷史人員記錄

**檔案**: [`scripts/create-historical-users.ts`](../scripts/create-historical-users.ts)

**安全機制**:
```typescript
// ✅ 第 1 層：檢查環境變數
if (!process.env.SUPABASE_DB_URL) {
  console.error('❌ SUPABASE_DB_URL 未設定');
  process.exit(1);
}

// ✅ 第 3 層：驗證資料庫
async function validateDatabase() {
  const result = await queryDatabase(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'users'
    ) as table_exists
  `);

  if (!result.rows[0].table_exists) {
    console.error('❌ 錯誤的資料庫！找不到 users 表');
    process.exit(1);
  }
}

// ✅ 主函數
async function main() {
  await validateDatabase();
  console.log('✅ 資料庫驗證通過');

  // 繼續建立人員...
}
```

**執行方式**:
```bash
# ✅ 方法 1: 使用安全腳本（推薦）
./scripts/run-migration-safely.sh scripts/create-historical-users.ts

# ✅ 方法 2: 手動執行（需先驗證環境變數）
echo $SUPABASE_DB_URL
npx tsx scripts/create-historical-users.ts
```

---

### 案例 2: 批次資料遷移

**檔案**: [`scripts/migrate-historical-data.ts`](../scripts/migrate-historical-data.ts)

**安全機制**:
```typescript
// ✅ 開頭驗證
async function main() {
  console.log('🚀 開始資料遷移...');

  // 驗證環境變數
  if (!process.env.SUPABASE_DB_URL) {
    console.error('❌ 請設定 SUPABASE_DB_URL');
    process.exit(1);
  }

  // 驗證資料庫
  const validation = await queryDatabase(`
    SELECT
      current_database() as db_name,
      (SELECT COUNT(*) FROM income_expense_records) as record_count
  `);

  console.log(`✅ 已連線到: ${validation.rows[0].db_name}`);
  console.log(`✅ 找到 ${validation.rows[0].record_count} 筆收支記錄`);

  // 繼續遷移...
}
```

---

## 🔍 常見錯誤與排查

### 錯誤 1: "relation does not exist"

**錯誤訊息**:
```
error: relation "income_expense_records" does not exist
```

**原因**: 連到了 Neondb，而非 Supabase

**解決方法**:
1. 檢查環境變數：`echo $SUPABASE_DB_URL`
2. 確認使用 `SUPABASE_DB_URL` 而非 `DATABASE_URL`
3. 重新執行腳本

---

### 錯誤 2: 環境變數未設定

**錯誤訊息**:
```
❌ 錯誤：SUPABASE_DB_URL 環境變數未設定
```

**解決方法**:
```bash
# 設定環境變數（從 Replit Secrets 複製）
export SUPABASE_DB_URL="postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# 驗證已設定
echo $SUPABASE_DB_URL
```

---

### 錯誤 3: 資料不同步

**症狀**: Migration 執行成功，但前端看不到資料

**可能原因**:
1. 執行在錯誤的資料庫（Neondb）
2. 使用了錯誤的 connection pool

**排查步驟**:
```bash
# 1. 確認當前連線
SUPABASE_DB_URL="..." psql -c "SELECT current_database();"

# 2. 檢查表格記錄數
SUPABASE_DB_URL="..." psql -c "SELECT COUNT(*) FROM business_identities;"

# 3. 比對前端 API 回應
curl http://localhost:5000/api/employees
```

---

## 📚 參考資料

### 相關檔案
- [`PROJECT_PROGRESS.md`](../PROJECT_PROGRESS.md) - 第 10-74 行記錄了資料庫問題
- [`server/services/pg-client.ts`](../server/services/pg-client.ts) - PostgreSQL 連線管理
- [`scripts/run-migration-safely.sh`](../scripts/run-migration-safely.sh) - 安全執行腳本
- [`PG_ARCHITECTURE_DECISION.md`](../PG_ARCHITECTURE_DECISION.md) - 為什麼使用 pg 而非 Supabase Client

### 環境變數說明
| 變數名稱 | 用途 | 指向資料庫 |
|---------|------|-----------|
| `SUPABASE_DB_URL` | ✅ 生產資料庫 | Supabase PostgreSQL |
| `DATABASE_URL` | ⚠️ 測試資料庫 | Neondb (Replit) |

### 快速參考指令
```bash
# 檢查環境變數
echo $SUPABASE_DB_URL

# 測試連線
SUPABASE_DB_URL="..." psql -c "SELECT version();"

# 安全執行 migration
./scripts/run-migration-safely.sh scripts/my-script.ts

# 檢查表格是否存在
SUPABASE_DB_URL="..." psql -c "\\dt"
```

---

## ✨ 最佳實踐總結

1. ✅ **永遠使用 `SUPABASE_DB_URL`**，不用 `DATABASE_URL`
2. ✅ **使用安全腳本** `run-migration-safely.sh` 執行 migration
3. ✅ **腳本內建驗證** 檢查特定表格存在（如 `income_expense_records`）
4. ✅ **執行前確認** 使用檢查清單驗證環境
5. ✅ **錯誤處理** 遇到 "relation does not exist" 立即檢查資料庫
6. ✅ **文件記錄** 每次 migration 都記錄在 PROJECT_PROGRESS.md

---

**文件維護者**: Claude (AI Assistant)
**最後驗證日期**: 2025-10-17

# 🚨 緊急修復：資料庫連線錯誤

## 問題
收支記錄管理、教學品質分析等功能出現 **"Tenant or user not found"** 錯誤。

## 原因
**Replit Secrets** 中的 `SUPABASE_DB_URL` 設定錯誤（使用了 `aws-1` 而非 `aws-0`）。

## 立即修復步驟

### 1️⃣ 開啟 Replit Secrets
在 Replit 專案左側點擊 **🔒 Secrets** (或 Tools → Secrets)

### 2️⃣ 更新 SUPABASE_DB_URL
找到 `SUPABASE_DB_URL`，改為：
```
postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

**重點**:
- ✅ 使用 `aws-0` (不是 `aws-1`)
- ✅ Port `6543`
- ✅ **沒有** `?pgbouncer=true` 參數

### 3️⃣ 重啟伺服器
```bash
npm run dev:clean
```

### 4️⃣ 測試驗證
- 重新整理「收支記錄管理」頁面
- 測試「教學品質分析」的「手動分析」功能

---

## 為什麼會發生？

1. **Replit Secrets 優先權高於 .env 檔案**
   - 即使修改 `.env`，Replit Secrets 的值仍會覆蓋
   - 必須直接在 Replit Secrets 中修正

2. **錯誤的 endpoint**
   - 舊設定: `aws-1-ap-southeast-1` ❌
   - 正確設定: `aws-0-ap-southeast-1` ✅

3. **影響範圍廣**
   - 所有使用 PostgreSQL 直連的功能 (約 110 處)
   - 收支記錄、教學品質、成本獲利、員工管理等

## 完整技術報告
詳細分析請參閱: [`DATABASE_CONNECTION_ERROR_REPORT.md`](./DATABASE_CONNECTION_ERROR_REPORT.md)

---

**修復時間**: < 2 分鐘
**修復後**: 所有功能立即恢復正常

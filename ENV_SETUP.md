# 環境變數設定指南

## ✅ 本地開發環境

### 自動載入 `.env` 檔案

本專案已配置自動載入 `.env` 檔案，**不需要每次重開 Claude Code 都重新設定環境變數**。

### 配置位置

1. **根目錄 `.env` 檔案** (已建立)
   - 位置: `/Users/hsepherdz./singple-ai-system-1/.env`
   - 已包含所有必要的環境變數
   - **已加入 `.gitignore`**，不會上傳到 Git（保護敏感資訊）

2. **自動載入機制**
   - [`server/index.ts:15`](server/index.ts#L15) - `dotenv.config({ override: true })`
   - 伺服器啟動時自動載入 `.env` 檔案
   - 測試腳本也已更新為自動載入

### 驗證環境變數

執行以下命令檢查環境變數是否正確載入：

```bash
npx tsx tests/test-env-check.ts
```

預期輸出：
```
✓ SUPABASE_URL: 已設定
✓ SUPABASE_SERVICE_ROLE_KEY: 已設定
✓ GOOGLE_SHEETS_CREDENTIALS: 已設定
✓ Supabase client: 已初始化
```

---

## 📋 環境變數清單

### Supabase 資料庫
```bash
SUPABASE_URL=https://vqkkqkjaywkjtraepqbg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_URL=postgresql://postgres.vqkkqkjaywkjtraepqbg:***@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
SESSION_DB_URL=postgresql://postgres.vqkkqkjaywkjtraepqbg:***@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
```

### Session 安全性
```bash
SESSION_SECRET=4wWIkpaozX64IwbQrwdEYZVaGwwoiCeI...
```

### OpenAI API
```bash
OPENAI_API_KEY=sk-proj-78aXUwY-S_I0syXYSE71...
```

### Google Sheets API
```bash
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"replit-473109",...}
```

### GitHub Token
```bash
GITHUB_TOKEN=ghp_xxxxx  # 請填入您的 GitHub Personal Access Token
```

### 開發環境設定
```bash
PORT=5001
NODE_ENV=development
# SKIP_AUTH=true  # 開發時可取消註解跳過認證
```

---

## 🚀 部署環境 (Zeabur)

### Zeabur 環境變數設定

在 Zeabur 專案設定中，手動新增以下環境變數：

1. 進入 Zeabur Dashboard
2. 選擇專案 → Settings → Environment Variables
3. 新增以下變數（複製 `.env` 檔案內容）

**注意**：
- Zeabur 會自動設定 `PORT` 環境變數，不需要手動設定
- `NODE_ENV` 在生產環境應設為 `production`

---

## 🔒 安全性提醒

### ⚠️ 絕對不要將以下內容上傳到 Git：
- ❌ `.env` 檔案（已在 `.gitignore` 中）
- ❌ API Keys
- ❌ 資料庫密碼
- ❌ Session Secrets

### ✅ 可以上傳到 Git：
- ✅ `.env.example` - 範例檔案（不含真實資訊）
- ✅ `ENV_SETUP.md` - 本設定指南

---

## 🧪 測試指令

### 測試環境變數載入
```bash
npx tsx tests/test-env-check.ts
```

### 測試 KPI 計算（需要環境變數）
```bash
npx tsx tests/test-kpi-only.ts
```

### 啟動開發伺服器
```bash
npm run dev
```

---

## 🔧 常見問題

### Q: 為什麼重開 Claude Code 後環境變數不見了？
A: **不會！** `.env` 檔案已經建立在專案根目錄，伺服器和測試腳本都會自動載入。

### Q: 如何更新環境變數？
A: 直接編輯 `.env` 檔案，重啟伺服器即可。

### Q: `.env` 檔案會上傳到 GitHub 嗎？
A: **不會！** 已加入 `.gitignore`，只會保留 `.env.example` 範例。

### Q: 生產環境如何設定環境變數？
A: 在 Zeabur Dashboard 的 Environment Variables 頁面手動設定。

---

## 📝 檔案結構

```
singple-ai-system-1/
├── .env                    # 本地環境變數（已建立，不上傳 Git）
├── .env.example            # 環境變數範例（上傳 Git）
├── ENV_SETUP.md            # 本設定指南
├── .gitignore              # 已排除 .env
└── server/
    └── index.ts            # 自動載入 dotenv.config()
```

---

**✅ 設定完成！下次重開 Claude Code 不需要再設定環境變數。**

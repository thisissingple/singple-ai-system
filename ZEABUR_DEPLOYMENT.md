# 🚀 Zeabur 部署指南

## 📋 前置準備

### 1. 確保程式碼已推送到 GitHub
```bash
git add .
git commit -m "Prepare for Zeabur deployment"
git push origin main
```

### 2. 準備環境變數

在 Zeabur 中需要設定以下環境變數（從您的 Replit Secrets 複製）：

#### 必要變數

```env
# Supabase Configuration
SUPABASE_URL=https://vqkkqkjaywkjtraepqbg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database URLs (⚠️ 重要：使用 port 5432)
SUPABASE_DB_URL=postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
SUPABASE_SESSION_DB_URL=postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres

# Session Secret
SESSION_SECRET=your-random-secret-key-here-please-change-this

# Server Configuration
NODE_ENV=production
PORT=5000

# Authentication (生產環境設為 false)
SKIP_AUTH=false

# AI API Key (從 Replit Secrets 複製您的 key)
OPENAI_API_KEY=your-openai-api-key-here
```

#### 可選變數

```env
# Google Sheets (如果需要)
GOOGLE_SHEETS_CREDENTIALS=

# Anthropic Claude (備選 AI)
# ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## 🔧 Zeabur 部署步驟

### 步驟 1: 登入 Zeabur

1. 前往 [https://zeabur.com](https://zeabur.com)
2. 使用 GitHub 帳號登入

### 步驟 2: 建立新專案

1. 點擊 **Create New Project**
2. 選擇區域：**Singapore** 或 **Taiwan**（離您最近的）
3. 輸入專案名稱：`singple-ai-system`

### 步驟 3: 連接 GitHub Repository

1. 點擊 **Add Service** → **Git**
2. 選擇 **thisissingple-studio/singple_ai_system**
3. 選擇分支：**main**

### 步驟 4: 設定環境變數

1. 進入專案設定
2. 點擊 **Variables** 標籤
3. 逐一添加上面的環境變數
4. ⚠️ **特別注意**：
   - `SUPABASE_DB_URL` 和 `SUPABASE_SESSION_DB_URL` 必須使用 **port 5432**
   - `NODE_ENV` 設為 `production`
   - `SKIP_AUTH` 設為 `false`（啟用登入功能）

### 步驟 5: 部署設定

1. Zeabur 會自動偵測 Node.js 專案
2. 確認以下設定：
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Port**: `5000`

### 步驟 6: 觸發部署

1. 點擊 **Deploy**
2. 等待建置完成（約 2-5 分鐘）
3. 部署成功後會顯示網址

### 步驟 7: 驗證部署

1. 開啟 Zeabur 提供的網址
2. 測試以下功能：
   - ✅ 登入頁面可以載入
   - ✅ 登入後可以看到儀表板
   - ✅ 體驗課報表資料顯示正常
   - ✅ 手動分析功能正常（不會出現 "Tenant not found"）

---

## 🔍 故障排除

### 問題 1: 建置失敗

**解決方案**:
- 檢查 GitHub 上的程式碼是否最新
- 確認 `package.json` 中的 scripts 正確

### 問題 2: 啟動失敗

**解決方案**:
- 檢查環境變數是否全部設定
- 查看 Zeabur 的 Logs 找出錯誤訊息

### 問題 3: 資料庫連線錯誤

**檢查清單**:
- [ ] `SUPABASE_DB_URL` 使用 port 5432（不是 6543）
- [ ] `SUPABASE_SESSION_DB_URL` 使用 port 5432
- [ ] Supabase 密碼正確
- [ ] Pooler 使用 `aws-1`（不是 `aws-0`）

### 問題 4: 手動分析功能出現 "Tenant not found"

**解決方案**:
```
確認環境變數：
SUPABASE_DB_URL=postgresql://...@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres
                                      ^^^^^ 必須是 aws-1
                                                                                ^^^^ 必須是 5432
```

---

## 📊 部署後檢查清單

部署完成後，請逐一確認：

- [ ] 網站可以正常開啟
- [ ] 登入功能正常
- [ ] 體驗課報表資料顯示
- [ ] 成本獲利報表資料顯示
- [ ] 教學品質追蹤可以查看
- [ ] 手動分析功能正常（不會出現資料庫錯誤）
- [ ] Form Builder 可以建立表單
- [ ] AI 分析功能正常（需要 OPENAI_API_KEY）

---

## 🔄 後續更新流程

當程式碼有更新時：

1. 在本地修改程式碼
2. Commit 並 push 到 GitHub
   ```bash
   git add .
   git commit -m "描述更新內容"
   git push origin main
   ```
3. Zeabur 會自動偵測並重新部署（約 2-5 分鐘）

---

## 🌐 自訂網域（可選）

如果想使用自己的網域：

1. 在 Zeabur 專案設定中點擊 **Domains**
2. 點擊 **Add Domain**
3. 輸入您的網域（例如：`app.singple.com`）
4. 按照指示設定 DNS CNAME 記錄

---

## 📞 需要協助？

如果部署遇到問題，請查看：
- Zeabur Logs（查看詳細錯誤訊息）
- GitHub Actions（如果有設定 CI/CD）
- Supabase Dashboard（確認資料庫狀態）

記錄錯誤訊息並告訴我，我會協助解決！

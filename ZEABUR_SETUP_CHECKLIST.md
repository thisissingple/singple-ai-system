# Zeabur 設定檢查清單

## 🎯 目標
讓 Zeabur 正確運行 Node.js 後端 + 前端的全端應用程式

---

## ✅ Step 1: 登入 Zeabur Dashboard

1. 前往：https://dash.zeabur.com/
2. 登入你的帳號
3. 找到專案：**singple-ai-system**

---

## ✅ Step 2: 檢查服務類型

### **重要！確認服務類型為 Node.js**

在 Zeabur Dashboard 中：

1. 點選你的服務（singple-ai-system）
2. 查看 **Service Type** 或 **Framework**
3. **必須是**：`Node.js` 或 `Express`
4. **不能是**：`Static` 或 `Vite`

### **如果是 Static，需要改成 Node.js：**

**方法 A：透過 Dashboard**
- 點選服務設定（Settings）
- 找到 Framework Detection
- 手動選擇 `Node.js`
- 重新部署

**方法 B：刪除並重新建立服務**
- 刪除現有服務
- 重新連接 GitHub repository
- Zeabur 應該會自動偵測為 Node.js（因為有 `zeabur.json`）

---

## ✅ Step 3: 確認建置與啟動命令

在 Zeabur Dashboard 的服務設定中確認：

| 設定項目 | 正確值 |
|---------|--------|
| **Build Command** | `npm run build` |
| **Start Command** | `npm start` |
| **Install Command** | `npm install`（或留空，自動偵測） |
| **Root Directory** | `/`（或留空） |

### **驗證方式**
查看部署日誌（Deployment Logs），應該看到：
```
✓ Running build command: npm run build
✓ Running start command: npm start
✓ Server listening on port 5000
```

---

## ✅ Step 4: 設定環境變數

在 Zeabur Dashboard → Environment Variables 新增：

```env
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **必要的環境變數**
- ✅ `SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `NODE_ENV=production`
- ✅ `PORT=5000`（可選，Zeabur 會自動分配）

### **其他可能需要的**
- `GOOGLE_SHEETS_CREDENTIALS`（如果用到 Google Sheets）
- `OPENAI_API_KEY`（如果用到 AI 功能）
- `SESSION_SECRET`（如果用到 session）

---

## ✅ Step 5: 檢查部署狀態

### **在 Zeabur Dashboard 查看：**

1. **Deployments** 頁面
2. 最新部署應該是：
   - Commit: `c53d973` (fix: Update Zeabur configuration...)
   - Status: **Running** ✅
   - 不是 **Building** 或 **Failed**

### **查看部署日誌**
點選最新部署 → View Logs

**成功的日誌應該包含**：
```
[build] > rest-express@1.0.0 build
[build] > vite build && node esbuild.config.js
[build] ✓ built in XXXms

[start] > rest-express@1.0.0 start
[start] > NODE_ENV=production node dist/index.js
[start] 🚀 Server running on port 5000
[start] ✅ Database connected
```

**失敗的日誌可能顯示**：
- ❌ `Module not found`
- ❌ `Cannot find package 'express'`
- ❌ `Connection refused`

---

## ✅ Step 6: 測試 API 端點

### **方法 1：用 cURL 測試**

```bash
# 測試 Health 端點（應該回傳 JSON，不是 HTML）
curl https://singple-ai-system.zeabur.app/api/health

# 預期回應：
{"status":"ok","timestamp":"..."}
```

### **方法 2：用瀏覽器**

打開：https://singple-ai-system.zeabur.app/api/health

**成功**：顯示 JSON
```json
{"status":"ok"}
```

**失敗**：顯示 HTML 前端頁面
```html
<!DOCTYPE html>
<html>...
```

---

## ✅ Step 7: 測試 GoHighLevel Webhook

### **在 GoHighLevel 發送測試**

1. Workflow → Webhook Action
2. URL: `https://singple-ai-system.zeabur.app/api/webhooks/gohighlevel`
3. Method: `POST`
4. 點選 **Test**

### **檢查 Supabase**

```sql
SELECT contact_id, name, email, phone, created_at
FROM gohighlevel_contacts
ORDER BY created_at DESC
LIMIT 5;
```

**成功**：有資料出現 ✅
**失敗**：`No rows returned` ❌

---

## 🚨 常見問題與解決方案

### **問題 1：API 回傳 HTML 而不是 JSON**

**原因**：Zeabur 把專案當作靜態網站部署

**解決**：
1. 確認 `zeabur.json` 存在且正確
2. 在 Dashboard 手動設定 Service Type 為 `Node.js`
3. 重新部署

---

### **問題 2：部署成功但伺服器沒啟動**

**原因**：Start Command 錯誤或 `dist/index.js` 不存在

**解決**：
1. 檢查 Build Logs 是否有錯誤
2. 確認 `npm run build` 成功建立 `dist/index.js`
3. 確認 Start Command 為 `npm start`

---

### **問題 3：環境變數沒生效**

**原因**：Zeabur 沒有正確載入環境變數

**解決**：
1. 在 Dashboard 重新輸入環境變數
2. 儲存後，手動觸發 Redeploy
3. 不要用 `.env` 檔案（Zeabur 不會讀取）

---

### **問題 4：資料庫連線失敗**

**原因**：`SUPABASE_URL` 或 `SUPABASE_SERVICE_ROLE_KEY` 錯誤

**解決**：
1. 檢查環境變數拼字
2. 確認 Supabase Service Role Key 是完整的（很長）
3. 測試連線：在伺服器日誌看是否有 `Database connected`

---

## 📊 完整檢查清單

在 Zeabur Dashboard 逐項確認：

- [ ] Service Type = **Node.js**（不是 Static）
- [ ] Build Command = `npm run build`
- [ ] Start Command = `npm start`
- [ ] 環境變數已設定（至少 SUPABASE_URL 和 KEY）
- [ ] 最新 commit `c53d973` 已部署
- [ ] 部署狀態為 **Running**
- [ ] 部署日誌無錯誤
- [ ] `/api/health` 回傳 JSON（不是 HTML）
- [ ] GoHighLevel webhook 測試成功
- [ ] Supabase 有收到資料

---

## 🆘 如果還是不行

**聯絡 Zeabur 支援**或考慮：

1. **Railway.app** - 更簡單的 Node.js 部署
2. **Render.com** - 免費且配置簡單
3. **Fly.io** - 效能好但需要 Dockerfile
4. **回到 Replit** - 最簡單，直接運行

---

## 📞 需要協助

如果以上步驟都完成但還是不行，請提供：

1. Zeabur 部署日誌截圖
2. `curl https://singple-ai-system.zeabur.app/api/health` 的回應
3. Zeabur Dashboard 的 Service Type 設定截圖

---

**最後更新**：2025-10-23
**版本**：1.0

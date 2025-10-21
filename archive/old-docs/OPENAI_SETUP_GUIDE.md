# 🤖 OpenAI GPT-4 設定指南

## ✅ AI Chat Service 已改用 OpenAI

已將 AI Chat Service 從 Anthropic Claude 改為 **OpenAI GPT-4**，更容易取得且價格更合理。

---

## 📋 如何取得 OpenAI API Key

### 步驟 1: 註冊/登入 OpenAI

1. 前往 [OpenAI Platform](https://platform.openai.com/)
2. 點擊右上角 **Sign Up** 或 **Log In**
3. 使用 Google/Microsoft 帳號或 Email 註冊

### 步驟 2: 充值帳戶

⚠️ **重要**：OpenAI API 不提供免費額度，需要先充值才能使用

1. 登入後，點擊左側選單 **Settings** → **Billing**
2. 點擊 **Add payment method** 加入信用卡
3. 點擊 **Add to credit balance** 充值
   - 建議先充值 **$5-10 美元**（足夠測試使用）
   - GPT-4 Turbo 費用：
     - Input: $10 / 1M tokens
     - Output: $30 / 1M tokens
   - 預估：**$0.01-0.05 美元/次**對話

### 步驟 3: 創建 API Key

1. 點擊左側選單 **API keys**
2. 點擊 **+ Create new secret key**
3. 設定名稱（例如：`SheetSync AI Chat`）
4. 點擊 **Create secret key**
5. **⚠️ 立即複製 API Key**（只會顯示一次！）
   - 格式：`sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## 🔑 設定 API Key 到 Replit

### 方法 1: 使用 Replit Secrets（推薦）

1. 在 Replit 點擊左側 **🔒 Secrets** 標籤
2. 點擊 **+ New Secret**
3. 設定：
   - **Key**: `OPENAI_API_KEY`
   - **Value**: 貼上您的 OpenAI API Key（`sk-proj-...`）
4. 點擊 **Add Secret**

### 方法 2: 使用 .env 檔案（開發用）

編輯 `.env` 檔案：

```bash
# AI API Configuration
OPENAI_API_KEY=sk-proj-your-api-key-here
```

⚠️ **安全提醒**：
- `.env` 已加入 `.gitignore`，不會被提交到 Git
- 正式環境請使用 Replit Secrets

---

## 🔄 重啟伺服器

設定完 API Key 後，需要重啟伺服器：

```bash
# 停止所有進程
pkill -9 -f "npm run dev"

# 重新啟動
npm run dev
```

或者在 Replit 中直接點擊 **Stop** → **Run**

---

## 🧪 測試 API

執行測試腳本：

```bash
npx tsx test-ai-chat-simple.ts
```

**預期輸出**：

```
🧪 測試 AI Chat API...
📊 API 回應狀態: 200
✅ 成功: true

💬 AI 回答:
根據目前的資料，本週成交額最高的老師是...

📈 相關數據:
{
  "teachers": [
    { "name": "Alice", "revenue": 50000, ... },
    ...
  ]
}

🎯 信心度: 0.9
```

---

## 💡 支援的問題範例

### 📊 教師分析
```
這週哪個老師成交額最高？
本月老師績效排名
Alice 的轉換率是多少？
```

### 👥 顧問分析
```
哪個顧問成交最多？
本週諮詢師排行榜
```

### 💰 營收分析
```
這個月總營收多少？
昨天的成交金額
本週收入趨勢
```

### 🎓 學生分析
```
有多少潛在學生？
高意向學生清單
試聽但未購買的學員
```

### 📈 轉換率分析
```
試聽到成交的轉換率
整體轉換漏斗分析
```

---

## 🎯 GPT-4 vs Claude 比較

| 特性 | GPT-4 Turbo | Claude 3.5 Sonnet |
|------|-------------|-------------------|
| **註冊難度** | ⭐⭐⭐ 簡單 | ⭐⭐ 中等 |
| **免費額度** | ❌ 無（需充值） | ✅ 有（但很少） |
| **價格** | $10-30 / 1M tokens | $3-15 / 1M tokens |
| **中文能力** | ⭐⭐⭐⭐ 優秀 | ⭐⭐⭐⭐⭐ 卓越 |
| **資料分析** | ⭐⭐⭐⭐ 優秀 | ⭐⭐⭐⭐⭐ 卓越 |
| **速度** | ⭐⭐⭐⭐ 快 | ⭐⭐⭐⭐⭐ 很快 |
| **推薦度** | ✅ 推薦（易用） | ✅✅ 更推薦（效果好） |

**結論**：
- 如果您已有 OpenAI 帳號 → 先用 GPT-4
- 如果要最佳效果 → 改天可以試試 Claude（需要充值）

---

## 📦 技術細節

### 使用的模型

- **gpt-4-turbo-preview** - OpenAI 最新的 GPT-4 Turbo 模型
  - 支援 128K context window
  - 更便宜且更快
  - 知識更新到 2023 年 12 月

### API 參數

```typescript
{
  model: 'gpt-4-turbo-preview',
  temperature: 0.3,        // 低溫度 = 更穩定的回答
  max_tokens: 2048,        // 最多 2048 tokens 輸出
}
```

### 程式碼位置

- **AI Chat Service**: [server/services/ai-chat-service.ts](server/services/ai-chat-service.ts)
- **API 端點**: [server/routes.ts](server/routes.ts) (Line 3831)
- **環境變數**: `.env` 或 Replit Secrets

---

## ⚠️ 常見問題

### Q: API Key 無效？
**A**: 確認：
1. API Key 格式正確（`sk-proj-...`）
2. 帳戶已充值
3. 重啟伺服器讓環境變數生效

### Q: 提示餘額不足？
**A**: 前往 [OpenAI Billing](https://platform.openai.com/settings/organization/billing/overview) 充值

### Q: 回應太慢？
**A**:
- GPT-4 通常 2-5 秒內回應
- 如果超過 10 秒，檢查網路或 API 狀態

### Q: 想改回 Claude？
**A**: 修改 `.env`：
```bash
# 註解掉 OpenAI
# OPENAI_API_KEY=...

# 取消註解 Claude
ANTHROPIC_API_KEY=sk-ant-...
```

然後修改 `ai-chat-service.ts` 的 `ensureInitialized()` 方法優先順序。

---

## 🚀 下一步

設定完成後：

1. ✅ 測試 AI Chat API
2. 🎨 開發前端 AI 分析頁面
3. 💬 實作 AI 對話框元件
4. 📊 創建智能洞察卡片

---

**最後更新**: 2025-10-07
**狀態**: ✅ 已完成 OpenAI 整合

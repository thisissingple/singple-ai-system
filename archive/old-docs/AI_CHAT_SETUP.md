# 🤖 AI Chat API 設定指南

## ✅ 後端 API 已完成

AI Chat Service 已經實作完成，現在需要設定環境變數。

## 🔑 步驟 1: 設定 Replit Secret

請在 Replit 環境中設定以下 Secret：

1. 點擊左側工具欄的 **🔒 Secrets** 標籤
2. 點擊 **+ New Secret**
3. 設定以下內容：
   - **Key**: `ANTHROPIC_API_KEY`
   - **Value**: `your-anthropic-api-key-here`
4. 點擊 **Add Secret**

## 🔄 步驟 2: 重啟伺服器

設定完 Secret 後，需要重啟伺服器讓環境變數生效：

```bash
# 停止所有進程
pkill -9 -f "npm run dev"

# 重新啟動
npm run dev
```

## 🧪 步驟 3: 測試 AI Chat API

```bash
npx tsx test-ai-chat-simple.ts
```

預期輸出：
```
🧪 測試 AI Chat API...
📊 API 回應狀態: 200
✅ 成功: true
💬 AI 回答: [AI 生成的回答]
```

## 📝 API 使用範例

### 範例請求

```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: '這週哪個老師成交額最高？',
    history: []
  })
});

const result = await response.json();
console.log(result.data.answer);
```

### 支援的問題類型

1. **教師表現分析**
   - "這週哪個老師成交額最高？"
   - "本月老師排名如何？"
   - "Alice 的成交數是多少？"

2. **顧問表現分析**
   - "哪個顧問成交最多？"
   - "本月顧問績效排名"

3. **營收分析**
   - "這個月總營收多少？"
   - "昨天的成交金額"

4. **學生分析**
   - "有多少潛在學生？"
   - "高意向學生名單"

5. **轉換率分析**
   - "試聽到成交的轉換率"
   - "整體轉換漏斗分析"

## 🎯 下一步：前端開發

後端 API 完成後，接下來需要開發：

### Phase 7.1 MVP Core (4-6 小時)

1. **創建 AI 分析頁面** (`client/src/pages/dashboard-ai-analysis.tsx`)
   - 頁面佈局
   - AI 對話框元件
   - 基礎卡片展示

2. **AI 對話框元件** (`client/src/components/ai-chat-box.tsx`)
   - 訊息輸入框
   - 對話歷史顯示
   - 載入狀態
   - 錯誤處理

3. **核心洞察卡片** (6 張)
   - TOP 3 教師營收排名
   - TOP 3 顧問成交數
   - 月度營收總覽
   - 待追蹤學生清單
   - 資料品質警告
   - 營收趨勢圖表

4. **導航整合**
   - 在主選單加入 🤖 AI 分析

## 📊 完整功能規劃

### Phase 7.2 完整分析系統 (6-8 小時)
- 25+ 智能卡片
- 5 大類別分析

### Phase 7.3 個人化功能 (4-6 小時)
- 卡片管理（新增/移除/排序）
- 卡片庫選擇
- 匯出功能

## ⚠️ 注意事項

1. **環境變數必須使用 Replit Secrets**
   - 不要將 API Key 寫入 .env 檔案
   - 不要提交 API Key 到 Git

2. **API 限制**
   - Claude API 有使用限制
   - 建議實作快取機制

3. **錯誤處理**
   - API 失敗時顯示友善錯誤訊息
   - 提供重試機制

---

**狀態**: 🚧 後端已完成，等待環境變數設定
**最後更新**: 2025-10-07

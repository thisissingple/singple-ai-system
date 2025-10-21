# 🤖 AI 分析功能優化計劃

> **建立時間**: 2025-10-07
> **狀態**: ⏳ 待執行（階段一已完成）
> **優先級**: 🔥 高優先級

---

## 🔍 問題分析

### 問題 1: 時間範圍邏輯錯誤 ❌

**現況**：
- AI Insights API 固定只取「本月資料」
- 本月只有 2 筆體驗課、2 筆購買記錄，但有 405 筆成交記錄

**後果**：
- TOP 3 教師排行資料不足（只有 2 筆體驗課）
- 6 個卡片顯示「載入中...」

**解決方案**：
```typescript
// server/routes.ts (第 3839-3844 行)
// 修改前：取得本月資料
const dateRange = {
  start: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`,
  end: `...`,
};

// 修改後：取得全部資料
const dateRange = {
  start: '1970-01-01',
  end: '2099-12-31',
};
```

---

### 問題 2: AI Prompt 指示不明確 ❌

**現況**：
- Prompt 允許使用「表格」格式
- react-markdown 預設不渲染 Markdown 表格
- AI 輸出表格顯示為原始文字（用戶體驗差）

**截圖問題**：
```
諮詢師總營收排行
| 排名 | 名稱 | 成交筆數 | 總營收 | 平均成交金額 | ----...
```

**解決方案**：
```typescript
// server/services/ai-chat-service.ts (第 379-392 行)
**回答要求**:
1. 用繁體中文回答
2. 直接回答問題，不要囉嗦
3. **禁止使用 Markdown 表格**，請使用清單格式
4. 如果有數字，要格式化（例如：NT$ 1,234,567）
5. 如果有排行，使用 🏆、🥈、🥉 等 emoji

**重要提醒**:
- consultants 資料已按「總營收」排序（從高到低）
- **不要計算或提及「成交率」**，因為沒有諮詢總數資料
- 直接使用提供的資料，不要做額外推論

**範例回答格式**:
🏆 第 1 名：47 - 成交 254 筆 - NT$ 10,685,662
🥈 第 2 名：Vicky - 成交 186 筆 - NT$ 7,544,097
🥉 第 3 名：Karen - 成交 99 筆 - NT$ 3,498,627
```

---

### 問題 3: 資料結構不完整 ❌

**現況**：
- `calculateTeacherStats` 需要關聯體驗課 → 購買 → 成交
- 但本月只有 2 筆體驗課資料
- 無法有效計算教師排行

**解決方案**：
- 修改 AI Insights API 取得全部資料（同問題 1）
- 確保有足夠的資料進行統計計算

---

## 📋 優化階段規劃

### ✅ 階段 1: 緊急修復（已完成）

**任務**：停止 4 個背景伺服器

**執行結果**：
```
✅ 已停止所有進程
確認：0 個進程運行
```

**狀態**：✅ 完成
**時間**：2025-10-07
**效果**：Port 5000 已歸還給 Replit 預覽

---

### ⏳ 階段 2: 資料範圍修正（待執行，10 分鐘）

**任務**：修正 AI Insights API 時間範圍

**檔案**：`server/routes.ts` (第 3839-3844 行)

**修改內容**：
```typescript
// 取得全部資料（而非本月資料）
const dateRange = {
  start: '1970-01-01',
  end: '2099-12-31',
};
```

**預期效果**：
- ✅ 取得完整的 143 筆體驗課、98 筆購買、997 筆成交
- ✅ 教師排行有足夠資料計算
- ✅ 6 個卡片正常顯示

---

### ⏳ 階段 3: AI Prompt 優化（待執行，15 分鐘）

**任務**：優化 AI Prompt，禁止表格 + 禁止成交率

**檔案**：`server/services/ai-chat-service.ts` (第 379-392 行)

**修改要點**：
1. **明確禁止使用 Markdown 表格**
2. **強制使用清單 + emoji 格式**
3. **禁止提及「成交率」**
4. **提供範例回答格式**
5. **只傳遞 TOP 5 資料**（減少 token）

**修改內容**：
```typescript
private buildPrompt(question: string, context: any, history: ChatMessage[]): string {
  const { data, dateRange } = context;

  return `你是一個教育機構的數據分析助理，專門幫助 CEO/COO 分析業務數據。

**當前資料範圍**: ${dateRange.start} 到 ${dateRange.end}

**可用資料**:
${JSON.stringify(data, null, 2)}

**使用者問題**: ${question}

**回答要求**:
1. 用繁體中文回答
2. 直接回答問題，不要囉嗦
3. **禁止使用 Markdown 表格**，請使用清單格式
4. 如果有數字，要格式化（例如：NT$ 1,234,567）
5. 如果有排行，使用 🏆、🥈、🥉 等 emoji
6. 如果資料不足，誠實說明

**重要提醒**:
- consultants 資料已按「總營收」排序（從高到低）
- **不要計算或提及「成交率」**，因為沒有諮詢總數資料
- 直接使用提供的資料，不要做額外推論
- 顯示格式：「🏆 名稱 - 成交 X 筆 - NT$ XXX」

**範例回答格式**:
🏆 第 1 名：47 - 成交 254 筆 - NT$ 10,685,662
🥈 第 2 名：Vicky - 成交 186 筆 - NT$ 7,544,097
🥉 第 3 名：Karen - 成交 99 筆 - NT$ 3,498,627

請開始回答：`;
}
```

**同時修改**：
```typescript
// 只傳遞 TOP 5，減少 token 使用量
if (lowerQ.includes('諮詢') || lowerQ.includes('closer') || lowerQ.includes('consultant')) {
  context.data.consultants = this.calculateConsultantStats(eodsData).slice(0, 5);
}
```

**預期效果**：
- ✅ AI 使用清單格式（易讀）
- ✅ 不再提及「成交率」
- ✅ 減少 token 使用量
- ✅ 回答更精準

---

### ⏳ 階段 4: 前端優化（待執行，10 分鐘）

**任務**：改善空資料提示與錯誤處理

**檔案**：`client/src/components/ai-analysis-tab.tsx`

**修改內容**：
```typescript
{insights?.data?.topTeachers && insights.data.topTeachers.length > 0 ? (
  // 顯示資料
) : (
  <div className="text-center py-4">
    <p className="text-sm text-muted-foreground">暫無資料</p>
    <p className="text-xs text-muted-foreground mt-1">
      請確認已同步 Google Sheets 資料
    </p>
  </div>
)}
```

**預期效果**：
- ✅ 清楚說明為什麼沒有資料
- ✅ 提供解決建議

---

### ⏳ 階段 5: 測試驗證（待執行，5 分鐘）

**測試清單**：
1. ✅ 檢查 6 個卡片是否正常顯示資料
2. ✅ 測試 AI 問答：「哪位諮詢師成交額最高？」
3. ✅ 驗證回答格式（清單 + emoji，無表格）
4. ✅ 確認無「成交率」相關文字
5. ✅ 檢查 port 5000 是否已清空

---

## 📊 預期優化效果

### 修正前：
- ❌ 卡片顯示「載入中...」（資料不足）
- ❌ AI 回答使用表格（顯示為原始文字）
- ❌ AI 提及「成交率」（邏輯錯誤）
- ❌ 4 個背景伺服器佔用 port 5000

### 修正後：
- ✅ 卡片顯示完整統計資料（143 筆體驗課、997 筆成交）
- ✅ AI 回答使用清單 + emoji（清晰易讀）
- ✅ AI 只顯示成交筆數和總營收（邏輯正確）
- ✅ Port 5000 歸還給 Replit 預覽

---

## 🎯 執行順序建議

1. ✅ **階段 1**：停止背景伺服器（已完成）
2. ⏳ **階段 2**：修正資料範圍（10 分鐘）
3. ⏳ **階段 3**：優化 AI Prompt（15 分鐘）
4. ⏳ **階段 4**：前端優化（10 分鐘）
5. ⏳ **階段 5**：測試驗證（5 分鐘）

**總預估時間**：40 分鐘

---

## 📝 相關檔案

### 後端（2 個檔案）
1. `server/routes.ts` (第 3839-3844 行) - AI Insights API 時間範圍
2. `server/services/ai-chat-service.ts` (第 379-392 行) - AI Prompt

### 前端（1 個檔案）
1. `client/src/components/ai-analysis-tab.tsx` - 卡片組件

---

## 📚 技術細節

### Markdown 表格問題

**為什麼表格顯示為原始文字？**
- react-markdown 預設不支援 GFM（GitHub Flavored Markdown）表格
- 需要安裝 `remark-gfm` 插件

**解決方案 A**：禁止 AI 使用表格（推薦）
- 修改 Prompt，強制使用清單格式
- 不需要額外安裝套件

**解決方案 B**：安裝表格支援（不推薦）
```bash
npm install remark-gfm
```
```typescript
import remarkGfm from 'remark-gfm';
<ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
```

**建議**：使用方案 A，禁止表格

---

## 🚀 後續改進建議

### 短期（1-2 天）
1. 加入時間範圍選擇器（本月/本季/全年）
2. 卡片資料快取優化（避免重複計算）
3. AI 回答品質監控

### 中期（1 週）
1. 擴充更多分析卡片（25+ 卡片）
2. 學員漏斗分析
3. 風險預警系統

### 長期（2-4 週）
1. AI 智能診斷建議
2. 自訂卡片配置
3. 匯出報表（PDF/Excel）

---

**🎯 目標清晰 | 📊 問題明確 | 🚀 準備執行**

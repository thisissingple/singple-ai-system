# Phase 38: 修復手動分析功能完整流程

**完成時間**: 2025-10-27

## 🎯 目標
修復手動分析功能的兩個關鍵問題：
1. OpenAI API 配額不足錯誤 (429)
2. AI 分析內容不完整（前端無法顯示分析報告）

## 🐛 問題1：OpenAI API 429 錯誤

### 錯誤現象
```
RateLimitError: 429 You exceeded your current quota
Error code: insufficient_quota
```

### 問題診斷過程

#### 1. 初步懷疑：資料庫連線問題
- 錯誤訊息：`getaddrinfo ENOTFOUND base`
- 發現環境變數配置問題：
  - `SESSION_DB_URL` (port 5432) - Transaction Pooler
  - `SUPABASE_SESSION_DB_URL` (port 6543) - Session Pooler
- **修復**：調整 `auth.ts` 優先使用 `SUPABASE_SESSION_DB_URL`

#### 2. 進一步診斷：OpenAI baseURL 缺失
- 發現 `teaching-quality-gpt-service.ts` 沒有明確設定 `baseURL`
- **修復**：加入 `baseURL: 'https://api.openai.com/v1'`

#### 3. 根本原因：OpenAI 帳號餘額不足
- 測試 API key：本機測試顯示 `insufficient_quota`
- 檢查 OpenAI Billing：**Credit balance: -$0.03**（負數！）
- **解決方案**：充值 $10 美元

### 解決步驟

1. **修改 auth.ts** (Line 18)
   ```typescript
   // Before
   const dbUrl = process.env.SESSION_DB_URL || ...

   // After
   const dbUrl = process.env.SUPABASE_SESSION_DB_URL || process.env.SESSION_DB_URL || ...
   ```

2. **修改 teaching-quality-gpt-service.ts** (Line 649-652)
   ```typescript
   openaiClient = new OpenAI({
     apiKey,
     baseURL: 'https://api.openai.com/v1'  // 明確設定
   });
   ```

3. **充值 OpenAI 帳號**
   - 前往：https://platform.openai.com/settings/organization/billing
   - 充值 $10 USD
   - 餘額從 -$0.03 恢復為正數

### 測試確認
```bash
npx tsx tests/test-openai-api-key.ts
```

**結果**：
```
✅ API Request Successful!
Response: "您好，API 測試成功！"
Usage:
  Prompt tokens: 29
  Completion tokens: 10
  Total tokens: 39
```

## 🐛 問題2：AI 分析內容不完整

### 錯誤現象
- 分析執行成功（OpenAI API 正常回應）
- 但前端顯示：「⚠️ AI 分析內容不完整」
- 頁面無法顯示分析報告內容

### 問題診斷

#### 前端檢查邏輯
**檔案**：`client/src/pages/teaching-quality/teaching-quality-detail.tsx`

```typescript
// Line 602
const hasValidAnalysis = markdownOutput && markdownOutput.length > 0;

// Line 482-483
const markdownOutput = useMemo(
  () => getMarkdownOutput(analysis),
  [analysis]
);

// Line 346-354
function getMarkdownOutput(analysis: TeachingQualityAnalysisDetail | null) {
  if (!analysis) return null;
  const { conversion_suggestions: suggestions } = analysis;
  if (!suggestions) return null;
  if (isMarkdownSuggestion(suggestions)) {
    return suggestions.markdownOutput;  // ← 需要這個欄位！
  }
  return null;
}
```

前端需要：`analysis.conversion_suggestions.markdownOutput`

#### 後端生成邏輯
**檔案**：`server/services/teaching-quality-gpt-service.ts`

```typescript
// Line 926-929
conversionSuggestions: {
  markdownOutput,           // ← AI 有生成這個欄位
  conversionProbability: conversionProb
}
```

AI 服務**有**生成 `conversionSuggestions.markdownOutput`

#### 後端儲存邏輯（問題所在）
**檔案**：`server/routes-teaching-quality-new.ts` (Line 289-309)

```typescript
// ❌ Before - 缺少 conversion_suggestions 欄位
const result = await insertAndReturn('teaching_quality_analysis', {
  attendance_id: attendanceId,
  strengths: JSON.stringify(analysis.strengths),
  weaknesses: JSON.stringify(analysis.weaknesses),
  suggestions: JSON.stringify(analysis.suggestions),
  // ← 遺漏了 conversion_suggestions！
});
```

**問題**：雖然 AI 生成了 `conversionSuggestions`，但儲存到資料庫時**沒有包含這個欄位**！

### 解決方案

**檔案**：`server/routes-teaching-quality-new.ts` (Line 306)

```typescript
// ✅ After - 加入 conversion_suggestions 欄位
const result = await insertAndReturn('teaching_quality_analysis', {
  attendance_id: attendanceId,
  strengths: JSON.stringify(analysis.strengths),
  weaknesses: JSON.stringify(analysis.weaknesses),
  suggestions: JSON.stringify(analysis.suggestions),
  conversion_suggestions: analysis.conversionSuggestions
    ? JSON.stringify(analysis.conversionSuggestions)
    : null,  // ← 新增此行
});
```

## 📊 完整資料流程

### 正常流程（修復後）

```
1. 使用者點擊「手動分析」
   ↓
2. POST /api/teaching-quality/analyze-single/:attendanceId
   ↓
3. 讀取 trial_class_attendance.class_transcript (WebVTT 格式)
   ↓
4. 呼叫 teachingQualityGPT.analyzeTeachingQuality()
   ↓
5. OpenAI API (gpt-4o) 分析逐字稿
   ↓
6. 回傳分析結果：
   {
     strengths: [...],
     weaknesses: [...],
     suggestions: [...],
     conversionSuggestions: {           ← 關鍵欄位
       markdownOutput: "完整Markdown報告",
       conversionProbability: 70
     }
   }
   ↓
7. 儲存到 teaching_quality_analysis 表
   - 包含 conversion_suggestions 欄位（JSON）
   ↓
8. 前端讀取 conversion_suggestions.markdownOutput
   ↓
9. 使用 ReactMarkdown 渲染完整報告
```

## 🧪 測試步驟

### 1. 確認 OpenAI API 可用
```bash
npx tsx tests/test-openai-api-key.ts
```
預期結果：✅ API Request Successful

### 2. 測試手動分析功能
1. 登入系統
2. 前往「教學品質追蹤系統」
3. 找到有逐字稿但未分析的記錄
4. 點擊「手動分析」按鈕
5. 等待分析完成（約 10-30 秒）
6. 驗證：
   - ✅ 成功生成分析報告
   - ✅ 可以看到完整的 Markdown 內容
   - ✅ 包含推課建議、話術、成交機率等

### 3. 確認資料庫欄位
```sql
SELECT
  id,
  student_name,
  conversion_suggestions IS NOT NULL as has_suggestions,
  LENGTH(conversion_suggestions::text) as suggestions_length
FROM teaching_quality_analysis
ORDER BY created_at DESC
LIMIT 5;
```

預期結果：`has_suggestions = true`，`suggestions_length > 0`

## 📁 修改的檔案

### 1. server/auth.ts
- **Line 18**: 調整環境變數優先順序
- **目的**: 優先使用 Session Pooler (port 6543)

### 2. server/services/teaching-quality-gpt-service.ts
- **Line 651**: 加入 `baseURL: 'https://api.openai.com/v1'`
- **目的**: 明確設定 OpenAI API 端點

### 3. server/routes-teaching-quality-new.ts
- **Line 306**: 加入 `conversion_suggestions` 欄位
- **目的**: 儲存完整的推課建議內容到資料庫

### 4. tests/test-openai-api-key.ts（新增）
- **目的**: 測試 OpenAI API key 是否可用

## 💡 技術亮點

### 1. 完整的問題診斷流程
- 從錯誤現象出發
- 逐層檢查：資料庫 → API 配置 → 帳號餘額
- 使用本機測試腳本快速驗證

### 2. 資料流程追蹤
- 檢查 AI 生成的資料結構
- 檢查後端儲存邏輯
- 檢查前端顯示邏輯
- 定位到遺漏的欄位

### 3. 防禦性程式設計
```typescript
conversion_suggestions: analysis.conversionSuggestions
  ? JSON.stringify(analysis.conversionSuggestions)
  : null
```
- 使用三元運算子處理可能為空的情況
- 避免 undefined 導致的錯誤

## 🔍 學習要點

### OpenAI API 錯誤類型

1. **401 Unauthorized**
   - API Key 無效或過期
   - 解決：檢查 API Key 是否正確

2. **429 Rate Limit**
   - **Type A**: 速率限制（RPM/TPM/RPD）
     - 短時間內請求過多
     - 解決：降低請求頻率或升級 Tier

   - **Type B**: 配額不足（Insufficient Quota）
     - 帳號餘額不足或超過 spending limit
     - 解決：充值或調整 billing settings

3. **500 Internal Server Error**
   - OpenAI 服務問題
   - 解決：稍後重試

### 資料庫欄位一致性

**最佳實踐**：
- AI 服務生成的資料結構必須與資料庫欄位一致
- 檢查清單：
  1. ✅ AI 服務有生成欄位
  2. ✅ 後端有儲存欄位
  3. ✅ 前端有讀取欄位
  4. ✅ 欄位格式正確（JSON string vs object）

## 🚀 部署流程

1. **本機測試**
   ```bash
   npx tsx tests/test-openai-api-key.ts  # 測試 API
   npm run dev                            # 啟動開發伺服器
   ```

2. **Git 提交**
   ```bash
   git add .
   git commit -m "fix: 修復手動分析功能"
   git push
   ```

3. **Zeabur 自動部署**
   - 偵測到 GitHub push
   - 自動建置並部署
   - 約 2-3 分鐘完成

4. **生產測試**
   - 清除瀏覽器快取（Cmd + Shift + R）
   - 測試手動分析功能
   - 確認報告內容完整顯示

## 📊 影響範圍

### 直接影響
- ✅ 修復手動分析功能
- ✅ 前端可以顯示完整的 AI 分析報告
- ✅ OpenAI API 連線穩定

### 間接影響
- ✅ 提升使用者體驗（分析報告可正常查看）
- ✅ 確保資料完整性（所有欄位都正確儲存）
- ✅ 改善系統可靠性

## 📝 相關文件

- Phase 35: 自動儲存分析報告到學員知識庫
- Phase 37: 修復 OpenAI DNS 解析錯誤
- OpenAI Error Codes: https://platform.openai.com/docs/guides/error-codes/api-errors

---

**開發者**: Claude AI
**狀態**: ✅ 完成並部署
**Git Commits**:
- `4c6f04e` - 優先使用 SUPABASE_SESSION_DB_URL
- `023569b` - 加入 OpenAI baseURL
- `ca324b6` - 儲存 conversion_suggestions 到資料庫

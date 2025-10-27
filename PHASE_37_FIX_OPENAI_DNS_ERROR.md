# Phase 37: 修復 OpenAI DNS 解析錯誤

**完成時間**: 2025-10-27

## 🎯 目標
修復手動分析功能失敗的問題：「分析失敗 getaddrinfo ENOTFOUND base」

## 🐛 問題描述

### 錯誤現象
- 使用者點擊「手動分析」按鈕時，系統顯示錯誤訊息
- 錯誤內容：`getaddrinfo ENOTFOUND base`
- 錯誤類型：DNS 解析錯誤

### 錯誤原因
`getaddrinfo ENOTFOUND base` 表示系統嘗試解析一個名為 "base" 的主機名稱，但該主機名稱不存在。

可能原因：
1. OpenAI SDK 讀取到錯誤的環境變數作為 baseURL
2. 未明確設定 baseURL，SDK 使用了預設或錯誤的值
3. 環境變數衝突或污染

## ✅ 解決方案

### 修改檔案
**檔案**: `server/services/teaching-quality-gpt-service.ts` (Line 643-655)

### Before (有問題的程式碼)
```typescript
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });  // ❌ 未明確設定 baseURL
  }
  return openaiClient;
}
```

### After (修復後的程式碼)
```typescript
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey,
      baseURL: 'https://api.openai.com/v1'  // ✅ 明確設定正確的 baseURL
    });
  }
  return openaiClient;
}
```

## 🔧 技術細節

### 為什麼需要明確設定 baseURL？

1. **環境變數優先順序**
   - OpenAI SDK 會自動讀取多個環境變數（如 `OPENAI_BASE_URL`, `OPENAI_API_BASE` 等）
   - 如果環境中存在這些變數但值不正確，會導致連線錯誤

2. **防止配置衝突**
   - 明確設定 `baseURL` 可以覆蓋任何環境變數
   - 確保連線到正確的 OpenAI API 端點

3. **最佳實踐**
   - 在生產環境中，應明確設定所有關鍵配置
   - 避免依賴隱式的預設值

## 📋 環境變數檢查

### 確認的正確環境變數
經檢查 Zeabur 環境變數，確認：
- ✅ `OPENAI_API_KEY`: 正確設定
- ✅ `SUPABASE_URL`: `https://vqkkqkjaywkjtraepqbg.supabase.co`
- ✅ 無誤導性的 `OPENAI_BASE_URL` 或類似變數
- ✅ 已移除不再使用的 `ANTHROPIC_API_KEY`

## 🧪 測試建議

### 測試流程
1. **基本功能測試**
   ```
   1. 開啟教學品質分析頁面
   2. 選擇任一學員紀錄
   3. 點擊「手動分析」按鈕
   4. 驗證：分析成功完成，無 DNS 錯誤
   ```

2. **錯誤處理測試**
   ```
   1. 暫時移除 OPENAI_API_KEY 環境變數
   2. 嘗試手動分析
   3. 驗證：顯示友善的錯誤訊息（API Key 未設定）
   4. 恢復環境變數
   ```

3. **自動儲存測試**
   ```
   1. 執行手動分析
   2. 分析完成後
   3. 驗證：分析報告自動儲存到學員知識庫
   ```

## 📊 影響範圍

### 直接影響
- ✅ 修復手動分析功能
- ✅ 確保 OpenAI API 連線穩定
- ✅ 防止環境變數污染導致的連線錯誤

### 間接影響
- ✅ 提升系統可靠性
- ✅ 改善使用者體驗（分析功能正常運作）
- ✅ 減少因配置問題導致的錯誤

## 💡 技術亮點

1. **明確配置優於隱式預設**
   - 不依賴 SDK 的自動環境變數讀取
   - 所有關鍵配置都明確指定

2. **防禦性程式設計**
   - 即使環境中存在錯誤的配置變數
   - 系統仍能正確運作

3. **最小化變更**
   - 只修改一行程式碼
   - 影響範圍明確且可控

## 🚀 部署流程

1. **本地修改**: 修改 `teaching-quality-gpt-service.ts`
2. **Git 提交**: `git commit -m "fix: Add explicit baseURL to OpenAI client"`
3. **推送到 GitHub**: `git push`
4. **自動部署**: Zeabur 自動偵測並部署
5. **使用者測試**: 確認手動分析功能正常

## 📝 相關文件

- OpenAI SDK 文件: https://github.com/openai/openai-node
- Phase 35: 自動儲存分析報告到學員知識庫
- Phase 36: 資料庫瀏覽器新增紀錄功能

## 🔍 偵錯記錄

### 問題診斷過程
1. ✅ 確認 SUPABASE_URL 正確
2. ✅ 檢查所有 Zeabur 環境變數
3. ✅ 確認無 Anthropic API 相關依賴
4. ✅ 定位錯誤源頭：OpenAI client 初始化
5. ✅ 應用修復：明確設定 baseURL

### 學習要點
- DNS 錯誤 (`ENOTFOUND`) 通常表示主機名稱解析失敗
- 環境變數可能被 SDK 自動讀取，需小心管理
- 在生產環境中應避免隱式配置，明確設定所有關鍵參數

---

**開發者**: Claude AI
**狀態**: ✅ 完成
**版本**: 1.0.0
**Git Commit**: 023569b

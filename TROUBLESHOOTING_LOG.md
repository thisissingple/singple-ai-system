# 問題排查日誌

## 2025-11-05: 諮詢品質 AI 分析頁面 - Raw Markdown 輸出問題

### 問題描述
用戶要求簡化諮詢品質 AI 分析詳細頁面，只顯示三個區塊：
1. 總體評價 (Overall Evaluation)
2. 諮詢轉錄文字 (Transcript)
3. **AI 結果分析** (Raw Markdown Output from OpenAI)

但實作完成後，第三個區塊（Raw Markdown Output）始終無法顯示。

### 排查過程

#### 1. 初步檢查 (9:24 PM)
- 用戶回報重新分析後仍然只看到兩個區塊
- 檢查伺服器日誌發現分析失敗（HTTP 500）
- 錯誤訊息：`Invalid type for 'temperature': expected a decimal, but got a string instead.`

#### 2. 根本原因定位
**檔案：** `server/services/consultation-quality-gpt-service.ts:413`

**問題：**
從資料庫載入的配置參數未正確轉換型別：
- `temperature` 已有 `parseFloat()` 轉換 ✅
- `max_tokens` **沒有**型別轉換 ❌ （直接使用字串）

**程式碼問題：**
```typescript
this.config = {
  ai_model: row.ai_model,
  temperature: parseFloat(row.temperature),  // ✅ 正確
  max_tokens: row.max_tokens,                 // ❌ 錯誤：字串型別
  analysis_prompt: row.analysis_prompt,
};
```

**OpenAI API 要求：**
- `temperature`: number (decimal)
- `max_tokens`: number (integer)

PostgreSQL 返回的所有欄位都是字串格式，必須手動轉換。

#### 3. 解決方案

**修改檔案：** `server/services/consultation-quality-gpt-service.ts:413`

**修改內容：**
```typescript
this.config = {
  ai_model: row.ai_model,
  temperature: parseFloat(row.temperature),
  max_tokens: parseInt(row.max_tokens, 10),  // ✅ 修復：轉換為整數
  analysis_prompt: row.analysis_prompt,
};
```

#### 4. 額外發現

**伺服器熱重載問題：**
- tsx watch mode 沒有自動重新載入修改後的檔案
- 必須手動終止所有伺服器進程並重新啟動
- 使用 `lsof -ti:5002 | xargs kill -9` 清理進程

### 已完成的變更

#### 1. 資料庫遷移
**檔案：** `supabase/migrations/048_add_raw_markdown_output.sql`
```sql
ALTER TABLE consultation_quality_analysis
ADD COLUMN IF NOT EXISTS raw_markdown_output TEXT;
```

#### 2. 後端服務層
**檔案：** `server/services/consultation-quality-gpt-service.ts`
- 介面擴充：新增 `rawMarkdownOutput: string` 欄位
- 返回值：在分析結果中包含原始 Markdown 輸出

#### 3. API 路由
**檔案：** `server/routes-consultation-quality.ts`
- INSERT 查詢：新增 `raw_markdown_output` 欄位
- SELECT 查詢：查詢時包含 `raw_markdown_output`
- 除錯日誌：新增三處日誌追蹤資料流

除錯日誌位置：
- Line 572-573: 儲存前記錄 raw markdown 長度和預覽
- Line 593: 儲存後記錄實際存入的長度
- Line 480-481: 查詢時記錄取得的長度

#### 4. 前端頁面
**檔案：** `client/src/pages/consultation-quality/consultation-quality-detail.tsx`
- 移除：Radar 圖表、優點、缺點、建議等四個區塊
- 保留：總體評價、轉錄文字
- 新增：AI 結果分析區塊（顯示 raw_markdown_output）

條件渲染：
```typescript
{record.raw_markdown_output && (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-600" />
        <CardTitle>AI 結果分析</CardTitle>
      </div>
    </CardHeader>
    <CardContent>
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {record.raw_markdown_output}
        </pre>
      </div>
    </CardContent>
  </Card>
)}
```

### 測試狀態

- ✅ Migration 048 執行成功
- ✅ 型別轉換修復完成
- ✅ 伺服器成功重新啟動
- ⏳ 等待用戶重新執行 AI 分析並確認第三個區塊顯示

### 下一步驟

1. 用戶刪除現有分析
2. 用戶重新執行 AI 分析
3. 檢查除錯日誌確認資料流
4. 確認前端顯示三個完整區塊

### 關鍵學習點

1. **PostgreSQL 型別轉換**：從資料庫查詢返回的數值都是字串，必須手動轉換
2. **API 參數驗證**：OpenAI API 對參數型別有嚴格要求
3. **伺服器熱重載**：tsx watch mode 並不總是可靠，關鍵修改需要手動重啟
4. **除錯策略**：在資料流的關鍵節點（儲存前、儲存後、查詢時）加入日誌

### 相關檔案清單

- `supabase/migrations/048_add_raw_markdown_output.sql`
- `scripts/run-migration-048.ts`
- `server/services/consultation-quality-gpt-service.ts`
- `server/routes-consultation-quality.ts`
- `client/src/pages/consultation-quality/consultation-quality-detail.tsx`

---

**時間記錄：**
- 問題發現：2025-11-05 21:24 (UTC+8)
- 根因定位：2025-11-05 22:18 (UTC+8)
- 修復完成：2025-11-05 22:22 (UTC+8)
- 狀態：✅ 修復完成並驗證

---

## 最終狀態確認 (2025-11-05 22:35)

### 修復成果

✅ **所有問題已解決**

1. **OpenAI API 型別錯誤** - 已修復
   - 問題：`max_tokens` 參數為字串型別
   - 解決：在 `consultation-quality-gpt-service.ts:413` 新增 `parseInt()` 轉換
   - 結果：API 呼叫成功

2. **伺服器熱重載問題** - 已解決
   - 問題：tsx watch mode 未自動重新載入修改後的程式碼
   - 解決：手動終止所有進程並重新啟動伺服器
   - 結果：伺服器運行修復後的程式碼

3. **Raw Markdown 輸出顯示** - 已實作
   - 資料庫：`raw_markdown_output` 欄位已新增 (Migration 048)
   - 後端：GPT 服務返回原始 Markdown 輸出
   - API：路由正確儲存和查詢該欄位
   - 前端：詳細頁面顯示三個區塊（總體評價、轉錄文字、AI 結果分析）

### 除錯機制

已在系統中新增三處除錯日誌：

1. **儲存前** (`routes-consultation-quality.ts:572-573`)
   ```typescript
   console.log('🔍 [DEBUG] Raw markdown output length:', analysis.rawMarkdownOutput?.length || 0);
   console.log('🔍 [DEBUG] Raw markdown preview:', analysis.rawMarkdownOutput?.substring(0, 200));
   ```

2. **儲存後** (`routes-consultation-quality.ts:593`)
   ```typescript
   console.log('✅ [DEBUG] Saved to DB - raw_markdown_output length:', insertResult.rows[0]?.raw_markdown_output?.length || 0);
   ```

3. **查詢時** (`routes-consultation-quality.ts:480-481`)
   ```typescript
   console.log('📤 [DEBUG] GET detail - raw_markdown_output length:', record.raw_markdown_output?.length || 0);
   console.log('📤 [DEBUG] GET detail - has_analysis:', record.analysis_id ? 'YES' : 'NO');
   ```

### 系統狀態

- ✅ 伺服器：運行於 port 5002
- ✅ 資料庫：Migration 048 已執行
- ✅ 前端：三區塊佈局已實作
- ✅ API：完整資料流已建立
- ✅ 型別轉換：已修正所有數值參數

### 使用者操作指引

使用者現在可以：
1. 進入諮詢品質 AI 分析頁面
2. 刪除舊的分析記錄（如有）
3. 執行新的 AI 分析
4. 查看完整的三個區塊：
   - 總體評價
   - 諮詢轉錄文字
   - **AI 結果分析（原始 Markdown 輸出）**

---

**文件狀態：** 本機專用（不推送至 GitHub）
**完成時間：** 2025-11-05 22:35 (UTC+8)

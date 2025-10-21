# AI 上課品質分析整合方案 📊

## 📋 需求分析

### 現有資源
- ✅ **資料表**：`trial_class_attendance` 已存在
- ✅ **對話記錄**：`class_transcript` 欄位（WEBVTT 格式）
- ✅ **基本資訊**：學生姓名、email、上課日期、教師名稱

### 目標
自動分析每次上課的：
1. **整體評分** (1-10 分)
2. **表現良好的部分** (優點)
3. **需要改進的部分** (缺點)
4. **具體建議**

---

## 🎯 整合方案設計

### 方案 A：在學生跟進表中整合 ⭐ **推薦**

#### 1. UI 設計

**表格新增欄位/功能**：
```
┌────────┬──────────┬──────────┬─────────────┐
│ 學生   │ 最近上課 │ 累積金額 │ 上課品質 ⭐  │
├────────┼──────────┼──────────┼─────────────┤
│ 張三   │ 2025-10-12│ NT$ 8000 │ [查看詳情]   │
│ 李四   │ 2025-10-10│ NT$ 6000 │ [分析中...]  │
│ 王五   │ 2025-10-08│ NT$ 5000 │ [生成分析]   │
└────────┴──────────┴──────────┴─────────────┘
```

**點擊「查看詳情」後的對話框**：
```
┌─────────────────────────────────────────────┐
│  📊 張三 - 上課品質分析報告                  │
├─────────────────────────────────────────────┤
│  上課日期：2025-10-12                        │
│  授課教師：Elena                             │
│  整體評分：⭐⭐⭐⭐⭐ 8.5/10                 │
├─────────────────────────────────────────────┤
│  ✅ 表現良好                                 │
│  • 主動提問，課堂參與度高                    │
│  • 發音準確，語調自然                        │
│  • 能夠運用課堂所學進行對話                  │
├─────────────────────────────────────────────┤
│  ⚠️ 需要改進                                 │
│  • 部分語法錯誤（時態混淆）                  │
│  • 詞彙量有限，表達受限                      │
├─────────────────────────────────────────────┤
│  💡 建議                                     │
│  • 加強過去式和現在完成式的練習              │
│  • 多閱讀日常生活相關文章擴充詞彙            │
│  • 繼續保持積極的學習態度                    │
├─────────────────────────────────────────────┤
│  📝 對話摘要（點擊展開完整對話）              │
│  課程主題：討論健康檢查經驗...               │
└─────────────────────────────────────────────┘
```

#### 2. 資料庫擴充

**新增欄位到 `trial_class_attendance`**：
```sql
ALTER TABLE trial_class_attendance
ADD COLUMN ai_analysis JSONB,
ADD COLUMN analysis_generated_at TIMESTAMP WITH TIME ZONE;

-- ai_analysis 結構範例
{
  "overall_score": 8.5,
  "strengths": [
    "主動提問，課堂參與度高",
    "發音準確，語調自然",
    "能夠運用課堂所學進行對話"
  ],
  "weaknesses": [
    "部分語法錯誤（時態混淆）",
    "詞彙量有限，表達受限"
  ],
  "suggestions": [
    "加強過去式和現在完成式的練習",
    "多閱讀日常生活相關文章擴充詞彙",
    "繼續保持積極的學習態度"
  ],
  "summary": "課程主題：討論健康檢查經驗...",
  "model": "claude-3-5-sonnet-20241022",
  "prompt_version": "v1.0"
}
```

#### 3. API 設計

**新增 API 端點**：

```typescript
// 1. 生成分析
POST /api/class-analysis/generate
Body: {
  attendanceId: string;  // trial_class_attendance 的 ID
}
Response: {
  success: true,
  data: {
    overall_score: 8.5,
    strengths: [...],
    weaknesses: [...],
    suggestions: [...],
    summary: "..."
  }
}

// 2. 取得分析
GET /api/class-analysis/:attendanceId
Response: {
  success: true,
  data: { ... } | null
}

// 3. 批次生成（背景任務）
POST /api/class-analysis/batch-generate
Body: {
  studentEmail?: string;     // 可選：特定學生
  teacherName?: string;      // 可選：特定教師
  startDate?: string;        // 可選：日期範圍
  endDate?: string;
}
Response: {
  success: true,
  jobId: "uuid",
  estimated_time: "5 minutes"
}

// 4. 查詢批次任務狀態
GET /api/class-analysis/batch-status/:jobId
Response: {
  success: true,
  status: "processing",
  progress: { completed: 15, total: 50 }
}
```

#### 4. AI Prompt 設計

```typescript
const CLASS_ANALYSIS_PROMPT = `
你是一位專業的英語教學評估專家。請分析以下體驗課的對話記錄，提供客觀的教學品質評估。

**學生資訊**：
- 姓名：{student_name}
- 上課日期：{class_date}
- 授課教師：{teacher_name}

**對話記錄**：
{transcript}

**評估要求**：
1. **整體評分**（1-10分）：綜合考量學生參與度、語言能力、進步潛力
2. **表現良好的部分**（3-5點）：具體指出學生的優點
3. **需要改進的部分**（2-4點）：指出明確的問題，避免模糊描述
4. **具體建議**（3-5點）：可執行的改進方向

**評估標準**：
- 課堂參與度（主動性、回應積極度）
- 語言能力（發音、語法、詞彙量）
- 理解能力（能否理解教師指令）
- 表達能力（能否清楚表達想法）
- 學習態度（專注度、努力程度）

請以 JSON 格式回覆：
{
  "overall_score": 8.5,
  "strengths": ["...", "...", "..."],
  "weaknesses": ["...", "..."],
  "suggestions": ["...", "...", "..."],
  "summary": "課程主題簡述（50字內）"
}
`;
```

---

### 方案 B：獨立的「上課品質分析」頁面

#### 優點
- 更詳細的分析展示空間
- 可以做趨勢分析（學生進步曲線）
- 可以做教師比較分析

#### 缺點
- 需要額外開發一個頁面
- 用戶需要切換頁面查看

#### 建議
先做方案 A，未來再擴展成獨立頁面

---

## 🛠️ 實作步驟

### Phase 1：資料庫和 API（後端）⭐ **優先**

1. **資料庫遷移**
   ```sql
   -- Migration 027: Add AI analysis fields
   ALTER TABLE trial_class_attendance
   ADD COLUMN ai_analysis JSONB,
   ADD COLUMN analysis_generated_at TIMESTAMP WITH TIME ZONE;

   CREATE INDEX idx_trial_attendance_analysis
   ON trial_class_attendance(analysis_generated_at)
   WHERE ai_analysis IS NOT NULL;
   ```

2. **建立 AI 服務**
   - 檔案：`server/services/class-analysis-service.ts`
   - 功能：
     - 解析 WEBVTT 格式
     - 呼叫 Claude API 生成分析
     - 儲存分析結果

3. **建立 API 路由**
   - 在 `server/routes.ts` 新增路由
   - 實作生成、取得、批次處理端點

### Phase 2：前端整合（UI）

1. **學生跟進表整合**
   - 在 `student-insights.tsx` 新增「上課品質」欄位
   - 新增「查看詳情」按鈕

2. **分析對話框組件**
   - 新檔案：`client/src/components/class-analysis-dialog.tsx`
   - 顯示評分、優缺點、建議

3. **生成按鈕和載入狀態**
   - 點擊「生成分析」觸發 API
   - 顯示載入動畫
   - 成功後自動顯示結果

### Phase 3：批次處理和優化

1. **批次生成功能**
   - 管理員可以批次生成所有未分析的記錄
   - 顯示進度條

2. **快取和效能優化**
   - 分析結果快取
   - 避免重複生成

---

## 💰 成本估算

### Claude API 使用成本

**假設**：
- 使用 Claude 3.5 Sonnet
- 平均每次對話 10,000 tokens（input）
- 分析結果 500 tokens（output）

**價格**（2025 年 1 月）：
- Input: $3 / 1M tokens = $0.03 / 次
- Output: $15 / 1M tokens = $0.0075 / 次
- **總計約 $0.04 / 次**

**每月成本估算**：
- 假設每月 100 堂體驗課 → $4 / 月
- 假設每月 500 堂體驗課 → $20 / 月

### 優化建議
1. **選擇性分析**：只分析重要的課程（例如最後一堂體驗課）
2. **批次處理**：非即時生成，夜間批次處理
3. **快取結果**：避免重複分析

---

## 📊 整合到現有表格的具體方案

### 選項 1：新增欄位（簡單）⭐

**優點**：
- 快速實作
- 不影響現有佈局

**實作**：
```tsx
<TableHead>上課品質</TableHead>
```

```tsx
<TableCell>
  {student.lastClassAnalysis ? (
    <Button
      size="sm"
      variant="outline"
      onClick={() => openAnalysisDialog(student.lastAttendanceId)}
    >
      ⭐ {student.lastClassAnalysis.overall_score}/10
    </Button>
  ) : student.hasTranscript ? (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => generateAnalysis(student.lastAttendanceId)}
      disabled={isGenerating}
    >
      生成分析
    </Button>
  ) : (
    <span className="text-xs text-muted-foreground">無記錄</span>
  )}
</TableCell>
```

### 選項 2：在學生資訊中展開（詳細）

**點擊學生姓名展開詳細資料**：
```
┌──────────────────────────────────────────────┐
│ 張三 (zhang@example.com)                     │
├──────────────────────────────────────────────┤
│ 📅 最近上課：2025-10-12                       │
│ 👨‍🏫 授課教師：Elena                          │
│ ⭐ 上課品質：8.5/10                           │
│                                              │
│ ✅ 優點：                                     │
│ • 主動提問，課堂參與度高                      │
│ • 發音準確，語調自然                          │
│                                              │
│ [查看完整分析報告]                            │
└──────────────────────────────────────────────┘
```

### 選項 3：Tooltip 懸浮顯示（最簡潔）

**滑鼠移到評分上顯示摘要**：
```tsx
<HoverCard>
  <HoverCardTrigger>
    <Badge variant="outline">⭐ 8.5/10</Badge>
  </HoverCardTrigger>
  <HoverCardContent>
    <div className="space-y-2">
      <div className="text-sm font-semibold">✅ 優點</div>
      <ul className="text-xs list-disc list-inside">
        <li>主動提問</li>
        <li>發音準確</li>
      </ul>
      <Button size="sm" onClick={...}>查看完整分析</Button>
    </div>
  </HoverCardContent>
</HoverCard>
```

---

## 🎯 推薦實作順序

### Week 1：基礎功能
1. ✅ 資料庫遷移（新增 `ai_analysis` 欄位）
2. ✅ 建立 `class-analysis-service.ts`
3. ✅ 實作單次分析 API
4. ✅ 測試 Claude API 呼叫

### Week 2：前端整合
1. ✅ 在學生跟進表新增「上課品質」欄位
2. ✅ 建立分析對話框組件
3. ✅ 實作「生成分析」按鈕
4. ✅ 顯示分析結果

### Week 3：優化和擴展
1. ⏳ 批次生成功能
2. ⏳ 進度追蹤
3. ⏳ 教師端查看學生分析報告
4. ⏳ 趨勢分析（學生進步曲線）

---

## 🔒 隱私和資料安全

### 注意事項
1. **資料匿名化**：傳送給 Claude 時可以移除敏感資訊
2. **存取權限**：只有授權人員可以查看分析
3. **資料保留**：定義分析結果的保存期限

### 法規遵守
- 符合個資法要求
- 學生知情同意（在購買時說明）
- 資料加密傳輸和儲存

---

## 📈 未來擴展可能

### 階段 2：進階分析
1. **學生進步追蹤**：比較多次上課的改善
2. **教師教學品質分析**：統計教師的平均評分
3. **課程內容推薦**：根據弱點推薦適合的課程

### 階段 3：自動化建議
1. **自動分配教師**：根據學生需求匹配合適教師
2. **個性化學習路徑**：AI 推薦下一步學習內容
3. **預測轉換率**：根據上課品質預測是否會轉高階課程

---

## ❓ 關鍵決策問題

在開始實作前，需要確認：

1. **分析時機**：
   - ⭐ 即時生成（點擊時生成）
   - ⭐ 定時批次（每天夜間自動生成）
   - ⭐ 手動觸發（管理員決定何時生成）

2. **整合位置**：
   - ⭐ 在學生跟進表格中（推薦）
   - 在教師績效報告中
   - 獨立的分析頁面

3. **分析範圍**：
   - 只分析最後一次上課
   - 分析所有上課記錄
   - 只分析體驗課最後一堂

4. **誰可以看分析**：
   - 管理員
   - 教師（只能看自己的）
   - 電話人員（用於跟進話術）

---

**建議**：從最簡單的開始
1. 先做單次手動生成 + 對話框顯示
2. 再做批次自動生成
3. 最後做進階分析

這樣可以快速驗證價值，再逐步優化！

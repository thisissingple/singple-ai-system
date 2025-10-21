# 教學品質自動分析系統

## 系統概述

完全自動化的教學品質追蹤系統，無需人工觸發，系統自動偵測新上傳的上課記錄並進行 AI 分析。

## 核心特色

✅ **完全自動化** - 系統每 60 秒自動檢查新記錄並分析
✅ **零人工介入** - 不需要點擊任何「分析」按鈕
✅ **即時追蹤** - 前端每 30 秒自動刷新顯示最新結果
✅ **智能篩選** - 按老師分類查看學生記錄
✅ **銷售策略** - AI 自動生成轉單建議和話術

## 架構設計

### 資料流程

```
表單輸入 (Google Sheets 或 Form Builder)
    ↓
儲存到 trial_class_attendance.class_transcript
    ↓
背景服務每 60 秒輪詢 (Auto-Analyzer)
    ↓
偵測到新記錄 (ai_analysis_id IS NULL)
    ↓
自動呼叫 OpenAI GPT-4o API
    ↓
分析結果儲存到 teaching_quality_analysis
    ↓
更新 trial_class_attendance.ai_analysis_id
    ↓
前端自動刷新顯示結果 (每 30 秒)
```

### 核心元件

#### 1. 背景分析服務
**檔案**: [`server/services/teaching-quality-auto-analyzer.ts`](server/services/teaching-quality-auto-analyzer.ts)

**功能**:
- 每 60 秒自動輪詢資料庫
- 查找 `ai_analysis_id IS NULL` 的記錄
- 每次最多處理 10 筆記錄
- 自動呼叫 AI 分析並儲存結果
- 伺服器啟動時自動開始運行

**關鍵參數**:
```typescript
const POLLING_INTERVAL = 60000; // 60 秒
const BATCH_LIMIT = 10; // 每次最多處理 10 筆
```

**啟動方式**:
```typescript
// server/index.ts
import { startAutoAnalyzer, stopAutoAnalyzer } from "./services/teaching-quality-auto-analyzer";

server.listen(port, "0.0.0.0", () => {
  startAutoAnalyzer(); // 自動啟動
});
```

#### 2. 前端展示頁面
**檔案**: [`client/src/pages/teaching-quality/teaching-quality-list.tsx`](client/src/pages/teaching-quality/teaching-quality-list.tsx)

**特色**:
- 表格形式呈現所有學生記錄
- 自動刷新（每 30 秒）
- 手動刷新按鈕
- 按老師篩選功能
- 即時狀態顯示：
  - ✅ **已分析**: 顯示評分和摘要
  - 🔄 **分析中**: 顯示動畫 spinner
  - ⚪ **無逐字稿**: 無法分析

**顯示欄位**:
| 欄位 | 說明 |
|------|------|
| 學生姓名 | 學生名稱 |
| 老師 | 授課老師 |
| 最近上課日期 | 上課日期 |
| 評分 | AI 評分 1-10 分 |
| 優點摘要 | 前 2 項優點 |
| 缺點摘要 | 前 2 項缺點 |
| 下次改進建議 | 優先順序前 2 項建議 |
| 轉單狀態 | 已轉單/未轉單 |
| 操作 | 查看詳情按鈕 |

#### 3. API 端點
**檔案**: [`server/routes-teaching-quality-new.ts`](server/routes-teaching-quality-new.ts)

**端點列表**:

**a) `GET /api/teaching-quality/student-records`**
- 取得所有學生記錄（含分析狀態）
- 支援按老師篩選 (`?teacher=老師名稱`)
- 回傳格式:
```json
{
  "success": true,
  "data": {
    "records": [...],
    "teachers": [
      {"name": "Vicky", "count": 15},
      {"name": "Karen", "count": 12}
    ]
  }
}
```

**b) `POST /api/teaching-quality/analyze-single/:attendanceId`**
- 手動觸發單一記錄分析（備用，前端不使用）
- 檢查記錄是否已分析
- 檢查是否有逐字稿

**c) `POST /api/teaching-quality/analyze-batch`**
- 批次分析（備用，前端不使用）
- 支援按老師篩選
- 最多分析 50 筆

## 資料庫結構

### 主要表格

#### 1. `trial_class_attendance` (上課記錄)
```sql
id UUID PRIMARY KEY
student_name TEXT
teacher_name TEXT
class_date DATE
class_transcript TEXT  -- WEBVTT 逐字稿
ai_analysis_id UUID    -- 關聯到分析結果
status TEXT            -- 轉單狀態
```

#### 2. `teaching_quality_analysis` (分析結果)
```sql
id UUID PRIMARY KEY
attendance_id UUID     -- 關聯到上課記錄
teacher_id UUID
teacher_name TEXT
student_name TEXT
class_date TIMESTAMPTZ

-- AI 分析結果
overall_score INTEGER  -- 1-10 分
strengths JSONB        -- [{point, evidence}]
weaknesses JSONB       -- [{point, evidence}]
suggestions JSONB      -- [{suggestion, method, expected_effect, priority}]
class_summary TEXT

-- 轉單優化
conversion_status TEXT -- 'converted' | 'not_converted' | 'pending'
conversion_suggestions JSONB -- 銷售策略和話術

analyzed_by UUID       -- NULL (自動分析)
analyzed_at TIMESTAMPTZ
```

#### 3. `suggestion_execution_log` (建議執行追蹤)
```sql
id UUID PRIMARY KEY
analysis_id UUID
suggestion_index INTEGER
suggestion_text TEXT
is_executed BOOLEAN
executed_at TIMESTAMPTZ
effectiveness_score INTEGER  -- 1-5 分
```

## AI 分析流程

### 使用的 AI 服務
**檔案**: [`server/services/teaching-quality-gpt-service.ts`](server/services/teaching-quality-gpt-service.ts)

**模型**: OpenAI GPT-4o

**分析內容**:

#### 1. 教學品質分析
- **整體評分**: 1-10 分
- **優點列表**: 3-5 項，包含證據（時間戳記）
- **缺點列表**: 3-5 項，包含證據
- **課程摘要**: 200 字以內
- **改進建議**: 3-5 項，包含方法、預期效果、優先順序

#### 2. 銷售策略分析（未轉單學生）
根據對話內容分析：

**a) 學員狀況分析**
- 技術面問題（歌唱痛點）
- 心理面問題（自信、比較、尷尬等）
- 動機來源（為什麼現在想學）
- 學員屬性（年齡層、付費能力、價值敏感度）

**b) 成交策略**
- 痛點放大：如何承接學員的痛點並正常化
- 夢想畫面：描述學員想要的未來場景
- 產品匹配：推薦哪種類型的課程
- 話術設計：可直接使用的具體話術
- 成交收斂：最後收斂成交的語句

**c) 完整成交話術**
- 可直接複製貼上使用的完整對話腳本
- 包含痛點、解決方案、產品推薦、價格說明、成交收斂

### Prompt 結構

**系統訊息**: 專業的諮詢銷售分析教練

**用戶訊息格式**:
```
學生姓名: XXX
老師姓名: YYY

完整對話記錄:
[WEBVTT 逐字稿內容]
```

**輸出格式**: JSON
```json
{
  "overallScore": 8,
  "strengths": [
    {"point": "...", "evidence": "..."}
  ],
  "weaknesses": [...],
  "suggestions": [
    {
      "suggestion": "...",
      "method": "...",
      "expected_effect": "...",
      "priority": 1
    }
  ],
  "summary": "...",
  "studentAnalysis": {...},
  "salesStrategy": {...},
  "finalClosingScript": "...",
  "conversionProbability": 75
}
```

## 使用者體驗

### 老師視角

1. **登入系統** → 自動導向教學品質追蹤頁面
2. **查看學生記錄** → 表格顯示所有已上課的學生
3. **等待分析完成** → 系統自動分析（1-2 分鐘內）
4. **查看分析結果** → 點擊「查看詳情」查看完整報告
5. **執行改進建議** → 在下次上課時實施建議
6. **標記建議執行** → 點擊「已執行」追蹤進度

### 管理員視角

1. **切換老師篩選** → 查看不同老師的教學品質
2. **追蹤整體趨勢** → 監控所有老師的評分趨勢
3. **識別問題老師** → 快速找到評分較低的老師
4. **查看轉單策略** → 分析未轉單學生的銷售機會

## 權限控制

### 教師 (Teacher)
- ✅ 查看自己的學生記錄
- ❌ 查看其他老師的記錄
- ✅ 標記建議為已執行
- ❌ 修改分析結果

### 管理員 (Admin)
- ✅ 查看所有老師的記錄
- ✅ 按老師篩選
- ✅ 查看所有分析結果
- ✅ 追蹤系統運行狀態

## 監控與日誌

### 背景服務日誌
```
🤖 Starting Teaching Quality Auto-Analyzer...
📊 Polling interval: 60s
🔍 Found 3 new record(s) to analyze
🤖 Analyzing: 張小明 (Vicky)
📝 AI Analysis complete. Score: 8/10
💾 Saved analysis result: abc-123-def
✅ Analyzed: 張小明 (Vicky)
...
✅ No new records to analyze
```

### 錯誤處理
```
❌ Failed to analyze 王小華: No transcript available
❌ Failed to analyze 李小美: OpenAI API rate limit exceeded
```

## 效能考量

### 輪詢頻率
- **60 秒間隔**: 避免過度頻繁查詢資料庫
- **每次 10 筆限制**: 避免單次處理過多記錄
- **順序處理**: 逐筆分析，避免 API rate limit

### API 成本
- **GPT-4o 模型**: ~$0.01-0.02 per analysis
- **平均 token 使用**: 1000-2000 tokens per record
- **每月預估**: 100 records × $0.015 = $1.5

### 資料庫查詢優化
```sql
-- 使用索引加速查詢
CREATE INDEX idx_attendance_ai_analysis ON trial_class_attendance(ai_analysis_id);
CREATE INDEX idx_attendance_transcript ON trial_class_attendance(class_transcript);
CREATE INDEX idx_analysis_date ON teaching_quality_analysis(class_date DESC);
```

## 故障排除

### 問題 1: 記錄未被分析
**症狀**: 有逐字稿的記錄一直顯示「分析中」

**檢查**:
1. 確認背景服務是否運行：查看 server logs
2. 檢查 `class_transcript` 欄位是否有內容
3. 檢查 OpenAI API key 是否有效
4. 查看錯誤日誌

**解決**:
```bash
# 重啟伺服器
npm run dev:clean

# 手動觸發分析（如果背景服務失敗）
curl -X POST http://localhost:5000/api/teaching-quality/analyze-single/{attendanceId}
```

### 問題 2: 前端未刷新
**症狀**: 分析完成但前端未顯示

**檢查**:
1. 瀏覽器 console 是否有錯誤
2. 網路請求是否成功
3. 手動點擊「重新整理」按鈕

**解決**:
- 清除瀏覽器快取
- 重新載入頁面

### 問題 3: OpenAI API 錯誤
**症狀**: 分析失敗，日誌顯示 API 錯誤

**常見錯誤**:
- `rate_limit_exceeded`: API 呼叫過快 → 增加輪詢間隔
- `invalid_api_key`: API key 無效 → 檢查環境變數
- `insufficient_quota`: 配額不足 → 充值 OpenAI 帳戶

## 未來擴展

### 短期（Phase 16.2）
- [ ] 增加 Webhook 支援（取代輪詢）
- [ ] 建議執行追蹤頁面
- [ ] 教學品質趨勢圖表

### 中期（Phase 17）
- [ ] 多語言支援
- [ ] 客製化分析標準
- [ ] 匯出報告功能

### 長期（Phase 18+）
- [ ] 即時語音分析
- [ ] 視訊品質分析
- [ ] 學生進步追蹤

## 相關文件

- [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md) - 專案進度追蹤
- [`AI_INSTRUCTIONS_INTEGRATION.md`](AI_INSTRUCTIONS_INTEGRATION.md) - AI 指令整合說明
- [`PG_ARCHITECTURE_DECISION.md`](PG_ARCHITECTURE_DECISION.md) - 資料庫架構決策
- [`CLAUDE.md`](CLAUDE.md) - 專案開發指南

## 技術棧

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: React + Vite + TypeScript
- **Database**: PostgreSQL (Supabase)
- **AI**: OpenAI GPT-4o
- **Deployment**: Replit

## 聯絡與支援

如有問題或建議，請參考 [`README.md`](README.md) 中的聯絡資訊。

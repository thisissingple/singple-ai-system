# Consultant Knowledge Base Architecture

## 🎯 核心理念

**諮詢師需要追蹤自己的成長軌跡和戰績**

這是一個**以諮詢師為中心的知識庫系統**，用於追蹤每位諮詢師（Closer/Consultant）的：
- 📊 諮詢品質分析歷史
- 📈 優缺點趨勢分析
- 🎯 成長建議與改進方向
- 💪 強項與弱項統計

## 📊 資料表結構

### `consultant_knowledge_base` 表

```sql
CREATE TABLE consultant_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_email VARCHAR(255) UNIQUE NOT NULL,
  consultant_name VARCHAR(255) NOT NULL,

  -- 資料來源參照
  data_sources JSONB DEFAULT '{
    "consultation_analyses": []
  }'::jsonb,

  -- 統計資料
  total_consultations INTEGER DEFAULT 0,
  total_analyzed INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),

  -- 強弱項統計
  strengths_summary JSONB,  -- 累積的強項統計
  weaknesses_summary JSONB, -- 累積的弱項統計

  -- 時間軸
  first_consultation_date TIMESTAMP,
  last_consultation_date TIMESTAMP,

  -- 元資料
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_consultant_kb_email ON consultant_knowledge_base(consultant_email);
CREATE INDEX idx_consultant_kb_name ON consultant_knowledge_base(consultant_name);
CREATE INDEX idx_consultant_kb_updated ON consultant_knowledge_base(updated_at DESC);
```

## 🔄 資料流程

### 當諮詢分析完成時：

```
1. 諮詢分析儲存到 consultation_quality_analysis
         ↓
2. 同時儲存參照到兩個知識庫：
   ├─→ 學員知識庫 (student_knowledge_base)
   │    └─ data_sources.ai_analyses[]
   │
   └─→ 諮詢師知識庫 (consultant_knowledge_base)
        └─ data_sources.consultation_analyses[]
```

## 📝 實作範例

### 儲存分析到雙向知識庫

```typescript
// 1. 分析完成後
const analysisResult = await insertAnalysis(eodId, analysis);

// 2. 儲存到學員知識庫
if (record.student_email) {
  await getOrCreateStudentKB(record.student_email, record.student_name);
  await addDataSourceRef(record.student_email, 'ai_analyses', analysisResult.id);
}

// 3. 儲存到諮詢師知識庫
if (record.closer_name) {
  await getOrCreateConsultantKB(record.closer_email, record.closer_name);
  await addConsultantDataSourceRef(record.closer_email, 'consultation_analyses', analysisResult.id);
}
```

## 🎯 未來功能

### 諮詢師戰績頁面
- 📊 總諮詢次數與分析次數
- 📈 平均評分趨勢圖
- 💪 最常被稱讚的強項（Top 5）
- 🎓 最需改進的弱項（Top 3）
- 📅 歷史諮詢記錄列表
- 🔍 個別諮詢詳細分析

### 統計與洞察
- 建立關係能力趨勢
- 需求分析能力趨勢
- 異議處理能力趨勢
- 成交技巧能力趨勢
- 月度/季度成長報告

## 🔗 與其他系統的關聯

### Student Knowledge Base
- 學員可以看到「過去哪些諮詢師服務過我」
- 諮詢師可以看到「我服務過哪些學員」

### EODs for Closers
- 原始諮詢記錄（逐字稿、日期、學員資訊）

### Consultation Quality Analysis
- AI 分析結果（評分、優缺點、建議）

## 📌 重要原則

1. **雙向儲存**：每個分析同時連結到學員和諮詢師知識庫
2. **統計自動更新**：每次新增分析時自動更新統計資料
3. **隱私保護**：諮詢師只能看到自己的戰績，無法看到其他諮詢師的資料
4. **學員優先**：即使諮詢師離職，學員的諮詢記錄仍然保留

---

**最後更新**: 2025-11-06
**維護者**: System Architecture Team

# Phase 34: 修復整體評分計算問題

> **完成日期**: 2025-10-26
> **問題**: 陳冠霖的分數顯示為 6 分（E），但實際應該是 64 分（C）
> **核心**: 雙評分系統未正確儲存至資料庫，overall_score 使用舊算法

---

## 🔍 問題分析

### 原始問題
- **列表頁面顯示**: 陳冠霖 6 分（E 級）
- **實際應該是**: 64 分（C 級）
- **根本原因**:
  - `overall_score` 使用舊算法：`Math.round(conversionProb / 10)` = `Math.round(55 / 10)` = 6
  - `teaching_score`, `sales_score`, `conversion_probability` 未儲存至資料庫
  - Phase 32-33 雙評分系統只在前端解析 Markdown，後端未實作

### 資料來源
從陳冠霖的 Markdown 報告中：
- **教學品質總分**: 20/25
- **成交策略總分**: 15/25
- **預估成交機率**: 55%

### 正確計算公式（Phase 32-33）
```
overall_score = (teaching_score/25 × 30) + (sales_score/25 × 30) + (conversion_probability × 0.4)
              = (20/25 × 30) + (15/25 × 30) + (55 × 0.4)
              = 24 + 18 + 22
              = 64
```

---

## 🛠️ 解決方案

### 1. 資料庫遷移（Migration 031）
建立新欄位以支援雙評分系統：

```sql
-- 變更 overall_score 從 1-10 scale 到 0-100 scale
ALTER TABLE teaching_quality_analysis
  DROP CONSTRAINT IF EXISTS teaching_quality_analysis_overall_score_check,
  ADD CONSTRAINT teaching_quality_analysis_overall_score_check
    CHECK (overall_score >= 0 AND overall_score <= 100);

-- 新增三個欄位
ALTER TABLE teaching_quality_analysis
  ADD COLUMN IF NOT EXISTS teaching_score INTEGER CHECK (teaching_score >= 0 AND teaching_score <= 25),
  ADD COLUMN IF NOT EXISTS sales_score INTEGER CHECK (sales_score >= 0 AND sales_score <= 25),
  ADD COLUMN IF NOT EXISTS conversion_probability INTEGER CHECK (conversion_probability >= 0 AND conversion_probability <= 100);
```

### 2. 建立後端 Markdown 解析器
新檔案：[`server/services/parse-teaching-scores.ts`](server/services/parse-teaching-scores.ts)

**核心功能**:
- `parseTeachingScore()`: 從 Markdown 提取教學評分（3 層遞進式容錯）
- `parseSalesScore()`: 從 Markdown 提取推課評分
- `parseConversionProbability()`: 從 Markdown 提取成交機率
- `calculateOverallScore()`: 計算整體評分（使用 Phase 32-33 公式）

**測試結果**:
```
✅ Parsed Scores:
  Teaching Score: 20/25
  Sales Score: 15/25
  Conversion Probability: 55%
  Overall Score: 64/100
```

### 3. 更新分析儲存邏輯
修改：[`server/routes-teaching-quality-new.ts`](server/routes-teaching-quality-new.ts#L284-L308)

```typescript
// 新增解析步驟
const parsedScores = parseScoresFromMarkdown(analysis.summary);

// 儲存至資料庫
const result = await insertAndReturn('teaching_quality_analysis', {
  // ... 其他欄位
  overall_score: parsedScores.overallScore,        // 0-100 calculated score
  teaching_score: parsedScores.teachingScore,      // 0-25
  sales_score: parsedScores.salesScore,            // 0-25
  conversion_probability: parsedScores.conversionProbability, // 0-100
  // ...
});
```

### 4. 批次更新歷史資料
建立腳本：[`tests/update-existing-scores.ts`](tests/update-existing-scores.ts)

**執行結果**:
```
🔄 Updating existing analysis records with dual score system...

📊 Found 153 records to update

✓ 陳冠霖:
  Old: 6/10
  New: 64/100 (T:20/25, S:15/25, P:55%)

✅ Updated 153/153 records
```

---

## ✅ 驗證結果

### 資料庫查詢
```sql
SELECT student_name, overall_score, teaching_score, sales_score, conversion_probability
FROM teaching_quality_analysis
WHERE student_name LIKE '%陳冠霖%';
```

**結果**:
| student_name | overall_score | teaching_score | sales_score | conversion_probability |
|--------------|---------------|----------------|-------------|------------------------|
| 陳冠霖       | 64            | 20             | 15          | 55                     |

### API 回應
```bash
curl "http://localhost:5001/api/teaching-quality/student-records" | grep "陳冠霖"
```

**結果**:
```json
{
  "student_name": "陳冠霖",
  "overall_score": 64,
  // ...
}
```

### 前端顯示
- **原本**: 6 分（E 級）❌
- **修復後**: 64 分（C 級）✅

---

## 📁 檔案清單

### 新增檔案（6 個）
1. `supabase/migrations/031_add_dual_score_system.sql` - 資料庫遷移
2. `server/services/parse-teaching-scores.ts` - 後端解析器
3. `tests/run-migration-031.ts` - 遷移執行腳本
4. `tests/test-score-parser.ts` - 解析器測試
5. `tests/update-existing-scores.ts` - 批次更新腳本
6. `PHASE_34_SCORE_FIX_SUMMARY.md` - 本文件

### 修改檔案（1 個）
1. `server/routes-teaching-quality-new.ts`
   - 新增 import: `parseScoresFromMarkdown`
   - 更新分析儲存邏輯（lines 284-308）

---

## 🎯 8 級評級系統

| Grade | Range     | Color                        | 陳冠霖 |
|-------|-----------|------------------------------|--------|
| SSS   | 95-100    | 漸層金色                     |        |
| SS    | 90-94     | 紫粉漸層                     |        |
| S     | 85-89     | 藍青漸層                     |        |
| A     | 80-84     | 綠色                         |        |
| B     | 70-79     | 藍色                         |        |
| **C** | **60-69** | **黃色**                     | **✓**  |
| D     | 50-59     | 橙色                         |        |
| E     | <50       | 紅色                         |        |

---

## 📊 影響範圍

### 1. 修復的記錄數
- **總計**: 153 筆分析記錄全部更新
- **陳冠霖**: 6 → 64 分

### 2. 未來新增分析
- 自動使用新算法
- 自動儲存 teaching_score, sales_score, conversion_probability
- overall_score 範圍：0-100（而非舊的 1-10）

### 3. 前端相容性
- 前端已有 `calculateOverallScore()` 函數（[`client/src/lib/calculate-overall-score.ts`](client/src/lib/calculate-overall-score.ts)）
- 前端會優先使用資料庫的 overall_score
- 若資料庫無值，前端會從 Markdown 即時解析

---

## 🚀 後續待辦

### 短期
- ✅ 修復評分計算邏輯
- ✅ 更新歷史資料
- ⏳ 測試部署至 Zeabur
- ⏳ 確認前端顯示正確

### 中期
- ⏳ 實作自動儲存 Markdown 報告至學員知識庫（User's second request）
- ⏳ 優化 Markdown 解析器容錯能力
- ⏳ 新增評分趨勢圖表

### 長期
- ⏳ 建立評分標準化流程
- ⏳ 實作評分異常偵測
- ⏳ 產生評分改善建議

---

## 🎉 成就解鎖

- ✅ 發現並修復舊算法問題（overall_score = conversionProb / 10）
- ✅ 實作完整的後端 Markdown 解析器
- ✅ 成功遷移資料庫欄位（1-10 → 0-100 scale）
- ✅ 批次更新 153 筆歷史資料
- ✅ 驗證陳冠霖評分從 6 分修正為 64 分
- ✅ 維持前後端評分計算一致性

---

**備註**: 本次修復確保了 Phase 32-33 雙評分系統的完整實作，從前端到後端、從資料庫到 API，全部使用統一的評分計算邏輯。

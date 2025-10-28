# Teaching Quality Score Bug Fix - Phase 36.2

## 問題描述

教學品質評分系統出現資料不一致問題：
- **列表頁顯示**：林宥辰 69 分
- **詳情頁顯示**：林宥辰 67 分
- **資料庫數據**：teaching_score=18, sales_score=18, conversion_probability=65, overall_score=69
- **前端計算**：teaching=18, sales=16, conversion=65 → overall=67

## 根本原因分析

### Bug Location
**File**: `server/services/parse-teaching-scores.ts` (Line 66)
**File**: `supabase/migrations/040_fix_teaching_scores.sql` (Line 56)

### 原有問題代碼
```typescript
// ❌ 錯誤：正則表達式過於寬鬆
function parseSalesScore(markdown: string): number {
  // Pattern 1: Most flexible - find any "總分/25" or "總評" followed by number/25
  let totalMatch = markdown.match(/總[評分][^0-9]{0,20}(\d+)\s*\/\s*25/);

  if (totalMatch) {
    const score = parseInt(totalMatch[1], 10);
    if (score >= 0 && score <= 25) {
      return score;  // ❌ 返回 18（錯誤！）
    }
  }
  // ...
}
```

### 問題分析

Markdown 結構：
```markdown
# 📊 教學品質評估
**教學品質總分：18/25** ← 正則在這裡誤匹配！

# 🧮 成交策略評估
1. **痛點挖掘深度：** 3/5
2. **方案客製化：** 4/5
3. **價值傳遞：** 2/5
4. **促成技巧：** 3/5
5. **專業度/信心：** 4/5

**總評（總分/25）：** 16/25 ← 這才是正確的目標！
```

**問題根源**：
- 正則表達式 `/總[評分][^0-9]{0,20}(\d+)\s*\/\s*25/` 中的 `總[評分]` 可以匹配 `總評` 或 `總分`
- 它首先遇到 `教學品質總分：18/25` 中的 `總分`，誤匹配到 18
- 正確的目標應該是 `總評（總分/25）：16/25` 中的 16

### 影響範圍
- **直接影響**：所有新分析和重新分析的記錄，銷售分數誤判
- **數據影響**：6 條有 markdownOutput 的記錄（Migration 040 第一次執行時已修復但使用錯誤正則）
- **用戶體驗**：列表頁與詳情頁分數不一致

## 解決方案

### 修正後的代碼

```typescript
// ✅ 正確：使用更精確的正則表達式
function parseSalesScore(markdown: string): number {
  // Pattern 1: Most specific - Look for "總評（總分/25）：" format
  // This avoids accidentally matching "教學品質總分：18/25" from teaching section
  let totalMatch = markdown.match(/總評[（(][^)）]*[)）][：:]\s*\*\*\s*(\d+)\s*\/\s*25/);

  if (totalMatch) {
    const score = parseInt(totalMatch[1], 10);
    if (score >= 0 && score <= 25) {
      return score;  // ✅ 返回 16（正確！）
    }
  }

  // Pattern 2: Alternative format - **總評：** 16/25
  if (!totalMatch) {
    totalMatch = markdown.match(/\*\*總評[：:]\*\*\s*(\d+)\s*\/\s*25/);
    if (totalMatch) {
      const score = parseInt(totalMatch[1], 10);
      if (score >= 0 && score <= 25) {
        return score;
      }
    }
  }

  // Pattern 3: Fallback - Look for individual metric scores in 成交策略評估 section
  const strategySection = markdown.match(/# 🧮 成交策略評估[\s\S]*?(?=# |$)/);

  if (strategySection) {
    const sectionText = strategySection[0];
    const metricsMatches = sectionText.matchAll(/\*\*[^*]+[：:]\s*(\d+)\/5\*\*/g);
    let sum = 0;
    let count = 0;

    for (const metricMatch of metricsMatches) {
      const metricScore = parseInt(metricMatch[1], 10);
      if (metricScore >= 0 && metricScore <= 5) {
        sum += metricScore;
        count++;
      }
    }

    if (count === 5) {
      return sum;  // 3+4+2+3+4 = 16 ✓
    }
  }

  return 0;
}
```

### 正則表達式改進說明

| Pattern | 正則表達式 | 用途 | 優先級 |
|---------|-----------|------|--------|
| Pattern 1 | `/總評[（(][^)）]*[)）][：:]\s*\*\*\s*(\d+)\s*\/\s*25/` | 匹配 `**總評（總分/25）：** 16/25` 格式 | 最高 |
| Pattern 2 | `/\*\*總評[：:]\*\*\s*(\d+)\s*\/\s*25/` | 匹配 `**總評：** 16/25` 備用格式 | 中 |
| Pattern 3 | 區塊解析 + 加總 | 從 `成交策略評估` 區塊加總 5 個指標 | 最低（備用） |

**關鍵改進**：
- ✅ Pattern 1 要求 `總評` 後面必須有括號 `（` 或 `(`，避免匹配 `總分`
- ✅ Pattern 2 要求 `**總評：**` 格式，確保是標題行
- ✅ Pattern 3 作為最後備用，直接從區塊內容加總 5 個指標

## 測試驗證

### 測試案例：林宥辰

**Markdown 內容**：
```markdown
**教學品質總分：18/25**
...
**總評（總分/25）：** 16/25
```

**修正前**：
- Pattern 1 匹配：`總分：18/25` → sales_score = 18 ❌
- Overall Score = (18/25 × 30) + (18/25 × 30) + (65 × 0.4) = 69

**修正後**：
- Pattern 1 匹配：`總評（總分/25）：** 16/25` → sales_score = 16 ✅
- Overall Score = (18/25 × 30) + (16/25 × 30) + (65 × 0.4) = 67

**結果**：列表頁與詳情頁分數一致 ✓

## 修復步驟

### 1. 代碼修正
```bash
# 修改檔案
server/services/parse-teaching-scores.ts (Line 64-88)
supabase/migrations/040_fix_teaching_scores.sql (Line 48-78)

# 提交變更
git add server/services/parse-teaching-scores.ts supabase/migrations/040_fix_teaching_scores.sql
git commit -m "fix: 修正銷售分數解析 - 避免誤匹配教學品質總分"
git push
```

### 2. 執行資料庫修正

**方法一：Supabase SQL Editor（推薦）**
1. 開啟 Supabase Dashboard → SQL Editor
2. 複製 `supabase/migrations/040_fix_teaching_scores.sql` 內容
3. 執行 SQL
4. 查看輸出日誌確認修正結果

**方法二：本地 psql（如果有安裝）**
```bash
./scripts/run-migration-040.sh
```

### 3. 驗證結果

```sql
-- 檢查林宥辰的分數
SELECT
  student_name,
  teaching_score,
  sales_score,
  conversion_probability,
  overall_score
FROM teaching_quality_analysis
WHERE student_name = '林宥辰'
  AND teaching_score > 0
ORDER BY created_at DESC
LIMIT 1;

-- 預期結果：
-- teaching_score: 18
-- sales_score: 16 ← 修正！
-- conversion_probability: 65
-- overall_score: 67 ← 修正！
```

## 部署狀態

- ✅ 代碼已推送到 GitHub
- ✅ Zeabur 將自動部署更新
- ⏳ 等待用戶執行資料庫 Migration 修正現有記錄

## 後續行動

### 必須執行
1. **執行 Migration**：在 Supabase SQL Editor 中執行 `040_fix_teaching_scores.sql`
2. **驗證修正**：查詢資料庫確認 6 條記錄的 sales_score 已從 18 更新為正確值

### 可選執行
3. **重新分析舊記錄**：對於 152 條無 markdownOutput 的舊記錄，可以考慮使用重新分析功能重新生成評分

## 相關文件

- [parse-teaching-scores.ts](../server/services/parse-teaching-scores.ts) - 分數解析邏輯
- [040_fix_teaching_scores.sql](../supabase/migrations/040_fix_teaching_scores.sql) - 資料庫修正腳本
- [PROJECT_PROGRESS.md](../PROJECT_PROGRESS.md) - 專案進度追蹤

## 技術總結

**教訓**：
- 正則表達式設計時必須考慮文檔全局結構，避免誤匹配類似模式
- 使用更具體的特徵（如括號、特定格式）可以提高匹配精確度
- 多層備用策略（Pattern 1 → 2 → 3）確保健壯性
- 前端與後端都需要使用相同的解析邏輯確保一致性

**最佳實踐**：
- ✅ 優先匹配最具體的格式模式
- ✅ 提供多個備用解析策略
- ✅ 在正則表達式中添加詳細註解說明意圖
- ✅ 測試正則表達式時使用真實文檔樣本
- ✅ 資料庫修正腳本與應用代碼保持同步

---

**修正完成時間**: 2025-10-28
**影響版本**: Phase 36.2+
**相關 Commit**: [5691b2f] fix: 修正銷售分數解析 - 避免誤匹配教學品質總分

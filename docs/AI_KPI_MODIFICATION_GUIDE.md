# AI KPI 修改指南

## 🎯 目標
讓 AI（或開發者）能安全地新增 KPI，只修改一個檔案，不會破壞現有功能。

---

## 🔒 安全規則

### ✅ **允許修改**
- `server/services/kpi-calculator.ts` - KPI 運算邏輯
- `configs/report-metric-defaults.ts` - 新增 metric 定義

### ❌ **禁止修改**
- `server/services/reporting/total-report-service.ts`
- `server/routes.ts`
- `server/storage.ts`
- 前端任何檔案
- Supabase schema

---

## 📋 新增 KPI 的三步驟

### **步驟 1：定義 Metric Config**

編輯 `configs/report-metric-defaults.ts`，新增一個 metric：

```typescript
export const DEFAULT_METRIC_CONFIGS: Record<string, ReportMetricConfig> = {
  // ... 現有的 metrics

  // 新增 KPI
  avgClassPerTeacher: {
    metricId: 'avgClassPerTeacher',
    label: '每位老師平均上課數',
    description: '總上課次數 / 老師人數',
    defaultFormula: 'trials / teacherCount',
    sourceFields: ['trials', 'teacherCount'],
  },
};
```

### **步驟 2：擴充運算 Context**

編輯 `server/services/kpi-calculator.ts`，在 `formulaContext` 加入新變數：

```typescript
// 第 2 步：準備公式運算 context
const formulaContext = {
  trials: totalTrials,
  conversions: totalConversions,
  purchases: totalPurchases,
  pending,
  totalRevenue,
  totalDealAmount: totalRevenue,
  avgDealAmount,
  avgConversionDays,
  revenue: totalRevenue,

  // 新增變數
  teacherCount: calculateTeacherCount(rawData.attendance), // 需要實作計算函數
};
```

### **步驟 3：（可選）更新回傳型別**

如果新 KPI 需要回傳給前端，編輯 `CalculatedKPIs` interface：

```typescript
export interface CalculatedKPIs {
  conversionRate: number;
  avgConversionTime: number;
  // ... 現有欄位

  // 新增 KPI
  avgClassPerTeacher?: number;
}
```

並在 `calculateAllKPIs()` 的回傳處加入：

```typescript
return {
  // ... 現有欄位
  avgClassPerTeacher: calculatedMetrics.avgClassPerTeacher,
};
```

---

## 🤖 AI Prompt 模板

### **模板 1：新增簡單 KPI**

```markdown
你是後端工程師，負責擴充 KPI 計算邏輯。

⚠️ 規則：
1. 只修改 `server/services/kpi-calculator.ts`
2. 只修改 `configs/report-metric-defaults.ts`
3. 不要動其他檔案
4. 新增變數時，先在 `formulaContext` 定義，再在 `DEFAULT_METRIC_CONFIGS` 加入公式

目前可用變數：
- trials: 體驗課總數
- conversions: 成交數
- purchases: 購買數
- pending: 待聯繫學生數
- totalRevenue: 總收益
- avgDealAmount: 平均客單價
- avgConversionDays: 平均轉換天數

請新增以下 KPI：
1. 成交率（成交數 / 購買數 * 100）

輸出：
1. 修改後的 `DEFAULT_METRIC_CONFIGS`（只顯示新增的部分）
2. 修改後的 `formulaContext`（如果需要新變數）
```

### **模板 2：新增需要計算的 KPI**

```markdown
你是後端工程師，負責擴充 KPI 計算邏輯。

⚠️ 規則：
1. 修改 `server/services/kpi-calculator.ts`
2. 在 `calculateAllKPIs()` 函數內新增計算邏輯
3. 計算完成後，將結果加入 `formulaContext`
4. 不要動其他檔案

目前可用的 raw data：
- rawData.attendance: 上課記錄陣列
- rawData.purchases: 購買記錄陣列
- rawData.deals: 成交記錄陣列

請新增以下 KPI：
1. 每位老師平均上課數（總上課數 / 不重複老師數）

步驟：
1. 計算不重複老師數量
2. 將結果加入 `formulaContext`
3. 在 `DEFAULT_METRIC_CONFIGS` 定義公式

輸出完整的修改程式碼。
```

---

## 📚 可用變數參考

### **基礎統計變數**（已內建）
| 變數名 | 說明 | 範例 |
|--------|------|------|
| `trials` | 體驗課總數 | 50 |
| `conversions` | 成交數 | 10 |
| `purchases` | 購買數 | 30 |
| `pending` | 待聯繫學生數 | 20 |
| `totalRevenue` | 總收益 | 500000 |
| `avgDealAmount` | 平均客單價 | 50000 |
| `avgConversionDays` | 平均轉換天數 | 7 |

### **可擴充的變數**（需自行計算）
- `teacherCount`: 不重複老師數量
- `studentCount`: 不重複學員數量
- `avgSatisfaction`: 平均滿意度
- `highIntentCount`: 高意願學員數（意願分數 > 80）
- `lowIntentCount`: 低意願學員數（意願分數 < 50）

---

## 🧪 測試新 KPI

### **方法 1：單元測試**

建立 `test-kpi-calculator.ts`：

```typescript
import { calculateAllKPIs } from './server/services/kpi-calculator';

const testData = {
  attendance: [
    { id: '1', data: { studentEmail: 'a@test.com', teacher: 'Teacher A' } },
    { id: '2', data: { studentEmail: 'b@test.com', teacher: 'Teacher B' } },
  ],
  purchases: [
    { id: '1', data: { studentEmail: 'a@test.com' } },
  ],
  deals: [
    { id: '1', data: { studentEmail: 'a@test.com', dealAmount: 50000 } },
  ],
};

const warnings: string[] = [];
const kpis = await calculateAllKPIs(testData, warnings);

console.log('KPIs:', kpis);
console.log('Warnings:', warnings);
```

執行：
```bash
npx tsx test-kpi-calculator.ts
```

### **方法 2：API 測試**

```bash
# 產生報表，查看新 KPI
curl http://localhost:5000/api/reports/total-report?period=monthly
```

---

## ⚠️ 常見錯誤與解決方案

### **錯誤 1：公式計算回傳 null**
**原因**：變數名稱拼錯或未定義
**解決**：檢查 `formulaContext` 是否有該變數

### **錯誤 2：除以零錯誤**
**原因**：分母為 0
**解決**：使用 `Math.max(1, denominator)` 避免除以零

### **錯誤 3：TypeScript 編譯錯誤**
**原因**：回傳型別不符
**解決**：更新 `CalculatedKPIs` interface

---

## 🎯 範例：完整新增一個 KPI

### **需求**
新增「高意願學員佔比」KPI，公式為：`highIntentCount / trials * 100`

### **實作**

#### 1. 修改 `kpi-calculator.ts`

```typescript
// 在 calculateAllKPIs() 內，計算高意願學員數
const highIntentCount = rawData.attendance.filter(a => {
  const intentScore = parseNumberField(resolveField(a.data, 'intentScore'));
  return intentScore !== null && intentScore > 80;
}).length;

// 加入 formulaContext
const formulaContext = {
  // ... 現有變數
  highIntentCount,
};
```

#### 2. 修改 `report-metric-defaults.ts`

```typescript
highIntentRatio: {
  metricId: 'highIntentRatio',
  label: '高意願學員佔比',
  description: '意願分數 > 80 的學員佔比',
  defaultFormula: '(highIntentCount / trials) * 100',
  sourceFields: ['highIntentCount', 'trials'],
},
```

#### 3. 測試

```bash
npx tsx test-kpi-calculator.ts
# 確認輸出包含 highIntentRatio
```

---

## 📞 需要幫助？

- 檢查 `server/services/kpi-calculator.ts` 的註解
- 參考既有的 metric configs
- 確認公式符合 Formula Engine 語法（只支援 `+`, `-`, `*`, `/`, `()`）

---

**最後更新**：2025-10-02
**維護者**：Claude Code Assistant

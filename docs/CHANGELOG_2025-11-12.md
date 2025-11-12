# 📋 更新日誌 - 2025-11-12

> **開發工程師**: Claude
> **更新時間**: 2025-11-12
> **專案狀態**: ✅ 諮詢師報表優化完成
> **本次更新**: 來源平均值詳情功能 - 成交率與平均實收計算修正

---

## 🎯 本次更新重點

### 諮詢師報表 - 來源平均值詳情功能優化

#### 問題背景
用戶在諮詢師報表的「來源分析」表格中，發現平均成交率和平均實收金額的計算邏輯不正確，且無法查看這些平均值是如何計算出來的。

#### 核心問題
1. **成交率計算錯誤**:
   - ❌ 錯誤邏輯：(成交筆數 / 總學生數) = 69.6%
   - ✅ 正確邏輯：(成交學生數 / 總學生數) = 60.9%
   - 問題：同一位學生可能有多筆成交記錄，應該只計算一次

2. **平均實收金額計算錯誤**:
   - ❌ 錯誤邏輯：總金額 / 成交筆數
   - ✅ 正確邏輯：總金額 / 成交學生數
   - 問題：應以「每位學生」為單位計算平均，而非以「每筆交易」

3. **缺乏透明度**:
   - 用戶無法查看平均值背後的具體資料
   - 無法驗證計算是否正確

---

## 🔧 技術實現

### 1. 後端修正 ([consultant-report-service.ts](../server/services/consultant-report-service.ts))

#### A. 修正 `getLeadSourceAverages` 函數 (Lines 413-457)

**修正前**:
```typescript
// 錯誤：使用成交筆數計算成交率
COUNT(CASE WHEN deal_date IS NOT NULL THEN 1 END) / COUNT(DISTINCT student_email) * 100
```

**修正後**:
```typescript
// 正確：使用成交學生數計算成交率
COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) / COUNT(DISTINCT student_email) * 100
```

**關鍵差異**:
- `COUNT(CASE WHEN deal_date IS NOT NULL THEN 1 END)` - 計算所有成交記錄（16筆）
- `COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END)` - 計算不重複的成交學生（14位）

#### B. 新增 `getLeadSourceAverageDetails` 函數 (Lines 462-593)

**功能**: 查詢特定來源的歷史成交記錄詳細資料，用於查看平均值的計算過程

**實現細節**:

1. **查詢成交記錄** (Lines 507-524):
```typescript
const dealQuery = `
  SELECT
    student_name,
    student_email,
    consultation_date,
    deal_date,
    closer_name as consultant_name,
    setter_name,
    lead_source,
    plan,
    actual_amount,
    ${groupByClause} as period
  FROM eods_for_closers
  WHERE lead_source = $1
    AND consultation_date IS NOT NULL
    AND deal_date IS NOT NULL
  ORDER BY consultation_date DESC
`;
```

2. **查詢總學生數（包含未成交）** (Lines 555-562):
```typescript
const totalQuery = `
  SELECT COUNT(DISTINCT student_email) as total_students
  FROM eods_for_closers
  WHERE lead_source = $1
    AND consultation_date IS NOT NULL
`;
```

3. **計算統計資訊** (Lines 564-592):
```typescript
// 成交學生數（去重）
const uniqueStudents = new Set(dealResult.rows.map(row => row.student_email)).size;

// 總成交筆數
const totalRecords = dealResult.rows.length;

// 總實收金額
let totalAmount = 0;
dealResult.rows.forEach(row => {
  if (row.actual_amount) {
    const cleaned = String(row.actual_amount).replace(/[^0-9.-]/g, '');
    const amount = parseFloat(cleaned);
    if (!isNaN(amount)) {
      totalAmount += amount;
    }
  }
});

// 平均實收（每位學生）
const avgAmount = uniqueStudents > 0 ? totalAmount / uniqueStudents : 0;

// 成交率
const closingRate = totalStudents > 0 ? (uniqueStudents / totalStudents) * 100 : 0;
```

**回傳資料結構**:
```typescript
{
  records: Array<{
    studentName: string;
    studentEmail: string;
    consultationDate: Date;
    dealDate: Date;
    consultantName: string;
    setterName: string;
    leadSource: string;
    plan: string;
    actualAmount: string;
    period: Date;
  }>;
  summary: {
    totalRecords: number;      // 總成交筆數: 16
    uniqueStudents: number;    // 成交學生數: 14
    totalStudents: number;     // 總學生數: 23
    totalAmount: number;       // 總實收金額: 774,500
    avgAmount: number;         // 平均實收: 55,321
    closingRate: number;       // 成交率: 60.9%
  }
}
```

### 2. API 端點新增 ([routes.ts](../server/routes.ts):3892-3927)

```typescript
app.get('/api/reports/consultants/lead-source-average-details',
  isAuthenticated,
  requireModulePermission('consultant_report'),
  async (req, res) => {
    const leadSource = req.query.leadSource as string;
    const params: ConsultantReportParams = {
      period: (req.query.period as PeriodType) || 'month',
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      consultantName: req.query.consultantName as string,
    };

    const details = await getLeadSourceAverageDetails(leadSource, params);

    res.json({
      success: true,
      data: details,
    });
  }
);
```

### 3. 前端實現 ([consultants.tsx](../client/src/pages/reports/consultants.tsx))

#### A. 新增 React Query 獲取詳細資料 (Lines 221-239)

```typescript
const averageDetailsData = useQuery({
  queryKey: ['leadSourceAverageDetails', selectedLeadSource, reportParams.period],
  queryFn: async () => {
    const params = new URLSearchParams({
      leadSource: selectedLeadSource || '',
      period: reportParams.period,
    });
    const response = await fetch(`/api/reports/consultants/lead-source-average-details?${params}`);
    if (!response.ok) throw new Error('Failed to fetch average details');
    return response.json();
  },
  enabled: !!selectedLeadSource,
});
```

#### B. 修正 `formatPercent` 函數避免崩潰 (Lines 433-436)

**修正前**:
```typescript
const formatPercent = (num: number) => {
  return `${num.toFixed(1)}%`;
};
```

**修正後**:
```typescript
const formatPercent = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return `${num.toFixed(1)}%`;
};
```

**問題**: 當 API 回傳 undefined 時，`toFixed()` 會導致 "Cannot read properties of undefined" 錯誤，造成白屏。

#### C. 統計資料展示 (Lines 1799-1826)

6 個統計卡片：
- **總學生數**: 23 位（包含未成交的）
- **成交學生數**: 14 位
- **成交率**: 60.9%（= 14/23）
- **總成交筆數**: 16 筆
- **總實收金額**: NT$774,500
- **平均實收（每位學生）**: NT$55,321（= 774,500/14）

#### D. 可排序的資料表格 (Lines 1828-1893)

功能：
- 點擊欄位標題排序
- 顯示排序方向（↑/↓）
- 包含行號（#）
- 支援多欄位排序（學生姓名、Email、諮詢日期等）

---

## 📊 實測結果

### 測試案例：開嗓菜單

#### API 回應驗證
```bash
curl "http://localhost:5001/api/reports/consultants/lead-source-average-details?leadSource=開嗓菜單&period=month"
```

**回應資料**:
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "studentName": "健恆",
        "studentEmail": "s0952726028@gmail.com",
        "consultationDate": "2025-11-09T16:00:00.000Z",
        "dealDate": "2025-11-09T16:00:00.000Z",
        "consultantName": "Vicky",
        "actualAmount": "NT$4,000.00"
      },
      // ... 共 16 筆記錄
    ],
    "summary": {
      "totalRecords": 16,
      "uniqueStudents": 14,
      "totalStudents": 23,
      "totalAmount": 774500,
      "avgAmount": 55321.42857142857,
      "closingRate": 60.86956521739131
    }
  }
}
```

#### 計算驗證
- ✅ 總學生數: 23 位
- ✅ 成交學生數: 14 位（蘇琦慧和林承德各有 2 筆成交，但只算 1 位）
- ✅ 總成交筆數: 16 筆
- ✅ 成交率: 14 / 23 = 60.87% ≈ 60.9% ✓
- ✅ 平均實收: 774,500 / 14 = 55,321 元 ✓

---

## 🐛 已修復的問題

### 問題 1: 成交率計算錯誤
- **現象**: 顯示 69.6% 而非 60.9%
- **根因**: SQL 使用 `COUNT(CASE WHEN deal_date IS NOT NULL THEN 1 END)` 計算所有記錄（16筆）
- **修復**: 改用 `COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END)` 計算不重複學生（14位）

### 問題 2: 平均實收計算錯誤
- **現象**: 數值不符合預期
- **根因**: 使用總筆數而非成交學生數作為除數
- **修復**: 改用 `totalAmount / uniqueStudents` 計算

### 問題 3: 白屏錯誤
- **現象**: "Cannot read properties of undefined (reading 'toFixed')"
- **根因**: `formatPercent` 函數未處理 undefined 值
- **修復**: 加入 null/undefined 檢查，回傳 '-' 作為預設值

### 問題 4: API 資料不完整
- **現象**: summary 物件缺少 totalStudents 和 closingRate 欄位
- **根因**: 伺服器未重新啟動，執行舊版程式碼
- **修復**: 重啟伺服器後正常回傳完整資料

---

## 📁 修改的檔案

### 後端
- [server/services/consultant-report-service.ts](../server/services/consultant-report-service.ts)
  - 修正 `getLeadSourceAverages` 成交率計算邏輯
  - 新增 `getLeadSourceAverageDetails` 函數
  - Lines: 413-593

- [server/routes.ts](../server/routes.ts)
  - 新增 GET `/api/reports/consultants/lead-source-average-details` 端點
  - Lines: 3892-3927

### 前端
- [client/src/pages/reports/consultants.tsx](../client/src/pages/reports/consultants.tsx)
  - 新增 React Query 資料獲取
  - 修正 `formatPercent` 函數
  - 新增詳細資料對話框
  - 實作統計資料展示（6 個統計卡片）
  - 實作可排序資料表格
  - Lines: 204-205, 221-239, 433-436, 1799-1893

### 測試檔案
- [tests/check-lead-source-closing-rate.ts](../tests/check-lead-source-closing-rate.ts)
  - 驗證成交率計算邏輯的測試腳本

---

## 🎓 技術亮點

### 1. SQL DISTINCT 在 CASE 表達式中的應用
```sql
-- 不重複的成交學生數
COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END)

-- 而非單純的記錄數
COUNT(CASE WHEN deal_date IS NOT NULL THEN 1 END)
```

這是關鍵的差異點，確保每位學生只被計算一次。

### 2. 前端錯誤處理最佳實踐
```typescript
const formatPercent = (num: number | undefined | null) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return `${num.toFixed(1)}%`;
};
```

防禦性程式設計，避免因資料問題導致整個頁面崩潰。

### 3. React Query 條件性查詢
```typescript
const averageDetailsData = useQuery({
  queryKey: ['leadSourceAverageDetails', selectedLeadSource, reportParams.period],
  queryFn: async () => { /* ... */ },
  enabled: !!selectedLeadSource,  // 只有在選擇來源時才查詢
});
```

避免不必要的 API 請求，提升效能。

### 4. 資料去重的多種實現方式
- **SQL 層**: `COUNT(DISTINCT student_email)`
- **JavaScript 層**: `new Set(rows.map(row => row.student_email)).size`

兩層驗證確保資料準確性。

---

## 📈 使用者體驗改善

### 修改前
- ❌ 成交率顯示錯誤（69.6%）
- ❌ 平均實收金額不準確
- ❌ 無法查看平均值的計算依據
- ❌ 缺乏數據透明度

### 修改後
- ✅ 成交率正確顯示（60.9%）
- ✅ 平均實收金額準確（NT$55,321/學生）
- ✅ 可點擊查看完整歷史記錄
- ✅ 6 個統計卡片清楚展示計算過程
- ✅ 可排序的資料表格，方便查找
- ✅ 完整的資料驗證能力

---

## 🔍 除錯過程記錄

### Step 1: 問題定位
用戶反應：「依照開嗓菜單來算，為什麼是69.6%」

### Step 2: 資料驗證
建立測試腳本 `check-lead-source-closing-rate.ts`：
```
總學生數: 23 位
成交學生數: 14 位
總成交筆數: 16 筆（蘇琦慧 2筆、林承德 2筆）
正確成交率: 14 / 23 = 60.9%
```

### Step 3: SQL 邏輯修正
將 `COUNT(CASE...)` 改為 `COUNT(DISTINCT CASE...)`

### Step 4: 前端崩潰修復
發現 `formatPercent` 函數未處理 undefined，加入防禦性檢查

### Step 5: API 資料驗證
使用 curl 測試發現 summary 缺少欄位，重啟伺服器解決

---

## ✅ 驗收標準

- [x] 成交率計算正確（60.9%）
- [x] 平均實收計算正確（NT$55,321）
- [x] 可點擊查看詳細記錄
- [x] 顯示 6 個統計資料
- [x] 表格可排序
- [x] 無白屏錯誤
- [x] API 回傳完整資料結構

---

## 📝 後續建議

1. **效能優化**: 對於大量資料的來源，考慮加入分頁功能
2. **匯出功能**: 允許匯出詳細記錄為 Excel/CSV
3. **視覺化**: 加入成交趨勢圖表
4. **比較功能**: 支援多個來源的對比分析

---

## 👨‍💻 開發者備註

本次修正的核心觀念是「以學生為單位」而非「以交易為單位」進行統計計算。這是業務邏輯上的關鍵差異，確保了報表數據的業務意義正確性。

在開發類似功能時，建議：
1. 先確認業務定義（以什麼為單位計算）
2. 使用 SQL DISTINCT 確保去重
3. 前端加入防禦性檢查
4. 提供資料驗證能力（可查看明細）

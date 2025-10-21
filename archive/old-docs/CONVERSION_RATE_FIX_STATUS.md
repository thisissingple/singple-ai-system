# 🔧 轉換率修正進度報告

> **時間**: 2025-10-08 下午
> **狀態**: Phase 1 完成 80%，遇到 PostgREST Schema Cache 問題

---

## ✅ 已完成的工作

### 1. 分析需求與定義（完成 ✅）

**你的需求**：
```
轉換率 = 體驗課升高階學生數 / 已上完課學生數

其中：
  - 體驗課升高階學生數 = 體驗課購買記錄表中「目前狀態」= "已轉高" 的唯一學生數
  - 已上完課學生數 = 「目前狀態」IN ["已轉高", "未轉高"] 的唯一學生數
```

**實際數據**（從 CSV 確認）：
- 已轉高：14 人
- 未轉高：17 人
- 已上完課（已轉高 + 未轉高）：31 人
- **預期轉換率**：14 / 31 * 100 = **45.16%**

---

### 2. 更新 KPI 計算邏輯（完成 ✅）

**修改檔案**: [server/services/kpi-calculator.ts](server/services/kpi-calculator.ts#L89-130)

**新增邏輯**：
```typescript
// 從 purchases 表提取唯一學生的狀態
const studentStatusMap = new Map<string, string>();
purchases.forEach(purchase => {
  const email = (resolveField(purchase.data, 'studentEmail') || purchase.data.email || '').trim().toLowerCase();
  const status = resolveField(purchase.data, 'currentStatus') || purchase.data.current_status || '';

  if (email && status) {
    studentStatusMap.set(email, status);
  }
});

// 計算「已轉高」的唯一學生數
const convertedStudentEmails = Array.from(studentStatusMap.entries())
  .filter(([email, status]) => status === '已轉高')
  .map(([email]) => email);

const convertedStudentsCount = convertedStudentEmails.length;

// 計算「已上完課」的唯一學生數（已轉高 + 未轉高）
const completedStudentEmails = Array.from(studentStatusMap.entries())
  .filter(([email, status]) => status === '已轉高' || status === '未轉高')
  .map(([email]) => email);

const completedStudentsCount = completedStudentEmails.length;
```

**新增變數到 formula context**：
```typescript
const step3_formulaContext = {
  // ... 其他變數
  convertedStudents: convertedStudentsCount,  // 已轉高學生數
  completedStudents: completedStudentsCount,  // 已上完課學生數
  attendedStudents: completedStudentsCount,   // 別名
};
```

---

### 3. 更新公式定義（完成 ✅）

**修改檔案**: [configs/report-metric-defaults.ts](configs/report-metric-defaults.ts#L24-30)

**舊公式**:
```typescript
conversionRate: {
  metricId: 'conversionRate',
  label: '轉換率',
  description: '成交數 / 體驗課總數 * 100',
  defaultFormula: '(conversions / trials) * 100',
  sourceFields: ['conversions', 'trials'],
}
```

**新公式**:
```typescript
conversionRate: {
  metricId: 'conversionRate',
  label: '轉換率',
  description: '已轉高學生數 / 已上完課學生數 * 100（從體驗課購買記錄表）',
  defaultFormula: '(convertedStudents / completedStudents) * 100',
  sourceFields: ['convertedStudents', 'completedStudents'],
}
```

---

### 4. 重新導入 CSV 數據（完成 ✅）

**問題**: 原本的 CSV 導入使用中文欄位名，但 Supabase 表使用英文欄位名

**解決方案**: 創建新的 SQL 導入腳本

**檔案**: [scripts/import-purchases-sql.ts](scripts/import-purchases-sql.ts)

**執行結果**:
```bash
✓ 讀取到 98 筆資料
🗑️  清空舊資料...
🎉 完成！總共 98 筆
```

**數據驗證**:
```sql
SELECT current_status, COUNT(*) FROM trial_class_purchase
WHERE current_status IS NOT NULL
GROUP BY current_status;

 current_status | count
----------------+-------
 體驗中         |    39
 未開始         |    27
 未轉高         |    17
 已轉高         |    14  ← 正確！
 測試範本       |     1
```

---

### 5. 更新 Repository 邏輯（完成 ✅）

**修改檔案**: [server/services/reporting/supabase-report-repository.ts](server/services/reporting/supabase-report-repository.ts#L125-175)

**修改內容**：
1. 查詢改用英文欄位名：`purchase_date` 而非 `體驗課購買日期`
2. Normalize 函數優先讀取英文欄位，兼容中文欄位
3. 確保 `current_status` 欄位正確傳遞到 raw_data

```typescript
private normalizePurchaseRow(row: any): SupabaseDataRow {
  return {
    id: row.id,
    student_name: row.student_name || row['姓名'],
    student_email: row.student_email || row['email'],
    purchase_date: row.purchase_date || row['體驗課購買日期'],
    status: row.current_status || row['目前狀態'] || row.status,
    raw_data: {
      ...row.raw_data || {},
      currentStatus: row.current_status,
      current_status: row.current_status,
    },
    // ...
  };
}
```

---

## ⚠️ 當前問題

### PostgREST Schema Cache 問題

**錯誤訊息**:
```
Supabase getPurchases error: {
  code: '42703',
  message: 'column trial_class_purchase.purchase_date does not exist'
}
```

**問題分析**:
1. 資料庫欄位 `purchase_date` 確實存在（已驗證）
2. PostgREST API 的 schema cache 沒有更新
3. 已嘗試 `NOTIFY pgrst, 'reload schema'` 但問題持續

**可能原因**:
- Supabase Cloud 的 PostgREST 需要更長時間重新載入
- Schema cache 需要手動清除或重啟 PostgREST 服務
- 可能需要在 Supabase Dashboard 手動觸發

---

## 🎯 下一步驟（需要執行）

### Option A: 使用 Supabase Dashboard 重新載入 Schema

1. 登入 Supabase Dashboard
2. 進入 Settings → Database
3. 點擊「Reload Schema」或重啟 PostgREST
4. 等待 2-3 分鐘後測試

### Option B: 使用 SQL 直接查詢（繞過 PostgREST）

修改 `supabase-client.ts` 使用直接的 SQL 查詢而非 PostgREST API：

```typescript
// 使用 pg 直接連接而非 supabase-js
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

// 直接 SQL 查詢
const result = await pool.query(
  'SELECT * FROM trial_class_purchase ORDER BY purchase_date'
);
```

### Option C: 等待 Schema Cache 自動更新

有時候 Supabase Cloud 需要 5-10 分鐘才會完全更新 schema cache。

---

## 📊 預期結果

一旦 Schema Cache 問題解決，預期看到：

```bash
$ curl http://localhost:5001/api/reports/total-report?period=all

{
  "success": true,
  "data": {
    "summaryMetrics": {
      "conversionRate": 45.16,  ← 應該是 45.16%（14/31*100）
      "totalTrials": 143,
      "totalConversions": 575
    }
  }
}
```

---

## 📝 相關檔案

### 已修改
1. `server/services/kpi-calculator.ts` - KPI 計算邏輯
2. `configs/report-metric-defaults.ts` - 公式定義
3. `server/services/reporting/supabase-report-repository.ts` - 資料查詢
4. `scripts/import-purchases-sql.ts` - CSV 導入（新建）

### 資料驗證
- CSV 檔案：`excisting_csv/教練組KPI - 體驗課購買記錄表.csv`
- Supabase 表：`trial_class_purchase`
- 已匯入 98 筆，current_status 正確

---

## ✅ Phase 1 完成度

- [x] 需求分析與定義
- [x] KPI 計算邏輯更新
- [x] 公式定義更新
- [x] CSV 數據重新導入
- [x] Repository 查詢更新
- [ ] **Schema Cache 問題解決** ← 待處理
- [ ] 最終測試與驗證

**完成度**: 80% (5/6 完成)

---

## 🚀 Phase 2 計畫（UI 自訂系統）

Phase 1 完成後，將開始 Phase 2：建立完整的 KPI 自訂定義系統（視覺化介面），預計 4-5 天完成。

---

**報告時間**: 2025-10-08 17:05
**下次檢查**: 等待 Supabase Schema Cache 更新後測試

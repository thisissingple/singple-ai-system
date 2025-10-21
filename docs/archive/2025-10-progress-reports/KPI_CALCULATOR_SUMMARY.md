# KPI Calculator 功能完成總結

## 🎉 已完成的功能

### 後端 (Backend)

#### 1. KPI Calculator Service
**檔案**: [server/services/kpi-calculator.ts](server/services/kpi-calculator.ts)

- ✅ 重構 `calculateAllKPIs()` 函數
- ✅ 新增 `CalculationDetail` 介面，包含 4 個步驟：
  - **Step 1**: 基礎變數 (`step1_baseVariables`)
  - **Step 2**: 中間計算 (`step2_intermediateCalculations`)
  - **Step 3**: 公式 Context (`step3_formulaContext`)
  - **Step 4**: KPI 計算結果 (`step4_kpiCalculations`)
- ✅ 回傳完整的計算過程和 warnings

#### 2. Formula Engine
**檔案**: [server/services/reporting/formula-engine.ts](server/services/reporting/formula-engine.ts)

- ✅ 新增 `calculateMetricWithDebug()` 方法
- ✅ 回傳詳細的除錯資訊：
  - 原始公式
  - 代入後的公式
  - 計算結果

#### 3. Total Report Service
**檔案**: [server/services/reporting/total-report-service.ts](server/services/reporting/total-report-service.ts)

- ✅ 更新 `calculateSummaryMetrics()` 適配新的 KPI Calculator
- ✅ 自動合併 warnings 到報表中

#### 4. API Routes
**檔案**: [server/routes.ts](server/routes.ts)

- ✅ 新增 `POST /api/kpi-calculator/detail`
  - 接收 `period`, `baseDate`, `startDate`, `endDate`
  - 回傳完整的計算過程和結果
- ✅ 確認 `GET /api/report-metrics/config` 完整可用

---

### 前端 (Frontend)

#### 1. KPI Calculator Dashboard
**檔案**: [client/src/pages/dashboard-kpi-calculator.tsx](client/src/pages/dashboard-kpi-calculator.tsx)

新建完整的 KPI 計算器頁面，包含：

- ✅ **4 個 Tab 分頁**：
  - Step 1: 基礎變數 (Base Variables)
  - Step 2: 中間計算 (Intermediate Calculations)
  - Step 3: 公式 Context (Formula Context)
  - Step 4: KPI 結果 (KPI Calculations)

- ✅ **詳細顯示每個 KPI**：
  - 公式 (Formula)
  - 代入變數 (Variables)
  - 計算過程 (Substituted Formula)
  - 最終結果 (Final Result)
  - 警告訊息 (Warnings)

- ✅ **資料來源指示**：
  - 顯示期間範圍
  - 顯示資料來源 (Supabase / Local Storage)
  - 重新計算按鈕

#### 2. Dashboard Integration
**檔案**: [client/src/pages/dashboard.tsx](client/src/pages/dashboard.tsx)

- ✅ 匯入 `DashboardKPICalculator` 組件
- ✅ 新增 Tab: "KPI 計算器"
- ✅ 整合到主 Dashboard

#### 3. Total Report Enhancement
**檔案**: [client/src/pages/dashboard-total-report.tsx](client/src/pages/dashboard-total-report.tsx)

- ✅ 已包含 Supabase 狀態顯示
- ✅ 顯示資料來源統計

---

## 📊 系統架構

```
┌─────────────────────────────────────────────────────────────┐
│                        使用者介面                            │
├─────────────────────────────────────────────────────────────┤
│  Dashboard                                                   │
│  ├─ Google Sheets 管理                                       │
│  ├─ 戰力報表                                                 │
│  ├─ 數據總報表 (Total Report) ← Supabase 狀態顯示           │
│  └─ KPI 計算器 (KPI Calculator) ← 🆕 新功能                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        API 層                                │
├─────────────────────────────────────────────────────────────┤
│  GET  /api/report-metrics/config                            │
│  POST /api/kpi-calculator/detail ← 🆕                        │
│  GET  /api/reports/total-report                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     服務層 (Services)                        │
├─────────────────────────────────────────────────────────────┤
│  KPI Calculator (kpi-calculator.ts)                         │
│  ├─ calculateAllKPIs() ← 🔄 重構                             │
│  ├─ Step 1: Base Variables                                  │
│  ├─ Step 2: Intermediate Calculations                       │
│  ├─ Step 3: Formula Context                                 │
│  └─ Step 4: KPI Calculations                                │
│                                                              │
│  Formula Engine (formula-engine.ts)                         │
│  ├─ calculateMetricWithDebug() ← 🆕                          │
│  └─ validateFormula()                                       │
│                                                              │
│  Total Report Service (total-report-service.ts)             │
│  ├─ generateReport()                                        │
│  ├─ fetchRawData() (Supabase → Storage fallback)            │
│  └─ calculateSummaryMetrics() ← 🔄 適配新格式                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      資料層 (Data)                           │
├─────────────────────────────────────────────────────────────┤
│  Supabase (優先)                                             │
│  ├─ trial_class_attendance                                  │
│  ├─ trial_class_purchase                                    │
│  └─ eods_for_closers                                        │
│                                                              │
│  Local Storage (備援)                                        │
│  └─ SQLite DB                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 測試指南

### 1. 啟動開發伺服器

```bash
npm run dev
```

### 2. 測試數據總報表

1. 訪問 Dashboard
2. 切換到「數據總報表」Tab
3. 確認顯示：
   - ✅ Supabase 狀態（資料來源、筆數）
   - ✅ 綠色提示框顯示即時資料
   - ✅ Warnings（如有）

### 3. 測試 KPI 計算器

1. 在 Dashboard 切換到「KPI 計算器」Tab
2. 查看 4 個計算步驟：
   - **Step 1**: 確認基礎變數值正確
   - **Step 2**: 查看中間計算過程
   - **Step 3**: 確認所有 context 變數
   - **Step 4**: 查看每個 KPI 的詳細計算
3. 點擊「重新計算」按鈕測試重新載入

### 4. API 測試

#### 測試 KPI Calculator Detail API

```bash
curl -X POST http://localhost:5000/api/kpi-calculator/detail \
  -H 'Content-Type: application/json' \
  -H 'Cookie: your-session-cookie' \
  -d '{
    "period": "monthly",
    "baseDate": "2025-10-03"
  }'
```

預期回應：
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "dateRange": {
      "start": "2025-10-01",
      "end": "2025-10-31"
    },
    "dataSource": "supabase",
    "summaryMetrics": { ... },
    "calculationDetail": {
      "step1_baseVariables": { ... },
      "step2_intermediateCalculations": { ... },
      "step3_formulaContext": { ... },
      "step4_kpiCalculations": [ ... ]
    },
    "warnings": [ ... ]
  }
}
```

#### 測試 Metric Config API

```bash
curl -X GET http://localhost:5000/api/report-metrics/config \
  -H 'Cookie: your-session-cookie'
```

---

## 🎯 核心特性

### 1. 透明化計算過程
每個 KPI 都顯示：
- 📐 原始公式
- 🔢 代入的變數值
- 🧮 實際計算過程
- ✅ 最終結果
- ⚠️ 警告訊息（如有）

### 2. 四步驟計算流程
1. **基礎變數萃取** - 從原始資料取得最基本的數值
2. **中間計算** - 複雜的衍生計算（平均值、總和等）
3. **公式 Context 準備** - 組裝所有可用變數
4. **KPI 計算** - 使用 Formula Engine 計算最終結果

### 3. 資料來源整合
- 🎯 **Supabase 優先** - 同步的即時資料
- 🔄 **Storage Fallback** - 本地 SQLite 備援
- 📊 **狀態顯示** - 明確標示使用的資料來源

### 4. 錯誤處理與警告
- ✅ 自動修正異常數值（如負數）
- ⚠️ 收集並顯示所有警告
- 🔍 詳細的計算過程除錯資訊

---

## 📁 檔案清單

### 後端新增/修改
- ✅ `server/services/kpi-calculator.ts` (重構)
- ✅ `server/services/reporting/formula-engine.ts` (新增 method)
- ✅ `server/services/reporting/total-report-service.ts` (適配)
- ✅ `server/routes.ts` (新增 API)

### 前端新增/修改
- ✅ `client/src/pages/dashboard-kpi-calculator.tsx` (新建)
- ✅ `client/src/pages/dashboard.tsx` (整合)
- ✅ `client/src/pages/dashboard-total-report.tsx` (已有 Supabase 狀態)

---

## 🚀 未來改進建議

1. **公式編輯器**
   - 在 KPI Calculator 頁面中直接編輯公式
   - 即時預覽計算結果

2. **歷史記錄比較**
   - 比較不同時期的 KPI 計算結果
   - 視覺化趨勢變化

3. **導出功能**
   - 導出計算過程為 PDF/Excel
   - 用於報告和稽核

4. **效能優化**
   - 快取計算結果
   - 只在資料變更時重新計算

---

## ✅ 功能檢查清單

- [x] 重構 KPI Calculator 回傳完整計算過程
- [x] 擴充 Formula Engine 支援 debug 模式
- [x] 更新 Total Report Service 適配新格式
- [x] 新增 `/api/kpi-calculator/detail` API
- [x] 確認 `/api/report-metrics/config` API 完整
- [x] 建立 KPI Calculator Dashboard 頁面
- [x] 整合到主 Dashboard
- [x] Total Report 顯示 Supabase 狀態
- [x] Build 測試通過
- [x] TypeScript 類型檢查通過

---

## 📝 總結

所有功能已完成並整合！系統現在提供：

1. ✅ **透明的 KPI 計算過程** - 使用者可以理解每個數字如何產生
2. ✅ **完整的除錯資訊** - AI 或開發者可以快速定位問題
3. ✅ **Supabase 整合** - 真實資料同步與顯示
4. ✅ **優雅的 UI** - 清晰的四步驟展示和視覺化

🎉 **系統已經準備好接受實際使用和進一步優化！**

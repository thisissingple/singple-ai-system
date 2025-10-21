# 實作狀態報告 - 數據總報表優化

## ✅ 已完成項目

### 1. 開發環境種子資料系統
- ✅ `server/services/dev-seed-service.ts` - 測試資料產生服務
- ✅ `POST /api/dev/seed-total-report` - 建立測試資料 API
- ✅ `DELETE /api/dev/seed-total-report` - 清除測試資料 API
- ✅ 僅在 DEV 環境啟用，production 環境回傳 403

**功能**：
- 自動建立3個測試 Spreadsheet
- 透過 `googleSheetsService.syncSpreadsheet()` 寫入 mock 資料
- 無需 Google 憑證即可產生 Live 模式資料

### 2. 欄位映射強化
- ✅ `server/services/reporting/field-mapping-v2.ts` - 新版映射工具
- ✅ `FIELD_ALIASES` - 統一的欄位別名對照表
- ✅ `resolveField()` - 欄位值解析函式
- ✅ `parseDateField()` - 日期欄位解析
- ✅ `parseNumberField()` - 數值欄位解析

**支援欄位**：
- studentName, studentEmail, teacher
- classDate, purchaseDate, dealDate
- courseType, dealAmount
- attended, status, intentScore, satisfaction

### 3. API 整合修正（v2.0）
- ✅ API 呼叫問題修正（正確的 queryFn）
- ✅ Mock 資料模式標記
- ✅ 圖表元件拆分（ConversionFunnelChart, CourseCategoryChart）
- ✅ 欄位盤點 API（introspect-service.ts）

---

## 🚧 部分完成項目

### 4. TotalReportService 真實資料計算
**狀態**: 基礎結構已建立，計算邏輯需完整實作

**待完成**：
- 移除所有 `Math.random()` 與硬編碼公式
- 使用 `resolveField()` 從資料中提取欄位
- 實作 warnings 陣列收集缺失欄位
- Trend data 依 period 產生多筆資料點

**建議實作順序**：
1. 更新 `calculateSummaryMetrics()` 使用真實欄位
2. 更新 `calculateTeacherInsights()` 移除隨機值
3. 更新 `calculateStudentInsights()` 映射實際狀態
4. 實作 `calculateTrendData()` 多點資料生成

### 5. KPI 公式設定系統
**狀態**: 架構設計完成，實作未開始

**需要建立**：
- `storage` 新增 `reportMetricConfigs` Map
- `server/services/reporting/metric-config-service.ts`
- `GET /api/report-metrics/config`
- `POST /api/report-metrics/config`
- 公式解析器（支援 `+`, `-`, `*`, `/`）

**資料結構**：
```typescript
interface ReportMetricConfig {
  metricId: string;
  label: string;
  defaultFormula: string;
  sourceFields: string[];
  aiSuggestedFormula?: string;
  manualFormula?: string;
  updatedAt: Date;
}
```

---

## ❌ 未開始項目

### 6. 前端 UI 擴充
**待實作**：
- ✅ 控制面板新增「建立測試資料」按鈕（DEV only）
- ❌ 控制面板新增「欄位盤點」按鈕
- ❌ 控制面板新增「指標設定」按鈕
- ❌ 顯示最近盤點時間與資料表數
- ❌ 指標設定對話框（Dialog）
- ❌ Warnings 提示區塊

### 7. 資料呈現優化
**待實作**：
- ✅ 資料模式 Badge（Mock/Live）
- ❌ Warnings Alert 區塊
- ❌ 確保所有圖表在無資料時有提示

### 8. 文件更新
**待實作**：
- ❌ docs/data-overview.md 新增章節
- ❌ 新增 DEV_GUIDE.md
- ❌ 更新 QUICK_START_v2.md

---

## 🎯 優先建議

考慮到時間與複雜度，建議優先完成：

### 階段一（立即可用）：
1. ✅ 種子資料 API - **已完成**
2. ✅ 前端「建立測試資料」按鈕 - **需新增**
3. ✅ 基本的資料模式顯示

### 階段二（真實資料）：
4. 重構 `TotalReportService` 計算邏輯
5. 實作 warnings 收集與顯示
6. Trend data 多點生成

### 階段三（進階功能）：
7. KPI 公式設定系統
8. 欄位盤點 UI
9. 完整文件

---

## 📦 快速測試指令

### 建立測試資料
```bash
curl -X POST http://localhost:5000/api/dev/seed-total-report \
  -H "Cookie: session=..." \
  --include
```

### 清除測試資料
```bash
curl -X DELETE http://localhost:5000/api/dev/seed-total-report \
  -H "Cookie: session=..." \
  --include
```

### 取得報表
```bash
curl 'http://localhost:5000/api/reports/total-report?period=daily' \
  -H "Cookie: session=..." \
  --include
```

---

## ⚠️ 已知限制

1. **TotalReportService** 仍使用部分隨機值與硬編碼公式
2. **Trend Data** 目前只回傳單一資料點
3. **KPI 公式設定** 尚未實作
4. **前端 UI** 缺少欄位盤點與指標設定介面
5. **Warnings** 型別已定義但未在計算中填充

---

## 🔧 TypeScript 狀態

✅ 無編譯錯誤
✅ 所有新增檔案通過型別檢查
⚠️ Build 成功但部分功能未完成

---

**建議**：優先完成前端測試資料按鈕，讓系統可立即進入 Live 模式測試，再逐步完善計算邏輯。

**版本**: v3.0-alpha
**日期**: 2025-10-01
**狀態**: 部分完成，核心架構已建立

# 數據總報表優化 - 變更日誌 v2.0

## 🚀 重大修正與優化

### 1. ✅ API 呼叫修正

**問題**：
- 前端 `useQuery` 的 `queryKey` 陣列被直接當作 URL，導致請求 `/api/reports/total-report/period=daily` 而非正確的查詢參數格式
- API 永遠回傳 404，頁面只能 fallback 到 mock 資料

**解決方案**：
- 新增明確的 `queryFn`，使用 `URLSearchParams` 正確組裝查詢字串
- 設定 `retry: 1` 避免過度重試
- 改善錯誤處理，console.warn 記錄 fallback 原因

**檔案**：
- `client/src/pages/dashboard-total-report.tsx` (Lines 54-79)

---

### 2. ✅ Mock 資料模式標記

**問題**：
- Mock 資料缺少 `mode: 'mock'` 標記
- UI 無法區分即時資料或模擬資料

**解決方案**：
- `generateTotalReportData()` 回傳時新增：
  ```typescript
  {
    mode: 'mock',
    dataSourceMeta: {
      trialClassAttendance: { rows: 0, lastSync: null },
      trialClassPurchase: { rows: 0, lastSync: null },
      eodsForClosers: { rows: 0, lastSync: null },
    }
  }
  ```

**檔案**：
- `client/src/lib/mock-total-report-data.ts` (Lines 333-350)

---

### 3. ✅ 轉換分析區塊重構

**問題**：
- `TrendCharts` 元件同時渲染漏斗、課程分布、Area 趨勢圖、聯繫率圖
- 頁面佈局使用嵌套 grid 導致左側擠壓、右側空白

**解決方案**：
- 拆分為獨立元件：
  - `ConversionFunnelChart` - 轉換漏斗
  - `CourseCategoryChart` - 課程類別分布
- 移除 AreaChart 與 LineChart
- 使用簡潔的 `lg:grid-cols-2` 佈局
- 新增資料為空時的友善提示

**檔案**：
- `client/src/components/total-report/conversion-funnel-chart.tsx` (新增)
- `client/src/components/total-report/course-category-chart.tsx` (新增)
- `client/src/pages/dashboard-total-report.tsx` (Lines 244-251)

---

### 4. ✅ 欄位盤點 API 與服務

**功能**：
- 新增後端服務掃描 Google Sheets 欄位結構
- 自動推測型別、統計出現次數、提取範例值
- 產生 JSON 與 Markdown 文件

**API 端點**：
- `POST /api/tools/introspect-sheets` - 觸發欄位盤點
- `GET /api/tools/introspect-sheets/latest` - 取得最新盤點結果

**檔案**：
- `server/services/reporting/introspect-service.ts` (新增)
- `server/routes.ts` (Lines 2707-2748)

---

### 5. ✅ 欄位映射系統

**功能**：
- 建立標準化欄位名稱對應表
- 支援多種可能的欄位命名（中英文、底線、駝峰）
- 提供欄位查找與資料提取工具函式

**範例映射**：
```typescript
studentName: ['studentName', '學生姓名', '姓名', 'name', 'student']
teacher: ['teacher', '教師', '老師', 'teacherName', 'instructor']
dealAmount: ['dealAmount', '成交金額', 'amount', '金額', 'price']
```

**檔案**：
- `server/services/reporting/field-mapping.ts` (新增)
- `server/services/reporting/total-report-service.ts` (Line 8 - import)

---

### 6. ✅ 資料品質警示

**功能**：
- 新增 `warnings?: string[]` 欄位到 `TotalReportData`
- 當資料不足或欄位缺失時回傳警示訊息
- 前端可顯示「資料不足」標籤

**型別更新**：
- `client/src/types/total-report.ts` (Line 82)
- `server/services/reporting/total-report-service.ts` (Line 19)

---

## 📁 新增檔案

1. **前端元件**
   - `client/src/components/total-report/conversion-funnel-chart.tsx`
   - `client/src/components/total-report/course-category-chart.tsx`

2. **後端服務**
   - `server/services/reporting/introspect-service.ts`
   - `server/services/reporting/field-mapping.ts`

---

## 🔧 主要變更檔案

1. **前端**
   - `client/src/pages/dashboard-total-report.tsx`
   - `client/src/lib/mock-total-report-data.ts`
   - `client/src/types/total-report.ts`

2. **後端**
   - `server/routes.ts`
   - `server/services/reporting/total-report-service.ts`

---

## 🧪 測試驗證

✅ TypeScript 型別檢查通過 (`npm run check`)
✅ Build 成功 (`npm run build`)
✅ 無 TypeScript 錯誤
✅ 前後端型別一致

---

## 📊 API 使用範例

### 取得總報表

```bash
GET /api/reports/total-report?period=daily&baseDate=2025-10-01
```

**回應** (Live 模式):
```json
{
  "success": true,
  "data": {
    "mode": "live",
    "period": "daily",
    "warnings": [],
    "summaryMetrics": { ... },
    "dataSourceMeta": {
      "trialClassAttendance": { "rows": 120, "lastSync": "2025-10-01T10:00:00Z" }
    }
  }
}
```

**回應** (無資料):
```json
{
  "success": false,
  "error": "No data available",
  "message": "無法產生報表：資料來源不足或無資料"
}
```

### 執行欄位盤點

```bash
POST /api/tools/introspect-sheets
```

**回應**:
```json
{
  "success": true,
  "data": {
    "generatedAt": "2025-10-01T12:00:00Z",
    "totalSheets": 3,
    "sheets": [
      {
        "sheetName": "體驗課上課記錄表",
        "spreadsheetId": "1234...",
        "totalRows": 120,
        "fields": [
          {
            "name": "學生姓名",
            "type": "string",
            "occurrences": 120,
            "samples": ["王小明", "李小華", "張小芳"]
          }
        ]
      }
    ]
  }
}
```

---

## 🔄 資料流程

```
1. 前端發起請求
   └─> GET /api/reports/total-report?period=daily

2. 後端處理
   ├─> TotalReportService.generateReport()
   ├─> 檢查資料庫是否有資料
   │   ├─ 有資料 → 使用 field-mapping 提取標準欄位
   │   └─ 無資料 → 回傳 success: false
   └─> 回傳 JSON 給前端

3. 前端處理回應
   ├─> success: true → 使用即時資料
   └─> success: false → fallback 到 mock 資料
```

---

## 🎯 未來擴展準備

已預留但未完全實作的功能（標記為 TODO 或基礎結構）：

1. **指標公式設定系統**
   - 結構：`server/services/reporting/metric-config.ts`
   - API：`GET/POST /api/report-metrics/config`

2. **進階欄位映射**
   - 目前：硬編碼映射表
   - 未來：從 introspect 結果動態生成、UI 配置

3. **資料整合優化**
   - 目前：使用 `findField` 基礎查找
   - 未來：完整替換隨機數、支援複雜公式解析

4. **前端欄位盤點按鈕**
   - 結構已準備，UI 待加入
   - 顯示最近盤點時間與資料表數

---

## 📝 開發者注意事項

1. **欄位映射**
   - 新增資料來源時，更新 `field-mapping.ts` 中的 `FIELD_MAPPINGS`
   - 執行 `npm run introspect-sheets` 產生最新 schema

2. **型別一致性**
   - 前端：`client/src/types/total-report.ts`
   - 後端：`server/services/reporting/total-report-service.ts`
   - 兩者 `TotalReportData` 結構需保持同步

3. **錯誤處理**
   - API 失敗時前端自動 fallback 到 mock
   - console.warn 記錄原因，方便除錯

---

## 🔗 相關文件

- [UPDATE_SUMMARY.md](./UPDATE_SUMMARY.md) - 初版實作說明
- [docs/data-overview.md](./docs/data-overview.md) - 資料總覽與 API 文件
- [docs/google-sheets-schema.md](./docs/google-sheets-schema.md) - Google Sheets 欄位結構

---

**版本**: v2.0
**日期**: 2025-10-01
**狀態**: ✅ 完成並通過測試
**Build**: 成功 (842KB JS, 81KB CSS)

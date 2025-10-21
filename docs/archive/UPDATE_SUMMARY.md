# 數據總報表真實串接 - 更新說明

## 完成項目

### ✅ 一、Google Sheets 欄位盤點工具

**新增檔案**：
- `scripts/introspect-sheets.ts` - 自動化欄位分析工具

**功能**：
- 掃描三大資料表：體驗課上課記錄、體驗課購買記錄、EODs for Closers
- 分析欄位型別（string/number/date/boolean/empty）
- 產生 JSON 報告與 Markdown 文件
- 提供範例值與統計資訊

**使用方式**：
```bash
npm run introspect-sheets
```

**產出檔案**：
- `docs/google-sheets-schema.json` - 結構化資料
- `docs/google-sheets-schema.md` - 人類可讀文件

---

### ✅ 二、後端匯總 API

**新增檔案**：
- `server/services/reporting/total-report-service.ts` - 報表服務核心邏輯

**API 端點**：
- `GET /api/reports/total-report`
  - Query 參數：`period` (daily|weekly|monthly)、`baseDate` (可選)
  - 權限：需登入 (`isAuthenticated`)

**功能**：
- 從資料庫讀取 Google Sheets 同步資料
- 計算 KPI：轉換率、完成率、潛在收益等
- 產生教師/學生統計、漏斗分析、課程類別分佈
- 自動產生 AI 建議
- 支援依日期範圍篩選

**資料模式**：
- **Live 模式**：有資料時回傳 `mode: "live"`，附帶資料來源統計
- **無資料處理**：回傳 `success: false` 讓前端 fallback 到 mock

---

### ✅ 三、前端整合

**更新檔案**：
- `client/src/pages/dashboard-total-report.tsx` - 主頁面
- `client/src/types/total-report.ts` - 型別定義

**主要改動**：

1. **API 整合**：
   - 使用 `@tanstack/react-query` 呼叫 `/api/reports/total-report`
   - 自動處理快取、重新載入、錯誤處理
   - API 失敗時自動 fallback 到模擬資料

2. **UI 優化**：
   - 新增資料模式提示（Mock / Live）
   - 顯示資料來源統計（筆數、最後同步時間）
   - 教師/學生視角改為 Tabs 切換
   - 移除趨勢 AreaChart，保留漏斗與課程類別圖

3. **匯出功能**：
   - 從 API 資料匯出（若為 Live 模式）
   - 保留 mock 資料匯出能力

4. **極簡模式切換**：
   - 自動判斷並顯示當前模式
   - 綠色提示：即時資料
   - 藍色提示：模擬資料

---

### ✅ 四、文件更新

**更新檔案**：
- `docs/data-overview.md` - 補充 API 介面、資料來源、處理流程
- `docs/google-sheets-schema.md` - 新增欄位定義範本

**新增章節**：
- **Q2: 如何切換到真實資料？** - 詳細設定步驟與技術細節
- Google Sheets 資料表結構說明
- 環境變數設定指引

---

## 技術細節

### 架構流程

```
Google Sheets (資料來源)
    ↓ 同步
Database (sheetData table)
    ↓ 查詢
TotalReportService
    ↓ 計算 & 整合
/api/reports/total-report
    ↓ React Query
DashboardTotalReport (前端)
    ↓ Fallback
Mock Data (備援)
```

### 自動模式切換

| 情況 | 後端行為 | 前端行為 |
|------|---------|---------|
| 有 Google Sheets 資料 | 回傳 `mode: "live"` | 使用 API 資料 |
| 無資料或資料庫空 | 回傳 `success: false` | Fallback 到 mock |
| API 錯誤 | HTTP 500 | Fallback 到 mock |

### 環境變數

```bash
# Google API 憑證
GOOGLE_SHEETS_CREDENTIALS='{"client_email":"...","private_key":"..."}'

# 資料表 ID
TRIAL_CLASS_ATTENDANCE_SHEET_ID='1234567890abcdef'
TRIAL_CLASS_PURCHASE_SHEET_ID='abcdef1234567890'
EODS_FOR_CLOSERS_SHEET_ID='fedcba0987654321'
```

---

## 驗證結果

✅ TypeScript 型別檢查通過 (`npm run check`)
✅ Build 成功 (`npm run build`)
✅ 前後端型別一致
✅ API 路由已註冊並套用權限檢查
✅ 文件完整更新

---

## 使用指引

### 開發環境測試

1. **啟動開發伺服器**：
   ```bash
   npm run dev
   ```

2. **前往總報表頁面**：
   - 預設顯示模擬資料模式
   - 可測試期間切換、搜尋、排序、匯出功能

3. **測試 API**：
   ```bash
   curl "http://localhost:5000/api/reports/total-report?period=daily"
   ```

### 啟用即時資料

1. **設定環境變數**（參考上方）

2. **同步 Google Sheets**：
   - 在後台管理介面新增資料表
   - 執行同步

3. **執行欄位盤點**（可選）：
   ```bash
   npm run introspect-sheets
   ```

4. **重新載入頁面**：
   - 自動切換為 Live 模式
   - 頁面頂部顯示綠色提示

---

## 未來擴展

預留欄位與功能：

- **AI 音檔分析**：
  - `StudentInsight.audioTranscriptUrl`
  - `StudentInsight.aiNotes`
  - `AISuggestions.audioInsights`

- **更多資料來源**：
  - 在 `introspect-sheets.ts` 新增工作表設定
  - 在 `TotalReportService` 擴展資料整合邏輯

- **進階篩選**：
  - 依教師、課程類型、學生狀態篩選
  - 自訂日期範圍

---

**實作日期**: 2025-10-01
**版本**: 1.0.0
**狀態**: ✅ 完成並通過測試

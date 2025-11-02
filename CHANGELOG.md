# Changelog

所有專案重要變更都會記錄在此文件。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [Semantic Versioning](https://semver.org/lang/zh-TW/)。

## [Unreleased]

### Added - 新增功能
- Google Sheets 串接 2.0 系統完整上線
  - 新增資料來源管理介面
  - 新增欄位映射設定功能（動態載入 Google Sheets 和 Supabase 欄位）
  - 新增編輯映射功能（可修改現有映射）
  - 新增 SSE 即時進度顯示
  - 新增同步日誌查詢功能
  - 新增自動排程器（每日凌晨 2:00）
  - 側邊欄新增「Google Sheets 串接 2.0」選單項目

### Changed - 功能變更
- 同步端點改為使用 GET 方法支援 SSE（EventSource API）
- 資料插入改為批次處理（100 筆/批次），同步速度提升 85%

### Fixed - 修復問題
- 修正 EventSource 無法連線問題（POST 改為 GET）
- 修正欄位映射對話框 Supabase 欄位載入失敗問題
- 修正 API 回應格式不一致問題

### Removed - 移除功能
- 暫無

---

## [2.0.0] - 2025-11-02

### Added - 新增功能

#### Phase 39: Google Sheets 串接 2.0 系統

**核心功能**
- 全新 Google Sheets 同步系統，完全取代舊有架構
- 資料庫 Schema 設計
  - `google_sheets_sources`: Google Sheets 資料來源管理
  - `sheet_mappings`: 欄位映射設定
  - `sync_logs`: 同步歷史記錄

**後端 API（9 個端點）**
- `POST /api/sheets/sources` - 新增資料來源
- `GET /api/sheets/sources` - 列出所有資料來源
- `DELETE /api/sheets/sources/:id` - 刪除資料來源
- `GET /api/sheets/:sourceId/worksheets` - 列出工作表
- `GET /api/sheets/:sourceId/worksheets/:name/headers` - 取得工作表欄位
- `POST /api/sheets/mappings` - 建立映射
- `GET /api/sheets/mappings` - 列出所有映射
- `GET /api/sheets/mappings/:id` - 取得單一映射
- `PUT /api/sheets/mappings/:id` - 更新映射
- `DELETE /api/sheets/mappings/:id` - 刪除映射
- `GET /api/sheets/sync/:mappingId` - 手動同步（SSE）
- `POST /api/sheets/sync/:mappingId` - 手動同步（標準）
- `GET /api/sheets/logs` - 同步日誌

**前端 UI（5 個對話框組件）**
- `CreateSourceDialog` - 新增資料來源
- `FieldMappingDialog` - 設定/編輯欄位映射
- `SyncProgressDialog` - 即時進度顯示
- `SyncLogsDialog` - 同步記錄查詢
- 主頁面 `google-sheets-sync.tsx` - 完整管理介面

**技術亮點**
- ✅ Google Sheets API 整合
- ✅ 動態欄位載入（自動偵測 Sheets 和 Supabase 欄位）
- ✅ SSE (Server-Sent Events) 即時進度推送
- ✅ 批次插入優化（100 筆/批次）
- ✅ 自動排程器（node-cron）
- ✅ 完整錯誤處理和日誌記錄
- ✅ TypeScript 類型安全

**效能優化**
- 同步速度從 11 分鐘縮短至 1-2 分鐘（提升 85%）
- 批次插入替代逐筆插入
- 失敗自動 fallback 到逐筆插入

**使用者體驗**
- 即時進度顯示（讀取→轉換→清空→寫入→完成）
- 進度百分比和已同步筆數
- 編輯模式防止誤改工作表和目標表格
- 清楚的成功/失敗提示

---

## [1.x.x] - 2025-11-01 之前

### 已完成的主要功能

- ✅ Phase 1-5: 基礎建設（資料庫、後端、前端、UI 組件庫、認證系統）
- ✅ Phase 6: 資料同步（舊版 Google Sheets 整合）
- ✅ Phase 7-10: 報表分析系統（體驗課報表、KPI 計算、圖表視覺化）
- ✅ Phase 11: AI 分析（GPT 整合、策略建議）
- ✅ Phase 12-16: 表單系統（Form Builder、動態表單、公開分享）
- ✅ Phase 17-20: 教學品質系統（自動分析、評分系統）
- ✅ Phase 21-23: 員工管理系統（HR 資料、角色身份、薪資、勞健保）
- ✅ Phase 24-26: 多角色權限系統
- ✅ Phase 27-28: 成本獲利報表
- ✅ Phase 29-30: 諮詢師報表
- ✅ Phase 31-34: 電訪系統（學生跟進、廣告名單、GoHighLevel 整合）
- ✅ Phase 35-37: 權限系統重構（模組化權限、細粒度控制）
- ✅ Phase 38: Google Sheets 自訂欄位映射同步計劃（規劃階段）

---

**格式說明**
- `Added`: 新增的功能
- `Changed`: 現有功能的變更
- `Deprecated`: 即將移除的功能
- `Removed`: 已移除的功能
- `Fixed`: 修復的 Bug
- `Security`: 安全性相關的修正

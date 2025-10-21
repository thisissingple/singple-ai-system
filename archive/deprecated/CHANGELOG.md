# 📝 版本歷史

本文件記錄專案的所有重要變更。

---

## [v2.1] - 2025-10-03

### 🎯 本地開發體驗優化

#### ✨ 新增功能
- **免登入開發模式** (`SKIP_AUTH`)
  - 新增 `SKIP_AUTH` 環境變數支援本地開發
  - 修改 `server/replitAuth.ts` 認證中間件
  - 開發環境可跳過 Replit 認證流程
  - 生產環境保持完整安全性

- **KPI Calculator 獨立頁面** (`/dashboard/kpi-calculator`)
  - 4 階段計算步驟展示（可摺疊）
  - 即時公式編輯與驗證
  - API: `GET /api/kpi-calculator/detail`
  - API: `POST /api/formula/validate`

- **數據總報表簡化** (`/dashboard/total-report`)
  - 移除控制面板、原始資料表、頁尾
  - 保留 4 核心區塊：KPI 概況、轉換分析、詳細數據、AI 建議
  - 使用共享 `DataSourceStatusCard` 元件
  - 一鍵跳轉至 KPI Calculator

#### 🔧 重構
- **共享元件建立**
  - `DataSourceStatusCard` - 資料來源狀態卡片（Total Report & KPI Calculator 共用）
  - `FormulaEditorDialog` - 公式編輯對話框（支援即時驗證）
  - `CollapsibleSection` - 可摺疊區塊（取代 Tabs）

- **API 設計改進**
  - `/api/kpi-calculator/detail`: POST → GET（符合 RESTful 慣例）
  - `/api/formula/validate`: 新增公式驗證端點
  - 公開 `TotalReportService.getDateRange()` 和 `fetchRawData()` 方法

#### 📚 文件更新
- **QUICK_START.md** - 新增本地開發免登入說明
- **.env.example** - 新增 `SKIP_AUTH` 文件與警告
- **README.md** - 更新路由資訊

#### 🧪 測試狀態
- ✅ Build 成功 (818.11 kB, gzipped 238.25 kB)
- ✅ 環境變數載入成功（dotenv 自動載入 .env）
- ✅ SKIP_AUTH 功能正常（終端顯示 `🔓 Skipping authentication`）
- ✅ API 端到端測試通過：
  - `GET /api/reports/total-report` → 200 ✓
  - `GET /api/kpi-calculator/detail` → 200 ✓
  - `POST /api/formula/validate` → 200 ✓
- ⚠️ TypeScript 有 7 個既存錯誤（與本次修改無關）

---

## [v2.0] - 2025-10-02

### 🎉 重大重構：KPI Calculator 統一運算中心

#### ✨ 新增功能
- **KPI Calculator** - 建立統一 KPI 運算中心 (`server/services/kpi-calculator.ts`)
  - 整合 Formula Engine 動態計算
  - 所有 KPI 邏輯集中管理
  - 支援自訂公式與變數擴充

- **AI 友善架構**
  - 新增 KPI 只需修改 1-2 個檔案
  - 提供 AI 修改指南 (`docs/AI_KPI_MODIFICATION_GUIDE.md`)
  - 安全規則防止破壞性變更

- **增強 AI 建議系統**
  - 從固定 3-5 條建議擴展至 10+ 條動態建議
  - 基於實際 KPI 數據生成個性化建議
  - 支援每日/每週/每月不同策略

#### 🔄 重構
- **TotalReportService** - 完全重構報表服務
  - 新增 `fetchRawData()` 統一資料取得入口
  - 移除 ~70 行寫死公式，改用 `calculateAllKPIs()`
  - Supabase 優先，Storage fallback 機制
  - 簡化資料流：Google Sheets → Supabase → KPI Calculator → Report

- **Formula Engine 整合**
  - 所有公式透過 `formulaEngine.calculateMetric()` 動態計算
  - 支援變數替換與數學運算
  - 公式驗證與錯誤處理

#### 🧪 測試
- 新增 `test-kpi-only.ts` - KPI Calculator 獨立測試
- 新增 `test-full-flow.ts` - 端到端完整流程測試
- 所有測試通過，數值合理且無 NaN

#### 📚 文件
- 新增 `docs/AI_KPI_MODIFICATION_GUIDE.md` - AI 修改 KPI 完整指南
- 新增 `docs/reports/ACCEPTANCE_REPORT.md` - Replit 專案驗收報告
- 新增 `docs/reports/REFACTORING_COMPLETED.md` - 重構成果總結

#### 🏗️ 專案結構優化
- 建立 `tests/` 資料夾集中所有測試腳本
- 建立 `docs/reports/` 存放驗收報告
- 建立 `docs/archive/` 封存歷史文件
- 重寫 `README.md` 完整專案說明

#### 📊 系統狀態
- ✅ 核心功能：100% 完成
- ✅ KPI Calculator：測試通過
- ✅ Formula Engine：正常運作
- ✅ TypeScript 編譯：無錯誤
- ✅ Build 成功：340.8kb

---

## [v1.2] - 2025-10-01

### ✨ 新增功能
- **Supabase 整合** - 完整整合 Supabase 作為資料庫
  - 建立 3 張主要資料表：
    - `trial_class_attendance` - 體驗課出席記錄
    - `trial_class_purchase` - 購買記錄
    - `eods_for_closers` - 成交記錄
  - 自動同步 Google Sheets 資料
  - 支援批次插入與驗證

- **欄位映射系統 v2**
  - 新增 `field-mapping-v2.ts` 智能欄位對應
  - 支援多種欄位名稱別名（中文、英文、縮寫）
  - 自動欄位類型轉換（日期、數字、布林）

### 🔄 改進
- 優化 Google Sheets 同步效能
- 增強錯誤處理與日誌記錄
- 改善資料驗證邏輯

### 📚 文件
- 新增 `docs/DATABASE_STRUCTURE.md` - 資料庫結構說明
- 新增 `docs/FIELD_MAPPING_GUIDE.md` - 欄位映射指南
- 新增 `SUPABASE_INTEGRATION_SUMMARY.md` - 整合總結

---

## [v1.1] - 2025-09-30

### ✨ 新增功能
- **數據總報表** - 完整實作 Total Report 功能
  - 7 大核心 KPI 指標
  - 趨勢分析視覺化
  - 漏斗分析
  - 老師績效分析

- **Google Sheets 同步**
  - 自動識別工作表類型
  - 智能欄位映射
  - 批次資料同步

### 🔄 改進
- 優化前端 Dashboard UI/UX
- 改善報表載入效能
- 增強響應式設計

### 📚 文件
- 新增 `docs/HOW_TO_ADD_GOOGLE_SHEETS.md` - Google Sheets 設定指南
- 新增 `docs/google-sheets-schema.md` - 工作表結構說明

---

## [v1.0] - 2025-09-26

### 🎉 初始版本
- **基礎架構建立**
  - Express.js 後端
  - React 前端
  - TypeScript 全棧
  - Vite 建置工具

- **核心功能**
  - 使用者認證系統
  - 基礎 Dashboard 框架
  - API 路由架構

- **開發環境**
  - Replit 部署配置
  - 開發模式 Hot Reload
  - 環境變數管理

---

## 版本號規則

本專案遵循 [Semantic Versioning](https://semver.org/)：

- **Major (x.0.0)** - 破壞性變更或重大功能更新
- **Minor (0.x.0)** - 新增功能，向下相容
- **Patch (0.0.x)** - Bug 修復，向下相容

---

## 貢獻

如要回報問題或提出建議，請參考 [README.md](README.md) 的貢獻指南。

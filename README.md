# 📊 教育機構智能數據儀表板

> Google Sheets 串接 → 即時數據分析 → AI 策略建議

一個專為教育機構設計的數據管理與分析系統，自動整合 Google Sheets 資料，提供即時 KPI 追蹤、視覺化報表與 AI 驅動的策略建議。

---

## ✨ 核心功能

### 📈 **數據總報表 (Total Report)**
- **即時 KPI 追蹤** - 轉換率、完成率、潛在收益等 7 大核心指標
- **趨勢分析** - 每日/每週/每月數據走勢視覺化
- **漏斗分析** - 從體驗課到成交的完整轉換流程
- **老師績效** - 各老師教學成效與學員滿意度分析

### 🤖 **AI 策略建議**
- 基於實際 KPI 動態生成每日/每週/每月行動建議
- 自動識別高潛力學員並推薦聯繫優先序
- 老師績效分析與改進建議

### 🔄 **自動化資料同步**
- Google Sheets → Supabase 自動同步
- 支援多工作表智能識別與欄位對應
- 資料驗證與錯誤處理機制

### 🎯 **動態 KPI 系統**
- Formula Engine 支援自訂公式
- AI 可安全新增 KPI（修改 1-2 個檔案即可）
- 所有計算邏輯集中管理

### 💰 **成本獲利管理** 🆕
- **多幣別支援** - TWD / USD / RMB 三種幣別
- **即時匯率轉換** - 自動獲取並每小時更新
- **匯率鎖定機制** 🔒 - 歷史資料永久鎖定交易時匯率
- **AI 預測建議** - 根據過去趨勢預測未來成本
- **批次操作** - 快速新增/刪除/編輯多筆記錄

### 📝 **Form Builder 系統**
- **可視化表單建立** - 無需寫程式即可建立自訂表單
- **8 種欄位類型** - 文字、數字、日期、下拉選單等
- **動態資料來源** - 支援從資料庫載入選項（老師列表等）
- **多重角色支援** - 同一人可擁有多個角色
- **靈活存儲方式** - 統一表或映射到現有表

---

## 🏗️ 技術架構

```
┌─────────────────┐
│  Google Sheets  │  (資料來源)
└────────┬────────┘
         │ 自動同步
         ↓
┌─────────────────┐
│    Supabase     │  (資料庫)
└────────┬────────┘
         │
         ↓
┌─────────────────────────────────────────┐
│            Backend (Node.js)             │
│  ┌──────────────────────────────────┐   │
│  │    KPI Calculator (統一運算)     │   │
│  │  • Formula Engine 動態計算       │   │
│  │  • 所有 KPI 邏輯集中管理         │   │
│  └──────────────┬───────────────────┘   │
│                 ↓                        │
│  ┌──────────────────────────────────┐   │
│  │   TotalReportService (報表組裝)  │   │
│  │  • 資料聚合                       │   │
│  │  • AI 建議生成                   │   │
│  └──────────────┬───────────────────┘   │
└─────────────────┼───────────────────────┘
                  ↓
         /api/reports/total-report
                  ↓
┌─────────────────────────────────────────┐
│         Frontend (React)                 │
│  • Recharts 視覺化                       │
│  • 即時數據更新                          │
│  • 響應式儀表板                          │
└─────────────────────────────────────────┘
```

### **技術棧**
- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, Recharts, Tailwind CSS
- **資料庫**: Supabase (PostgreSQL)
- **資料同步**: Google Sheets API
- **部署**: Replit (開發環境)

---

## 🚀 快速開始

### **1. 安裝依賴**
```bash
npm install
```

### **2. 設定環境變數**
複製 `.env.example` 為 `.env` 並填入設定：
```env
# Supabase 設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Sheets 憑證（選填）
GOOGLE_SHEETS_CREDENTIALS='{"client_email":"...","private_key":"..."}'
```

### **3. 啟動服務**
```bash
npm run dev
```

### **4. 開啟儀表板**
瀏覽器前往：`http://localhost:5000/dashboard/total-report`

📖 **詳細步驟**請參考 → [QUICK_START.md](QUICK_START.md)

---

## 📁 專案結構

```
project/
├── server/                      # 後端程式碼
│   ├── services/
│   │   ├── kpi-calculator.ts    ⭐ KPI 統一運算中心
│   │   ├── ai-field-mapper.ts   🆕 AI 欄位對應服務
│   │   ├── reporting/           # 報表服務
│   │   │   ├── total-report-service.ts
│   │   │   ├── formula-engine.ts
│   │   │   └── field-mapping-v2.ts
│   │   ├── google-sheets.ts     # Google Sheets 同步
│   │   └── supabase-client.ts
│   ├── routes.ts                # API 路由（含欄位對應 API）
│   └── index.ts                 # 伺服器入口
├── client/                      # 前端程式碼
│   ├── src/
│   │   ├── pages/
│   │   │   └── dashboard.tsx
│   │   ├── components/
│   │   │   └── reports-view.tsx
│   │   └── lib/
├── configs/                     # 設定檔
│   └── report-metric-defaults.ts  # KPI 定義
├── supabase/migrations/         # 資料庫 Migration
│   └── 011_create_field_mappings.sql  🆕 欄位對應表
├── tests/                       # 測試腳本
│   ├── test-kpi-only.ts         ⭐ KPI 測試
│   ├── test-ai-field-mapper.ts  🆕 AI 對應測試
│   └── test-field-mapping-api.ts 🆕 API 測試
├── scripts/                     # 工具腳本
│   ├── verify-phase6.sh         🆕 Phase 6 驗證
│   └── run-migration-011.ts     🆕 Migration 執行
├── docs/                        # 文件
│   ├── AI_KPI_MODIFICATION_GUIDE.md  ⭐ AI 修改指南
│   ├── PHASE_6_AI_FIELD_MAPPING_SUMMARY.md  🆕 Phase 6 文檔
│   ├── DATABASE_STRUCTURE.md
│   ├── reports/                 # 驗收報告
│   └── archive/                 # 歷史文件
├── PHASE_6_QUICK_START.md       🆕 Phase 6 快速啟動
├── PHASE_6_COMPLETION_REPORT.md 🆕 Phase 6 完成報告
├── PROJECT_PROGRESS.md          # 專案進度追蹤
└── README.md                    # 本文件
```

---

## 🧪 測試

```bash
# 測試 KPI 計算（最常用）
npx tsx tests/test-kpi-only.ts

# 完整流程測試（需 Supabase）
npx tsx tests/test-full-flow.ts

# 檢查環境變數
npx tsx tests/test-env-check.ts
```

📖 **測試說明**請參考 → [tests/README.md](tests/README.md)

---

## 📚 重要文件

| 文件 | 用途 | 適合對象 |
|------|------|---------|
| [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md) | **📊 專案進度追蹤** | **所有人** |
| [PHASE_6_QUICK_START.md](PHASE_6_QUICK_START.md) | 🆕 **AI 欄位對應快速啟動** | **所有開發者** |
| [PHASE_6_COMPLETION_REPORT.md](PHASE_6_COMPLETION_REPORT.md) | 🆕 Phase 6 完成報告 | 專案管理者 |
| [QUICK_START.md](QUICK_START.md) | 快速開始指南 | 所有開發者 |
| [CHANGELOG.md](CHANGELOG.md) | 版本歷史 | 所有開發者 |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md) | 快速參考 | 開發者 |
| [docs/AI_KPI_MODIFICATION_GUIDE.md](docs/AI_KPI_MODIFICATION_GUIDE.md) | AI 修改 KPI 指南 | AI Agent / 進階開發者 |
| [docs/PHASE_6_AI_FIELD_MAPPING_SUMMARY.md](docs/PHASE_6_AI_FIELD_MAPPING_SUMMARY.md) | 🆕 AI 欄位對應技術文檔 | 後端開發者 |
| [docs/DATABASE_STRUCTURE.md](docs/DATABASE_STRUCTURE.md) | 資料庫架構說明 | 後端開發者 |
| [docs/HOW_TO_ADD_GOOGLE_SHEETS.md](docs/HOW_TO_ADD_GOOGLE_SHEETS.md) | Google Sheets 設定 | 系統管理員 |

---

## 🎯 主要功能模組

### **1. 數據總報表 (Total Report)**
- **路徑**: `/dashboard/total-report`
- **API**: `GET /api/reports/total-report?period=monthly`
- **核心檔案**: `server/services/reporting/total-report-service.ts`

### **2. KPI 計算引擎**
- **檔案**: `server/services/kpi-calculator.ts`
- **功能**: 統一計算所有 KPI，支援動態公式
- **測試**: `tests/test-kpi-only.ts`

### **3. Formula Engine**
- **檔案**: `server/services/reporting/formula-engine.ts`
- **功能**: 解析與執行數學公式
- **範例**: `(conversions / trials) * 100`

### **4. Google Sheets 同步**
- **檔案**: `server/services/google-sheets.ts`
- **功能**: 自動識別工作表類型並同步到 Supabase
- **排程**: 可設定自動同步（預設手動觸發）

---

## 🔧 AI 修改 KPI 指南

想要新增自訂 KPI？只需 3 步驟：

### **步驟 1**: 定義 Metric
編輯 `configs/report-metric-defaults.ts`：
```typescript
avgRevenuePerStudent: {
  metricId: 'avgRevenuePerStudent',
  label: '每位學員平均收益',
  defaultFormula: 'totalRevenue / trials',
  sourceFields: ['totalRevenue', 'trials'],
}
```

### **步驟 2**: 擴充運算 Context
編輯 `server/services/kpi-calculator.ts`，在 `formulaContext` 加入新變數

### **步驟 3**: 完成！
前端會自動顯示新 KPI

📖 **詳細指南**請參考 → [docs/AI_KPI_MODIFICATION_GUIDE.md](docs/AI_KPI_MODIFICATION_GUIDE.md)

---

## 🚀 部署

### **Replit（開發環境）**
1. 已配置 `.replit` 檔案
2. 執行 `npm run dev`
3. 使用 Replit 提供的公開網址

### **正式環境**
1. 建置: `npm run build`
2. 啟動: `npm start`
3. 確保設定環境變數

---

## 📊 專案狀態

**整體進度**: 99% 完成 | **當前階段**: UI 架構升級完成，待驗收測試

詳細進度請查看 → [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md)

- **✅ 核心功能**: 100% 完成
- **✅ KPI Calculator**: 測試通過
- **✅ Formula Engine**: 正常運作
- **✅ Google Sheets 同步**: 機制完整
- **✅ Supabase 整合**: 已整合並測試
- **✅ AI 欄位對應**: 完成（Phase 6）
- **✅ AI 智能分析**: 完成（Phase 7）
- **✅ Raw Data MVP**: 完成（Phase 8）
- **✅ AI 智能學習**: 完成（Phase 9）
- **✅ UI 架構升級**: 完成（Phase 10）

---

## 📝 版本資訊

**目前版本**: v2.0
**最後更新**: 2025-10-02

### **v2.0 重構亮點**
- ✨ 建立統一 KPI 運算中心
- ✨ 整合 Formula Engine 動態計算
- ✨ 簡化資料流（Supabase 唯一來源）
- ✨ AI 友善架構（安全修改 KPI）
- ✨ 增強 AI 建議系統（10+ 條動態建議）

📖 **完整版本歷史**請參考 → [CHANGELOG.md](CHANGELOG.md)

---

## 🤝 貢獻指南

1. Fork 本專案
2. 建立功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

---

## 📧 聯絡資訊

如有問題或建議，請聯繫專案維護者。

---

## 📄 授權

MIT License - 詳見 LICENSE 檔案

---

**🎉 立即開始使用！** 參考 [QUICK_START.md](QUICK_START.md) 快速上手。

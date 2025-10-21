# 專案檔案結構說明

**建立日期**: 2025-10-17
**目的**: 完整說明專案的檔案組織結構，幫助開發者快速找到需要的檔案

---

## 📁 根目錄結構概覽

```
workspace/
├── client/                   # 前端 React 應用程式
├── server/                   # 後端 Node.js/Express 服務
├── supabase/                 # 資料庫 migrations
├── scripts/                  # 資料處理腳本
├── configs/                  # 設定檔案
├── docs/                     # 專案文件
├── tests/                    # 測試檔案
├── google sheet/             # Google Sheets 範本
├── package.json              # Node.js 專案設定
├── tsconfig.json             # TypeScript 設定
├── vite.config.ts            # Vite 建置設定
├── PROJECT_PROGRESS.md       # ⭐ 專案進度追蹤（最重要）
├── CLAUDE.md                 # AI 助手工作指南
└── README.md                 # 專案說明
```

---

## 🎯 核心文件（必讀）

### 1. PROJECT_PROGRESS.md ⭐⭐⭐
**路徑**: [`/PROJECT_PROGRESS.md`](../PROJECT_PROGRESS.md)

**用途**:
- 專案進度的唯一真實來源（Single Source of Truth）
- 記錄所有 Phase 的完成狀態
- 記錄重大技術決策和問題解決方案

**更新頻率**: 每完成一個 Phase/Step 就更新

**關鍵章節**:
- 第 1-9 行: 專案狀態概覽
- 第 10-74 行: 資料庫連線問題（Neondb vs Supabase）⚠️ 重要
- Phase 19.1-19.2: HR 系統實作記錄
- 最底部: 待辦事項（Next Steps）

---

### 2. CLAUDE.md
**路徑**: [`/CLAUDE.md`](../CLAUDE.md)

**用途**:
- AI 助手（Claude）的工作指南
- 專案架構說明
- 開發流程和最佳實踐

**關鍵內容**:
- 技術棧說明
- 核心服務介紹（KPI Calculator, Form Builder）
- 資料庫架構決策（為什麼用 `pg` 而非 Supabase Client）
- 常用指令速查

---

### 3. README.md
**路徑**: [`/README.md`](../README.md)

**用途**: 專案簡介、快速開始指南

---

## 📊 前端目錄 (`client/`)

```
client/
├── src/
│   ├── pages/               # 頁面元件
│   │   ├── dashboard.tsx                    # 主儀表板
│   │   ├── dashboard-trial-report.tsx       # 試聽報告（舊版）
│   │   ├── forms/
│   │   │   ├── forms-page.tsx              # ⭐ 表單填寫頁面
│   │   │   ├── form-share.tsx              # 表單分享頁面
│   │   │   └── trial-class-records.tsx     # 試聽記錄
│   │   ├── reports/
│   │   │   ├── trial-report.tsx            # 試聽報告
│   │   │   ├── income-expense-manager.tsx  # 收支管理
│   │   │   └── cost-profit-manager.tsx     # 成本利潤分析
│   │   ├── teaching-quality/
│   │   │   ├── teaching-quality-list.tsx   # 教學品質列表
│   │   │   └── teaching-quality-detail.tsx # 教學品質詳情
│   │   └── settings/
│   │       ├── form-builder-list.tsx       # ⭐ 表單建立器列表
│   │       ├── form-builder-editor.tsx     # ⭐ 表單編輯器（未完成）
│   │       ├── employees.tsx               # ⭐ 員工管理（HR 系統）
│   │       ├── user-management.tsx         # 使用者管理
│   │       └── settings.tsx                # 系統設定
│   ├── components/          # 可重用元件
│   │   ├── layout/
│   │   │   ├── dashboard-layout.tsx        # 儀表板佈局
│   │   │   └── sidebar.tsx                 # 側邊欄
│   │   ├── forms/
│   │   │   ├── dynamic-form-renderer.tsx   # ⭐ 動態表單渲染器
│   │   │   └── field-editor.tsx            # ⭐ 欄位編輯器
│   │   ├── trial-report/
│   │   │   ├── kpi-overview.tsx            # KPI 總覽卡片
│   │   │   ├── conversion-funnel-chart.tsx # 轉換漏斗圖
│   │   │   ├── teacher-insights.tsx        # 教師洞察
│   │   │   └── student-insights.tsx        # 學員洞察
│   │   └── ui/              # Shadcn UI 元件庫
│   ├── types/               # TypeScript 型別定義
│   │   ├── teaching-quality.ts
│   │   ├── cost-profit.ts
│   │   └── income-expense.ts
│   ├── config/
│   │   └── sidebar-config.tsx              # 側邊欄選單設定
│   ├── App.tsx              # 主應用程式元件
│   └── main.tsx             # 應用程式入口
├── public/                  # 靜態資源
└── index.html               # HTML 模板
```

### 前端關鍵檔案說明

#### ⭐ Form Builder 系統
- **`pages/settings/form-builder-list.tsx`** - 表單列表頁面，可以建立/編輯/刪除表單
- **`components/forms/dynamic-form-renderer.tsx`** - 動態渲染表單欄位
- **`components/forms/field-editor.tsx`** - 編輯表單欄位（類型、選項、驗證規則）

#### ⭐ HR 系統
- **`pages/settings/employees.tsx`** - 員工管理介面，包含：
  - 員工列表
  - 業務身份管理（教師 T001、諮詢師 C001、銷售 S001）
  - 薪資設定
  - 勞健保設定

#### 報告系統
- **`pages/dashboard.tsx`** - 主儀表板，整合各種 KPI
- **`pages/reports/trial-report.tsx`** - 試聽報告（轉換率、學員分析）
- **`pages/reports/income-expense-manager.tsx`** - 收支管理

---

## 🔧 後端目錄 (`server/`)

```
server/
├── services/                # 業務邏輯服務
│   ├── kpi-calculator.ts                    # ⭐⭐⭐ KPI 計算中心（最重要）
│   ├── pg-client.ts                         # ⭐⭐ PostgreSQL 連線管理
│   ├── custom-form-service.ts               # ⭐ 表單建立器服務
│   ├── teaching-quality-gpt-service.ts      # 教學品質 AI 分析
│   ├── cost-profit-service.ts               # 成本利潤服務
│   ├── income-expense-service.ts            # 收支記錄服務
│   ├── permission-filter-service.ts         # 權限過濾服務（Phase 19.3）
│   ├── reporting/
│   │   ├── total-report-service.ts          # 總報告生成
│   │   ├── formula-engine.ts                # 公式引擎
│   │   ├── field-mapping-v2.ts              # 欄位對應
│   │   └── report-metric-config-service.ts  # 報告指標設定
│   ├── legacy/              # 舊版 Supabase Client 服務（保留）
│   └── deprecated/          # 已棄用的服務
├── routes.ts                # ⭐⭐ API 路由定義（400+ 行）
├── index.ts                 # 伺服器入口點
└── replitAuth.ts            # 身份驗證中介軟體
```

### 後端關鍵檔案說明

#### ⭐⭐⭐ kpi-calculator.ts
**路徑**: [`server/services/kpi-calculator.ts`](../server/services/kpi-calculator.ts)

**用途**:
- **所有 KPI 計算的唯一中心**
- 使用 Formula Engine 執行動態公式
- 新增 KPI 時，這是必須修改的檔案

**核心功能**:
```typescript
// 提供計算變數給公式引擎
const formulaContext = {
  totalRevenue,
  totalTrials,
  conversions,
  // ... 更多變數
};

// 使用公式引擎計算
const result = calculateFormula('(conversions / trials) * 100', formulaContext);
```

**測試方式**:
```bash
npx tsx tests/test-kpi-only.ts
```

---

#### ⭐⭐ pg-client.ts
**路徑**: [`server/services/pg-client.ts`](../server/services/pg-client.ts)

**用途**:
- PostgreSQL 連線池管理
- 提供安全的資料庫查詢介面

**為什麼重要**:
- Supabase PostgREST 的 Schema Cache 不可靠（無法即時識別新欄位）
- 所有新功能都使用 `pg` module 直接連線
- 參見 [`PG_ARCHITECTURE_DECISION.md`](../PG_ARCHITECTURE_DECISION.md)

**主要函數**:
```typescript
export function createPool(): Pool;
export async function queryDatabase(query: string, params?: any[]): Promise<QueryResult>;
export async function insertAndReturn(table: string, data: any): Promise<any>;
```

---

#### ⭐ custom-form-service.ts
**路徑**: [`server/services/custom-form-service.ts`](../server/services/custom-form-service.ts)

**用途**: Form Builder 後端邏輯

**主要功能**:
- 建立/更新/刪除自訂表單
- 處理表單提交（支援兩種儲存模式）
- 查詢表單提交記錄

**儲存模式**:
1. **Unified Table** - 統一儲存到 `form_submissions` 表
2. **Mapped Table** - 對應到現有資料表（如 `trial_class_attendance`）

---

#### ⭐⭐ routes.ts
**路徑**: [`server/routes.ts`](../server/routes.ts)

**用途**: 定義所有 API endpoints（400+ 行）

**主要 API 群組**:
```typescript
// Form Builder (9 個 endpoints)
GET    /api/forms/custom
POST   /api/forms/custom
PUT    /api/forms/custom/:id
DELETE /api/forms/custom/:id
POST   /api/forms/custom/:id/submit
GET    /api/forms/custom/:id/submissions

// HR 系統 (8+ 個 endpoints)
GET    /api/employees                    # 員工列表
POST   /api/employees                    # 新增員工
GET    /api/employees/:userId            # 員工詳情
PUT    /api/employees/:userId/identities # 更新業務身份
POST   /api/employees/:userId/compensation # 新增薪資記錄
POST   /api/employees/:userId/insurance  # 新增勞健保記錄

// 報告系統
GET    /api/reports/total-report         # 總報告
GET    /api/reports/trial-report         # 試聽報告

// KPI 系統
GET    /api/kpi/calculate                # 計算 KPI
```

**重要修正記錄**:
- 2025-10-17: 修正 SQL 聚合錯誤（移除 `ORDER BY` 從 `DISTINCT json_agg`）
- 2025-10-17: 修正 insurance 欄位名稱（`adjustment_reason` → `notes`）

---

## 🗄️ 資料庫目錄 (`supabase/migrations/`)

```
supabase/migrations/
├── 001_*.sql                # 初始 schema
├── ...
├── 024_create_custom_forms.sql           # Form Builder 系統
├── 025_add_multiple_roles_support.sql    # 多角色支援
├── 028_add_exchange_rate_locking.sql     # 匯率鎖定
├── 029_create_income_expense_records.sql # 收支記錄優化
├── 030_*.sql                             # 欄位優化
├── 031_create_hr_management_system.sql   # ⭐ HR 系統核心
└── 032_create_leave_records.sql          # 請假記錄
```

### 關鍵 Migrations

#### ⭐ 031_create_hr_management_system.sql
**用途**: HR 系統的核心資料結構

**建立的表格**:
1. **`business_identities`** - 業務身份表
   - `identity_code` (T001, C001, S001)
   - `identity_type` (teacher, consultant, sales)
   - `is_active` (是否啟用)
   - `effective_from`, `effective_to` (生效期間)

2. **`employee_compensation`** - 薪資記錄
   - 底薪、獎金、獎金來源
   - 支付日期、支付方式

3. **`employee_insurance`** - 勞健保記錄
   - 勞保、健保、勞退金額
   - 僱主/員工負擔比例

**Auto-increment 邏輯**:
```sql
-- 自動生成業務編號（T001, T002, C001, C002...）
CREATE OR REPLACE FUNCTION generate_identity_code()
RETURNS TRIGGER AS $$
DECLARE
  prefix TEXT;
  max_num INT;
  new_code TEXT;
BEGIN
  -- 根據身份類型決定前綴
  prefix := CASE NEW.identity_type
    WHEN 'teacher' THEN 'T'
    WHEN 'consultant' THEN 'C'
    WHEN 'sales' THEN 'S'
    ELSE 'U'
  END;

  -- 找到當前最大編號
  SELECT COALESCE(MAX(SUBSTRING(identity_code FROM '[0-9]+')::INT), 0)
  INTO max_num
  FROM business_identities
  WHERE identity_type = NEW.identity_type;

  -- 生成新編號
  new_code := prefix || LPAD((max_num + 1)::TEXT, 3, '0');
  NEW.identity_code := new_code;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 🛠️ 腳本目錄 (`scripts/`)

```
scripts/
├── run-migration-safely.sh           # ⭐ 安全執行 migration 腳本
├── create-historical-users.ts        # ⭐ 建立歷史人員（Phase 19.2）
├── migrate-historical-data.ts        # ⭐ 遷移歷史資料（Phase 19.2）
├── import-all-income-expense.ts      # 匯入收支記錄
├── import-cost-profit.js             # 匯入成本利潤
├── reimport-2025-with-teachers.ts    # 重新匯入 2025 資料
└── run-teaching-quality-analysis.ts  # 執行教學品質分析
```

### 關鍵腳本說明

#### ⭐ run-migration-safely.sh
**路徑**: [`scripts/run-migration-safely.sh`](../scripts/run-migration-safely.sh)

**用途**:
- 防止連到錯誤的資料庫（Neondb vs Supabase）
- 執行前檢查 `SUPABASE_DB_URL`
- 顯示連線資訊並要求確認

**使用方式**:
```bash
./scripts/run-migration-safely.sh scripts/my-migration.ts
```

**安全機制**: 參見 [`docs/DATABASE_SAFETY_GUIDE.md`](DATABASE_SAFETY_GUIDE.md)

---

#### ⭐ create-historical-users.ts
**路徑**: [`scripts/create-historical-users.ts`](../scripts/create-historical-users.ts)

**用途**: 建立 8 位歷史離職人員（Vivi, Wendy, 47, JU, Isha, Ivan, 翊瑄, 文軒）

**功能**:
- 建立 `users` 記錄（狀態 = `inactive`）
- 建立對應的 `business_identities`（`is_active = false`）

**執行結果**: 17 個業務身份（4 active + 13 inactive）

---

#### ⭐ migrate-historical-data.ts
**路徑**: [`scripts/migrate-historical-data.ts`](../scripts/migrate-historical-data.ts)

**用途**: 將歷史資料從「名稱」對應到「業務編號」

**遷移範圍**:
- `trial_class_attendance.teacher_name` → `teacher_code`
- `teaching_quality_analysis.teacher_name` → `teacher_id`
- `income_expense_records.notes` (JSON) → 各種 code 欄位

**執行結果**: 297 筆記錄成功遷移（100%）

**關鍵功能**: 大小寫不敏感比對（`toLowerCase()`）

---

## 📝 設定目錄 (`configs/`)

```
configs/
└── report-metric-defaults.ts  # ⭐⭐ KPI 定義檔案
```

### ⭐⭐ report-metric-defaults.ts
**路徑**: [`configs/report-metric-defaults.ts`](../configs/report-metric-defaults.ts)

**用途**: 定義所有 KPI 的預設公式

**範例**:
```typescript
export const defaultMetrics: Record<string, MetricDefinition> = {
  conversionRate: {
    metricId: 'conversionRate',
    label: '轉換率',
    defaultFormula: '(conversions / trials) * 100',
    sourceFields: ['conversions', 'trials'],
    unit: '%',
  },
  avgRevenuePerStudent: {
    metricId: 'avgRevenuePerStudent',
    label: '每位學員平均收益',
    defaultFormula: 'totalRevenue / conversions',
    sourceFields: ['totalRevenue', 'conversions'],
    unit: 'NTD',
  },
  // ... 更多 KPI
};
```

**如何新增 KPI**:
1. 在此檔案新增 metric 定義
2. 在 `kpi-calculator.ts` 的 `formulaContext` 新增對應變數
3. 前端會自動顯示新 KPI

**詳細指南**: 參見 [`docs/AI_KPI_MODIFICATION_GUIDE.md`](AI_KPI_MODIFICATION_GUIDE.md)

---

## 📚 文件目錄 (`docs/`)

```
docs/
├── DATABASE_SAFETY_GUIDE.md         # ⭐ 資料庫安全操作指南（本次建立）
├── PROJECT_FILE_STRUCTURE.md        # ⭐ 專案檔案結構（本檔案）
├── AI_KPI_MODIFICATION_GUIDE.md     # AI 修改 KPI 指南
├── HR_SYSTEM_MIGRATION_GUIDE.md     # HR 系統遷移指南
└── COST_PROFIT_SOP.md               # 成本利潤分析 SOP
```

---

## 📄 工作總結文件（根目錄）

```
workspace/
├── SESSION_SUMMARY_2025-10-13.md    # 2025-10-13 工作總結
├── SESSION_SUMMARY_2025-10-14.md    # 2025-10-14 工作總結
├── SESSION_SUMMARY_2025-10-15.md    # 2025-10-15 工作總結
├── SESSION_SUMMARY_2025-10-16.md    # 2025-10-16 工作總結
├── SESSION_SUMMARY_2025-10-17.md    # ⭐ 2025-10-17 工作總結（本次建立）
└── TODAY_SUMMARY_2025-10-16.md      # 今日總結
```

### 工作總結結構
每個總結檔案包含：
- 完成項目清單
- 建立/修改的檔案
- 解決的技術問題
- 資料統計
- 學到的經驗
- 下一步計畫

---

## 📋 Phase 完成報告文件

```
workspace/
├── PHASE_19_2_STEP1_COMPLETE.md     # Phase 19.2 Step 1 完成報告
├── PHASE_19_2_STEP2_COMPLETE.md     # Phase 19.2 Step 2 完成報告
├── DATA_MIGRATION_ANALYSIS.md       # 資料遷移分析
├── FORM_SYSTEM_COMPLETE.md          # 表單系統完成報告
├── TEACHING_QUALITY_GAMIFIED_UI_UPDATE.md
├── INCOME_EXPENSE_SYSTEM_COMPLETE.md
└── ... (更多完成報告)
```

**用途**: 記錄每個 Phase/Feature 的完成狀態、技術細節、測試結果

---

## 🧪 測試目錄 (`tests/`)

```
tests/
├── test-kpi-only.ts              # ⭐ KPI 計算測試（最常用）
├── test-ai-field-mapper.ts       # AI 欄位對應測試
├── test-field-mapping-api.ts     # 欄位對應 API 測試
├── test-env-check.ts             # 環境變數檢查
└── test-permission-filter.ts     # 權限過濾測試（Phase 19.3）
```

### 常用測試指令
```bash
# 測試 KPI 計算
npx tsx tests/test-kpi-only.ts

# 測試 AI 欄位對應
npx tsx tests/test-ai-field-mapper.ts

# 檢查環境變數
npx tsx tests/test-env-check.ts
```

---

## 🔍 如何找到你要的檔案？

### 場景 1: 我要修改 KPI 計算邏輯
1. **定義 KPI**: [`configs/report-metric-defaults.ts`](../configs/report-metric-defaults.ts)
2. **計算邏輯**: [`server/services/kpi-calculator.ts`](../server/services/kpi-calculator.ts)
3. **測試**: `npx tsx tests/test-kpi-only.ts`

### 場景 2: 我要修改表單建立器
1. **後端服務**: [`server/services/custom-form-service.ts`](../server/services/custom-form-service.ts)
2. **API 路由**: [`server/routes.ts`](../server/routes.ts) (搜尋 `/api/forms/custom`)
3. **前端列表**: [`client/src/pages/settings/form-builder-list.tsx`](../client/src/pages/settings/form-builder-list.tsx)
4. **動態渲染**: [`client/src/components/forms/dynamic-form-renderer.tsx`](../client/src/components/forms/dynamic-form-renderer.tsx)

### 場景 3: 我要修改 HR 系統
1. **資料庫 Schema**: [`supabase/migrations/031_create_hr_management_system.sql`](../supabase/migrations/031_create_hr_management_system.sql)
2. **API 路由**: [`server/routes.ts`](../server/routes.ts) (搜尋 `/api/employees`)
3. **前端頁面**: [`client/src/pages/settings/employees.tsx`](../client/src/pages/settings/employees.tsx)
4. **歷史資料遷移**: [`scripts/migrate-historical-data.ts`](../scripts/migrate-historical-data.ts)

### 場景 4: 我要執行資料庫 Migration
1. **建立 Migration**: `supabase/migrations/0XX_*.sql`
2. **編寫 TypeScript 腳本**: `scripts/my-migration.ts`
3. **安全執行**: `./scripts/run-migration-safely.sh scripts/my-migration.ts`
4. **參考指南**: [`docs/DATABASE_SAFETY_GUIDE.md`](DATABASE_SAFETY_GUIDE.md)

### 場景 5: 我要查看專案進度
1. **主要文件**: [`PROJECT_PROGRESS.md`](../PROJECT_PROGRESS.md)
2. **今日總結**: `SESSION_SUMMARY_2025-10-17.md`
3. **Phase 報告**: `PHASE_19_2_STEP1_COMPLETE.md`, `PHASE_19_2_STEP2_COMPLETE.md`

---

## 📌 檔案命名規範

### 文件檔案
- **大寫蛇形**: `PROJECT_PROGRESS.md`, `SESSION_SUMMARY_2025-10-17.md`
- **Phase 報告**: `PHASE_XX_Y_STEPZ_COMPLETE.md`

### 程式碼檔案
- **kebab-case**: `kpi-calculator.ts`, `custom-form-service.ts`
- **React 元件**: `PascalCase.tsx` (如 `DashboardLayout.tsx`)

### Migration 檔案
- **格式**: `0XX_description.sql`
- **範例**: `031_create_hr_management_system.sql`

### 腳本檔案
- **kebab-case**: `migrate-historical-data.ts`
- **Bash**: `run-migration-safely.sh`

---

## ✨ 最佳實踐

### 1. 修改前先讀文件
- ✅ 先讀 `PROJECT_PROGRESS.md` 了解專案狀態
- ✅ 先讀 `CLAUDE.md` 了解架構決策
- ✅ 檢查 `docs/` 目錄是否有相關指南

### 2. 修改後更新文件
- ✅ 完成 Phase 後更新 `PROJECT_PROGRESS.md`
- ✅ 建立 `PHASE_XX_COMPLETE.md` 記錄細節
- ✅ 更新 `SESSION_SUMMARY_YYYY-MM-DD.md`

### 3. 資料庫操作安全
- ✅ 使用 `SUPABASE_DB_URL` 環境變數
- ✅ 使用 `./scripts/run-migration-safely.sh` 執行腳本
- ✅ 腳本內建資料庫驗證邏輯

### 4. 測試先行
- ✅ 修改 KPI 後執行 `npx tsx tests/test-kpi-only.ts`
- ✅ 新增 API 後手動測試（Postman/curl）
- ✅ 前端修改後在瀏覽器驗證

---

## 🚀 快速指令參考

```bash
# 開發
npm run dev                  # 啟動開發伺服器
npm run build                # 建置生產版本
npm run check                # TypeScript 類型檢查

# 測試
npx tsx tests/test-kpi-only.ts          # 測試 KPI
npx tsx tests/test-env-check.ts         # 檢查環境

# 資料庫
./scripts/run-migration-safely.sh scripts/my-script.ts  # 安全執行腳本
SUPABASE_DB_URL="..." psql -c "SELECT * FROM users;"   # 直接查詢

# 除錯
npm run kill:5000            # 關閉 5000 port
npm run dev:clean            # 清理並重啟
```

---

**文件維護者**: Claude (AI Assistant)
**最後更新日期**: 2025-10-17

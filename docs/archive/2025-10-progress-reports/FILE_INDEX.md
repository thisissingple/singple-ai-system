# 檔案索引 - Google Sheets → Supabase 同步系統

**版本**: 2.0
**更新日期**: 2025-10-04

---

## 📁 新建檔案清單

### 核心程式碼

| 檔案路徑 | 類型 | 說明 | 行數 |
|---------|------|------|------|
| `configs/sheet-field-mappings-complete.ts` | TypeScript | 完整欄位映射（包含所有業務欄位） | ~450 |
| `server/services/etl/extract.ts` | TypeScript | Extract 模組 - 抽取 Google Sheets 資料 | ~80 |
| `server/services/etl/transform.ts` | TypeScript | Transform 模組 - 欄位映射與驗證 | ~200 |
| `server/services/etl/load.ts` | TypeScript | Load 模組 - 載入 Supabase | ~150 |
| `server/services/etl/index.ts` | TypeScript | ETL Pipeline - 整合 E/T/L 模組 | ~250 |
| `server/services/sheet-sync-service-v2.ts` | TypeScript | 新版同步服務（使用 ETL 模式） | ~280 |

### Migration SQL

| 檔案路徑 | 類型 | 說明 | 行數 |
|---------|------|------|------|
| `supabase/migrations/008_complete_business_schema.sql` | SQL | 完整業務 Schema（所有欄位、索引、註解、RLS） | ~400 |
| `supabase/migrations/009_create_report_views.sql` | SQL | 報表視圖和函數（7 views + 3 functions） | ~500 |

### 測試

| 檔案路徑 | 類型 | 說明 | 行數 |
|---------|------|------|------|
| `tests/etl/extract.test.ts` | TypeScript | Extract 模組測試 | ~130 |
| `tests/etl/transform.test.ts` | TypeScript | Transform 模組測試（含資料型別轉換測試） | ~250 |

### 文件

| 檔案路徑 | 類型 | 說明 | 頁數 |
|---------|------|------|------|
| `docs/ARCHITECTURE_OVERVIEW.md` | Markdown | 系統架構總覽 | ~15 頁 |
| `docs/COMPLETE_OPERATION_MANUAL.md` | Markdown | 完整操作手冊（部署、維運、故障排除） | ~40 頁 |
| `docs/FIELD_MAPPING_COMPLETE.md` | Markdown | 欄位映射文件（完整對應表） | ~10 頁 |
| `docs/QUICK_DEPLOYMENT_GUIDE.md` | Markdown | 快速部署指南（5 分鐘部署） | ~3 頁 |
| `IMPLEMENTATION_SUMMARY.md` | Markdown | 實作總結報告 | ~8 頁 |
| `FILE_INDEX.md` | Markdown | 本檔案 - 檔案索引 | ~2 頁 |

**總計**:
- **程式碼**: 6 個新檔案，~1,410 行
- **Migration**: 2 個新檔案，~900 行 SQL
- **測試**: 2 個新檔案，~380 行
- **文件**: 6 個新檔案，~78 頁

---

## 📂 專案結構總覽

```
workspace/
│
├── 📁 configs/
│   ├── sheet-field-mappings-complete.ts     ⭐ 新建 - 完整欄位映射
│   ├── sheet-field-mappings.ts              📄 保留 - 舊版（可刪除）
│   └── supabase-schema-authority.ts         📄 保留 - Schema 權威定義
│
├── 📁 server/
│   └── 📁 services/
│       ├── 📁 etl/                           ⭐ 新建資料夾
│       │   ├── extract.ts                   ⭐ 新建
│       │   ├── transform.ts                 ⭐ 新建
│       │   ├── load.ts                      ⭐ 新建
│       │   └── index.ts                     ⭐ 新建
│       ├── sheet-sync-service-v2.ts          ⭐ 新建 - 新版同步服務
│       ├── sheet-sync-service.ts             📄 保留 - 舊版（可刪除）
│       └── supabase-client.ts                📄 保留
│
├── 📁 supabase/
│   └── 📁 migrations/
│       ├── 008_complete_business_schema.sql  ⭐ 新建
│       ├── 009_create_report_views.sql       ⭐ 新建
│       ├── 007_schema_authority_final_fix.sql 📄 保留
│       └── ... (其他 migrations)             📄 保留
│
├── 📁 tests/
│   ├── 📁 etl/                               ⭐ 新建資料夾
│   │   ├── extract.test.ts                  ⭐ 新建
│   │   └── transform.test.ts                ⭐ 新建
│   └── schema-validation.test.ts             📄 保留
│
├── 📁 docs/
│   ├── ARCHITECTURE_OVERVIEW.md              ⭐ 新建
│   ├── COMPLETE_OPERATION_MANUAL.md          ⭐ 新建
│   ├── FIELD_MAPPING_COMPLETE.md             ⭐ 新建
│   └── QUICK_DEPLOYMENT_GUIDE.md             ⭐ 新建
│
├── 📁 shared/
│   └── schema.ts                             📄 保留 - Drizzle ORM Schema
│
├── IMPLEMENTATION_SUMMARY.md                 ⭐ 新建 - 實作總結
├── FILE_INDEX.md                             ⭐ 新建 - 本檔案
├── SCHEMA_FIX_EXECUTION_GUIDE.md             📄 保留
└── package.json                              📄 保留
```

**圖示說明**:
- ⭐ 新建: 本次實作新建的檔案
- 📄 保留: 現有檔案（保留使用）
- 📁 資料夾

---

## 🔄 檔案關聯圖

```
┌─────────────────────────────────────────────────────────────────┐
│                    Entry Point (同步流程)                         │
│                                                                  │
│  server/services/sheet-sync-service-v2.ts                       │
│  └─> syncWorksheetToSupabase()                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ETL Pipeline                                  │
│                                                                  │
│  server/services/etl/index.ts                                   │
│  └─> runETL()                                                   │
│       ├─> extractFromSheets()     (etl/extract.ts)              │
│       ├─> transformData()         (etl/transform.ts)            │
│       └─> loadToSupabase()        (etl/load.ts)                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Field Mappings                                │
│                                                                  │
│  configs/sheet-field-mappings-complete.ts                       │
│  └─> transformRowData()                                         │
│  └─> validateRequiredFields()                                   │
│  └─> Transforms (toDate, toInteger, toBoolean, ...)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Database                             │
│                                                                  │
│  supabase/migrations/008_*.sql (Schema)                         │
│  supabase/migrations/009_*.sql (Views & Functions)              │
│                                                                  │
│  Tables:                                                        │
│  ├─ trial_class_attendance                                      │
│  ├─ trial_class_purchase                                        │
│  └─ eods_for_closers                                            │
│                                                                  │
│  Views:                                                         │
│  ├─ v_student_journey                                           │
│  ├─ v_teacher_performance                                       │
│  ├─ v_closer_performance                                        │
│  └─ ... (4 more views)                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Queries                              │
│                                                                  │
│  client/src/hooks/use-*.ts                                      │
│  └─> useStudentJourney()                                        │
│  └─> useTeacherPerformance()                                    │
│  └─> useConversionStatistics()                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📖 文件閱讀順序建議

### 初次部署

1. **[QUICK_DEPLOYMENT_GUIDE.md](docs/QUICK_DEPLOYMENT_GUIDE.md)** - 5 分鐘快速部署
2. **[COMPLETE_OPERATION_MANUAL.md](docs/COMPLETE_OPERATION_MANUAL.md)** - 詳細部署步驟和驗證

### 理解系統

3. **[ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md)** - 系統架構和設計原則
4. **[FIELD_MAPPING_COMPLETE.md](docs/FIELD_MAPPING_COMPLETE.md)** - 欄位映射說明

### 開發和維運

5. **[COMPLETE_OPERATION_MANUAL.md](docs/COMPLETE_OPERATION_MANUAL.md)** - 維運指南、故障排除
6. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** - 實作總結和未來擴充

### 程式碼閱讀

7. `configs/sheet-field-mappings-complete.ts` - 欄位映射邏輯
8. `server/services/etl/` - ETL Pipeline 實作
9. `supabase/migrations/` - Schema 定義

---

## 🔍 快速查找

### 我想...

| 需求 | 參考檔案 |
|-----|---------|
| **部署系統** | [QUICK_DEPLOYMENT_GUIDE.md](docs/QUICK_DEPLOYMENT_GUIDE.md) |
| **理解架構** | [ARCHITECTURE_OVERVIEW.md](docs/ARCHITECTURE_OVERVIEW.md) |
| **查看欄位映射** | [FIELD_MAPPING_COMPLETE.md](docs/FIELD_MAPPING_COMPLETE.md) |
| **新增欄位** | [COMPLETE_OPERATION_MANUAL.md](docs/COMPLETE_OPERATION_MANUAL.md#新增-google-sheets-欄位流程) |
| **故障排除** | [COMPLETE_OPERATION_MANUAL.md](docs/COMPLETE_OPERATION_MANUAL.md#故障排除) |
| **前端查詢範例** | [COMPLETE_OPERATION_MANUAL.md](docs/COMPLETE_OPERATION_MANUAL.md#前端報表查詢) |
| **執行測試** | [COMPLETE_OPERATION_MANUAL.md](docs/COMPLETE_OPERATION_MANUAL.md#執行測試) |
| **查看實作成果** | [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) |

### 我遇到問題...

| 問題 | 參考章節 |
|-----|---------|
| **Migration 執行失敗** | [QUICK_DEPLOYMENT_GUIDE.md - 問題 1](docs/QUICK_DEPLOYMENT_GUIDE.md#問題-1-migration-執行失敗) |
| **PostgREST 報錯 "column not found"** | [COMPLETE_OPERATION_MANUAL.md - 問題 1](docs/COMPLETE_OPERATION_MANUAL.md#問題-1-could-not-find-column-in-schema-cache) |
| **批次插入失敗 "All object keys must match"** | [COMPLETE_OPERATION_MANUAL.md - 問題 2](docs/COMPLETE_OPERATION_MANUAL.md#問題-2-all-object-keys-must-match-pgrst102) |
| **同步後資料遺失** | [COMPLETE_OPERATION_MANUAL.md - 問題 3](docs/COMPLETE_OPERATION_MANUAL.md#問題-3-同步後資料遺失) |
| **測試失敗** | [COMPLETE_OPERATION_MANUAL.md - 問題 4](docs/COMPLETE_OPERATION_MANUAL.md#問題-4-測試失敗) |

---

## 🧹 可刪除的舊檔案

部署完成並驗證無誤後，可以刪除以下舊檔案：

- ❌ `configs/sheet-field-mappings.ts` （已被 `sheet-field-mappings-complete.ts` 取代）
- ❌ `server/services/sheet-sync-service.ts` （已被 `sheet-sync-service-v2.ts` 取代）

**注意**: 刪除前請確保：
1. Migration 008 和 009 已成功執行
2. 新同步服務已正常運作
3. 所有測試通過
4. 已備份資料

---

## 📊 程式碼統計

### 新增程式碼

- **TypeScript**: ~2,160 行
- **SQL**: ~900 行
- **測試**: ~380 行
- **文件**: ~4,500 行

**總計**: ~7,940 行

### 檔案數量

- **新建檔案**: 16 個
- **修改檔案**: 0 個（完全新增，不影響現有程式碼）
- **可刪除檔案**: 2 個

---

## 🎯 關鍵檔案說明

### 1. `configs/sheet-field-mappings-complete.ts`

**用途**: 定義所有 Google Sheets 欄位到 Supabase 欄位的完整映射

**關鍵功能**:
- 三張表的完整欄位定義（40+ 欄位）
- Transform 函數庫（`toDate`, `toInteger`, `toBoolean` 等）
- 必填欄位驗證
- 所有業務欄位（包含之前刪除的欄位）

### 2. `server/services/etl/`

**用途**: ETL Pipeline 實作（Extract → Transform → Load）

**三個模組**:
- `extract.ts`: 抽取 Google Sheets 資料
- `transform.ts`: 欄位映射、驗證、清洗
- `load.ts`: 載入 Supabase（去重 + 批次插入）

### 3. `supabase/migrations/008_complete_business_schema.sql`

**用途**: 完整業務 Schema（替代 Migration 007）

**包含**:
- 三張表的所有欄位定義
- 16 個索引（B-tree, GIN, 複合, 部分）
- Column comments（中文說明）
- RLS Policies
- Triggers（自動更新 `updated_at`）

### 4. `supabase/migrations/009_create_report_views.sql`

**用途**: 報表視圖和函數

**包含**:
- 7 個 Views（預先計算統計資料）
- 3 個 Functions（參數化查詢）
- Permissions（授權給 authenticated users）

### 5. `docs/COMPLETE_OPERATION_MANUAL.md`

**用途**: 40 頁完整操作手冊

**涵蓋**:
- 部署 Migration
- 重啟 PostgREST
- 啟動同步流程
- 驗證同步結果
- 執行測試
- 前端報表查詢（含完整 TypeScript 範例）
- 新增 Google Sheets 欄位流程（詳細步驟）
- 故障排除（6 個常見問題）
- 日常維運（日/週/月檢查清單）

---

## ✅ 完成檢查清單

### 程式碼

- [x] 完整欄位映射（包含所有業務欄位）
- [x] ETL Pipeline（Extract, Transform, Load）
- [x] 新版同步服務（使用 ETL 模式）
- [x] Supabase Schema（完整欄位、索引、註解）
- [x] 報表視圖和函數（7 views + 3 functions）
- [x] 測試套件（Extract, Transform, Schema Validation）

### 文件

- [x] 系統架構總覽
- [x] 完整操作手冊（40 頁）
- [x] 欄位映射文件
- [x] 快速部署指南
- [x] 實作總結報告
- [x] 檔案索引（本檔案）

### 部署

- [ ] 執行 Migration 008 ⬅️ **待執行**
- [ ] 執行 Migration 009 ⬅️ **待執行**
- [ ] 重啟 PostgREST ⬅️ **待執行**
- [ ] 替換同步服務 ⬅️ **待執行**
- [ ] 執行測試驗證 ⬅️ **待執行**

---

**檔案索引版本**: 1.0
**最後更新**: 2025-10-04
**狀態**: ✅ 完整

# Google Sheets → Supabase 系統架構總覽

**版本**: 2.0
**更新日期**: 2025-10-04

---

## 📐 系統架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                        Google Sheets                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ 體驗課上課記錄  │  │ 體驗課購買記錄  │  │ EODs (咨詢)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Google Sheets API
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ETL Pipeline (Node.js)                       │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │   Extract      │→ │   Transform    │→ │     Load       │   │
│  │                │  │                │  │                │   │
│  │ • 抽取原始資料   │  │ • 欄位映射       │  │ • 刪除舊資料    │   │
│  │ • 清理空列      │  │ • 資料驗證       │  │ • 批次插入      │   │
│  │ • 建立 header  │  │ • 型別轉換       │  │ • 錯誤處理      │   │
│  │   mapping      │  │ • 補充系統欄位    │  │                │   │
│  │                │  │ • 保存 raw_data  │  │                │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                                  │
│  Field Mappings:                                                │
│  • configs/sheet-field-mappings-complete.ts                     │
│  • Transform functions (toDate, toInteger, toBoolean)           │
│  • Validation (required fields, student_email)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase Client
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase (PostgreSQL)                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Business Tables                            │  │
│  │                                                          │  │
│  │  trial_class_attendance (體驗課上課記錄)                  │  │
│  │  • 基礎欄位: student_email, student_name, class_date     │  │
│  │  • 業務欄位: is_reviewed, no_conversion_reason          │  │
│  │  • 系統欄位: teacher_id, sales_id, department_id        │  │
│  │  • 追蹤欄位: source_worksheet_id, origin_row_index      │  │
│  │  • raw_data: JSONB (所有原始欄位)                        │  │
│  │                                                          │  │
│  │  trial_class_purchase (體驗課購買記錄)                   │  │
│  │  eods_for_closers (咨詢師業績)                           │  │
│  │                                                          │  │
│  │  JOIN Key: student_email (所有表共用)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Report Views                               │  │
│  │                                                          │  │
│  │  • v_student_journey (學生完整旅程)                       │  │
│  │  • v_teacher_performance (老師業績)                      │  │
│  │  • v_closer_performance (咨詢師業績)                      │  │
│  │  • v_caller_performance (電訪業績)                        │  │
│  │  • v_daily_statistics (每日統計)                          │  │
│  │  • v_monthly_statistics (每月統計)                        │  │
│  │  • v_conversion_funnel (轉換漏斗)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │               Functions                                  │  │
│  │                                                          │  │
│  │  • get_student_journey(email)                           │  │
│  │  • get_teacher_performance(name, start, end)            │  │
│  │  • get_conversion_statistics(start, end)                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Indexes:                                                       │
│  • student_email (B-tree) - JOIN 優化                           │
│  • class_date, purchase_date, deal_date - 時間範圍查詢           │
│  • teacher_name, closer_name, caller_name - 業務查詢            │
│  • raw_data (GIN) - JSONB 查詢                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ PostgREST API
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)                │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │
│  │  Dashboard     │  │   Reports      │  │  AI Analysis   │   │
│  │                │  │                │  │                │   │
│  │ • KPI 卡片     │  │ • 老師業績報表   │  │ • 轉換預測      │   │
│  │ • 即時統計     │  │ • 咨詢師業績     │  │ • 趨勢分析      │   │
│  │ • 圖表視覺化   │  │ • 學生旅程       │  │ • 異常偵測      │   │
│  └────────────────┘  └────────────────┘  └────────────────┘   │
│                                                                  │
│  Data Fetching:                                                 │
│  • React Query (快取、重試、自動刷新)                             │
│  • Supabase Client (直接查詢 views 和 tables)                    │
│  • Real-time subscriptions (即時更新)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ 核心設計原則

### 1. Single Source of Truth

**Supabase 是唯一的資料真實來源**，所有前端報表、AI 分析都只查詢 Supabase。

### 2. raw_data 策略

所有 Google Sheets 欄位都保存在 `raw_data` JSONB 欄位中：
- **優點**: 未來新增欄位無需 schema migration
- **用途**: 新欄位可直接從 `raw_data` 查詢
- **查詢**: `SELECT raw_data->>'新欄位' FROM table`

### 3. ETL 分離

Extract、Transform、Load 三個階段完全分離：
- **Extract**: 抽取原始資料，不做任何業務邏輯
- **Transform**: 欄位映射、驗證、清洗
- **Load**: 刪除舊資料、批次插入新資料

### 4. 資料溯源

每筆資料都包含：
- `source_worksheet_id`: 來源工作表 ID
- `origin_row_index`: Google Sheets 原始列號
- `synced_at`: 同步時間

可完整追蹤資料來源和同步歷史。

### 5. 報表優化

使用 PostgreSQL Views 和 Functions 優化常用查詢：
- **Views**: 預先計算統計資料
- **Functions**: 支援參數化查詢
- **Indexes**: 優化 JOIN 和範圍查詢

---

## 📁 專案結構

```
workspace/
├── configs/
│   ├── sheet-field-mappings-complete.ts    # 完整欄位映射
│   └── supabase-schema-authority.ts        # Schema 權威定義
│
├── server/
│   └── services/
│       ├── etl/
│       │   ├── extract.ts                  # Extract 模組
│       │   ├── transform.ts                # Transform 模組
│       │   ├── load.ts                     # Load 模組
│       │   └── index.ts                    # ETL Pipeline
│       ├── sheet-sync-service-v2.ts        # 新版同步服務
│       └── supabase-client.ts              # Supabase 客戶端
│
├── supabase/
│   └── migrations/
│       ├── 008_complete_business_schema.sql  # 完整業務 Schema
│       └── 009_create_report_views.sql       # 報表視圖和函數
│
├── tests/
│   ├── etl/
│   │   ├── extract.test.ts                 # Extract 測試
│   │   └── transform.test.ts               # Transform 測試
│   └── schema-validation.test.ts           # Schema 驗證測試
│
├── docs/
│   ├── ARCHITECTURE_OVERVIEW.md            # 本文件
│   ├── COMPLETE_OPERATION_MANUAL.md        # 完整操作手冊
│   ├── FIELD_MAPPING_COMPLETE.md           # 欄位映射文件
│   └── QUICK_DEPLOYMENT_GUIDE.md           # 快速部署指南
│
└── shared/
    └── schema.ts                            # Drizzle ORM Schema
```

---

## 🔄 資料流程詳解

### 同步流程

```typescript
// 1. 從 Google Sheets 抽取資料
const extractedData = extractFromSheets(worksheet, headers, dataRows);
// ↓
// {
//   worksheet: { id, name, supabaseTable },
//   headers: ['姓名', 'email', '上課日期'],
//   rows: [{ '姓名': '王小明', 'email': 'wang@example.com', ... }],
//   totalRows: 100
// }

// 2. 轉換為 Supabase 格式
const transformResult = transformData(extractedData);
// ↓
// {
//   records: [
//     {
//       data: {
//         student_name: '王小明',
//         student_email: 'wang@example.com',
//         class_date: '2025-10-01',
//         raw_data: { '姓名': '王小明', 'email': '...', ... },
//         source_worksheet_id: 'xxx',
//         origin_row_index: 0,
//         synced_at: '2025-10-04T12:00:00Z'
//       },
//       isValid: true,
//       validationErrors: []
//     }
//   ],
//   validCount: 95,
//   invalidCount: 5
// }

// 3. 載入到 Supabase
const loadResult = await loadToSupabase(transformResult);
// ↓
// {
//   tableName: 'trial_class_attendance',
//   insertedCount: 95,
//   deletedCount: 90,  // 刪除舊資料
//   errors: []
// }
```

### 查詢流程

```typescript
// 前端查詢（使用 View）
const { data } = await supabase
  .from('v_teacher_performance')
  .select('*')
  .order('conversion_rate', { ascending: false });

// ↓ PostgREST 自動產生 SQL
// SELECT * FROM v_teacher_performance
// ORDER BY conversion_rate DESC;

// ↓ View 定義自動 JOIN 並計算統計資料
// 返回結果:
// [
//   {
//     teacher_name: '李老師',
//     total_students: 50,
//     total_classes: 75,
//     converted_students: 35,
//     conversion_rate: 70.00
//   },
//   ...
// ]
```

---

## 🔐 安全性設計

### Row Level Security (RLS)

所有業務表都啟用 RLS：

```sql
-- service_role 完全存取（用於同步服務）
CREATE POLICY "Service role has full access"
  ON trial_class_attendance
  FOR ALL TO service_role
  USING (true);

-- authenticated users 只能讀取（用於前端查詢）
CREATE POLICY "Authenticated users can read"
  ON trial_class_attendance
  FOR SELECT TO authenticated
  USING (true);
```

### 權限設計

| 角色 | 權限 | 用途 |
|-----|------|------|
| `service_role` | 完全存取（讀寫刪） | 後端同步服務 |
| `authenticated` | 僅讀取 | 前端查詢 |
| `anon` | 無權限 | 未登入使用者 |

---

## 📊 資料庫 Schema 設計

### 核心欄位分類

#### 1. 業務欄位（Mapped Fields）

定義在 `sheet-field-mappings-complete.ts`，直接映射自 Google Sheets。

**用途**: 快速查詢、JOIN、建立索引

**範例**:
- `student_email` (JOIN 鍵)
- `student_name`
- `class_date`
- `teacher_name`

#### 2. 系統欄位（System Fields）

由系統自動補充，不從 Google Sheets 讀取。

**用途**: 支援業務邏輯、權限控制

**範例**:
- `teacher_id`
- `sales_id`
- `department_id`

#### 3. 追蹤欄位（Tracking Fields）

用於資料溯源和同步管理。

**用途**: 追蹤資料來源、支援增量同步

**範例**:
- `source_worksheet_id`
- `origin_row_index`
- `synced_at`

#### 4. raw_data (JSONB)

儲存所有 Google Sheets 原始欄位。

**用途**: 保留完整資料、支援未來擴充

**範例**:
```json
{
  "姓名": "王小明",
  "email": "wang@example.com",
  "上課日期": "2025-10-01",
  "是否已審核": "true",
  "未來新增欄位": "新資料"
}
```

---

## 🚀 效能優化

### 索引策略

#### B-tree 索引（用於精確查詢和 JOIN）

```sql
CREATE INDEX idx_trial_attendance_email ON trial_class_attendance(student_email);
CREATE INDEX idx_trial_attendance_teacher ON trial_class_attendance(teacher_name);
```

#### 複合索引（用於多條件查詢）

```sql
CREATE INDEX idx_eods_closer_date ON eods_for_closers(closer_name, deal_date DESC);
```

#### GIN 索引（用於 JSONB 查詢）

```sql
CREATE INDEX idx_trial_attendance_raw_data_gin ON trial_class_attendance USING gin(raw_data);
```

#### 部分索引（用於特定條件查詢）

```sql
CREATE INDEX idx_trial_attendance_reviewed
  ON trial_class_attendance(is_reviewed)
  WHERE is_reviewed = FALSE;
```

### 查詢優化

#### 使用 Views 減少重複計算

```sql
-- 不要每次都 JOIN 三張表
-- ❌ Bad
SELECT ... FROM trial_class_attendance a
JOIN trial_class_purchase p ON a.student_email = p.student_email
JOIN eods_for_closers e ON a.student_email = e.student_email
...

-- ✅ Good
SELECT * FROM v_student_journey WHERE student_email = 'xxx';
```

#### 使用 Functions 支援參數化查詢

```sql
-- ✅ Good
SELECT * FROM get_teacher_performance('李老師', '2025-10-01', '2025-10-31');
```

---

## 🧪 測試策略

### 單元測試

- **Extract Module**: 測試資料抽取、空列處理、值清理
- **Transform Module**: 測試欄位映射、型別轉換、驗證邏輯
- **Load Module**: 測試批次插入、去重邏輯

### 整合測試

- **ETL Pipeline**: 測試完整流程（Extract → Transform → Load）
- **Schema Validation**: 確保 transformer 輸出與 schema 定義一致

### 端對端測試

- **Sync Service**: 測試完整同步流程
- **Report Queries**: 測試報表視圖和函數

---

## 📈 可擴展性

### 新增表

1. 在 `shared/schema.ts` 定義 Drizzle schema
2. 建立 migration SQL
3. 新增 field mapping 到 `sheet-field-mappings-complete.ts`
4. 更新 ETL pipeline 支援新表
5. 新增測試

### 新增欄位

#### 選項 1: 僅存 raw_data（零停機）

不需要任何操作，新欄位自動存入 `raw_data`。

#### 選項 2: 新增專用欄位（支援索引）

1. 更新 field mapping
2. 更新 schema authority
3. 建立 migration SQL
4. 執行測試
5. 部署

### 新增報表

1. 建立 View 或 Function
2. 建立 migration SQL
3. 新增前端 hook
4. 新增 UI 元件

---

## 🔧 維護建議

### 日常檢查

- 監控同步成功率
- 檢查資料新鮮度（`MAX(synced_at)`）
- 查看錯誤日誌

### 定期優化

- 清理過期的 `sync_history`
- 分析慢查詢並建立索引
- 檢視 `raw_data` 使用情況，考慮是否新增專用欄位

### 容量規劃

- 監控資料庫大小
- 評估索引大小
- 規劃資料歸檔策略

---

## 📚 相關文件

- [完整操作手冊](./COMPLETE_OPERATION_MANUAL.md)
- [快速部署指南](./QUICK_DEPLOYMENT_GUIDE.md)
- [Field Mapping 文件](./FIELD_MAPPING_COMPLETE.md)
- [Schema Fix 執行指南](../SCHEMA_FIX_EXECUTION_GUIDE.md)

---

**架構設計**: 遵循 ETL 最佳實踐、Single Source of Truth 原則、資料溯源能力
**技術棧**: Node.js + TypeScript + Supabase (PostgreSQL) + React
**部署環境**: Replit + Supabase Cloud

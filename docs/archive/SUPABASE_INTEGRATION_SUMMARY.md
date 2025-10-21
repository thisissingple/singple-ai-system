# Supabase Integration & Metric Configuration Summary

**Date**: 2025-10-01
**Status**: ✅ Core Infrastructure Complete | ⏳ Frontend & TotalReport Service Integration In Progress

---

## Completed Components

### 1. Supabase Client & Schema ✅

**Files Created**:
- `server/services/supabase-client.ts` - Supabase client with environment variable fallback
- `docs/supabase-schema.sql` - Complete database schema with 3 tables

**Features**:
- Lazy initialization with graceful degradation
- Environment variable validation (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Connection testing utility
- Row Level Security policies
- Automatic `updated_at` triggers
- `report_aggregate_metrics` view for AI/reporting

**Tables**:
1. `trial_class_attendance` - 體驗課上課記錄
2. `trial_class_purchase` - 體驗課購買記錄
3. `eods_for_closers` - 成交記錄

**Standard Fields** (normalized):
- `student_name`, `student_email`, `teacher_name`
- `class_date`, `purchase_date`, `deal_date`
- `course_type`, `deal_amount`, `status`, `intent_score`, `satisfaction`
- `raw_data` (JSONB) - preserves original field names
- `source_spreadsheet_id`, `origin_row_index`, `synced_at`

---

### 2. Supabase Repository Layer ✅

**File**: `server/services/reporting/supabase-report-repository.ts`

**Methods**:
- `isAvailable()` - Check if Supabase is configured
- `getAttendance(dateRange)` - Get attendance data by date range
- `getPurchases(dateRange)` - Get purchase data by date range
- `getDeals(dateRange)` - Get deal data by date range
- `getAllAttendance()`, `getAllPurchases()`, `getAllDeals()` - Get all data (up to 10k rows)
- `getTableCounts()` - Get row counts for each table
- `getAggregateMetrics()` - Get aggregate metrics (students, teachers, revenue, conversion rate)
- `getMetricsForAI()` - TODO: Placeholder for AI integration

**Date Range Filtering**:
- Attendance: filters by `class_date`
- Purchases: filters by `purchase_date` OR `class_date`
- Deals: filters by `deal_date`

---

### 3. Google Sheets → Supabase Sync ✅

**File**: `server/services/google-sheets.ts`

**New Method**: `syncToSupabase(spreadsheet, headers, dataRows)`

**Sync Flow**:
1. Determine target table based on spreadsheet name pattern matching:
   - "體驗課上課記錄" / "上課打卡" → `trial_class_attendance`
   - "體驗課購買記錄" / "體驗課學員名單" → `trial_class_purchase`
   - "EODs for Closers" / "升高階學員" → `eods_for_closers`

2. Delete old data for `source_spreadsheet_id`

3. Normalize fields using `field-mapping-v2.ts` (`resolveField`, `parseDateField`, `parseNumberField`)

4. Insert data in batches (500 rows per batch)

5. Preserves `raw_data` as JSONB for all original fields

**Integration Points**:
- Called automatically from `syncSpreadsheet()` after storage sync
- Called from `syncWithMockData()` for dev seed data
- Gracefully handles Supabase unavailable (logs warning, continues)

---

### 4. DevSeedService with Supabase Support ✅

**File**: `server/services/dev-seed-service.ts`

**Updated Return Type**:
```typescript
{
  success: boolean;
  spreadsheetsCreated: number;
  worksheetsCreated: number;
  dataRowsInserted: number;
  supabaseRowsInserted?: number;  // NEW
  supabase: boolean;                // NEW
}
```

**Behavior**:
- Creates 3 test spreadsheets with IDs:
  - `test-trial-class-attendance`
  - `test-trial-class-purchase`
  - `test-eods-for-closers`
- Syncs to both local storage AND Supabase (if available)
- Queries Supabase table counts after sync
- Returns `supabase: false` if not configured

---

### 5. Formula Engine ✅

**File**: `server/services/reporting/formula-engine.ts`

**Class**: `FormulaEngine`

**Methods**:
- `calculateMetric(formula, context)` - Evaluates formula with variable substitution
  - Supports: `+`, `-`, `*`, `/`, `()`, variable names
  - Example: `"(conversions / trials) * 100"` with `{ conversions: 10, trials: 50 }` → `20`

- `validateFormula(formula, allowedVariables)` - Validates formula syntax
  - Checks: length limit (500 chars), allowed characters, balanced parentheses, valid variables

- `testFormula(formula, context)` - Tests formula with sample data

**Security**:
- Validates expression before evaluation
- Only allows numbers, operators, parentheses
- Uses `Function` constructor instead of raw `eval()`

---

### 6. Metric Configuration Defaults ✅

**File**: `configs/report-metric-defaults.ts`

**Interface**: `ReportMetricConfig`
```typescript
{
  metricId: string;
  label: string;
  description: string;
  defaultFormula: string;
  sourceFields: string[];
  aiSuggestedFormula?: string;
  manualFormula?: string;
  updatedAt?: Date;
}
```

**Default Metrics**:
1. `conversionRate` - 轉換率: `(conversions / trials) * 100`
2. `trialCompletionRate` - 體驗課完成率: `(purchases / trials) * 100`
3. `potentialRevenue` - 潛在收益: `pending * avgDealAmount`
4. `avgConversionTime` - 平均轉換時間: `avgConversionDays`
5. `totalRevenue` - 總收益: `totalDealAmount`
6. `avgDealAmount` - 平均客單價: `totalRevenue / conversions`

**Available Variables**:
- `trials`, `conversions`, `purchases`, `pending`
- `revenue`, `totalRevenue`, `totalDealAmount`
- `avgDealAmount`, `avgConversionDays`

---

## TODO: Remaining Tasks

### 7. Storage Layer for Metric Configs ⏳

**File to Update**: `server/storage.ts`

**Add**:
```typescript
// In-memory storage for metric configs
reportMetricConfigs: Map<string, ReportMetricConfig>

// Methods
getReportMetricConfigs(): Promise<ReportMetricConfig[]>
getReportMetricConfig(metricId: string): Promise<ReportMetricConfig | null>
updateReportMetricConfig(metricId: string, updates: Partial<ReportMetricConfig>): Promise<ReportMetricConfig>
```

**Initialization**: Load from `DEFAULT_METRIC_CONFIGS` on startup

---

### 8. Metric Config Service ⏳

**File to Create**: `server/services/reporting/report-metric-config-service.ts`

**Methods**:
- `getAllConfigs()` - Get all metric configurations
- `getConfig(metricId)` - Get specific configuration
- `updateConfig(metricId, updates)` - Update configuration (saves `manualFormula`, `updatedAt`)
- `resetConfig(metricId)` - Reset to default formula

---

### 9. Metric Config API Routes ⏳

**File to Update**: `server/routes.ts`

**Add Routes**:
```typescript
GET  /api/report-metrics/config           // Get all configs
GET  /api/report-metrics/config/:metricId // Get specific config
POST /api/report-metrics/config           // Update config
  Body: { metricId: string; manualFormula?: string; sourceFields?: string[] }
DELETE /api/report-metrics/config/:metricId // Reset to default
```

**Middleware**: `isAuthenticated`

---

### 10. TotalReportService - Read from Supabase ⏳

**File to Update**: `server/services/reporting/total-report-service.ts`

**Changes Needed**:

1. **Add Supabase Data Source**:
```typescript
import { supabaseReportRepository } from './supabase-report-repository';
import { formulaEngine } from './formula-engine';
import { reportMetricConfigService } from './report-metric-config-service';
```

2. **Update `generateReport()`**:
```typescript
// Try Supabase first
if (supabaseReportRepository.isAvailable()) {
  try {
    const [attendanceData, purchaseData, eodsData] = await Promise.all([
      supabaseReportRepository.getAttendance(dateRange),
      supabaseReportRepository.getPurchases(dateRange),
      supabaseReportRepository.getDeals(dateRange),
    ]);

    // Convert SupabaseDataRow to storage format
    // ... proceed with calculations

    return { mode: 'live', ...results };
  } catch (error) {
    warnings.push('Supabase 查詢失敗，fallback 至 local storage');
  }
}

// Fallback to storage
const spreadsheets = await storage.listSpreadsheets();
// ... existing logic
```

3. **Update `calculateSummaryMetrics()`**:
```typescript
// Load metric configs
const configs = await reportMetricConfigService.getAllConfigs();

// For each metric, check if manualFormula exists
const conversionRateConfig = configs.find(c => c.metricId === 'conversionRate');
if (conversionRateConfig?.manualFormula) {
  try {
    const result = formulaEngine.calculateMetric(
      conversionRateConfig.manualFormula,
      { trials, conversions, purchases, pending, ... }
    );
    if (result !== null) {
      conversionRate = result;
    } else {
      warnings.push('轉換率公式計算失敗，使用預設計算');
    }
  } catch (error) {
    warnings.push(`轉換率公式錯誤: ${error}`);
  }
}
```

---

### 11. Frontend: Control Panel Buttons ⏳

**File to Update**: `client/src/pages/dashboard-total-report.tsx`

**Add to Control Panel**:
```tsx
<div className="flex gap-2">
  <Button variant="outline" onClick={handleIntrospectSheets}>
    <Search className="h-4 w-4 mr-2" />
    欄位盤點
  </Button>
  <Button variant="outline" onClick={() => setMetricSettingsOpen(true)}>
    <Settings className="h-4 w-4 mr-2" />
    指標設定
  </Button>
</div>
```

**Add State**:
```tsx
const [metricSettingsOpen, setMetricSettingsOpen] = useState(false);
const [introspectResult, setIntrospectResult] = useState<any>(null);
```

**Add Handler**:
```tsx
const handleIntrospectSheets = async () => {
  try {
    const response = await fetch('/api/tools/introspect-sheets', {
      method: 'POST',
      credentials: 'include',
    });
    const json = await response.json();
    if (json.success) {
      toast({ title: '欄位盤點完成', description: `分析了 ${json.data.worksheetCount} 個工作表` });
      setIntrospectResult(json.data);
    }
  } catch (error) {
    toast({ title: '盤點失敗', variant: 'destructive' });
  }
};
```

**Load Latest Introspection on Mount**:
```tsx
useEffect(() => {
  fetch('/api/tools/introspect-sheets/latest', { credentials: 'include' })
    .then(res => res.json())
    .then(json => {
      if (json.success && json.data) {
        setIntrospectResult(json.data);
      }
    });
}, []);
```

**Display Introspection Info**:
```tsx
{introspectResult && (
  <div className="text-sm text-muted-foreground">
    最近盤點：{format(new Date(introspectResult.analysisDate), 'yyyy-MM-dd HH:mm')} ·
    工作表數：{introspectResult.worksheetCount}
  </div>
)}
```

---

### 12. Frontend: Metric Settings Dialog ⏳

**File to Create**: `client/src/components/total-report/report-metric-settings-dialog.tsx`

**Component**: `ReportMetricSettingsDialog`

**Props**:
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}
```

**Features**:
1. Fetch configs from `GET /api/report-metrics/config`
2. Display table with columns: 指標名稱, 預設公式, 目前公式, 可用欄位
3. Each row has:
   - Textarea for `manualFormula` (editable)
   - Multi-select for `sourceFields` (from introspection or predefined list)
   - "重置" button (calls `DELETE /api/report-metrics/config/:metricId`)
4. "儲存" button (calls `POST /api/report-metrics/config` with all changes)
5. Display available variables with descriptions
6. Real-time formula validation using client-side validation

**Example UI**:
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>指標設定</DialogTitle>
      <DialogDescription>
        自訂報表指標的計算公式
      </DialogDescription>
    </DialogHeader>

    <div className="space-y-4">
      {/* Available Variables */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>可用變數</AlertTitle>
        <AlertDescription>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
            {Object.entries(getAvailableFormulaVariables()).map(([key, label]) => (
              <div key={key}>
                <code className="bg-muted px-1 py-0.5 rounded">{key}</code> - {label}
              </div>
            ))}
          </div>
        </AlertDescription>
      </Alert>

      {/* Metrics Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>指標</TableHead>
            <TableHead>預設公式</TableHead>
            <TableHead>自訂公式</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {configs.map((config) => (
            <TableRow key={config.metricId}>
              <TableCell>
                <div className="font-medium">{config.label}</div>
                <div className="text-sm text-muted-foreground">{config.description}</div>
              </TableCell>
              <TableCell>
                <code className="text-sm bg-muted px-2 py-1 rounded">{config.defaultFormula}</code>
              </TableCell>
              <TableCell>
                <Textarea
                  value={config.manualFormula || ''}
                  onChange={(e) => handleFormulaChange(config.metricId, e.target.value)}
                  placeholder="留空使用預設公式"
                  rows={2}
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset(config.metricId)}
                >
                  重置
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        取消
      </Button>
      <Button onClick={handleSave}>
        儲存
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### 13. Documentation Updates ⏳

**File**: `docs/data-overview.md`

**Add Sections**:

```markdown
## Supabase 資料同步流程

### 環境設定
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 同步機制
1. Google Sheets → Local Storage (既有功能)
2. Google Sheets → Supabase (新增功能)
3. 報表優先讀取 Supabase，失敗時 fallback 至 Storage

### 資料表結構
- `trial_class_attendance` - 體驗課上課記錄
- `trial_class_purchase` - 體驗課購買記錄
- `eods_for_closers` - 成交記錄

每筆資料包含：
- 標準化欄位（student_name, teacher_name, class_date 等）
- raw_data（JSONB，保留原始欄位）
- 來源追蹤（source_spreadsheet_id, origin_row_index）

## 欄位盤點操作方式

1. 點擊控制面板的「欄位盤點」按鈕
2. 系統會分析所有 Google Sheets 工作表的欄位結構
3. 結果包含：
   - 各工作表的欄位清單
   - 欄位類型推測
   - 資料範例
4. 可下載 `docs/google-sheets-schema.md` 查看完整報告

## 指標設定流程

1. 點擊「指標設定」按鈕開啟設定對話框
2. 查看各指標的預設公式
3. 在「自訂公式」欄位輸入新公式
   - 使用可用變數（trials, conversions, purchases 等）
   - 支援四則運算：+ - * / ()
   - 範例：`(conversions / trials) * 100`
4. 點擊「儲存」套用變更
5. 報表會立即使用新公式重新計算

## 資料模式說明

- **Mock Mode**: 使用模擬資料（無 Google Sheets 憑證時）
- **Live Mode**: 從 Storage 讀取真實資料
- **Supabase Mode**: 從 Supabase 讀取真實資料（優先使用）

系統會自動選擇最佳資料來源，並在 warnings 中說明使用的模式。
```

**File**: `QUICK_START_v2.md`

**Update**:

```markdown
## 環境變數設定

### 必要設定
```bash
# Database (既有)
DATABASE_URL=postgresql://...

# Session (既有)
SESSION_SECRET=your-session-secret

# Google Sheets (既有)
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account",...}
```

### 選用設定（強烈建議）
```bash
# Supabase (新增)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase 設定步驟

1. 前往 [Supabase](https://supabase.com/) 建立專案
2. 執行 `docs/supabase-schema.sql` 建立資料表
3. 在 Project Settings → API 取得：
   - `SUPABASE_URL`
   - `service_role` key (非 `anon` key)
4. 設定環境變數並重啟服務

## 開發模式測試資料

### 建立測試資料
```bash
# 方法 1: API 呼叫
curl -X POST http://localhost:3000/api/dev/seed-total-report \
  -H "Cookie: connect.sid=..." \
  -H "Content-Type: application/json"

# 方法 2: 前端按鈕
1. 登入後進入「數據總報表」頁面
2. 點擊「建立測試資料」按鈕
3. 查看 toast 確認建立成功
```

回傳範例：
```json
{
  "success": true,
  "data": {
    "spreadsheetsCreated": 3,
    "worksheetsCreated": 3,
    "dataRowsInserted": 150,
    "supabaseRowsInserted": 150,
    "supabase": true
  }
}
```

### 查看資料
- Local Storage: 透過現有 API
- Supabase: 直接查詢資料庫或使用 Supabase Dashboard

## 欄位盤點與指標設定

### 欄位盤點
```bash
# API 呼叫
POST /api/tools/introspect-sheets

# 或使用前端按鈕
1. 數據總報表頁面
2. 點擊「欄位盤點」
3. 查看分析結果
```

### 指標設定
1. 點擊「指標設定」按鈕
2. 修改公式（例如：`(conversions / trials) * 100`）
3. 點擊「儲存」
4. 報表自動重新載入並使用新公式
```

---

## Verification Checklist

### Backend
- [ ] `npm run check` passes
- [ ] `npm run build` succeeds
- [ ] Supabase client initializes without errors (with/without env vars)
- [ ] DevSeedService returns Supabase row counts
- [ ] Google Sheets sync writes to both storage and Supabase
- [ ] Formula engine validates and calculates correctly

### API Routes
- [ ] `GET /api/report-metrics/config` returns all configs
- [ ] `POST /api/report-metrics/config` updates config successfully
- [ ] `POST /api/dev/seed-total-report` creates Supabase data
- [ ] `GET /api/reports/total-report` reads from Supabase first

### Frontend
- [ ] 欄位盤點 button triggers introspection
- [ ] 指標設定 button opens dialog
- [ ] Metric settings dialog loads configs
- [ ] Formula changes save and trigger report refresh
- [ ] Warnings display when Supabase unavailable

### Documentation
- [ ] `data-overview.md` updated with Supabase flow
- [ ] `QUICK_START_v2.md` updated with env vars
- [ ] `supabase-schema.sql` provided
- [ ] Example `.env.example` includes Supabase vars

---

## Environment Variables (.env.example)

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Session
SESSION_SECRET=your-random-secret-key

# Google Sheets (optional, uses mock data if not set)
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"..."}

# Supabase (optional, fallback to storage if not set)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server
PORT=3000
NODE_ENV=development
```

---

## Next Steps

1. Complete storage layer for metric configs
2. Create metric config service
3. Add API routes for metric configuration
4. Update TotalReportService to read from Supabase
5. Implement frontend control panel buttons
6. Create ReportMetricSettingsDialog component
7. Update documentation files
8. Run full end-to-end tests
9. Deploy Supabase schema to production
10. Update deployment documentation

---

## Notes

- All Supabase operations gracefully degrade if not configured
- Formula engine uses safe evaluation with validation
- Metric configs stored in memory (can be persisted to DB later)
- Raw data preserved in JSONB for flexibility
- Field mapping ensures consistency across sources

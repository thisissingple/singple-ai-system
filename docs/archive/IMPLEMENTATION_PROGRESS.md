# Supabase Integration Implementation Progress

**Date**: 2025-10-01
**Build Status**: ✅ PASSING (296.7kb server, 842.89kb client)

---

## 🎯 Overall Progress: 60% Complete

### ✅ Completed (Core Infrastructure)

#### 1. Supabase Foundation
- [x] Supabase client with environment variable validation
- [x] Graceful degradation when credentials missing
- [x] Database schema with 3 normalized tables
- [x] Row Level Security policies
- [x] Automatic updated_at triggers
- [x] Aggregate metrics view for reporting

**Files**:
- `server/services/supabase-client.ts` (111 lines)
- `docs/supabase-schema.sql` (186 lines)

#### 2. Data Repository Layer
- [x] SupabaseReportRepository with full CRUD operations
- [x] Date range filtering for all tables
- [x] Table count queries
- [x] Aggregate metrics calculation
- [x] AI metrics placeholder

**Files**:
- `server/services/reporting/supabase-report-repository.ts` (314 lines)

#### 3. Google Sheets Sync Integration
- [x] Automatic sync to Supabase after storage sync
- [x] Spreadsheet name pattern matching to determine target table
- [x] Field normalization using field-mapping-v2
- [x] Batch insert (500 rows per batch)
- [x] raw_data preservation as JSONB
- [x] Graceful handling of Supabase unavailable

**Files Modified**:
- `server/services/google-sheets.ts` (+116 lines)

#### 4. Dev Seed Service Enhancement
- [x] Supabase row count reporting
- [x] Availability status flag
- [x] Updated return type with Supabase metrics

**Files Modified**:
- `server/services/dev-seed-service.ts` (+12 lines)

#### 5. Formula Engine
- [x] Safe formula evaluation with validation
- [x] Support for +, -, *, /, ()
- [x] Variable substitution
- [x] Formula syntax validation
- [x] Test execution with sample context

**Files**:
- `server/services/reporting/formula-engine.ts` (148 lines)

#### 6. Metric Configuration Defaults
- [x] 6 default metric configs
- [x] Formula and field definitions
- [x] Available variables documentation

**Files**:
- `configs/report-metric-defaults.ts` (73 lines)

#### 7. Documentation
- [x] Comprehensive Supabase schema SQL
- [x] Implementation summary document
- [x] Environment variables example
- [x] Progress tracking document (this file)

**Files**:
- `.env.example` (new)
- `SUPABASE_INTEGRATION_SUMMARY.md` (new, 400+ lines)
- `TOTAL_REPORT_REFACTORING.md` (existing, updated)

---

### ⏳ In Progress / TODO

#### 8. Storage Layer for Metric Configs (15 minutes)
**Priority**: HIGH

**Tasks**:
- [ ] Add `reportMetricConfigs` Map to storage.ts
- [ ] Implement `getReportMetricConfigs()`
- [ ] Implement `getReportMetricConfig(metricId)`
- [ ] Implement `updateReportMetricConfig(metricId, updates)`
- [ ] Initialize from DEFAULT_METRIC_CONFIGS on startup

**Complexity**: LOW - Similar to existing storage patterns

---

#### 9. Metric Config Service (20 minutes)
**Priority**: HIGH

**File to Create**: `server/services/reporting/report-metric-config-service.ts`

**Tasks**:
- [ ] Create ReportMetricConfigService class
- [ ] Implement `getAllConfigs()`
- [ ] Implement `getConfig(metricId)`
- [ ] Implement `updateConfig(metricId, updates)`
- [ ] Implement `resetConfig(metricId)`
- [ ] Export singleton instance

**Dependencies**: Storage layer must be complete

---

#### 10. Metric Config API Routes (15 minutes)
**Priority**: HIGH

**File to Update**: `server/routes.ts`

**Tasks**:
- [ ] `GET /api/report-metrics/config` - List all
- [ ] `GET /api/report-metrics/config/:metricId` - Get one
- [ ] `POST /api/report-metrics/config` - Update
- [ ] `DELETE /api/report-metrics/config/:metricId` - Reset
- [ ] Add isAuthenticated middleware
- [ ] Add error handling

**Example Implementation**:
```typescript
// GET /api/report-metrics/config
app.get('/api/report-metrics/config', isAuthenticated, async (req, res) => {
  try {
    const configs = await reportMetricConfigService.getAllConfigs();
    res.json({ success: true, data: configs });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// POST /api/report-metrics/config
app.post('/api/report-metrics/config', isAuthenticated, async (req, res) => {
  try {
    const { metricId, manualFormula, sourceFields } = req.body;

    // Validate formula
    const validation = formulaEngine.validateFormula(
      manualFormula,
      Object.keys(getAvailableFormulaVariables())
    );

    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const updated = await reportMetricConfigService.updateConfig(metricId, {
      manualFormula,
      sourceFields,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});
```

---

#### 11. TotalReportService - Supabase Integration (45 minutes)
**Priority**: CRITICAL

**File to Update**: `server/services/reporting/total-report-service.ts`

**Tasks**:
- [ ] Import supabaseReportRepository
- [ ] Import formulaEngine
- [ ] Import reportMetricConfigService
- [ ] Add Supabase data fetching logic in `generateReport()`
- [ ] Convert SupabaseDataRow to internal format
- [ ] Implement formula-based metric calculation in `calculateSummaryMetrics()`
- [ ] Add fallback logic when Supabase fails
- [ ] Update warnings for Supabase status

**Key Changes**:

```typescript
// In generateReport()
if (supabaseReportRepository.isAvailable()) {
  try {
    const [attendanceData, purchaseData, eodsData] = await Promise.all([
      supabaseReportRepository.getAttendance(dateRange),
      supabaseReportRepository.getPurchases(dateRange),
      supabaseReportRepository.getDeals(dateRange),
    ]);

    // Convert to internal format
    const convertedAttendance = attendanceData.map(row => ({
      id: row.id,
      data: {
        student_name: row.student_name,
        student_email: row.student_email,
        teacher_name: row.teacher_name,
        class_date: row.class_date,
        // ... other fields
        ...row.raw_data, // Include original fields
      },
      lastUpdated: new Date(row.synced_at),
    }));

    // ... proceed with calculations using converted data

    return { mode: 'live', ...results };
  } catch (error) {
    console.error('Supabase query failed:', error);
    warnings.push('Supabase 查詢失敗，fallback 至 local storage');
    // Continue to storage fallback below
  }
}

// Existing storage logic as fallback
```

```typescript
// In calculateSummaryMetrics()
const configs = await reportMetricConfigService.getAllConfigs();

// Prepare context for formula engine
const formulaContext = {
  trials: totalTrials,
  conversions: totalConversions,
  purchases: purchaseData.length,
  pending: purchaseData.length - totalConversions,
  avgDealAmount,
  avgConversionDays: avgConversionTime,
  totalRevenue: potentialRevenue,
  // ... other variables
};

// Calculate each metric with custom formula support
const conversionRateConfig = configs.find(c => c.metricId === 'conversionRate');
let conversionRate = totalTrials > 0 ? (totalConversions / totalTrials) * 100 : 0;

if (conversionRateConfig?.manualFormula) {
  const customResult = formulaEngine.calculateMetric(
    conversionRateConfig.manualFormula,
    formulaContext
  );

  if (customResult !== null) {
    conversionRate = customResult;
  } else {
    warnings.push('轉換率自訂公式計算失敗，使用預設計算');
  }
}

// Repeat for other metrics...
```

---

#### 12. Frontend - Control Panel Buttons (30 minutes)
**Priority**: HIGH

**File to Update**: `client/src/pages/dashboard-total-report.tsx`

**Tasks**:
- [ ] Import Search, Settings icons from lucide-react
- [ ] Add state for metric settings dialog
- [ ] Add state for introspection result
- [ ] Add "欄位盤點" button with handler
- [ ] Add "指標設定" button with handler
- [ ] Fetch latest introspection on component mount
- [ ] Display introspection info if available
- [ ] Add ReportMetricSettingsDialog component

**Code Additions**:
```tsx
// Imports
import { Search, Settings } from 'lucide-react';

// State
const [metricSettingsOpen, setMetricSettingsOpen] = useState(false);
const [introspectResult, setIntrospectResult] = useState<any>(null);

// Load latest introspection
useEffect(() => {
  fetch('/api/tools/introspect-sheets/latest', { credentials: 'include' })
    .then(res => res.json())
    .then(json => {
      if (json.success && json.data) {
        setIntrospectResult(json.data);
      }
    })
    .catch(console.error);
}, []);

// Handlers
const handleIntrospectSheets = async () => {
  try {
    const response = await fetch('/api/tools/introspect-sheets', {
      method: 'POST',
      credentials: 'include',
    });
    const json = await response.json();
    if (json.success) {
      toast({
        title: '欄位盤點完成',
        description: `分析了 ${json.data.worksheetCount} 個工作表`
      });
      setIntrospectResult(json.data);
    } else {
      throw new Error(json.error);
    }
  } catch (error) {
    toast({
      title: '欄位盤點失敗',
      description: String(error),
      variant: 'destructive'
    });
  }
};

// In JSX (in control panel area)
<div className="flex items-center gap-2">
  <Button variant="outline" size="sm" onClick={handleIntrospectSheets}>
    <Search className="h-4 w-4 mr-2" />
    欄位盤點
  </Button>
  <Button variant="outline" size="sm" onClick={() => setMetricSettingsOpen(true)}>
    <Settings className="h-4 w-4 mr-2" />
    指標設定
  </Button>
</div>

{introspectResult && (
  <div className="text-xs text-muted-foreground">
    最近盤點：{format(new Date(introspectResult.analysisDate), 'yyyy-MM-dd HH:mm')} ·
    工作表：{introspectResult.worksheetCount}
  </div>
)}

{/* Add dialog component */}
<ReportMetricSettingsDialog
  open={metricSettingsOpen}
  onOpenChange={setMetricSettingsOpen}
  onSave={() => {
    refetch(); // Reload report with new formulas
  }}
/>
```

---

#### 13. Frontend - Metric Settings Dialog (60 minutes)
**Priority**: HIGH

**File to Create**: `client/src/components/total-report/report-metric-settings-dialog.tsx`

**Tasks**:
- [ ] Create component with Dialog from Radix UI
- [ ] Fetch configs from API on mount
- [ ] Display available variables info
- [ ] Render table with all metrics
- [ ] Add textarea for formula editing
- [ ] Add reset button per metric
- [ ] Add save button with validation
- [ ] Handle loading and error states
- [ ] Call onSave callback after successful save

**Component Structure**:
```tsx
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ReportMetricSettingsDialog({ open, onOpenChange, onSave }: Props) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [changes, setChanges] = useState<Record<string, string>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadConfigs();
    }
  }, [open]);

  const loadConfigs = async () => {
    try {
      const response = await fetch('/api/report-metrics/config', {
        credentials: 'include',
      });
      const json = await response.json();
      if (json.success) {
        setConfigs(json.data);
      }
    } catch (error) {
      toast({ title: '載入失敗', variant: 'destructive' });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const [metricId, formula] of Object.entries(changes)) {
        await fetch('/api/report-metrics/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ metricId, manualFormula: formula }),
        });
      }
      toast({ title: '儲存成功' });
      setChanges({});
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast({ title: '儲存失敗', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (metricId: string) => {
    try {
      await fetch(`/api/report-metrics/config/${metricId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      toast({ title: '已重置為預設公式' });
      loadConfigs();
      onSave();
    } catch (error) {
      toast({ title: '重置失敗', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        {/* Implementation as shown in SUPABASE_INTEGRATION_SUMMARY.md */}
      </DialogContent>
    </Dialog>
  );
}
```

---

#### 14. Documentation Updates (20 minutes)
**Priority**: MEDIUM

**Files to Update**:
- [ ] `docs/data-overview.md` - Add Supabase sync flow, field inspection, metric settings
- [ ] `QUICK_START_v2.md` - Add Supabase setup, test data creation, metric configuration
- [ ] Create `docs/SUPABASE_SETUP.md` - Detailed Supabase configuration guide
- [ ] Update `README.md` - Add Supabase to feature list

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] Supabase client initializes with valid credentials
- [ ] Supabase client degrades gracefully without credentials
- [ ] Google Sheets sync writes to Supabase successfully
- [ ] DevSeedService creates data in Supabase
- [ ] SupabaseReportRepository queries return correct data
- [ ] Formula engine validates formulas correctly
- [ ] Formula engine calculates metrics accurately
- [ ] Metric config service CRUD operations work
- [ ] API routes return proper responses

### Frontend Testing
- [ ] 欄位盤點 button triggers introspection
- [ ] Introspection result displays correctly
- [ ] 指標設定 button opens dialog
- [ ] Metric settings dialog loads configurations
- [ ] Formula textarea accepts input
- [ ] Save button persists changes
- [ ] Reset button reverts to default
- [ ] Report refreshes with new formulas

### Integration Testing
- [ ] End-to-end flow: Sync → Storage → Supabase → Report
- [ ] Fallback flow: Supabase fails → Storage succeeds
- [ ] Formula override flow: Set formula → Save → Report recalculates
- [ ] Dev seed flow: Create test data → Verify in Supabase → View in report

---

## 📊 Time Estimates

| Task | Estimated Time | Priority | Complexity |
|------|----------------|----------|------------|
| Storage layer for metric configs | 15 min | HIGH | LOW |
| Metric config service | 20 min | HIGH | LOW |
| Metric config API routes | 15 min | HIGH | LOW |
| TotalReportService Supabase integration | 45 min | CRITICAL | MEDIUM |
| Frontend control panel buttons | 30 min | HIGH | LOW |
| Frontend metric settings dialog | 60 min | HIGH | MEDIUM |
| Documentation updates | 20 min | MEDIUM | LOW |
| Testing & validation | 30 min | HIGH | LOW |

**Total Remaining**: ~3.5 hours

---

## 🚀 Deployment Steps

### 1. Supabase Setup
```bash
# 1. Create Supabase project
# 2. Run schema
psql -h db.your-project.supabase.co -U postgres -f docs/supabase-schema.sql

# 3. Verify tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

### 2. Environment Variables
```bash
# Production .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 3. Initial Data Sync
```bash
# Trigger sync for existing spreadsheets
curl -X POST https://your-domain.com/api/spreadsheets/sync-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Verification
```bash
# Check Supabase data
curl https://your-domain.com/api/reports/total-report?period=monthly
# Should return mode: 'live' and supabase row counts
```

---

## 📝 Known Limitations & Future Enhancements

### Current Limitations
- Metric configs stored in memory (reset on restart)
- Formula validation allows only basic arithmetic
- No formula syntax highlighting in UI
- No undo/redo for formula changes
- No formula version history

### Future Enhancements
1. **Persistent Metric Config Storage**
   - Move from memory to database
   - Add change history tracking
   - Support metric config templates

2. **Advanced Formula Features**
   - Support for functions (SUM, AVG, MAX, MIN)
   - Conditional logic (IF, SWITCH)
   - Date/time functions
   - String manipulation

3. **Formula Editor Improvements**
   - Syntax highlighting
   - Auto-completion for variables
   - Real-time validation
   - Formula testing with live data

4. **AI Integration**
   - AI-suggested formulas based on data patterns
   - Natural language formula generation
   - Anomaly detection in metrics

5. **Performance Optimization**
   - Caching for frequently accessed queries
   - Incremental sync instead of full sync
   - Materialized views for aggregates

---

## 📚 References

- Supabase Docs: https://supabase.com/docs
- Formula Engine Pattern: Function constructor for safe eval
- Field Mapping: field-mapping-v2.ts with resolveField utilities
- Metric Configs: configs/report-metric-defaults.ts

---

## ✅ Sign-off Checklist

Before marking this feature as complete:

- [ ] All TODO items completed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Build succeeds without warnings
- [ ] Peer review completed
- [ ] Deployed to staging
- [ ] User acceptance testing passed
- [ ] Deployed to production
- [ ] Monitoring configured

---

**Last Updated**: 2025-10-01
**Next Review**: After completing TotalReportService Supabase integration

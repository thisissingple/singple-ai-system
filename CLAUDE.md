# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An educational institution data dashboard system that integrates Google Sheets data to provide real-time KPI tracking, visual reports, and AI-driven strategic recommendations. The system includes a custom form builder for dynamic form creation.

**Tech Stack**: Node.js/Express (backend), React/Vite (frontend), PostgreSQL/Supabase (database), TypeScript

## Commands

### Development
```bash
npm run dev              # Start development server (port 5001)
npm run dev:clean        # Kill existing tsx processes and restart
npm run build            # Build production bundle
npm start                # Start production server
npm run check            # Run TypeScript type checking
```

### Testing
```bash
npx tsx tests/test-kpi-only.ts                # Test KPI calculations (most common)
npx tsx tests/test-ai-field-mapper.ts         # Test AI field mapping
npx tsx tests/test-field-mapping-api.ts       # Test field mapping API
npx tsx tests/test-env-check.ts               # Check environment variables
```

### Database
```bash
npm run db:push                               # Push schema changes (if using Drizzle)
npx tsx scripts/run-migration-011.ts          # Run specific migration
npm run introspect-sheets                     # Introspect Google Sheets structure
```

## Architecture

### Critical Architecture Decision: PostgreSQL Direct Connection

**IMPORTANT**: This project uses `pg` module for direct PostgreSQL connections instead of Supabase Client for new features.

**Why**: Supabase PostgREST Schema Cache is unreliable and doesn't recognize new columns for hours after migration.

**Pattern**:
- ✅ **Use** [`pg-client.ts`](server/services/pg-client.ts) for all new features
- ⚠️ **Legacy features** may still use Supabase Client (preserve if working)
- See [`PG_ARCHITECTURE_DECISION.md`](PG_ARCHITECTURE_DECISION.md) for details

### Data Flow

```
Google Sheets → Supabase (PostgreSQL) → Backend Services → Frontend
                                          ↓
                                    KPI Calculator
                                          ↓
                                    Formula Engine
```

### Core Services

1. **KPI Calculator** ([`kpi-calculator.ts`](server/services/kpi-calculator.ts))
   - **Centralized computation center** for ALL KPI calculations
   - Uses Formula Engine for dynamic calculation
   - AI should modify this file when adding new KPIs
   - Test with: `npx tsx tests/test-kpi-only.ts`

2. **Formula Engine** ([`formula-engine.ts`](server/services/reporting/formula-engine.ts))
   - Parses and executes mathematical formulas
   - Example: `(conversions / trials) * 100`
   - Supports safe variable substitution

3. **Total Report Service** ([`total-report-service.ts`](server/services/reporting/total-report-service.ts))
   - Aggregates data and generates comprehensive reports
   - Calls KPI Calculator for all metrics
   - Generates AI-driven recommendations

4. **Custom Form Service** ([`custom-form-service.ts`](server/services/custom-form-service.ts))
   - Manages dynamic form creation (Form Builder system)
   - Supports 8 field types
   - Two storage modes: unified table or mapped to existing tables
   - Dynamic data sources (teachers, students lists)

5. **Field Mapping Service** ([`field-mapping-v2.ts`](server/services/reporting/field-mapping-v2.ts))
   - Maps Google Sheets columns to database fields
   - Handles field resolution with aliases
   - Critical for data synchronization

6. **Student Knowledge Service** ([`student-knowledge-service.ts`](server/services/student-knowledge-service.ts))
   - **IMPORTANT**: Uses batch UPSERT for performance (500x faster than old version)
   - Manages student knowledge base (`student_knowledge_base` table)
   - Auto-syncs after Google Sheets sync
   - Deletion protection: keeps records even when source data deleted
   - **Calculates interaction dates**: Uses UNION ALL to aggregate first_contact_date and last_interaction_date
   - See [`STUDENT_KNOWLEDGE_BASE_SYSTEM.md`](docs/STUDENT_KNOWLEDGE_BASE_SYSTEM.md) for full documentation

## Adding New KPIs

**AI-Friendly Process** (modify 1-2 files):

1. **Define Metric** in [`report-metric-defaults.ts`](configs/report-metric-defaults.ts):
```typescript
avgRevenuePerStudent: {
  metricId: 'avgRevenuePerStudent',
  label: '每位學員平均收益',
  defaultFormula: 'totalRevenue / trials',
  sourceFields: ['totalRevenue', 'trials'],
}
```

2. **Add Variables** to `formulaContext` in [`kpi-calculator.ts`](server/services/kpi-calculator.ts)

3. Frontend auto-displays the new KPI

See [`AI_KPI_MODIFICATION_GUIDE.md`](docs/AI_KPI_MODIFICATION_GUIDE.md) for detailed instructions.

## Database Migrations

Located in [`supabase/migrations/`](supabase/migrations/):
- Numbered sequentially (001, 002, etc.)
- Recent migrations:
  - `024_create_custom_forms.sql` - Form Builder system
  - `025_add_multiple_roles_support.sql` - Multi-role support
  - `023_rename_all_columns_to_english.sql` - Column standardization

**Multi-Role System**: Users can have multiple roles (e.g., Karen is both teacher and consultant). Use `'teacher' = ANY(roles)` for queries.

## Form Builder System

The Form Builder allows admins to create custom forms without coding.

**Key Files**:
- Backend: [`custom-form-service.ts`](server/services/custom-form-service.ts)
- Frontend Pages:
  - [`form-builder-list.tsx`](client/src/pages/settings/form-builder-list.tsx) - List view
  - [`form-builder-editor.tsx`](client/src/pages/settings/form-builder-editor.tsx) - Editor
  - [`forms-page.tsx`](client/src/pages/forms/forms-page.tsx) - Fill forms
- Components:
  - [`field-editor.tsx`](client/src/components/forms/field-editor.tsx)
  - [`dynamic-form-renderer.tsx`](client/src/components/forms/dynamic-form-renderer.tsx)

**API Endpoints** (9 endpoints):
- `GET /api/database/tables` - List all tables
- `GET /api/database/tables/:name/columns` - Get table columns
- `POST /api/forms/custom` - Create form
- `GET /api/forms/custom` - List forms
- `GET /api/forms/custom/:id` - Get form
- `PUT /api/forms/custom/:id` - Update form
- `DELETE /api/forms/custom/:id` - Delete form
- `POST /api/forms/custom/:id/submit` - Submit form data
- `GET /api/forms/custom/:id/submissions` - Get submissions

## Environment Configuration

**Deployment Workflow**: Local → GitHub → Zeabur
1. **Local Development**: Test on local machine (localhost:5001)
2. **Version Control**: Push to GitHub repository
3. **Production Deployment**: Auto-deploy to Zeabur via GitHub integration

**IMPORTANT**:
- ⚠️ This project is NO LONGER deployed on Replit
- ✅ Production environment: Zeabur (zeabur.com)
- ✅ Local testing required before pushing to GitHub
- ✅ **Environment variables are automatically loaded from `.env` file**
- Port: 5001 (local development)

### Local Environment Variables

**Auto-loading mechanism** (2025-11-18 update):
- ✅ `.env` file exists in project root (NOT committed to Git)
- ✅ `server/index.ts:15` - `dotenv.config({ override: true })` automatically loads `.env`
- ✅ Test scripts updated to load `.env` automatically
- ✅ **DO NOT ask the user for environment variables** - they are already configured
- ✅ See [`ENV_SETUP.md`](ENV_SETUP.md) for complete documentation

**Required Variables** (already configured in `.env`):
```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres.xxx:password@host.supabase.com:5432/postgres
SESSION_DB_URL=postgresql://postgres.xxx:password@host.supabase.com:5432/postgres

# Session & API Keys
SESSION_SECRET=your-random-session-secret
OPENAI_API_KEY=sk-proj-xxxxx

# Google Sheets Service Account Credentials (JSON)
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"your-project",...}

# GitHub Token (optional)
GITHUB_TOKEN=ghp_xxxxx

# Development settings
PORT=5001
NODE_ENV=development
# SKIP_AUTH=true  # Uncomment to bypass authentication in development
```

**Verification**:
```bash
# Check if environment variables are loaded correctly
npx tsx tests/test-env-check.ts
```

## MCP Chrome DevTools Configuration

**IMPORTANT**: MCP servers are project-level and require Claude Code restart after configuration.

### Configuration Status
- ✅ Current project (`singple-ai-system-1`): Configured
- Configuration file: `~/.claude.json` → `projects[project_path].mcpServers`

### Setup Process
```bash
# 1. Configure MCP server (if not already done)
claude mcp add chrome-devtools npx chrome-devtools-mcp@latest

# 2. MUST restart Claude Code for changes to take effect
# MCP servers only load during session initialization

# 3. Verify tools are available
# Try: mcp__chrome-devtools__list_pages
```

### Why Restart is Required
- MCP server runs as independent process (`npx chrome-devtools-mcp@latest`)
- Communication via stdio protocol
- Process spawning happens during session initialization only
- Running sessions cannot dynamically load new MCP servers

### AI Self-Check Procedure
When user requests MCP tools:
1. ✅ Test if tool is available (try calling `mcp__chrome-devtools__list_pages`)
2. ✅ If unavailable, check `~/.claude.json` configuration
3. ✅ If configured but unavailable, remind user to restart Claude Code
4. ✅ If not configured, run `claude mcp add` and request restart

### Common MCP Tools
- `mcp__chrome-devtools__list_pages` - List open browser pages
- `mcp__chrome-devtools__navigate_page` - Navigate to URL
- `mcp__chrome-devtools__take_screenshot` - Capture page screenshot
- `mcp__chrome-devtools__take_snapshot` - Get page a11y tree
- `mcp__chrome-devtools__click` - Click elements
- `mcp__chrome-devtools__fill` - Fill form inputs

See [`PROJECT_PROGRESS.md:540-567`](PROJECT_PROGRESS.md#L540-L567) for detailed usage guide.

---

## Authentication

Located in [`replitAuth.ts`](server/replitAuth.ts):
- Session-based authentication
- Middleware: `isAuthenticated`, `requireAdmin`, `requireActiveUser`
- `SKIP_AUTH` environment variable for development bypass

## Student Knowledge Base System

**IMPORTANT**: The system uses a centralized `student_knowledge_base` table to store aggregated student profiles.

### Key Characteristics
- **Auto-sync**: Automatically syncs after Google Sheets sync
- **Batch UPSERT**: Uses optimized batch processing (500x faster than old version)
- **Deletion Protection**: Keeps records even when source data is deleted (marks as `is_deleted = true`)
- **Performance**: Processes 965 students in 2.58 seconds

### Usage Commands
```bash
# Initial setup (one-time)
npx tsx scripts/backfill-all-students.ts

# Manual sync (if needed)
curl -X POST http://localhost:5001/api/students/sync-all

# Check statistics
npx tsx scripts/check-kb-stats.ts
```

### Critical Implementation Details
- **DO NOT** use the old loop-based sync (causes connection pool timeout)
- **DO** use the batch UPSERT version in `syncAllStudentsToKB()` (Lines 411-521)
- **Full Documentation**: See [`STUDENT_KNOWLEDGE_BASE_SYSTEM.md`](docs/STUDENT_KNOWLEDGE_BASE_SYSTEM.md)

## Directory Structure Highlights

```
server/
├── services/
│   ├── kpi-calculator.ts         ⭐ Central KPI computation
│   ├── custom-form-service.ts    ⭐ Form Builder service
│   ├── student-knowledge-service.ts ⭐ Student KB (batch UPSERT)
│   ├── pg-client.ts              ⭐ PostgreSQL direct connection
│   ├── reporting/                # Report generation
│   │   ├── total-report-service.ts
│   │   ├── formula-engine.ts
│   │   ├── field-mapping-v2.ts
│   │   └── report-metric-config-service.ts
│   ├── sheets/
│   │   └── sync-service.ts       # Google Sheets sync (auto-triggers student sync)
│   ├── legacy/                   # Old Supabase Client code
│   └── deprecated/               # Deprecated services
├── routes.ts                     # API routes (8700+ lines)
└── index.ts                      # Server entry point

client/src/
├── pages/
│   ├── dashboard.tsx             # Main dashboard
│   ├── students/
│   │   └── student-profile-page.tsx  # Student complete profile
│   ├── forms/
│   │   ├── forms-page.tsx       # Form filling UI
│   │   └── trial-class-records.tsx
│   └── settings/
│       ├── form-builder-list.tsx
│       └── form-builder-editor.tsx
└── components/
    └── forms/                    # Form components

configs/
└── report-metric-defaults.ts    ⭐ KPI definitions

scripts/
├── backfill-all-students.ts     # Student KB backfill
└── check-kb-stats.ts            # Check student statistics

supabase/migrations/
└── 037_add_deletion_tracking.sql # Student deletion tracking

docs/
└── STUDENT_KNOWLEDGE_BASE_SYSTEM.md  ⭐ Full student KB documentation
```

## Key Patterns

### API Routes
All routes registered in [`routes.ts`](server/routes.ts). Pattern:
```typescript
app.get('/api/reports/total-report', async (req, res) => {
  const period = req.query.period as PeriodType;
  const report = await totalReportService.generateReport({ period });
  res.json({ success: true, data: report });
});
```

### Database Queries
Use [`pg-client.ts`](server/services/pg-client.ts) utilities:
```typescript
import { createPool, queryDatabase, insertAndReturn } from './pg-client';

const pool = createPool();
const result = await queryDatabase(pool, 'SELECT * FROM users WHERE $1 = ANY(roles)', ['teacher']);
```

### Form Field Types
Supported types: `text`, `email`, `number`, `tel`, `date`, `select`, `textarea`, `checkbox`

### Dynamic Data Sources
Forms can load options from:
- Manual input
- `/api/teachers` (teacher list)
- Extensible for other sources (students, etc.)

## Common Workflows

### Adding a New Report Metric
1. Edit [`report-metric-defaults.ts`](configs/report-metric-defaults.ts)
2. Update `formulaContext` in [`kpi-calculator.ts`](server/services/kpi-calculator.ts)
3. Test with `npx tsx tests/test-kpi-only.ts`

### Creating a Custom Form
1. Navigate to Settings → Form Builder
2. Click "Create New Form"
3. Configure fields, data source, storage type
4. Assign to tabs (teacher/telemarketing/consultant)
5. Test form submission

### Running Migrations
1. Create migration file in `supabase/migrations/`
2. Number it sequentially (e.g., `026_*.sql`)
3. Run manually or via Supabase dashboard
4. Update services to use new schema

## Project Status

See [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md) for detailed progress tracking.

**Current Phase**: Phase 15 Complete (Form Builder System)
- ✅ Phases 1-15: Core features, KPI system, Form Builder
- ⏳ Phase 16: Testing and validation
- ⏳ Phase 17: Production deployment

## Important Documentation

- [`PROJECT_PROGRESS.md`](PROJECT_PROGRESS.md) - Comprehensive progress tracking
- [`README.md`](README.md) - Project overview and quick start
- [`AI_KPI_MODIFICATION_GUIDE.md`](docs/AI_KPI_MODIFICATION_GUIDE.md) - AI guide for KPI changes
- [`PG_ARCHITECTURE_DECISION.md`](PG_ARCHITECTURE_DECISION.md) - Why direct PostgreSQL connection
- [`FORM_SYSTEM_COMPLETE.md`](FORM_SYSTEM_COMPLETE.md) - Form system documentation

## Development Notes

- **Port Management**: Never hardcode ports. Use `process.env.PORT` (Replit auto-assigns)
- **Graceful Shutdown**: Server handles SIGTERM/SIGINT for Replit restarts
- **Error Handling**: Centralized error handler in [`index.ts`](server/index.ts)
- **WebSocket**: Server supports WebSocket for real-time updates (port 5000)
- **Session Store**: Uses PostgreSQL for session storage (`connect-pg-simple`)

## Testing Philosophy

- Test KPI calculations independently: `test-kpi-only.ts`
- Test field mapping logic: `test-ai-field-mapper.ts`
- Test API endpoints: `test-field-mapping-api.ts`
- Check environment setup: `test-env-check.ts`

## ⚠️ MCP 驗證要求（強制執行）

**CRITICAL**: 每次完成前端 UI 修改後，**必須**使用 MCP Chrome DevTools 進行驗證，確認功能正常後才能告知用戶已完成。

### 驗證流程

1. **修改完成後**：使用 `mcp__chrome-devtools__take_snapshot` 檢查頁面狀態
2. **觸發更新**：點擊相關按鈕（如「重新計算」）觸發 API 呼叫
3. **等待載入**：使用 `mcp__chrome-devtools__wait_for` 等待頁面更新完成
4. **確認結果**：再次 snapshot 確認修改已生效
5. **報告驗收**：只有在 MCP 驗證通過後，才能告訴用戶「已完成，可以驗收」

### 驗證範例

```
1. take_snapshot → 檢查當前狀態
2. click 按鈕 → 觸發操作
3. wait_for "按鈕文字" → 等待載入完成
4. take_snapshot → 確認結果正確
5. 告知用戶：「MCP 驗證通過，功能正常」
```

### 常見驗證項目

- 姓名顯示格式是否正確
- 業績分類是否正確（一般業績/其他業績）
- 數字計算是否正確
- 表格資料是否正確顯示
- 錯誤提示是否正確處理

**禁止行為**：
- ❌ 修改完程式碼就直接說「已完成」
- ❌ 只看程式碼邏輯就認定功能正常
- ❌ 跳過 MCP 驗證步驟

## Database Best Practices

### Date and Time Handling

**CRITICAL**: Understanding PostgreSQL date types is essential for correct sorting and filtering.

**Date Types**:
- `DATE`: Stores only date (YYYY-MM-DD), no time information
  - Examples in this project: `class_date`, `consultation_date`, `purchase_date`
  - Value example: `2025-11-15 00:00:00` (time is always 00:00:00)
- `TIMESTAMP WITHOUT TIME ZONE`: Stores full date and time
  - Examples in this project: `created_at`
  - Value example: `2025-11-15 14:16:06`

**Common Pitfall: Backfilled Data**
- When backfilling historical data, `created_at` reflects the backfill date, NOT the actual interaction date
- ❌ **WRONG**: Sort by `MAX(created_at)` - backfilled records appear as "recent"
- ✅ **CORRECT**: Sort by actual interaction date fields (`class_date`, `consultation_date`, `purchase_date`)

**Solution: Combining Date + Time**
When you need accurate timestamps for same-day sorting:
```sql
-- Combine DATE field with TIME from created_at
class_date::timestamp + (created_at::time)
-- Example: 2025-11-15 + 14:16:06 = 2025-11-15 14:16:06
```

**Real Example from Student List Sorting**:
```sql
ORDER BY (
  SELECT MAX(interaction_timestamp)
  FROM (
    SELECT
      CASE
        WHEN class_date IS NOT NULL
        THEN class_date::timestamp + (created_at::time)
        ELSE NULL
      END as interaction_timestamp
    FROM trial_class_attendance
    WHERE student_email = skb.student_email AND class_date IS NOT NULL
    UNION ALL
    SELECT
      CASE
        WHEN consultation_date IS NOT NULL
        THEN consultation_date::timestamp + (created_at::time)
        ELSE NULL
      END as interaction_timestamp
    FROM eods_for_closers
    WHERE student_email = skb.student_email AND consultation_date IS NOT NULL
    UNION ALL
    SELECT
      CASE
        WHEN purchase_date IS NOT NULL
        THEN purchase_date::timestamp + (created_at::time)
        ELSE NULL
      END as interaction_timestamp
    FROM trial_class_purchases
    WHERE student_email = skb.student_email AND purchase_date IS NOT NULL
  ) all_interactions
) DESC NULLS LAST
```

**Key Points**:
1. Always filter `IS NOT NULL` to avoid NULL dates appearing first
2. Use `NULLS LAST` in ORDER BY for predictable sorting
3. Combine date fields with `created_at::time` for accurate same-day ordering
4. Never rely solely on `created_at` for historical data sorting

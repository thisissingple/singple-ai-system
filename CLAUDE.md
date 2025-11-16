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
1. **Local Development**: Test on local machine (localhost:5000)
2. **Version Control**: Push to GitHub repository
3. **Production Deployment**: Auto-deploy to Zeabur via GitHub integration

**IMPORTANT**:
- ⚠️ This project is NO LONGER deployed on Replit
- ✅ Production environment: Zeabur (zeabur.com)
- ✅ Local testing required before pushing to GitHub
- Port: 5000 (local development)

**Required Variables**:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_SHEETS_CREDENTIALS={"client_email":"...","private_key":"..."}
PORT=5000  # Set by Replit
NODE_ENV=development|production
```

## Authentication

Located in [`replitAuth.ts`](server/replitAuth.ts):
- Session-based authentication
- Middleware: `isAuthenticated`, `requireAdmin`, `requireActiveUser`
- `SKIP_AUTH` environment variable for development bypass

## Directory Structure Highlights

```
server/
├── services/
│   ├── kpi-calculator.ts         ⭐ Central KPI computation
│   ├── custom-form-service.ts    ⭐ Form Builder service
│   ├── pg-client.ts              ⭐ PostgreSQL direct connection
│   ├── reporting/                # Report generation
│   │   ├── total-report-service.ts
│   │   ├── formula-engine.ts
│   │   ├── field-mapping-v2.ts
│   │   └── report-metric-config-service.ts
│   ├── legacy/                   # Old Supabase Client code
│   └── deprecated/               # Deprecated services
├── routes.ts                     # API routes (400+ lines)
└── index.ts                      # Server entry point

client/src/
├── pages/
│   ├── dashboard.tsx             # Main dashboard
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

supabase/migrations/              # Database migrations
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

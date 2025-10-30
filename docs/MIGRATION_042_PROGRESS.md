# Migration 042: Consultant → Closer Rename Progress

**Date Started**: 2025-10-29
**Priority**: Priority 1 (High)
**Status**: In Progress - Phase 3B

## Overview

Renaming all instances of 'consultant' to 'closer' throughout the entire Singple AI System to match the actual business terminology used by the company.

## Progress Summary

- ✅ **Phase 1**: Data Backups (COMPLETED)
- ✅ **Phase 2**: Migration 042 SQL (COMPLETED)
- ✅ **Phase 3A**: Core Backend Files (COMPLETED)
- 🔄 **Phase 3B**: Remaining Backend Files (IN PROGRESS)
- ⏳ **Phase 4**: Frontend Files (PENDING)
- ⏳ **Phase 5**: Documentation (PENDING)
- ⏳ **Phase 6**: Testing & Verification (PENDING)

---

## Phase 1: Data Backups ✅

### Created Files:
1. `scripts/backup-consultant-data.ts` - Backup script using Supabase client
2. Backup location: `backups/consultant-to-closer/`

### Backup Contents:
- `business_identities_consultant_YYYY-MM-DD.json` - All consultant identity records
- `users_consultant_YYYY-MM-DD.json` - All users with consultant role
- CSV versions for easy viewing
- `rollback_script_YYYY-MM-DD.sql` - Rollback SQL if needed

### Notes:
- Script created but NOT executed yet (requires `npm install` first)
- User should execute backup script before running migration

---

## Phase 2: Migration 042 SQL ✅

### Created Files:
1. `supabase/migrations/042_rename_consultant_to_closer.sql` (310 lines)
2. `scripts/run-migration-042.ts` - Helper script to verify migration

### Migration Steps:
1. Validates current data state
2. Updates `business_identities.identity_type`: consultant → closer
3. Updates `users.roles` array: consultant → closer
4. Updates `users.role` single value: consultant → closer
5. Updates CHECK constraints to include 'closer'
6. Updates `generate_identity_code()` function
7. Verifies migration results
8. Includes rollback script in comments

### Database Changes:
- **business_identities**: identity_type 'consultant' → 'closer'
- **users**: roles array elements 'consultant' → 'closer'
- **users**: role value 'consultant' → 'closer'
- **CHECK constraints**: Updated to allow 'closer' (kept 'consultant' for rollback support)
- **Function**: generate_identity_code() updated for 'closer'

### Status:
- ✅ Migration SQL file created
- ⚠️ NOT executed yet - waiting for user to run manually
- ⚠️ User must execute via Supabase Dashboard or psql command

---

## Phase 3A: Core Backend Files ✅

### Files Updated:

#### 1. `server/routes.ts` ✅
**Changes:**
- Line 5014: Created new `/api/closers` endpoint (replaces /api/consultants)
- Line 5038: Added backward compatibility `/api/consultants` endpoint with deprecation warning
- Line 4380: Renamed `consultants` variable to `closers`
- Line 4388: Renamed `topConsultants` to `topClosers`

**Before:**
```typescript
app.get('/api/consultants', async (req, res) => {
  const result = await queryDatabase(
    `WHERE 'consultant' = ANY(roles)`
  );
  const consultants = result.rows.map(...);
  res.json(consultants);
});

const consultants = calculateConsultantStats(eodsData);
topConsultants: consultants.slice(0, 3)
```

**After:**
```typescript
app.get('/api/closers', async (req, res) => {
  const result = await queryDatabase(
    `WHERE 'closer' = ANY(roles)`
  );
  const closers = result.rows.map(...);
  res.json(closers);
});

// Backward compatibility
app.get('/api/consultants', async (req, res) => {
  console.warn('[DEPRECATED] /api/consultants is deprecated. Use /api/closers instead.');
  // ... queries 'closer' role
});

const closers = calculateCloserStats(eodsData);
topClosers: closers.slice(0, 3)
```

#### 2. `server/routes-employee-management.ts` ✅
**Changes:**
- Lines 64-82: Updated `syncRolesToUser()` function identity mapping

**Before:**
```typescript
if (identityType === 'consultant' && !roles.includes('consultant')) {
  roles.push('consultant');
}
if (identityType === 'sales' && !roles.includes('sales')) {
  roles.push('sales');
}
```

**After:**
```typescript
if (identityType === 'closer' && !roles.includes('closer')) {
  roles.push('closer');
}
// Legacy support
if (identityType === 'consultant' && !roles.includes('closer')) {
  roles.push('closer'); // Map old consultant to closer
}
if (identityType === 'sales' && !roles.includes('setter')) {
  roles.push('setter'); // Map old sales to setter
}
```

#### 3. `server/services/ai-chat-service.ts` ✅
**Changes:**
- Line 262: Renamed method `calculateConsultantStats()` → `calculateCloserStats()`
- Line 263: Renamed variable `consultantMap` → `closerMap`
- Line 266: Renamed variable `consultant` → `closer`
- Line 301: Added deprecated wrapper for backward compatibility
- Line 144: Updated context data: `context.data.closers = this.calculateCloserStats(eodsData)`
- Line 397-399: Updated AI system prompt to mention "Closer" instead of "consultant"

**Before:**
```typescript
private calculateConsultantStats(eodsData: any[]): any[] {
  const consultantMap = new Map<string, any>();
  eodsData.forEach((row) => {
    const consultant = row.data.closer_name || ...;
    // ...
  });
  return Array.from(consultantMap.values())...;
}

context.data.consultants = this.calculateConsultantStats(eodsData);
```

**After:**
```typescript
private calculateCloserStats(eodsData: any[]): any[] {
  const closerMap = new Map<string, any>();
  eodsData.forEach((row) => {
    const closer = row.data.closer_name || ...;
    // ...
  });
  return Array.from(closerMap.values())...;
}

// @deprecated wrapper
private calculateConsultantStats(eodsData: any[]): any[] {
  return this.calculateCloserStats(eodsData);
}

context.data.closers = this.calculateCloserStats(eodsData);
context.data.consultants = context.data.closers; // Legacy
```

#### 4. `server/services/permission-filter-service.ts` ✅
**Changes:**
- Line 9: Updated comment: `teacher/consultant/sales` → `teacher/closer/setter`
- Lines 24-28: Updated interface `UserWithIdentities.identities`:
  - `consultant?: string[]` → `closer?: string[]`
  - `sales?: string[]` → `setter?: string[]`
  - Added `employee?: string[]`
- Lines 161-169: Updated filter building logic
- Lines 191-197: Updated role checks for `income_expense` table
- Lines 223-224: Updated role checks for `cost_profit` table
- Line 307: Updated type union: `'consultant' | 'sales'` → `'closer' | 'setter' | 'employee'`

**Before:**
```typescript
identities: {
  teacher?: string[];
  consultant?: string[];
  sales?: string[];
}

if (user.identities.consultant && ...) {
  filters.push(`consultant_code IN (${consultantCodes})`);
}

if (user.roles.includes('consultant')) {
  filters.push(`consultant_id = '${user.id}'`);
}
```

**After:**
```typescript
identities: {
  teacher?: string[];
  closer?: string[];
  setter?: string[];
  employee?: string[];
}

if (user.identities.closer && ...) {
  filters.push(`consultant_code IN (${closerCodes})`);
  // Note: Database column is still consultant_code
}

if (user.roles.includes('closer')) {
  filters.push(`consultant_id = '${user.id}'`);
  // Note: Database column is still consultant_id
}
```

---

## Phase 3B: Remaining Backend Files 🔄

### Files To Update:

#### 5. `server/services/reporting/total-report-service.ts`
**Status**: Not started
**Expected changes**: Variable names, method calls

#### 6. `server/services/reporting/direct-sql-repository.ts`
**Status**: Not started
**Expected changes**: SQL queries, comments

#### 7. `server/services/reporting/field-mapping-v2.ts`
**Status**: Not started
**Expected changes**: Field name mappings

#### 8. `server/services/legacy/storage.ts`
**Status**: Not started
**Expected changes**: Legacy code (may skip if deprecated)

#### 9. `server/services/income-expense-service.ts`
**Status**: Not started
**Expected changes**: Variable names, queries

#### 10. `server/services/custom-form-service.ts`
**Status**: Not started
**Expected changes**: Dynamic data source configuration

---

## Phase 4: Frontend Files ⏳

### Files To Update (37 files with 'consultant'):

#### High Priority (Pages):
1. `client/src/pages/reports/income-expense-manager.tsx` (31 occurrences - MOST CRITICAL)
2. `client/src/pages/forms/trial-class-records.tsx`
3. `client/src/pages/reports/consultants-report.tsx`

#### Medium Priority (Components):
4. `client/src/components/forms/dynamic-form-renderer.tsx`
5. `client/src/components/forms/field-editor.tsx`

#### Configuration Files:
6. `client/src/config/sidebar-config.tsx` (Update menu labels)
7. `client/src/config/permissions.ts` (Update Role type)
8. `client/src/types/employee.ts` (Update IdentityType)

---

## Phase 5: Documentation ⏳

### Files To Update:

1. `CLAUDE.md` - Main project documentation
2. `PROJECT_PROGRESS.md` - Progress tracking
3. `README.md` - Project overview
4. `docs/AI_KPI_MODIFICATION_GUIDE.md`
5. `FORM_SYSTEM_COMPLETE.md`

---

## Phase 6: Testing & Verification ⏳

### Testing Checklist:

#### Database Tests:
- [ ] Run Migration 042 in Supabase Dashboard
- [ ] Verify all consultant → closer conversions
- [ ] Test generate_identity_code('closer') function
- [ ] Verify no remaining 'consultant' in business_identities
- [ ] Verify all users.roles updated correctly

#### Backend API Tests:
- [ ] Test `/api/closers` endpoint returns correct data
- [ ] Test `/api/consultants` (deprecated) still works
- [ ] Test AI chat service calculateCloserStats()
- [ ] Test permission filtering for closer role
- [ ] Test syncRolesToUser() with closer identity

#### Frontend Tests:
- [ ] Income-expense page dropdown shows correct closers
- [ ] Form builder closer data source works
- [ ] Sidebar "Closer 系統" menu items work
- [ ] No console errors about missing consultant references

#### Integration Tests:
- [ ] Create new closer business identity (code: C00X)
- [ ] Verify closer appears in dropdown menus
- [ ] Submit income-expense record with closer
- [ ] Verify closer can login and see correct data

---

## Important Notes

### Database Column Names:
⚠️ **Database columns are NOT renamed in this phase**:
- `consultant_id` (stays as is)
- `consultant_code` (stays as is)
- `consultant_name` (stays as is)
- `forwarded_to_consultant` (stays as is)

These are ONLY renamed in code logic, not in the database schema. A future migration can rename columns if needed.

### Backward Compatibility:
- Kept `'consultant'` in CHECK constraints for rollback support
- Added deprecated wrapper methods (`calculateConsultantStats`)
- Added legacy API endpoint (`/api/consultants` redirects to `/api/closers`)
- Legacy identity mapping in syncRolesToUser

### Rollback Plan:
If migration fails, execute the rollback script in Migration 042 comments:
```sql
BEGIN;
UPDATE business_identities SET identity_type = 'consultant' WHERE identity_type = 'closer';
UPDATE users SET roles = array_replace(roles, 'closer', 'consultant') WHERE 'closer' = ANY(roles);
-- ... (see full script in migration file)
COMMIT;
```

---

## Next Steps

1. **User Action Required**: Execute backup script
   ```bash
   npm install  # Install dependencies first
   npx tsx scripts/backup-consultant-data.ts
   ```

2. **User Action Required**: Execute Migration 042
   - Option A: Supabase Dashboard SQL Editor
   - Option B: `psql "$SUPABASE_DB_URL" -f supabase/migrations/042_rename_consultant_to_closer.sql`

3. **Continue Phase 3B**: Update remaining 6 backend service files

4. **Phase 4**: Update 37+ frontend files (estimated 1.5 hours)

5. **Phase 5**: Update documentation files (estimated 30 minutes)

6. **Phase 6**: Comprehensive testing (estimated 1 hour)

---

## Estimated Time Remaining

- Phase 3B: 30 minutes (6 files)
- Phase 4: 1.5 hours (37 files)
- Phase 5: 30 minutes (5 files)
- Phase 6: 1 hour (testing)

**Total Remaining**: ~3.5 hours

---

**Last Updated**: 2025-10-29 (Phase 3A Complete)

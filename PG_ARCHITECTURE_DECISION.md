# 🏗️ PostgreSQL 直接連線架構決策

**決策日期**：2025-10-09
**決策原因**：Supabase PostgREST Schema Cache 嚴重過期且不可靠

---

## 📊 問題診斷

### Schema Cache 問題

**症狀**：
- ❌ `trial_class_attendance` 表無法識別關鍵欄位（`student_name`, `class_date`）
- ❌ `telemarketing_calls` 表完全找不到
- ❌ 修改資料庫結構後需等待數小時才生效
- ❌ 手動重新載入指令無效（`NOTIFY pgrst, 'reload schema'`）

**驗證結果**：
```bash
✅ PostgreSQL 直接查詢 - 所有欄位存在且正常
❌ Supabase REST API - Schema Cache 過期，找不到欄位
```

---

## 🎯 最終架構決策

### ✅ 統一使用 `pg` 模組（PostgreSQL 直接連線）

**適用範圍**：
- ✅ **表單系統**（Phase 13-16）：寫入頻繁
- ✅ **新功能開發**：避免 Schema Cache 問題
- ✅ **資料匯入/同步**：大量寫入操作
- ✅ **複雜 SQL 查詢**：JOIN、聚合運算

**保留 Supabase Client 範圍**：
- 舊有功能（已穩定運作）
- Google Sheets 同步服務
- 報表查詢服務（如無 Schema Cache 問題）

---

## 🔧 實作方式

### 統一服務：`pg-client.ts`

**位置**：[server/services/pg-client.ts](server/services/pg-client.ts)

**核心功能**：
```typescript
// 1. 單次查詢（自動管理連線）
import { queryDatabase } from './services/pg-client';

const result = await queryDatabase(
  'SELECT * FROM users WHERE role = $1',
  ['teacher']
);

// 2. INSERT 並回傳資料
import { insertAndReturn } from './services/pg-client';

const newRecord = await insertAndReturn(
  'trial_class_attendance',
  {
    student_name: 'John',
    student_email: 'john@example.com',
    class_date: '2025-10-09'
  },
  ['id', 'created_at']
);

// 3. UPDATE 並回傳資料
import { updateAndReturn } from './services/pg-client';

const updated = await updateAndReturn(
  'users',
  { status: 'inactive' },
  'id = $1',
  ['user-id-123']
);
```

---

## ✅ 已更新的 API 端點

### 表單系統 API

1. **老師名單** - `GET /api/teachers`
   - ✅ 改用 `pg` 直接查詢
   - 查詢 `users` 表，role = 'teacher'

2. **體驗課打卡** - `POST /api/forms/trial-class`
   - ✅ 使用 `insertAndReturn` 統一服務
   - 寫入 `trial_class_attendance` 表

3. **其他表單 API** (待更新)
   - ⏳ 電訪記錄表單
   - ⏳ 諮詢記錄表單

---

## 📋 未來開發規範

### 新功能開發標準

**全部使用 `pg-client` 統一服務**：

```typescript
// ✅ 推薦寫法
import { queryDatabase, insertAndReturn } from './services/pg-client';

app.post('/api/new-feature', async (req, res) => {
  const data = await insertAndReturn('table_name', req.body);
  res.json({ success: true, data });
});

// ❌ 不推薦（除非舊有功能）
import { getSupabaseClient } from './services/supabase-client';
const supabase = getSupabaseClient();
const { data } = await supabase.from('table_name')...;
```

---

## 🔮 未來需求支援

### 1️⃣ 權限控制

**實作方式**：後端 Middleware

```typescript
// 權限檢查中介層
function checkPermission(user, resource) {
  if (user.role === 'teacher' && resource === 'financial-report') {
    return false; // 老師不能看財務報表
  }
  return true;
}

// API 使用
app.get('/api/reports/financial', async (req, res) => {
  if (!checkPermission(req.session.user, 'financial-report')) {
    return res.status(403).json({ error: '無權限' });
  }

  // 查詢資料
  const result = await queryDatabase('SELECT ...');
  res.json(result.rows);
});
```

### 2️⃣ AI + KPI 運算

**實作方式**：後端計算 + AI 分析

```typescript
app.post('/api/ai/calculate-kpi', async (req, res) => {
  // 1. 查詢資料
  const data = await queryDatabase('SELECT ...');

  // 2. AI 分析
  const aiResult = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20241022",
    messages: [{ role: "user", content: `分析：${JSON.stringify(data.rows)}` }]
  });

  // 3. 回傳結果
  res.json({ result: aiResult });
});
```

### 3️⃣ 功能限制

**實作方式**：Role-based Access Control

```typescript
const FEATURE_PERMISSIONS = {
  'ai-analysis': ['admin', 'consultant'],
  'financial-report': ['admin'],
  'trial-class-form': ['teacher', 'admin']
};

function canAccessFeature(userRole, feature) {
  return FEATURE_PERMISSIONS[feature]?.includes(userRole);
}
```

---

## 🎯 優勢總結

### ✅ 使用 `pg` 模組的優勢

1. **穩定可靠** - 永遠是最新資料結構，無快取問題
2. **完全控制** - 手寫 SQL，效能優化更容易
3. **統一架構** - 所有新功能使用相同模式
4. **未來擴展** - 支援權限控制、AI 整合、複雜查詢

### ⚠️ 注意事項

1. **手寫 SQL** - 需注意 SQL Injection（使用參數化查詢 `$1, $2`）
2. **無 TypeScript 自動補全** - 需手動檢查欄位名稱
3. **需手動處理連線** - 使用 `pg-client` 統一服務避免連線洩漏

---

## 📚 相關文件

- [pg-client.ts](server/services/pg-client.ts) - 統一服務實作
- [routes.ts](server/routes.ts) - API 端點實作範例
- [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md) - 專案進度追蹤

---

**結論**：`pg` 模組完全可行，支援所有未來需求！🚀

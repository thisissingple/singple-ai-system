# Phase 19.3: API 權限過濾整合計畫

**建立日期**: 2025-10-17
**目標**: 整合 permission-filter-service 到現有 API endpoints

---

## 🎯 目標

將已完成的 [`permission-filter-service.ts`](../../server/services/permission-filter-service.ts) 整合到所有相關 API，確保資料安全與角色權限正確。

---

## 📋 需要整合的 API Endpoints

### 1. Teaching Quality APIs ⭐ 優先

| Endpoint | 當前狀態 | 需要整合 |
|---------|---------|---------|
| `GET /api/teaching-quality/attendance-records` | ✅ 有基本權限檢查（舊方式） | 🔄 升級到新服務 |
| `GET /api/teaching-quality/analyses` | ❌ 無權限過濾 | ✅ 需要整合 |
| `GET /api/teaching-quality/analyses/:id` | ❌ 無權限過濾 | ✅ 需要整合 |
| `GET /api/teaching-quality/teachers/:teacherId/stats` | ❌ 無權限過濾 | ✅ 需要整合 |

### 2. Income Expense APIs

| Endpoint | 當前狀態 | 需要整合 |
|---------|---------|---------|
| `GET /api/income-expense/records` | ❌ 無權限過濾 | ✅ 需要整合 |
| `GET /api/income-expense/by-teacher/:teacherId` | ❌ 無權限過濾 | ✅ 需要整合 |
| `GET /api/income-expense/summary/:month` | ❌ 無權限過濾 | ✅ 需要整合 |

### 3. Trial Class Attendance (如果有直接 API)

目前 trial_class_attendance 主要透過 teaching-quality API 存取，暫時不需要獨立 API。

---

## 🔧 實作策略

### 方案 A: 在現有 SQL 查詢中加入 WHERE 條件（推薦）

**優點**:
- ✅ 資料庫層面過濾，效能最好
- ✅ 不需要改變太多現有邏輯
- ✅ 與現有 query 整合容易

**範例**:
```typescript
// 取得權限過濾條件
const permissionFilter = await buildPermissionFilter({
  userId: req.user.id,
  tableName: 'trial_class_attendance',
  additionalConditions: 'ai_analysis_id IS NULL'
});

// 整合到 SQL query
const query = `
  SELECT * FROM trial_class_attendance
  WHERE ${permissionFilter}
  ORDER BY class_date DESC
`;
```

---

### 方案 B: 後端過濾（不推薦，效能差）

**缺點**:
- ❌ 需要先拿所有資料再過濾
- ❌ 效能差
- ❌ 不適合大量資料

---

## 📝 實作步驟

### Step 1: 更新 Teaching Quality - Attendance Records API ✅

**檔案**: [`server/routes.ts`](../../server/routes.ts) 第 5405 行

**現有問題**:
- 使用舊的 `teacher_name` 比對（第 5432 行）
- 沒有使用新的 `teacher_code` 欄位
- 沒有處理多重角色（Karen 同時是 teacher + consultant）

**改進後**:
```typescript
app.get('/api/teaching-quality/attendance-records', isAuthenticated, async (req: any, res) => {
  try {
    // 建立權限過濾條件
    const permissionFilter = await buildPermissionFilter({
      userId: req.user.id,
      tableName: 'trial_class_attendance',
      additionalConditions: 'ai_analysis_id IS NULL'
    });

    const query = `
      SELECT
        tca.id,
        tca.student_name,
        tca.class_date,
        tca.teacher_name,
        tca.teacher_code,
        tca.status,
        tca.ai_analysis_id
      FROM trial_class_attendance tca
      WHERE ${permissionFilter}
      ORDER BY tca.class_date DESC
      LIMIT 100
    `;

    const result = await queryDatabase(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Failed to fetch attendance records:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Step 2: 更新 Teaching Quality - Analyses List API

**檔案**: [`server/routes.ts`](../../server/routes.ts) 第 5551 行

**需求**:
- 教師只能看自己的分析記錄
- Admin 可以看所有記錄

**實作**:
```typescript
app.get('/api/teaching-quality/analyses', isAuthenticated, async (req: any, res) => {
  try {
    // 建立權限過濾條件
    const permissionFilter = await buildPermissionFilter({
      userId: req.user.id,
      tableName: 'teaching_quality_records'
    });

    const query = `
      SELECT
        tqr.*,
        tca.student_name,
        tca.teacher_name,
        tca.class_date
      FROM teaching_quality_records tqr
      LEFT JOIN trial_class_attendance tca ON tca.id = tqr.attendance_id
      WHERE ${permissionFilter}
      ORDER BY tqr.created_at DESC
    `;

    const result = await queryDatabase(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Failed to fetch analyses:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Step 3: 更新 Income Expense - Records List API

**檔案**: [`server/routes.ts`](../../server/routes.ts) 第 5952 行

**需求**:
- 教師只能看自己相關的收支
- 諮詢師只能看自己相關的收支
- Admin 可以看所有記錄

**實作**:
```typescript
app.get('/api/income-expense/records', isAuthenticated, async (req, res) => {
  try {
    // 建立權限過濾條件
    const permissionFilter = await buildPermissionFilter({
      userId: req.user.id,
      tableName: 'income_expense_records'
    });

    const query = `
      SELECT * FROM income_expense_records
      WHERE ${permissionFilter}
      ORDER BY date DESC
      LIMIT 500
    `;

    const result = await queryDatabase(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Failed to fetch income expense records:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Step 4: 更新 Income Expense - By Teacher API

**檔案**: [`server/routes.ts`](../../server/routes.ts) 第 6034 行

**需求**:
- 檢查使用者是否有權限查看特定教師的資料
- 教師只能查看自己的收支

**實作**:
```typescript
app.get('/api/income-expense/by-teacher/:teacherId', isAuthenticated, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // 檢查權限：只能查看自己的資料（除非是 admin）
    const user = await getUserWithIdentities(req.user.id);
    const isAdmin = user.roles.includes('super_admin') || user.roles.includes('admin');

    if (!isAdmin && teacherId !== req.user.id) {
      return res.status(403).json({ error: '沒有權限查看此教師的資料' });
    }

    // 建立權限過濾條件
    const permissionFilter = await buildPermissionFilter({
      userId: req.user.id,
      tableName: 'income_expense_records',
      additionalConditions: `teacher_id = '${teacherId}'`
    });

    const query = `
      SELECT * FROM income_expense_records
      WHERE ${permissionFilter}
      ORDER BY date DESC
    `;

    const result = await queryDatabase(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Failed to fetch teacher income expense:', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🧪 測試計畫

### 測試情境 1: Admin 使用者
- ✅ 應該看到所有資料
- ✅ 不受權限過濾影響

### 測試情境 2: 教師（Karen T001）
- ✅ 只看到 teacher_code = 'T001' 的試聽課記錄
- ✅ 只看到 teacher_id = Karen 的收支記錄
- ✅ 只看到自己的教學品質分析

### 測試情境 3: 諮詢師（Elena C001）
- ✅ 只看到 consultant_code = 'C001' 的資料
- ✅ 看不到教師的試聽課記錄

### 測試情境 4: 多重角色（假設 Karen 也是 Consultant）
- ✅ 應該看到 T001 + C001 的所有資料（OR 邏輯）

---

## 📊 預期改進

### 資料安全
- ✅ 教師無法看到其他教師的資料
- ✅ 諮詢師無法看到教師的課程記錄
- ✅ 一般員工無法看到全公司資料

### 效能
- ✅ 資料庫層面過濾，不需要拿所有資料
- ✅ 使用索引（teacher_code, consultant_code）提升效能

### 維護性
- ✅ 統一使用 permission-filter-service
- ✅ 新增角色時只需更新服務，不需改每個 API

---

## ⚠️ 注意事項

### 1. SQL Injection 防護
permission-filter-service 已處理，但要注意：
- ✅ 使用參數化查詢
- ✅ 驗證 userId
- ❌ 不要直接拼接使用者輸入

### 2. 相容性
- 舊的 `teacher_name` 欄位仍然保留
- 新的 `teacher_code` 欄位優先使用
- 過渡期兩者並存

### 3. 效能考量
- 建議在 `teacher_code`, `consultant_code`, `sales_code` 欄位建立索引
- 限制回傳筆數（LIMIT）

---

## 🚀 執行順序

1. ✅ Step 1: Teaching Quality - Attendance Records（最常用）
2. ✅ Step 2: Teaching Quality - Analyses List
3. ✅ Step 3: Income Expense - Records List
4. ✅ Step 4: Income Expense - By Teacher
5. ✅ 建立測試腳本
6. ✅ 實際測試
7. ✅ 更新 PROJECT_PROGRESS.md

---

**預估時間**: 3-4 小時
**完成標準**: 所有 API 都整合權限過濾，測試通過

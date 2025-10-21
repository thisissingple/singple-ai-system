# 人資管理系統遷移指南

## 📋 目錄

1. [系統架構概覽](#系統架構概覽)
2. [遷移步驟](#遷移步驟)
3. [資料對應關係](#資料對應關係)
4. [API 使用範例](#api-使用範例)
5. [常見問題](#常見問題)

---

## 🏗️ 系統架構概覽

### 新建立的資料表

```
users (既有，稍作調整)
  ├──> employee_profiles (員工基本資料)
  ├──> employee_compensation (薪資結構，支援歷史)
  ├──> employee_insurance (勞健保資料，支援歷史)
  └──> business_identities (業務身份對應，支援多重身份)

departments (部門管理)
```

### 核心概念

#### 1. **系統帳號 vs 業務身份**

- **系統帳號 (users.id)**: UUID，用於登入、權限控制
- **業務身份 (business_identities.identity_code)**: 業務編號（T001, C001），用於資料關聯

**範例：Karen**
```
系統帳號：
- users.id = 'uuid-karen'
- users.email = 'karen@example.com'
- users.roles = ['teacher', 'consultant']

業務身份：
- business_identities: { user_id: 'uuid-karen', identity_type: 'teacher', identity_code: 'T001' }
- business_identities: { user_id: 'uuid-karen', identity_type: 'consultant', identity_code: 'C001' }
```

#### 2. **薪資歷史記錄**

每次調薪都會新增一筆記錄：
```sql
-- 2024-01-01: 初始薪資
{ user_id: 'uuid', base_salary: 40000, effective_from: '2024-01-01', is_active: false }

-- 2024-07-01: 調薪
{ user_id: 'uuid', base_salary: 45000, effective_from: '2024-07-01', is_active: true }
```

#### 3. **自動編號生成**

- **員工編號**: E001, E002, E003...（employee_profiles.employee_number）
- **教師編號**: T001, T002, T003...（business_identities.identity_code, type='teacher'）
- **諮詢師編號**: C001, C002, C003...（business_identities.identity_code, type='consultant'）
- **銷售編號**: S001, S002, S003...（business_identities.identity_code, type='sales'）
- **電訪編號**: TM001, TM002, TM003...（business_identities.identity_code, type='telemarketing'）

---

## 🚀 遷移步驟

### **階段一：執行 Migration（不影響現有系統）**

```bash
# 1. 執行 Migration 031
# 在 Supabase SQL Editor 中執行：
cat supabase/migrations/031_create_hr_management_system.sql
```

**這個步驟會：**
- ✅ 建立 5 個新資料表
- ✅ 建立自動編號生成函數
- ✅ 在現有表新增業務編號欄位（不影響現有資料）
- ✅ 建立索引和觸發器

**不會：**
- ❌ 修改現有資料
- ❌ 刪除任何欄位
- ❌ 影響現有功能

---

### **階段二：手動建立人員資料（透過前端 UI）**

#### 步驟 1：建立使用者帳號（如果還沒有）

使用現有的「使用者管理」介面，建立以下人員：

```
1. 鄭文軒 (你)
   - Email: your-email@example.com
   - Role: admin
   - Roles: ['admin', 'manager']

2. 許易叡
   - Email: editor@example.com
   - Role: staff
   - Roles: ['staff']

3. 洪翊瑄
   - Email: customer-service@example.com
   - Role: staff
   - Roles: ['staff']

4. 47
   - Email: consultant-47@example.com
   - Role: consultant
   - Roles: ['consultant']

5. Karen (已存在)
   - Email: karen@example.com
   - Role: teacher
   - Roles: ['teacher', 'consultant']
```

#### 步驟 2：新增員工基本資料

建立前端介面（稍後實作），填寫：
- 員工編號（自動生成）
- 身份證字號
- 地址、緊急聯絡人
- 到職日期、聘用類型

#### 步驟 3：設定業務身份

為每個使用者建立對應的業務身份：

```sql
-- Karen: 教師 + 諮詢師
INSERT INTO business_identities (user_id, identity_type, display_name)
VALUES
  ('uuid-karen', 'teacher', 'Karen'),    -- 自動生成 T001
  ('uuid-karen', 'consultant', 'Karen'); -- 自動生成 C001

-- 47: 諮詢師
INSERT INTO business_identities (user_id, identity_type, display_name)
VALUES ('uuid-47', 'consultant', '47');  -- 自動生成 C002

-- 鄭文軒: 營運長（可能不需要業務身份，除非他也教課或做諮詢）
```

#### 步驟 4：設定薪資結構

```sql
-- Karen 的薪資（教師固定抽成 10%）
INSERT INTO employee_compensation (
  user_id,
  base_salary,
  commission_type,
  commission_config,
  effective_from,
  is_active
)
VALUES (
  'uuid-karen',
  50000,
  'fixed',
  '{"type": "fixed", "rate": 0.10, "description": "教師課程抽成 10%"}'::jsonb,
  '2024-01-01',
  true
);

-- 47 的薪資（諮詢師階梯式抽成）
INSERT INTO employee_compensation (
  user_id,
  base_salary,
  commission_type,
  commission_config,
  effective_from,
  is_active
)
VALUES (
  'uuid-47',
  45000,
  'tiered',
  '{
    "type": "tiered",
    "threshold": 700000,
    "rates": {
      "selfDeal": {"belowThreshold": 0.08, "aboveThreshold": 0.12},
      "assistedDeal": {"belowThreshold": 0.05, "aboveThreshold": 0.08}
    }
  }'::jsonb,
  '2024-01-01',
  true
);
```

#### 步驟 5：設定勞健保資料

```sql
INSERT INTO employee_insurance (
  user_id,
  labor_insurance_grade,
  labor_insurance_amount,
  health_insurance_grade,
  health_insurance_amount,
  pension_employer_rate,
  pension_employee_rate,
  effective_from,
  is_active
)
VALUES (
  'uuid-karen',
  28800,  -- 勞保投保級距
  856,    -- 個人負擔
  28800,  -- 健保投保級距
  408,    -- 個人負擔
  0.06,   -- 雇主提撥 6%
  0.00,   -- 員工自提 0%
  '2024-01-01',
  true
);
```

---

### **階段三：遷移歷史資料（CSV 重新匯入）**

#### 問題：現有的收支記錄需要對應到業務身份

**現狀：**
```sql
-- income_expense_records 表目前的資料
SELECT * FROM income_expense_records WHERE notes LIKE '%teacher_name%';
-- 結果：teacher_name 資料存在 notes 欄位（JSON 格式）
```

**目標：**
```sql
-- 需要填入 teacher_id (UUID) 和 teacher_code (業務編號)
UPDATE income_expense_records
SET
  teacher_id = 'uuid-karen',
  teacher_code = 'T001'
WHERE ...;
```

#### 遷移腳本範例

```typescript
// scripts/migrate-income-expense-identities.ts

import { createPool, queryDatabase } from '../server/services/pg-client';

async function migrateIncomeExpenseIdentities() {
  const pool = createPool();

  // 1. 建立名稱 → 業務身份的對應表
  const identityMap = new Map<string, { userId: string; code: string }>();

  const identities = await queryDatabase(pool, `
    SELECT
      bi.identity_code,
      bi.identity_type,
      bi.display_name,
      u.id as user_id,
      u.first_name
    FROM business_identities bi
    JOIN users u ON u.id = bi.user_id
    WHERE bi.is_active = true
  `);

  identities.rows.forEach((row: any) => {
    // 用 display_name 和 first_name 都建立對應
    if (row.display_name) {
      const key = `${row.identity_type}:${row.display_name}`;
      identityMap.set(key, { userId: row.user_id, code: row.identity_code });
    }
    if (row.first_name) {
      const key = `${row.identity_type}:${row.first_name}`;
      identityMap.set(key, { userId: row.user_id, code: row.identity_code });
    }
  });

  console.log('身份對應表：', identityMap);

  // 2. 更新 income_expense_records
  const records = await queryDatabase(pool, `
    SELECT id, notes
    FROM income_expense_records
    WHERE notes IS NOT NULL
      AND (teacher_id IS NULL OR teacher_code IS NULL)
  `);

  let updatedCount = 0;

  for (const record of records.rows) {
    try {
      // 解析 notes 中的 JSON 資料
      const notesData = JSON.parse(record.notes);
      const teacherName = notesData.teacher_name;
      const consultantName = notesData.consultant_name;
      const salesPersonName = notesData.sales_person_name;

      // 查找對應的業務身份
      const teacherIdentity = teacherName ? identityMap.get(`teacher:${teacherName}`) : null;
      const consultantIdentity = consultantName ? identityMap.get(`consultant:${consultantName}`) : null;
      const salesIdentity = salesPersonName ? identityMap.get(`sales:${salesPersonName}`) : null;

      // 更新記錄
      if (teacherIdentity || consultantIdentity || salesIdentity) {
        await queryDatabase(pool, `
          UPDATE income_expense_records
          SET
            teacher_id = $1,
            teacher_code = $2,
            consultant_id = $3,
            consultant_code = $4,
            sales_person_id = $5,
            sales_code = $6
          WHERE id = $7
        `, [
          teacherIdentity?.userId || null,
          teacherIdentity?.code || null,
          consultantIdentity?.userId || null,
          consultantIdentity?.code || null,
          salesIdentity?.userId || null,
          salesIdentity?.code || null,
          record.id,
        ]);

        updatedCount++;
      }
    } catch (error) {
      console.error(`處理記錄 ${record.id} 時發生錯誤:`, error);
    }
  }

  console.log(`✅ 成功更新 ${updatedCount} 筆記錄`);
}

migrateIncomeExpenseIdentities().catch(console.error);
```

執行遷移：
```bash
npx tsx scripts/migrate-income-expense-identities.ts
```

---

### **階段四：修改 API，套用權限過濾**

#### 範例：修改體驗課出席記錄 API

**修改前：**
```typescript
// GET /api/trial-class-attendance
app.get('/api/trial-class-attendance', isAuthenticated, async (req, res) => {
  const result = await queryDatabase(pool, `
    SELECT * FROM trial_class_attendance
    ORDER BY class_date DESC
  `);
  res.json({ success: true, data: result.rows });
});
```

**修改後（套用權限過濾）：**
```typescript
import { buildPermissionFilter } from './services/permission-filter-service';

app.get('/api/trial-class-attendance', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  // 建立權限過濾條件
  const filter = await buildPermissionFilter({
    userId,
    tableName: 'trial_class_attendance',
  });

  const result = await queryDatabase(pool, `
    SELECT * FROM trial_class_attendance
    WHERE ${filter}
    ORDER BY class_date DESC
  `);

  res.json({ success: true, data: result.rows });
});
```

**效果：**
- super_admin/admin → 看所有資料
- teacher (Karen, T001) → 只看 teacher_code = 'T001' 的課程
- consultant → 看自己相關的課程

---

## 🔗 資料對應關係

### CSV 匯入時的名稱對應

| CSV 欄位 | 名稱範例 | 對應到 | 說明 |
|---------|---------|--------|------|
| 授課教練 (column 11) | Karen, 鄭文軒 | `business_identities.display_name` | 用 display_name 查找 teacher |
| 業績歸屬人 1 (column 23) | 47, Karen | `business_identities.display_name` | 諮詢師 |
| 業績歸屬人 2 (column 24) | Vivi, 洪翊瑄 | `business_identities.display_name` | 電訪人員 |

### 查詢範例

```sql
-- 根據名稱查找業務編號
SELECT
  bi.identity_code,
  bi.identity_type,
  u.id as user_id
FROM business_identities bi
JOIN users u ON u.id = bi.user_id
WHERE bi.display_name = 'Karen'
  AND bi.identity_type = 'teacher'
  AND bi.is_active = true;

-- 結果：
-- identity_code: T001
-- identity_type: teacher
-- user_id: uuid-karen
```

---

## 📚 API 使用範例

### 1. 取得使用者的業務身份

```typescript
import { getUserIdentityCodes } from './services/permission-filter-service';

// 取得 Karen 的所有業務編號
const allCodes = await getUserIdentityCodes('uuid-karen');
// 結果: ['T001', 'C001']

// 只取得教師編號
const teacherCodes = await getUserIdentityCodes('uuid-karen', 'teacher');
// 結果: ['T001']
```

### 2. 檢查權限

```typescript
import { hasPermission, canEditRecord } from './services/permission-filter-service';

// 檢查是否有教師權限
const isTeacher = await hasPermission('uuid-karen', ['teacher']);
// 結果: true

// 檢查是否可以編輯特定記錄
const canEdit = await canEditRecord('uuid-karen', 'uuid-other-user');
// 結果: false (不是自己創建的)
```

### 3. 查詢自己能看到的資料

```typescript
import { buildPermissionFilter } from './services/permission-filter-service';

// Karen 登入後查詢體驗課記錄
const filter = await buildPermissionFilter({
  userId: 'uuid-karen',
  tableName: 'trial_class_attendance',
  additionalConditions: "class_date >= '2024-01-01'",
});

// filter 結果：
// (teacher_code IN ('T001') OR consultant_code IN ('C001')) AND (class_date >= '2024-01-01')

const result = await queryDatabase(pool, `
  SELECT * FROM trial_class_attendance
  WHERE ${filter}
  ORDER BY class_date DESC
`);
```

---

## ❓ 常見問題

### Q1: 為什麼要分 `teacher_id` (UUID) 和 `teacher_code` (業務編號)？

**A:** 兩者用途不同：
- `teacher_id` (UUID): 外鍵，用於資料庫關聯，確保資料完整性
- `teacher_code` (業務編號): 人類可讀，用於顯示、匯入、匯出

建議：
- 新資料優先用 UUID
- 業務編號作為輔助（方便查詢和顯示）

---

### Q2: 如果一個人同時是教師和諮詢師，薪資怎麼計算？

**A:** 在 `employee_compensation` 表中可以設定複合規則：

```json
{
  "type": "multi_role",
  "roles": {
    "teacher": {
      "base_salary": 30000,
      "commission": {"type": "fixed", "rate": 0.10}
    },
    "consultant": {
      "commission": {
        "type": "tiered",
        "threshold": 700000,
        "rates": {
          "selfDeal": {"belowThreshold": 0.08, "aboveThreshold": 0.12}
        }
      }
    }
  }
}
```

或者分別記錄兩筆薪資規則（需要後端計算時合併）。

---

### Q3: 員工離職後，歷史資料怎麼處理？

**A:** 建議流程：

1. 設定離職日期：
```sql
UPDATE employee_profiles
SET resign_date = '2024-12-31'
WHERE user_id = 'uuid-employee';
```

2. 停用業務身份：
```sql
UPDATE business_identities
SET is_active = false, effective_to = '2024-12-31'
WHERE user_id = 'uuid-employee';
```

3. 停用使用者帳號：
```sql
UPDATE users
SET status = 'inactive'
WHERE id = 'uuid-employee';
```

**歷史資料保留：**
- ✅ 薪資記錄保留（用於計算歷史成本）
- ✅ 勞健保記錄保留
- ✅ 業務資料中的關聯保留（teacher_id, consultant_id）

---

### Q4: 如何查詢某個月的有效薪資？

**A:**
```sql
SELECT
  ec.*
FROM employee_compensation ec
WHERE ec.user_id = 'uuid-karen'
  AND ec.effective_from <= '2024-10-01'
  AND (ec.effective_to IS NULL OR ec.effective_to >= '2024-10-01')
ORDER BY ec.effective_from DESC
LIMIT 1;
```

---

## 🎯 下一步

1. **執行 Migration 031**
2. **建立前端人員管理介面**（可以先用 SQL 手動建立資料）
3. **執行資料遷移腳本**
4. **修改 API，套用權限過濾**
5. **測試不同角色登入後的資料可見性**

---

## 📞 需要協助

如有問題，請檢查：
1. Migration 是否執行成功
2. 自動編號是否正確生成
3. 業務身份是否正確建立
4. 權限過濾邏輯是否符合需求

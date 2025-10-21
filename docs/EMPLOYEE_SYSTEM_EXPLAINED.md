# 員工管理系統說明

> **建立時間**: 2025-10-21
> **目的**: 解釋員工編號、角色身份編號的邏輯與用途

---

## 📋 系統概覽

員工管理系統有**兩套編號系統**：

1. **員工編號** (Employee Number) - HR 系統用
2. **角色身份編號** (Business Identity Code) - 業務系統用

---

## 1️⃣ 員工編號 (Employee Number)

### 📍 資料位置
- **資料表**: `employee_profiles`
- **欄位**: `employee_number`
- **Migration**: `031_create_hr_management_system.sql`

### 🔢 編號格式
```
E001, E002, E003, E004, ...
```

### ⚙️ 產生邏輯

**自動產生** - 透過資料庫 Trigger：

```sql
CREATE OR REPLACE FUNCTION generate_employee_number()
RETURNS TRIGGER AS $$
DECLARE
  new_number TEXT;
  max_num INTEGER;
BEGIN
  IF NEW.employee_number IS NULL THEN
    SELECT
      COALESCE(
        MAX(CAST(SUBSTRING(employee_number FROM 2) AS INTEGER)),
        0
      ) + 1
    INTO max_num
    FROM employee_profiles
    WHERE employee_number ~ '^E[0-9]+$';

    new_number := 'E' || LPAD(max_num::TEXT, 3, '0');
    NEW.employee_number := new_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_employee_number
  BEFORE INSERT ON employee_profiles
  FOR EACH ROW
  EXECUTE FUNCTION generate_employee_number();
```

### 🎯 用途

1. **HR 管理**
   - 唯一識別員工（類似工號）
   - 人事檔案管理

2. **請假系統**
   - `leave_records` 表使用 `employee_code` 欄位
   - 記錄員工的請假記錄

3. **薪資管理**
   - 員工薪資計算
   - 出勤記錄

### ❓ 為什麼有些員工沒有編號？

可能原因：
1. **舊資料** - 在實作 HR 系統之前建立的員工
2. **沒有建立 employee_profiles** - 只有 users 記錄，沒有 profile
3. **只是登入帳號** - 不是正式員工（例如：測試帳號、Admin 帳號）

### 🔧 如何補上編號？

為現有員工建立 profile：
```sql
INSERT INTO employee_profiles (user_id)
SELECT id FROM users WHERE id NOT IN (
  SELECT user_id FROM employee_profiles
);
-- Trigger 會自動產生 employee_number
```

---

## 2️⃣ 角色身份編號 (Business Identity Code)

### 📍 資料位置
- **資料表**: `business_identities`
- **欄位**: `identity_code`
- **Migration**: `031_create_hr_management_system.sql`

### 🔢 編號格式

根據角色類型有不同的前綴：

| 角色類型 | 前綴 | 範例 |
|---------|------|------|
| 教師 (Teacher) | T | T001, T002, T003 |
| 諮詢師 (Consultant) | C | C001, C002, C003 |
| 電銷 (Setter) | S | S001, S002, S003 |

### ⚙️ 產生邏輯

**API 自動產生** - 在新增角色身份時：

```typescript
// server/routes-employee-management.ts (Line 195-262)

const codePrefix = identity_type === 'teacher' ? 'T'
                 : identity_type === 'consultant' ? 'C'
                 : identity_type === 'setter' ? 'S'
                 : 'E';

// 查詢該類型的最大編號
const { data: existingCodes } = await supabase
  .from('business_identities')
  .select('identity_code')
  .eq('identity_type', identity_type)
  .order('identity_code', { ascending: false })
  .limit(1);

let nextNum = 1;
if (existingCodes && existingCodes.length > 0) {
  const lastCode = existingCodes[0].identity_code;
  const lastNum = parseInt(lastCode.substring(1), 10);
  nextNum = lastNum + 1;
}

const identity_code = `${codePrefix}${String(nextNum).padStart(3, '0')}`;
```

### 🎯 用途

1. **體驗課追蹤**
   - `trial_class_attendance` - 記錄哪位教師上課
   - `trial_class_purchases` - 記錄哪位諮詢師成交

2. **業績計算**
   - 依照 identity_code 計算每位教師/諮詢師的業績
   - 用於 KPI 報表和排名

3. **分潤系統**
   - 根據不同角色的 commission_config 計算獎金
   - 同一人可能有多個身份（例如：Karen 既是教師 T001 又是諮詢師 C001）

4. **權限控制**
   - 教師只能看到自己 identity_code 的體驗課記錄
   - 諮詢師只能看到自己的成交記錄

### 🔄 多重身份

**一個員工可以有多個角色身份**：

範例：Karen
- 員工編號: `E003`
- 角色身份 1: `T001` (教師) - 2024/01/01 起
- 角色身份 2: `C001` (諮詢師) - 2024/03/01 起

這樣 Karen 可以：
- 用 T001 身份上體驗課
- 用 C001 身份做諮詢和成交
- 分別計算兩種身份的業績和分潤

### 🚫 停用身份

當員工不再擔任某個角色時：
```typescript
// PUT /api/employees/:userId/business-identity/:identityId/deactivate

await supabase
  .from('business_identities')
  .update({
    is_active: false,
    effective_to: '2025-10-21',  // 結束日期
    updated_at: new Date().toISOString(),
  })
  .eq('id', identityId);
```

停用後：
- `is_active` = false
- 不會出現在業務報表的篩選選項中
- 歷史記錄保留（仍可查詢過去的業績）

---

## 3️⃣ 員工列表排序

### 📊 排序邏輯

**優先級**：
1. **在職狀態** (status) - `active` 優先於 `inactive`
2. **名字** (first_name) - 字母順序

### 💻 實作位置

**Backend** - `server/routes-employee-management.ts` (Line 40-41):
```typescript
.order('status', { ascending: true })      // 'active' < 'inactive' (字母順序)
.order('first_name', { ascending: true })  // A-Z
```

### 📋 排序結果

```
✅ 在職員工 (status = 'active')
├─ 47
├─ Admin
├─ Elena
├─ Isha (active)
├─ Ivan
├─ JU
└─ Karen

❌ 離職員工 (status = 'inactive')
├─ Isha (inactive)
└─ Orange
```

### 🔍 為什麼字母順序有效？

`status` 欄位的值：
- `'active'` - 字母順序排第一（a < i）
- `'inactive'` - 字母順序排第二

所以 `ascending: true` 會讓 active 自動排在前面！

---

## 📊 完整資料關聯圖

```
┌─────────────────┐
│     users       │ ← 登入帳號
│  (基本資訊)      │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌──────────────────────┐
│employee_profiles│  │ business_identities  │
│                 │  │                      │
│ • employee_     │  │ • identity_code      │
│   number (E001) │  │   (T001, C001, S001) │
│                 │  │ • identity_type      │
│ • national_id   │  │ • is_active          │
│ • hire_date     │  │ • effective_from     │
│ • employment_   │  │ • effective_to       │
│   type          │  │                      │
└─────────────────┘  └───────────┬──────────┘
                                 │
                                 │ 用於業務記錄
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
         ▼                       ▼                       ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ trial_class_     │  │ trial_class_     │  │ employee_        │
│ attendance       │  │ purchases        │  │ compensation     │
│                  │  │                  │  │                  │
│ • teacher_code   │  │ • consultant_    │  │ • commission_    │
│   (T001)         │  │   code (C001)    │  │   type           │
│                  │  │                  │  │ • commission_    │
│                  │  │                  │  │   rate           │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 🎯 總結

### 員工編號 vs 角色身份編號

| 特徵 | 員工編號 | 角色身份編號 |
|------|---------|-------------|
| 格式 | E001, E002 | T001, C001, S001 |
| 產生方式 | 資料庫 Trigger | API 邏輯 |
| 數量 | 每人 1 個 | 每人可有多個 |
| 用途 | HR 管理 | 業務追蹤 |
| 可停用 | ✗ | ✓ (設定 effective_to) |
| 相關表 | employee_profiles | business_identities |

### 常見問題

**Q: 為什麼有些員工沒有員工編號？**
A: 可能是舊資料，或只是登入帳號不是正式員工。可以手動建立 employee_profiles 記錄。

**Q: 可以更改角色身份編號嗎？**
A: 不建議。編號已經用於歷史業務記錄。如需更改，應該停用舊身份並新增新身份。

**Q: 員工離職後編號會重複使用嗎？**
A: 不會。員工編號和角色身份編號都是遞增的，不會重複使用。

**Q: 為什麼需要兩套編號系統？**
A: HR 系統和業務系統的需求不同：
- HR 需要固定的員工識別碼
- 業務需要彈性的角色身份管理（一人多角）

---

**檔案位置**: `/home/runner/workspace/docs/EMPLOYEE_SYSTEM_EXPLAINED.md`
**維護者**: Claude (AI 軟體開發工程師)
**最後更新**: 2025-10-21

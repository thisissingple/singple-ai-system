# 人資管理系統實作總結

## 📋 已完成的工作

### 1. 資料庫架構設計 ✅

建立了完整的人資管理系統架構，包含 5 個新資料表：

#### **核心資料表**

1. **`employee_profiles`** - 員工基本資料
   - 身份證件、地址、緊急聯絡人
   - 聘用資訊（到職日、離職日、聘用類型）
   - 合約文件 URL、銀行資訊
   - 員工編號自動生成 (E001, E002...)

2. **`employee_compensation`** - 員工薪資結構（支援歷史記錄）
   - 底薪、抽成類型、抽成規則 (JSONB)
   - 津貼設定 (JSONB)
   - 生效期間（effective_from / effective_to）
   - 調薪原因、審核人

3. **`employee_insurance`** - 勞健保資料（支援歷史記錄）
   - 勞保投保級距、勞保費用
   - 健保投保級距、健保費用
   - 退休金提撥比例、退休金金額
   - 生效期間（支援歷史查詢）

4. **`business_identities`** - 業務身份對應（支援多重身份）
   - 身份類型 (teacher/consultant/sales/telemarketing)
   - 業務編號自動生成 (T001, C001, S001, TM001)
   - 顯示名稱（用於匹配歷史資料）
   - 生效期間、是否啟用

5. **`departments`** - 部門管理
   - 部門代碼、名稱、描述
   - 部門主管、上層部門（支援階層）
   - 預設建立 4 個部門（業務部、教學部、行政部、營運部）

---

### 2. 自動化功能 ✅

#### **自動編號生成**

- **員工編號**: `E001, E002, E003...`
- **教師編號**: `T001, T002, T003...`
- **諮詢師編號**: `C001, C002, C003...`
- **銷售編號**: `S001, S002, S003...`
- **電訪編號**: `TM001, TM002, TM003...`

使用 PostgreSQL 觸發器自動生成，無需手動輸入。

#### **更新時間自動維護**

所有表都有 `updated_at` 欄位，透過觸發器自動更新。

---

### 3. 權限過濾服務 ✅

建立了完整的權限過濾邏輯：[`permission-filter-service.ts`](server/services/permission-filter-service.ts)

#### **核心函數**

1. **`buildPermissionFilter(options)`**
   - 根據使用者角色和業務身份自動建立 SQL WHERE 條件
   - 支援不同資料表的過濾邏輯
   - 支援額外條件（如日期範圍）

2. **`hasPermission(userId, roles)`**
   - 快速檢查使用者是否有特定角色權限

3. **`canEditRecord(userId, recordCreatedBy)`**
   - 檢查使用者是否可以編輯特定記錄

4. **`getUserIdentityCodes(userId, identityType)`**
   - 取得使用者的業務編號（用於表單自動帶入）

#### **權限規則**

```
super_admin / admin
  → 看所有資料（不過濾）

manager
  → 看部門內的資料

teacher / consultant / sales
  → 只看自己相關的資料
  → 如果一人身兼多職（如 Karen 是 teacher + consultant），可以看到所有相關資料
```

---

### 4. 資料表修改 ✅

為現有資料表新增業務編號欄位，以支援權限過濾：

#### **`trial_class_attendance`**
- 新增 `teacher_code VARCHAR(20)`
- 新增 `consultant_code VARCHAR(20)`
- 新增 `sales_code VARCHAR(20)`

#### **`income_expense_records`**
- 新增 `teacher_code VARCHAR(20)`（補充欄位，主要還是用 `teacher_id` UUID）
- 新增 `consultant_code VARCHAR(20)`
- 新增 `sales_code VARCHAR(20)`

**注意**: 這些欄位不會影響現有資料，可以逐步填入。

---

### 5. 輔助函數 ✅

建立了 4 個 PostgreSQL 函數：

1. **`generate_employee_number()`** - 自動生成員工編號
2. **`generate_identity_code()`** - 自動生成業務編號
3. **`get_user_identity_codes(user_id, type)`** - 取得使用者的業務編號
4. **`get_user_by_identity_code(code)`** - 根據業務編號查詢使用者

---

### 6. 文件 ✅

建立了完整的遷移指南：[`HR_SYSTEM_MIGRATION_GUIDE.md`](docs/HR_SYSTEM_MIGRATION_GUIDE.md)

包含：
- 系統架構概覽
- 詳細的遷移步驟（4 個階段）
- 資料對應關係
- API 使用範例
- 常見問題解答

---

## 🎯 核心設計概念

### **問題：為什麼需要 business_identities？**

你的系統有**兩套 ID 體系**：

1. **系統 UUID** (users.id)
   - 用於登入、權限控制、資料庫外鍵
   - 例如: `uuid-karen = '2e259b11-5906-4647-b19a-ec43a3bbe537'`

2. **業務編號** (business_identities.identity_code)
   - 人類可讀的編號，用於顯示、報表、CSV 匯入
   - 例如: Karen 是教師 `T001`，同時也是諮詢師 `C001`

### **解決的問題**

**問題 1**: CSV 匯入時只有名稱（如「授課教練：Karen」），無法直接對應到 UUID
- **解法**: 用 `business_identities.display_name = 'Karen'` 查找對應的 `identity_code` 和 `user_id`

**問題 2**: 一個人可能同時是教師、諮詢師、銷售
- **解法**: 同一個 `user_id` 可以有多筆 `business_identities` 記錄

**問題 3**: 權限過濾需要知道「Karen 作為教師的編號是什麼」
- **解法**: 查詢 `business_identities` 取得 Karen 的所有業務身份

---

## 📊 資料關聯示意圖

```
Karen 的完整資料：

users
  id: uuid-karen
  email: karen@example.com
  roles: ['teacher', 'consultant']

employee_profiles
  user_id: uuid-karen
  employee_number: E001
  national_id: A123456789
  hire_date: 2023-01-01

business_identities (2 筆)
  1. { user_id: uuid-karen, type: 'teacher', code: 'T001', display_name: 'Karen' }
  2. { user_id: uuid-karen, type: 'consultant', code: 'C001', display_name: 'Karen' }

employee_compensation (目前有效的)
  user_id: uuid-karen
  base_salary: 50000
  commission_type: 'fixed'
  commission_config: { "rate": 0.10 }
  effective_from: 2024-01-01
  is_active: true

employee_insurance (目前有效的)
  user_id: uuid-karen
  labor_insurance_grade: 28800
  pension_employer_rate: 0.06
  effective_from: 2024-01-01
  is_active: true
```

當 Karen 登入後查詢體驗課記錄：
```sql
SELECT * FROM trial_class_attendance
WHERE teacher_code IN ('T001') OR consultant_code IN ('C001')
ORDER BY class_date DESC;
```

---

## 🚀 接下來要做的事

### **第一步：執行 Migration**

```bash
# 在 Supabase SQL Editor 中執行
cat supabase/migrations/031_create_hr_management_system.sql
```

驗證：
```sql
-- 檢查資料表是否建立成功
SELECT tablename FROM pg_tables
WHERE tablename IN (
  'employee_profiles',
  'employee_compensation',
  'employee_insurance',
  'business_identities',
  'departments'
);

-- 檢查函數是否建立成功
SELECT routine_name FROM information_schema.routines
WHERE routine_name LIKE 'generate%' OR routine_name LIKE 'get_user%';
```

---

### **第二步：建立人員資料**

#### 方案 A：先用 SQL 手動建立（快速測試）

```sql
-- 1. 為 Karen 建立業務身份
INSERT INTO business_identities (user_id, identity_type, display_name)
VALUES
  ('2e259b11-5906-4647-b19a-ec43a3bbe537', 'teacher', 'Karen'),
  ('2e259b11-5906-4647-b19a-ec43a3bbe537', 'consultant', 'Karen');

-- 檢查自動生成的編號
SELECT * FROM business_identities WHERE user_id = '2e259b11-5906-4647-b19a-ec43a3bbe537';
-- 應該看到 T001 和 C001

-- 2. 建立員工資料
INSERT INTO employee_profiles (user_id, hire_date, employment_type)
VALUES ('2e259b11-5906-4647-b19a-ec43a3bbe537', '2023-01-01', 'full_time');

-- 檢查自動生成的員工編號
SELECT employee_number FROM employee_profiles WHERE user_id = '2e259b11-5906-4647-b19a-ec43a3bbe537';
-- 應該看到 E001

-- 3. 設定薪資
INSERT INTO employee_compensation (user_id, base_salary, commission_type, commission_config, effective_from)
VALUES (
  '2e259b11-5906-4647-b19a-ec43a3bbe537',
  50000,
  'fixed',
  '{"type": "fixed", "rate": 0.10}'::jsonb,
  '2024-01-01'
);
```

#### 方案 B：建立前端人員管理介面（完整方案）

需要建立以下前端頁面：
1. 員工列表頁面
2. 員工詳細資料頁面（包含基本資料、薪資、勞健保、業務身份）
3. 業務身份管理介面

---

### **第三步：遷移歷史資料**

執行資料遷移腳本，將 `income_expense_records` 的 notes 欄位中的資料對應到業務身份：

```bash
# 建立並執行遷移腳本
npx tsx scripts/migrate-income-expense-identities.ts
```

參考 [`HR_SYSTEM_MIGRATION_GUIDE.md`](docs/HR_SYSTEM_MIGRATION_GUIDE.md) 中的「階段三」。

---

### **第四步：修改 API，套用權限過濾**

範例：修改體驗課 API

```typescript
import { buildPermissionFilter } from './services/permission-filter-service';

app.get('/api/trial-class-attendance', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

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

需要修改的 API endpoints：
- `GET /api/trial-class-attendance`
- `GET /api/income-expense-records`
- `GET /api/cost-profit`
- `GET /api/teaching-quality-records`
- 其他需要權限過濾的 API

---

### **第五步：測試**

測試不同角色登入後的資料可見性：

1. **super_admin 登入** → 應該看到所有資料
2. **Karen (teacher + consultant) 登入** → 只看到 teacher_code='T001' 或 consultant_code='C001' 的資料
3. **普通教師登入** → 只看到自己的課程
4. **Manager 登入** → 看到部門內的資料

---

## 📁 建立的檔案清單

```
supabase/migrations/
  └─ 031_create_hr_management_system.sql  (完整的 Migration)

server/services/
  └─ permission-filter-service.ts  (權限過濾服務)

docs/
  └─ HR_SYSTEM_MIGRATION_GUIDE.md  (遷移指南)

本檔案：
  └─ HR_SYSTEM_IMPLEMENTATION_SUMMARY.md  (實作總結)
```

---

## 🎓 關鍵學習

### 1. **為什麼要分開 users.role 和 business_identities？**

- `users.role` / `users.roles`: **系統角色**，用於權限控制（能不能登入、能看哪些頁面）
- `business_identities`: **業務身份**，用於資料關聯（這筆課程記錄是哪個教師上的）

### 2. **為什麼要支援薪資歷史記錄？**

- 調薪時不能覆蓋舊資料，否則無法計算過去月份的正確薪資
- 用 `effective_from` / `effective_to` 和 `is_active` 欄位來追蹤歷史

### 3. **為什麼要自動生成業務編號？**

- 人類可讀（T001 比 UUID 好記）
- 避免手動輸入錯誤
- 方便排序和查詢

---

## ✅ 檢查清單

在正式使用前，請確認：

- [ ] Migration 031 執行成功
- [ ] 5 個新資料表都已建立
- [ ] 自動編號生成函數正常運作（測試插入資料）
- [ ] 為現有使用者建立業務身份
- [ ] 設定薪資和勞健保資料
- [ ] 執行歷史資料遷移腳本
- [ ] 修改 API 套用權限過濾
- [ ] 測試不同角色的資料可見性
- [ ] 前端人員管理介面（選做）

---

## 🆘 疑難排解

### 問題 1：自動編號沒有生成

**檢查：**
```sql
-- 檢查觸發器是否存在
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'trigger_generate%';
```

### 問題 2：權限過濾不正確

**檢查：**
```typescript
// 測試權限過濾邏輯
const filter = await buildPermissionFilter({
  userId: 'uuid-karen',
  tableName: 'trial_class_attendance',
});
console.log('生成的過濾條件:', filter);
```

### 問題 3：業務身份對應失敗

**檢查：**
```sql
-- 檢查是否有建立業務身份
SELECT * FROM business_identities WHERE user_id = 'uuid-karen';

-- 檢查 display_name 是否正確
SELECT * FROM business_identities WHERE display_name = 'Karen';
```

---

## 📞 下一步建議

根據你的優先順序，建議：

1. **先執行 Migration**，確保資料庫架構正確
2. **手動建立幾筆測試資料**（Karen, 47, 鄭文軒）
3. **修改 1-2 個 API 測試權限過濾**
4. **確認可行後再建立完整的前端介面**

有任何問題隨時問我！

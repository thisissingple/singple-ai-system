# 開發日誌 - 2025-10-28

## Phase 37: 統一人員選項管理系統

---

## 📋 今日完成項目

### 1. 收支記錄表 UI 全面優化
- ✅ 移除展開功能，一次顯示全部資訊
- ✅ 新增全欄位排序（15 個欄位）
- ✅ 實作 Google Sheets 風格可調整欄寬
- ✅ 智能排序（日期/數字/名稱）

### 2. Orange 教練缺失問題修復
- ✅ 診斷 /api/teachers API 查詢錯誤
- ✅ 修復 queryDatabase 語法
- ✅ Orange 補充 teacher 角色

### 3. 業務編號系統架構決策
- ✅ 調查 business_identities 使用情況
- ✅ 確認混合方案（權限過濾 + 下拉選單分工）
- ✅ 回答使用者關鍵問題

### 4. 自動同步機制實作
- ✅ 新增 syncRolesToUser() 函數
- ✅ 修改 3 個員工管理 API
- ✅ 確保資料一致性

---

## 🎯 問題與解決

### 問題 1：收支記錄表 UI 不便
**現象**：需要展開才能看到電訪人員、諮詢人員、填表人、時間等資訊

**解決方案**：
1. 移除 Collapsible 展開功能
2. 改為固定寬度表格（min-w-3000px）
3. 直接顯示所有 15 個欄位

**檔案變更**：
- `client/src/pages/reports/income-expense-manager.tsx`

**Commit**: e06eaf9

---

### 問題 2：無法對欄位排序和調整寬度
**現象**：表格欄位固定寬度，無法排序

**解決方案**：
1. 新增 ResizableTableHead 元件
2. 實作滑鼠拖曳調整寬度
3. 新增排序功能（sortColumn, sortDirection state）
4. 智能排序邏輯：
   - 日期欄位：轉換為 timestamp 比較
   - 數字欄位：parseFloat 數值比較
   - 名稱欄位：字母順序比較

**新增元件**：
- `client/src/components/ui/resizable-table-head.tsx` (80 行)

**修改元件**：
- `client/src/pages/reports/income-expense-manager.tsx` (新增 100+ 行)

**Commit**: cda76e6

---

### 問題 3：收支表缺少 Orange 教練
**現象**：授課教練下拉選單只有 Elena、Vicky、Karen，缺少 Orange

**根本原因**：
- `/api/teachers` API 使用錯誤的 queryDatabase 語法
- `queryDatabase(pool, query)` → 錯誤
- 正確語法：`queryDatabase(query, params, mode)`

**解決方案**：
1. 修復 API 查詢語法（routes.ts Line 4965-4987）
2. 使用者手動執行 SQL 補充 Orange 的 teacher 角色

```sql
UPDATE users
SET roles = array_append(roles, 'teacher')
WHERE email = 'orange@thisissingple.com'
  AND NOT ('teacher' = ANY(roles));
```

**結果**：Success. No rows returned（Orange 已有 teacher 角色）

**Commit**: 81d603b, e8c9e9d

---

### 問題 4：業務編號系統的必要性疑問
**使用者問題**：
1. 「所有需要選擇人員的地方，都會從員工管理的角色身份對應嗎？」
2. 「users.roles 還有用處嗎？」
3. 「如果要分很多表去追蹤身份，要確保全部的表的資料都有改到」
4. 「用最簡單實用的設定好就好，我不希望後面一堆 BUG」

**調查結果**：

#### 業務編號系統使用情況
**✅ 確實在用**：
- 權限過濾服務（permission-filter-service.ts）：核心功能
- 體驗課記錄（trial_class_attendance）：145 筆已填入 teacher_code
- 員工管理 UI：顯示業務身份編號
- 報表統計：使用 teacher_code 過濾

**❌ 使用不完整**：
- 收支記錄（income_expense_records）：code 欄位全部為 NULL（637 筆）
- 教學品質（teaching_quality_analysis）：不用 code，只用 UUID

#### 架構決策：混合方案

**原則**：
```
business_identities (主表)
├─ 用於：權限過濾系統（必須保留）
├─ 用於：員工管理頁面顯示
└─ 不用於：收支記錄下拉選單

users.roles (副表)
├─ 用於：收支記錄下拉選單（主要）
├─ 用於：基本權限檢查
└─ 需要同步：編輯 business_identities 時自動更新
```

**理由**：
1. **權限過濾系統不可移除**：已實作並測試完成，是核心功能
2. **多重身份需求真實存在**：Karen 同時是教師和諮詢師
3. **人類可讀性需求**：T001, C001 比 UUID 更適合顯示
4. **歷史資料已遷移**：145 筆體驗課記錄已填入 teacher_code

**使用者接受**：「我覺得這個混合的可以，因為我馬上就要執行權限過濾系統」

---

### 問題 5：business_identities 與 users.roles 不同步
**現況**：
- 新增員工時只寫 users.roles，不建立 business_identities
- 新增角色身份時只寫 business_identities，不更新 users.roles
- 導致下拉選單缺人（API 查 users.roles，但員工管理只更新 business_identities）

**解決方案：單向自動同步機制**

#### 1. 新增 syncRolesToUser() 函數
**檔案**：`server/routes-employee-management.ts` Line 33-91

**功能**：
1. 查詢使用者所有 active 的 business_identities
2. 轉換為 roles 陣列
3. 保留 admin 角色
4. 更新 users.roles

**核心邏輯**：
```typescript
async function syncRolesToUser(userId: string): Promise<void> {
  // 1. 查詢所有 active 的 business_identities
  const result = await queryDatabase(
    `SELECT DISTINCT identity_type
     FROM business_identities
     WHERE user_id = $1 AND is_active = true`,
    [userId]
  );

  // 2. 轉換為 roles 陣列
  const roles = ['user'];

  // 保留 admin 角色
  const adminCheck = await queryDatabase(
    `SELECT roles FROM users WHERE id = $1`,
    [userId]
  );
  if (adminCheck.rows[0]?.roles?.includes('admin')) {
    roles.push('admin');
  }

  // 根據 business_identities 新增角色
  result.rows.forEach(row => {
    const identityType = row.identity_type;
    if (identityType === 'teacher' && !roles.includes('teacher')) {
      roles.push('teacher');
    }
    if (identityType === 'consultant' && !roles.includes('consultant')) {
      roles.push('consultant');
    }
    // ... 其他角色
  });

  // 3. 更新 users.roles
  await queryDatabase(
    `UPDATE users SET roles = $1, updated_at = NOW() WHERE id = $2`,
    [roles, userId]
  );

  console.log(`✅ 已同步角色: userId=${userId}, roles=${JSON.stringify(roles)}`);
}
```

#### 2. 修改 3 個 API 端點

**POST /api/employees/:userId/business-identity**（新增角色身份）
```typescript
// 建立 business_identities 記錄
const { data, error } = await supabase
  .from('business_identities')
  .insert({ ... })
  .select()
  .single();

if (error) throw error;

// ✅ 自動同步 users.roles
await syncRolesToUser(userId);
```

**PUT /api/employees/:userId/business-identity/:id/deactivate**（停用角色身份）
```typescript
// 停用 business_identities
const { data, error } = await supabase
  .from('business_identities')
  .update({ is_active: false })
  .eq('id', identityId)
  .select()
  .single();

if (error) throw error;

// ✅ 同步 users.roles（重新計算角色）
await syncRolesToUser(data.user_id);
```

**DELETE /api/employees/:userId/business-identity/:id**（刪除角色身份）
```typescript
// 刪除 business_identities
const { error } = await supabase
  .from('business_identities')
  .delete()
  .eq('id', identityId)
  .eq('user_id', userId);

if (error) throw error;

// ✅ 同步 users.roles（重新計算角色）
await syncRolesToUser(userId);
```

**Commit**: 0f21323

---

## 📊 同步機制範例

### 範例 1：新增 Orange 為教練

**操作**：
1. 員工管理頁面 → 選擇 Orange
2. 新增角色身份 → 角色類型選「teacher」
3. 點擊「儲存」

**系統執行**：
```sql
-- 1. 建立 business_identities 記錄
INSERT INTO business_identities (
  user_id, identity_type, identity_code, is_active
) VALUES (
  'orange-uuid', 'teacher', 'T003', true
);

-- 2. 自動同步 users.roles
UPDATE users
SET roles = ['user', 'admin', 'teacher'],
    updated_at = NOW()
WHERE id = 'orange-uuid';
```

**結果**：
- ✅ 權限過濾系統可使用 T003 編號
- ✅ 收支記錄下拉選單立即顯示 Orange
- ✅ Orange 登入後有 teacher 權限

---

### 範例 2：停用 Karen 的諮詢師身份

**操作**：
1. 員工管理頁面 → 找到 Karen
2. 點擊「諮詢師 (C001)」旁的「停用」按鈕
3. 確認停用

**系統執行**：
```sql
-- 1. 停用 business_identities
UPDATE business_identities
SET is_active = false,
    effective_to = CURRENT_DATE,
    updated_at = NOW()
WHERE id = 'c001-identity-id';

-- 2. 自動同步 users.roles（重新計算）
-- Karen 還有 teacher 身份，所以保留 teacher
UPDATE users
SET roles = ['user', 'admin', 'teacher'],  -- 移除 'consultant'
    updated_at = NOW()
WHERE id = 'karen-uuid';
```

**結果**：
- ✅ Karen 的權限過濾不再包含 consultant_code
- ✅ 收支記錄「諮詢人員」下拉選單不再顯示 Karen
- ✅ 歷史記錄仍顯示 Karen 的諮詢師名稱

---

## 🏗️ 系統架構

### 資料流程
```
員工管理頁面
    ↓ 新增/停用/刪除角色身份
business_identities 表（主表）
    ├─ identity_type: 'teacher', 'consultant', 'setter'
    ├─ identity_code: 'T001', 'C001', 'S001'（自動生成）
    ├─ is_active: true/false
    └─ effective_from/to: 生效期間
    ↓ syncRolesToUser() 自動同步
users.roles 陣列（副表）
    ├─ ['user', 'teacher', 'consultant', ...]
    └─ 用於 API 查詢、權限控制
    ↓
/api/teachers 查詢（WHERE 'teacher' = ANY(roles)）
    ↓
收支記錄下拉選單顯示（Elena, Karen, Orange, Vicky）
```

### 分工明確

| 功能 | 使用的表 | 理由 |
|------|---------|------|
| **權限過濾系統** | business_identities | 需要業務編號（T001, C001）做權限過濾 |
| **收支記錄下拉選單** | users.roles | 簡單快速，只需要顯示名字 |
| **員工管理頁面** | business_identities | 顯示業務編號、歷史記錄 |
| **基本權限檢查** | users.roles | 快速判斷是否為 admin |

---

## 📁 檔案變更統計

### 前端（2 個檔案）
1. **client/src/pages/reports/income-expense-manager.tsx**
   - 新增：100+ 行
   - 功能：移除展開、新增排序、新增欄寬調整

2. **client/src/components/ui/resizable-table-head.tsx**
   - 新增：80 行
   - 功能：可調整欄寬的表格標題元件

### 後端（2 個檔案）
1. **server/routes.ts**
   - 修改：1 處 API（/api/teachers）
   - 功能：修復 queryDatabase 語法

2. **server/routes-employee-management.ts**
   - 新增：79 行
   - 功能：syncRolesToUser() 函數 + 3 個 API 同步調用

---

## 📝 Git Commits

| Commit | 說明 | 檔案 |
|--------|------|------|
| e06eaf9 | Phase 37.1 - 移除收支記錄展開功能 | income-expense-manager.tsx |
| cda76e6 | Phase 37.1 - 新增排序和可調整欄寬 | +resizable-table-head.tsx |
| 81d603b | Phase 37.2 - 修復 /api/teachers 查詢 (第一版) | routes.ts |
| e8c9e9d | Phase 37.2 - 修復 /api/teachers queryDatabase 語法 | routes.ts |
| 0f21323 | Phase 37.4 - 實作 business_identities → users.roles 自動同步 | routes-employee-management.ts |
| f38b17f | docs: Phase 37 - 統一人員選項管理系統完整記錄 | PROJECT_PROGRESS.md |

---

## ✅ Phase 37 成果

### 功能完成
- ✅ 收支記錄表 UI 優化（展開、排序、調整欄寬）
- ✅ Orange 教練修復（API 查詢語法修正）
- ✅ 業務編號系統設計決策（混合方案）
- ✅ 自動同步機制（business_identities ↔ users.roles）

### 系統架構優勢
- **簡單可靠**：只修改 1 個後端檔案，邏輯集中在 3 個 API
- **保留功能**：業務編號系統完整保留（權限過濾需要）
- **自動同步**：不會忘記更新，確保資料一致性
- **向下相容**：不影響現有 API 和前端

### 為權限過濾系統做準備
- business_identities 表完整保留
- 權限過濾服務（permission-filter-service.ts）無需修改
- 體驗課記錄（trial_class_attendance）已有 145 筆 teacher_code
- users.roles 保持同步，確保下拉選單正確

---

## 📝 測試建議（明日驗收）

### 測試 1：收支記錄下拉選單
1. 進入收支記錄管理頁面
2. 新增一筆記錄，點擊「授課教練」下拉選單
3. **預期結果**：看到 Elena, Karen, Orange, Vicky（按字母排序）

### 測試 2：表格排序與欄寬調整
1. 點擊任何欄位標題
2. **預期結果**：表格按該欄位排序，標題顯示箭頭圖示
3. 拖曳欄位標題右側邊緣
4. **預期結果**：欄位寬度即時調整

### 測試 3：員工管理新增角色
1. 進入員工管理頁面，找到任何員工
2. 新增角色身份（例如 consultant）
3. 儲存後檢查伺服器 log
4. **預期結果**：看到 `✅ 已同步角色: userId=..., roles=[...]`
5. 回到收支記錄頁面，檢查「諮詢人員」下拉選單
6. **預期結果**：該員工出現在下拉選單

### 測試 4：停用角色
1. 員工管理頁面停用某個角色身份
2. **預期結果**：收支記錄下拉選單不再顯示該人員（對應角色）
3. 歷史記錄仍正常顯示該人員名稱

---

## 🎓 關鍵技術決策

### 決策 1：混合方案（而非單一資料源）
**理由**：
- business_identities：權限過濾系統的核心依賴，無法移除
- users.roles：API 查詢效能更好，適合下拉選單
- 自動同步機制：確保兩者一致，避免 BUG

**使用者反饋**：「我覺得這個混合的可以，因為我馬上就要執行權限過濾系統」

---

### 決策 2：單向同步（business_identities → users.roles）
**理由**：
- business_identities 是主表（有業務編號、歷史記錄、生效日期）
- users.roles 是副表（僅供 API 查詢使用）
- 修改 business_identities 時自動更新 users.roles
- 不反向同步，避免循環依賴

**優勢**：
- 邏輯清晰，不易出錯
- 只需修改 3 個 API
- 向下相容，不影響現有功能

---

### 決策 3：集中同步邏輯（而非分散）
**理由**：
- syncRolesToUser() 函數集中處理所有同步邏輯
- 3 個 API 只需調用一行 `await syncRolesToUser(userId)`
- 未來修改同步邏輯只需改一個地方

**使用者需求**：「用最簡單實用的設定好就好，我不希望後面一堆 BUG」

---

## 📚 參考文件

- `PROJECT_PROGRESS.md` - Phase 37 完整記錄
- `server/routes-employee-management.ts` - 同步機制實作
- `server/services/permission-filter-service.ts` - 權限過濾服務
- `supabase/migrations/031_create_hr_management_system.sql` - business_identities 表結構

---

## 🚀 下一階段：Phase 38 權限過濾系統實作

使用者已確認：「我馬上就要執行權限過濾系統」

**準備工作已完成**：
- ✅ business_identities 表完整保留
- ✅ 權限過濾服務（permission-filter-service.ts）無需修改
- ✅ 體驗課記錄已有 teacher_code（145 筆）
- ✅ users.roles 與 business_identities 自動同步

**下一步**：
1. 測試現有權限過濾服務
2. 整合到各個報表頁面
3. 前端權限控制（側邊欄、功能按鈕）
4. 建立測試帳號驗證

---

**最後更新時間**: 2025-10-28
**開發工程師**: Claude（資深軟體開發工程師）
**當前狀態**: Phase 37 完成 - 統一人員選項管理系統 ✅
**下一階段**: Phase 38 - 權限過濾系統實作

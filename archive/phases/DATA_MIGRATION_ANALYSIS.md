# 資料遷移分析報告
**日期**: 2025-10-17
**分析者**: Claude
**目的**: Phase 19.2 - 準備將歷史資料遷移到業務身份系統

---

## 📊 資料概況

### 表格 1: trial_class_attendance（體驗課記錄）
- **總記錄數**: 145 筆
- **時間範圍**: 2024-06-16 至 2025-10-16

**人員欄位現況**:
- ✅ `teacher_name` (TEXT) - 有資料
- ✅ `teacher_code` (VARCHAR(20)) - **欄位已存在但全部為 NULL**
- ✅ `consultant_code` (VARCHAR(20)) - **欄位已存在但全部為 NULL**
- ✅ `sales_code` (VARCHAR(20)) - **欄位已存在但全部為 NULL**

**發現的教師名稱**:
| 教師名稱 | 記錄數 | 最早課程 | 最新課程 |
|---------|--------|---------|---------|
| Vicky   | 64     | 2024-06-16 | 2025-10-16 |
| Karen   | 58     | 2025-02-15 | 2025-10-03 |
| Elena   | 22     | 2025-03-11 | 2025-10-02 |
| orange  | 1      | 2025-08-21 | 2025-08-21 |

**⚠️ 注意事項**:
- "orange" 是小寫，但 users 表中是 "Orange"（大寫）
- 需要處理大小寫不一致問題

---

### 表格 2: income_expense_records（收支記錄）
- **總記錄數**: 637 筆
- **資料格式**: 人員資訊儲存在 `notes` 欄位（JSONB 格式）

**人員欄位現況**:
- ✅ `teacher_id` (UUID) - **欄位已存在但全部為 NULL**
- ✅ `teacher_code` (VARCHAR(20)) - **欄位已存在但全部為 NULL**
- ✅ `consultant_id` (UUID) - **欄位已存在但全部為 NULL**
- ✅ `consultant_code` (VARCHAR(20)) - **欄位已存在但全部為 NULL**
- ✅ `sales_person_id` (UUID) - **欄位已存在但全部為 NULL**
- ✅ `sales_code` (VARCHAR(20)) - **欄位已存在但全部為 NULL**

**notes 欄位結構** (JSON):
```json
{
  "original_notes": "",
  "teacher_name": "Karen",
  "sales_person_name": "Vicky",
  "consultant_name": "Vivi",
  "created_by_name": "Karen （Rainmaker）"
}
```

**發現的人員名稱**:

**教師** (4 位):
- Elena
- Karen
- Orange
- Vicky

**諮詢師** (6 位):
| 名稱 | 記錄數 |
|-----|--------|
| Vivi | 163 |
| Wendy | 69 |
| 47 | 8 |
| JU | 5 |
| Isha | 3 |
| Ivan | 1 |

**銷售人員** (6 位):
| 名稱 | 記錄數 |
|-----|--------|
| 47 | 101 |
| Vicky | 86 |
| Karen | 86 |
| 翊瑄 | 4 |
| Elena | 2 |
| 文軒 | 2 |

---

### 表格 3: teaching_quality_analysis（教學品質分析）
- **總記錄數**: 152 筆
- **唯一教師數**: 3 位

**人員欄位現況**:
- ✅ `teacher_id` (UUID) - **欄位已存在但全部為 NULL**
- ✅ `teacher_name` (TEXT) - 有資料

---

## 👥 現有 Users 資料

| ID | 名稱 | 角色 | 狀態 |
|----|------|------|------|
| b5474fc5-2bc1-429e-922b-8b97ccc48b67 | Elena | teacher | active |
| 2e259b11-5906-4647-b19a-ec43a3bbe537 | Karen | teacher | active |
| 03c1a361-3d48-4dd5-a815-2a9fc3564267 | Orange | teacher | active |
| 0ed734f2-f0d3-4b1f-b285-79c704a98a6e | Vicky | teacher | active |

**⚠️ 缺少的人員**（在資料中出現但 users 表中不存在）:
- **諮詢師**: Vivi, Wendy, 47, JU, Isha, Ivan
- **其他**: 翊瑄, 文軒

---

## 🗂️ 完整名稱對應需求

### 需要建立業務身份的人員清單

**已存在於 users 表的人員**:
1. **Elena** (b5474fc5-2bc1-429e-922b-8b97ccc48b67)
   - 需要身份: `teacher`, `sales`

2. **Karen** (2e259b11-5906-4647-b19a-ec43a3bbe537)
   - 需要身份: `teacher`, `sales`
   - 已有身份: `teacher` (T001), `consultant` (C001), `sales` (S001)
   - ✅ **已完成，無需處理**

3. **Orange** (03c1a361-3d48-4dd5-a815-2a9fc3564267)
   - 需要身份: `teacher`
   - ⚠️ 資料中是小寫 "orange"，需要處理大小寫不一致

4. **Vicky** (0ed734f2-f0d3-4b1f-b285-79c704a98a6e)
   - 需要身份: `teacher`, `sales`

**需要新增到 users 表的人員**:
5. **Vivi** - 諮詢師（163 筆記錄）
6. **Wendy** - 諮詢師（69 筆記錄）
7. **47** - 諮詢師（8 筆）+ 銷售（101 筆）
8. **JU** - 諮詢師（5 筆）
9. **Isha** - 諮詢師（3 筆）
10. **Ivan** - 諮詢師（1 筆）
11. **翊瑄** - 銷售（4 筆）
12. **文軒** - 銷售（2 筆）

---

## 📋 遷移任務清單

### Phase 1: 建立 Users 和業務身份（必須先完成）

**任務 1.1**: 新增缺少的 users 記錄
```sql
-- Vivi (諮詢師)
INSERT INTO users (email, first_name, role, status)
VALUES ('vivi@example.com', 'Vivi', 'consultant', 'active');

-- Wendy (諮詢師)
INSERT INTO users (email, first_name, role, status)
VALUES ('wendy@example.com', 'Wendy', 'consultant', 'active');

-- 47 (諮詢師 + 銷售)
INSERT INTO users (email, first_name, role, status)
VALUES ('47@example.com', '47', 'consultant', 'active');

-- JU (諮詢師)
INSERT INTO users (email, first_name, role, status)
VALUES ('ju@example.com', 'JU', 'consultant', 'active');

-- Isha (諮詢師)
INSERT INTO users (email, first_name, role, status)
VALUES ('isha@example.com', 'Isha', 'consultant', 'active');

-- Ivan (諮詢師)
INSERT INTO users (email, first_name, role, status)
VALUES ('ivan@example.com', 'Ivan', 'consultant', 'active');

-- 翊瑄 (銷售)
INSERT INTO users (email, first_name, role, status)
VALUES ('yixuan@example.com', '翊瑄', 'sales', 'active');

-- 文軒 (銷售)
INSERT INTO users (email, first_name, role, status)
VALUES ('wenxuan@example.com', '文軒', 'sales', 'active');
```

**任務 1.2**: 為所有人員建立業務身份
- Elena: T002, S002
- Orange: T003
- Vicky: T004, S003
- Vivi: C002
- Wendy: C003
- 47: C004, S004
- JU: C005
- Isha: C006
- Ivan: C007
- 翊瑄: S005
- 文軒: S006

---

### Phase 2: 遷移歷史資料

**任務 2.1**: 更新 trial_class_attendance 表
```sql
-- 範例：將 "Vicky" 對應到 T004
UPDATE trial_class_attendance
SET teacher_code = 'T004'
WHERE teacher_name = 'Vicky';

-- 處理大小寫不一致
UPDATE trial_class_attendance
SET teacher_code = 'T003'
WHERE LOWER(teacher_name) = 'orange';
```

**任務 2.2**: 更新 income_expense_records 表
```sql
-- 從 notes JSON 提取並更新
UPDATE income_expense_records
SET
  teacher_id = (SELECT id FROM users WHERE first_name = notes::jsonb->>'teacher_name'),
  teacher_code = (SELECT identity_code FROM business_identities WHERE user_id = (SELECT id FROM users WHERE first_name = notes::jsonb->>'teacher_name') AND identity_type = 'teacher' AND is_active = true)
WHERE notes::jsonb->>'teacher_name' IS NOT NULL;
```

**任務 2.3**: 更新 teaching_quality_analysis 表
```sql
UPDATE teaching_quality_analysis tqa
SET teacher_id = u.id
FROM users u
WHERE u.first_name = tqa.teacher_name;
```

---

### Phase 3: 驗證

**驗證 1**: 檢查未對應的記錄
```sql
-- trial_class_attendance 中沒有 teacher_code 的記錄
SELECT teacher_name, COUNT(*)
FROM trial_class_attendance
WHERE teacher_name IS NOT NULL AND teacher_code IS NULL
GROUP BY teacher_name;

-- 應該返回 0 筆
```

**驗證 2**: 檢查業務身份完整性
```sql
-- 確認所有業務身份都已建立
SELECT
  u.first_name,
  array_agg(bi.identity_type || ' ' || bi.identity_code) as identities
FROM users u
LEFT JOIN business_identities bi ON bi.user_id = u.id AND bi.is_active = true
GROUP BY u.id, u.first_name
ORDER BY u.first_name;
```

---

## ⚠️ 風險與注意事項

1. **大小寫不一致**
   - "orange" vs "Orange"
   - 建議使用 `LOWER()` 或 `ILIKE` 進行比對

2. **諮詢師/銷售缺少 email**
   - 新增的 users 記錄使用假 email
   - 需要後續補充真實 email

3. **"47" 這個名稱**
   - 是編號還是真實名稱？
   - 需要確認是否為同一人

4. **資料完整性**
   - 確保所有 notes JSON 都能正確解析
   - 部分舊記錄的 notes 可能不是 JSON 格式

5. **歷史資料不可逆**
   - 建議先在測試環境執行
   - 或先備份資料

---

## 🎯 下一步建議

1. **立即執行**: 建立缺少的 users 記錄和業務身份
2. **編寫腳本**: 批次遷移歷史資料的自動化腳本
3. **逐步驗證**: 每個表格遷移後立即驗證
4. **保留舊欄位**: 暫時保留 `teacher_name` 等欄位，確保向後相容

---

**報告完成時間**: 2025-10-17 18:53 (台北時間)

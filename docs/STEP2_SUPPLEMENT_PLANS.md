# 步驟 2: 補充課程方案資料

## 📋 目標
檢查您的 Supabase 資料庫，找出所有使用中的方案名稱，並補充缺少的方案定義。

---

## 🔍 Part A: 檢查現有方案

### 1. 前往 Supabase Dashboard
- 登入 https://supabase.com/dashboard
- 選擇您的專案
- 點擊左側選單的 **SQL Editor**

### 2. 執行檢查查詢
- 打開檔案：`supabase/queries/check-existing-plans.sql`
- 複製全部內容
- 貼到 SQL Editor 中
- 點擊 **Run** 執行

### 3. 查看結果
查詢會顯示三個表格：

**表格 1: 目前使用中的所有方案**
```
方案名稱          | 學生數量 | 首次使用日期
-----------------|---------|-------------
初學專案          | 25      | 2024-01-15
進階專案          | 18      | 2024-02-01
VIP專案           | 10      | 2024-03-10
```

**表格 2: 缺少的方案** ⚠️ 重點！
```
❌ 缺少的方案    | 影響的學生數
----------------|-------------
VIP專案          | 10
快速入門          | 5
```

**表格 3: 已存在的方案** ✅
```
✅ 已存在的方案  | 總堂數 | 分類   | 啟用
----------------|--------|--------|------
初學專案         | 4      | 體驗課 | true
進階專案         | 6      | 體驗課 | true
```

---

## ➕ Part B: 補充缺少的方案

### 1. 根據表格 2 的結果，記錄缺少的方案

例如，如果缺少：
- `VIP專案` (10 位學生)
- `快速入門` (5 位學生)

### 2. 編輯 insert-missing-plans.sql

打開 `supabase/queries/insert-missing-plans.sql`，修改 INSERT 語句：

```sql
INSERT INTO course_plans (plan_name, total_classes, category, description, is_active, display_order)
VALUES
  -- 根據您的實際情況填寫
  ('VIP專案', 10, '體驗課', 'VIP專屬10堂課程', TRUE, 6),
  ('快速入門', 2, '體驗課', '快速入門2堂課', TRUE, 7)
ON CONFLICT (plan_name) DO UPDATE SET
  total_classes = EXCLUDED.total_classes,
  updated_at = NOW();
```

**重要參數說明**:
- `plan_name`: 必須與 `trial_class_purchases.package_name` **完全一致**
- `total_classes`: 該方案的總堂數（用於計算剩餘堂數）
- `category`: 體驗課、正式課、特殊方案
- `is_active`: TRUE = 啟用，FALSE = 停用
- `display_order`: 顯示順序（數字越小越前面）

### 3. 在 Supabase SQL Editor 執行

- 複製修改後的 SQL
- 貼到 SQL Editor
- 點擊 **Run**
- 確認執行成功

### 4. 驗證結果

執行檔案最後的驗證查詢：

```sql
SELECT
  plan_name AS "方案名稱",
  total_classes AS "總堂數",
  category AS "分類",
  is_active AS "啟用"
FROM course_plans
ORDER BY display_order;
```

應該能看到所有方案都已存在。

---

## ✅ 完成檢查清單

- [ ] Part A: 執行 `check-existing-plans.sql` 查詢
- [ ] Part A: 記錄所有缺少的方案名稱
- [ ] Part B: 修改 `insert-missing-plans.sql`
- [ ] Part B: 執行 INSERT 語句補充方案
- [ ] 驗證：確認所有方案都已存在
- [ ] 回報：告訴 Claude 哪些方案已補充

---

## 🚨 常見問題

### Q1: 方案名稱不一致怎麼辦？
**問題**: `trial_class_purchases` 中的方案叫「初級方案」，但實際應該叫「初學專案」

**解決方案 A** (推薦): 更新 course_plans 使用實際的名稱
```sql
INSERT INTO course_plans (plan_name, total_classes, category, is_active)
VALUES ('初級方案', 4, '體驗課', TRUE);
```

**解決方案 B**: 更新 trial_class_purchases 統一名稱
```sql
UPDATE trial_class_purchases
SET package_name = '初學專案'
WHERE package_name = '初級方案';
```

### Q2: 不知道某個方案的總堂數？
查詢該方案學生的實際上課記錄：

```sql
SELECT
  p.package_name,
  p.student_name,
  COUNT(a.id) as attended_classes
FROM trial_class_purchases p
LEFT JOIN trial_class_attendance a ON p.student_name = a.student_name
WHERE p.package_name = 'VIP專案'
GROUP BY p.package_name, p.student_name
ORDER BY attended_classes DESC;
```

看最多人上過幾堂課，推測總堂數。

### Q3: 有些方案已經停用了？
將 `is_active` 設為 `FALSE`：

```sql
UPDATE course_plans
SET is_active = FALSE
WHERE plan_name = '舊方案名稱';
```

---

## 📞 需要協助？

完成後請告訴我：
1. ✅ 執行成功了嗎？
2. 📝 補充了哪些方案？（方案名稱 + 總堂數）
3. ⚠️ 有遇到任何問題嗎？

我會繼續進行**步驟 3: 實作後端自動計算邏輯**！

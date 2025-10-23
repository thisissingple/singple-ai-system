# 欄位淘汰計畫

## 📋 背景

在引入 `course_plans` 表後，`trial_class_purchases` 中的以下欄位變成冗餘：

| 欄位名稱 | 原用途 | 新方案 |
|---------|--------|--------|
| `trial_class_count` | 儲存總堂數 | ❌ 改用 `course_plans.total_classes` |
| `remaining_classes` | 儲存剩餘堂數 | ❌ 改用自動計算（total - attended） |

---

## 🎯 淘汰策略（分階段）

### ✅ **階段 1: 標記為已棄用** (Migration 039)

**目標**: 通知開發者不要再使用這些欄位

**做法**:
- 保留欄位結構（不刪除）
- 新增 `DEPRECATED` 註解
- 歷史資料保持不變

**執行**:
```sql
-- 在 Supabase SQL Editor 執行
-- supabase/migrations/039_deprecate_redundant_columns.sql
```

**影響**:
- ✅ 無破壞性變更
- ✅ 現有查詢仍可運作
- ⚠️ 提醒開發者停止使用

---

### ✅ **階段 2: 停止寫入這些欄位** (代碼層級)

**目標**: 後端代碼不再更新 `trial_class_count` 和 `remaining_classes`

**變更位置**:
1. 任何 INSERT 到 `trial_class_purchases` 的地方
2. 任何 UPDATE 這兩個欄位的地方

**檢查清單**:
- [ ] 檢查 `server/routes.ts` 中的 form submission handlers
- [ ] 檢查 Google Sheets 同步邏輯（如果還在用）
- [ ] 檢查任何手動更新學生記錄的 API

**改為**:
```typescript
// ❌ 舊代碼 - 不要再這樣寫
await supabase
  .from('trial_class_purchases')
  .update({
    trial_class_count: 4,        // ❌ 不要寫入
    remaining_classes: 2          // ❌ 不要寫入
  });

// ✅ 新代碼 - 只更新必要欄位
await supabase
  .from('trial_class_purchases')
  .update({
    package_name: '初學專案',    // ✅ 這個要更新
    status: '體驗中'             // ✅ 狀態可以更新
  });
```

**驗證**:
- 觀察 1-2 週，確認新資料不再寫入這兩個欄位
- 查詢最近更新的記錄：
  ```sql
  SELECT student_name, trial_class_count, remaining_classes, updated_at
  FROM trial_class_purchases
  WHERE updated_at > NOW() - INTERVAL '7 days'
  ORDER BY updated_at DESC;
  ```

---

### ⏳ **階段 3: 設定欄位為 NULL** (未來執行)

**時機**: 階段 2 運行穩定 1 個月後

**目標**: 清空欄位值，但保留欄位結構

```sql
-- 將所有值設為 NULL（保留欄位）
UPDATE trial_class_purchases
SET trial_class_count = NULL,
    remaining_classes = NULL;
```

**影響**:
- ✅ 強制所有查詢使用新邏輯
- ⚠️ 如果有遺漏的舊代碼會立即發現
- ✅ 仍可回滾（欄位還在）

---

### ⏳ **階段 4: 完全刪除欄位** (未來執行)

**時機**: 階段 3 運行穩定 3 個月後

**目標**: 徹底移除欄位，清理資料庫結構

```sql
-- ⚠️ 不可逆操作！
ALTER TABLE trial_class_purchases
DROP COLUMN trial_class_count,
DROP COLUMN remaining_classes;
```

**影響**:
- ✅ 資料庫更乾淨
- ✅ 避免未來混淆
- ❌ 無法回滾，歷史資料永久消失

---

## 🛠️ 新的最佳實踐

### ✅ **正確的查詢方式**

**方法 1: 使用新建的視圖（推薦）**
```sql
SELECT
  student_name,
  package_name,
  total_classes,      -- 來自 course_plans
  attended_classes,   -- 自動計算
  remaining_classes   -- 自動計算
FROM student_class_summary
WHERE student_email = 'example@gmail.com';
```

**方法 2: 手動 JOIN**
```sql
SELECT
  p.student_name,
  p.package_name,
  cp.total_classes,
  (SELECT COUNT(*) FROM trial_class_attendance a
   WHERE a.student_email = p.student_email
     AND a.class_date >= p.purchase_date
  ) AS attended_classes,
  cp.total_classes - (SELECT COUNT(*) FROM trial_class_attendance a
                      WHERE a.student_email = p.student_email
                        AND a.class_date >= p.purchase_date
  ) AS remaining_classes
FROM trial_class_purchases p
LEFT JOIN course_plans cp ON p.package_name = cp.plan_name
WHERE p.student_email = 'example@gmail.com';
```

**方法 3: 使用後端服務（最推薦）**
```typescript
// 後端已經在 total-report-service.ts 實作
const studentInsights = await totalReportService.generateReport({
  period: 'all',
  userId: currentUserId
});
// studentInsights 中的 totalTrialClasses 已自動從 course_plans 查詢
```

---

## ❌ **不要再這樣做**

```typescript
// ❌ 直接讀取已棄用欄位
const { trial_class_count, remaining_classes } = row;

// ❌ 更新已棄用欄位
await supabase
  .from('trial_class_purchases')
  .update({
    trial_class_count: newValue,
    remaining_classes: newValue
  });

// ❌ 在 INSERT 時設定這些欄位
await supabase
  .from('trial_class_purchases')
  .insert({
    student_name: 'John',
    trial_class_count: 4,      // ❌
    remaining_classes: 4        // ❌
  });
```

---

## 🔍 檢查清單

### Migration 039 執行前
- [ ] 備份 `trial_class_purchases` 表
- [ ] 確認 `course_plans` 表已建立且有資料
- [ ] 確認後端代碼已改用 `course_plans` 查詢

### Migration 039 執行後
- [ ] 驗證 COMMENT 已正確新增
- [ ] 驗證視圖 `student_class_summary` 可正常查詢
- [ ] 測試前端報表仍正常顯示

### 階段 2 執行前
- [ ] 搜尋代碼中所有對這兩個欄位的 INSERT/UPDATE
- [ ] 逐一修改為不寫入這些欄位
- [ ] 全面測試表單提交功能

---

## 📞 問題與解答

### Q1: 如果有舊資料的 trial_class_count 與 course_plans 不一致怎麼辦？
**A**: 視圖和後端代碼會優先使用 `course_plans` 的值。舊的 `trial_class_count` 會被忽略。

### Q2: 如果 course_plans 中找不到對應方案？
**A**: 系統會 fallback 到 `trial_class_count`（歷史資料），並顯示警告訊息。

### Q3: 可以跳過階段直接刪除欄位嗎？
**A**: 不建議。分階段可以安全驗證，避免破壞現有功能。

### Q4: 視圖的效能如何？
**A**: 視圖包含子查詢（COUNT），建議未來改用 materialized view 或快取。

---

## 📅 時間表建議

| 階段 | 時間點 | 狀態 |
|-----|--------|------|
| 階段 1: 標記 DEPRECATED | 2025-10-23 | ✅ Migration 039 |
| 階段 2: 停止寫入 | 2025-10-24 ~ 2025-11-23 | ⏳ 觀察期 1 個月 |
| 階段 3: 設為 NULL | 2025-12-23 | ⏸️ 待定 |
| 階段 4: 刪除欄位 | 2026-03-23 | ⏸️ 待定 |

---

## 🚀 當前行動項目

**您現在要做**:
1. ✅ 執行 Migration 039（在 Supabase SQL Editor）
2. ✅ 驗證視圖 `student_class_summary` 可正常查詢
3. ⏳ 繼續使用系統 1-2 週，觀察是否正常

**我現在要做**:
- 搜尋代碼中所有寫入這兩個欄位的地方
- 修改為不再寫入
- 提交代碼變更

完成後這兩個欄位會自然"老化"，未來可以安全刪除。

# 已轉高學生定義

## 定義公式

**已轉高學生** = 符合以下**所有條件**的學生：

1. ✅ 在 `trial_class_purchases` 表中有體驗課購買記錄
2. ✅ 在 `eods_for_closers` 表中有高階成交記錄
3. ✅ `eods_for_closers.actual_amount` 不為 NULL 且不為 `NT$0.00`（有實際成交金額）
4. ✅ `eods_for_closers.deal_date` >= `trial_class_purchases.purchase_date`（高階成交日期在體驗課購買日期當天或之後）
5. ✅ `eods_for_closers.plan` 包含以下任一關鍵字：
   - `高階一對一訓練`
   - 或其他一對一訓練方案（Elena高階一對一訓練、Vicky高階一對一訓練、Karen高階一對一訓練）

## SQL 查詢範例

```sql
SELECT DISTINCT
  t.student_email,
  t.student_name,
  t.purchase_date as trial_purchase_date,
  e.deal_date,
  e.plan,
  e.actual_amount
FROM trial_class_purchases t
INNER JOIN eods_for_closers e
  ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
WHERE e.actual_amount IS NOT NULL
  AND e.actual_amount != 'NT$0.00'
  AND e.deal_date IS NOT NULL
  AND e.deal_date >= t.purchase_date
  AND (e.plan LIKE '%高階一對一訓練%')
ORDER BY t.student_name;
```

## 關鍵邏輯說明

### 為什麼要 INNER JOIN？
- 確保學生**必須先有體驗課記錄**，才能算是「已轉高」
- 直接從高階成交表查詢會包含沒有上過體驗課的學生（不符合定義）

### 為什麼要檢查日期順序？
- `deal_date >= purchase_date` 確保學生是**先上體驗課（或同一天），後購買高階方案**
- 包含同一天成交的情況（例如：諮詢後立即決定購買高階方案）
- 這是「轉換」的核心邏輯：體驗課 → 高階方案

### 方案名稱篩選
目前符合定義的高階方案包括：
- Elena高階一對一訓練
- Vicky高階一對一訓練
- Karen高階一對一訓練

**不包含**：
- 初學專案（4堂）
- 不指定一對一
- 其他非高階訓練方案

## 統計數據（截至 2025-11-16）

- 體驗課購買學生總數: 110 位
- 有高階成交記錄: 68 位
- 符合「已轉高」定義: **22 位** (26 筆記錄，部分學生有多次成交)
  - deal_date > purchase_date: 19 位學生 (23 筆記錄)
  - deal_date = purchase_date: 3 位學生 (3 筆記錄)

## 使用場景

此定義用於以下 KPI 計算：

1. **轉換率計算** = 已轉高學生數 / 體驗課購買學生數
2. **平均轉換時間** = AVG(deal_date - purchase_date) 只計算已轉高學生
3. **體驗課報表** - 體驗課總覽頁面的轉換數據

## 注意事項

⚠️ **重要**：
- 此定義與單純查詢 `eods_for_closers` 表不同
- 必須同時滿足「有體驗課」+「日期順序正確」+「高階方案」三個條件
- 不要使用 `trial_class_purchases.package_name` 來判斷是否轉高（那是體驗課方案，不是高階方案）

## 版本歷史

- 2025-11-16: 初版定義確立

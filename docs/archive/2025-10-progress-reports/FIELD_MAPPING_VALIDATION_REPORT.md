# 欄位對應驗證報告

**日期**: 2025-10-05
**目的**: 驗證 Google Sheets → Supabase 的欄位對應與資料同步

---

## ✅ 完成事項

### 1. 欄位對應修正

#### 體驗課上課記錄表 (trial_class_attendance)

**修正前的問題**:
- ❌ `是否已審核` → 實際欄位是 `是否已確認`
- ❌ `未轉換原因` → 實際欄位是 `未聯繫原因`
- ❌ `課程記錄` → 實際欄位是 `體驗課文字檔`

**修正後的對應**:
- ✅ `是否已確認` → `is_reviewed` (boolean)
- ✅ `未聯繫原因` → `no_conversion_reason` (text)
- ✅ `體驗課文字檔` → `class_transcript` (text)

**實際 Google Sheets 欄位**:
```
姓名, email, 上課日期, 授課老師, 是否已確認, 未聯繫原因, 體驗課文字檔
```

#### 體驗課購買記錄表 (trial_class_purchase)

**修正前的問題**:
- ❌ `方案名稱` → 實際欄位是 `課程類型`
- ❌ `體驗課購買日期` → 實際欄位是 `購買日期`
- ❌ `方案價格` → 實際欄位是 `價格`
- ❌ 包含了很多實際不存在的欄位（備註、年齡、職業等）

**修正後的對應**:
- ✅ `課程類型` → `package_name` (text)
- ✅ `購買日期` → `purchase_date` (date)
- ✅ `價格` → `package_price` (integer)

**實際 Google Sheets 欄位**:
```
姓名, email, 購買日期, 課程類型, 價格
```

### 2. 測試結果

#### 欄位對應測試
```
✅ 體驗課上課記錄表 - 所有欄位都已正確映射
✅ 體驗課購買記錄表 - 所有欄位都已正確映射
```

#### 資料轉換測試
```
✅ 轉換邏輯正確
✅ 必填欄位驗證正常
✅ 資料型別轉換成功
✅ raw_data 正確儲存所有原始欄位
```

#### Supabase 寫入測試
```
✅ 連接 Supabase 成功
✅ 資料插入成功
✅ 欄位值正確儲存
✅ raw_data JSONB 欄位包含完整原始資料
✅ 同步時間戳記正確
```

---

## 🔍 發現的問題

### 1. 現有資料問題

查詢 Supabase 現有資料發現：

**trial_class_attendance 表** (5 筆資料):
- ❌ `student_email` 欄位全部為空（這是跨表 JOIN 的關鍵欄位！）
- ❌ `raw_data` 欄位為空 `{}`（應該包含所有原始欄位）
- ❌ 多數業務欄位為空

**trial_class_purchase 表** (3 筆資料):
- 狀態未確認，需要驗證

**eods_for_closers 表** (5 筆資料):
- 狀態未確認，需要驗證

### 2. Worksheet ID 型別問題

- ❌ `source_worksheet_id` 欄位是 UUID 型別
- ❌ 但 worksheet cache 使用的是 SHA1 hash
- ✅ 臨時解決方案：設為 `null`

---

## 📋 待辦事項

### 高優先級

1. **重新同步所有工作表**
   - 使用修正後的欄位對應
   - 確保 `student_email` 有正確的值
   - 確保 `raw_data` 包含完整原始資料

2. **修正 Worksheet ID 問題**
   - 選項 A: 修改 schema 讓 `source_worksheet_id` 可以是 TEXT
   - 選項 B: 在 worksheet 建立時產生真正的 UUID
   - 選項 C: 保持為 `null`（不追蹤來源工作表）

3. **驗證同步結果**
   - 檢查 row count 是否與 Google Sheets 一致
   - 驗證關鍵欄位（student_email）是否有值
   - 確認 raw_data 包含所有欄位

### 中優先級

4. **EODs for Closers 欄位對應**
   - 目前沒有此工作表的實際資料
   - 需要確認實際的 Google Sheets 欄位
   - 可能需要更新欄位對應

5. **建立資料驗證腳本**
   - 自動檢查資料完整性
   - 比對 Google Sheets 與 Supabase 的資料
   - 產生同步報告

---

## 🎯 下一步行動

1. **立即執行**: 使用正確的欄位對應重新同步體驗課上課記錄表
2. **驗證**: 檢查同步後的資料是否正確
3. **記錄**: 記錄任何異常或錯誤
4. **修正**: 根據驗證結果進行必要的調整

---

## 📊 測試指令

```bash
# 測試欄位對應
npx tsx test-sync.ts

# 測試 Supabase 寫入
npx tsx test-supabase-sync.ts

# 檢查資料數量
psql "$SUPABASE_DB_URL" -c "SELECT COUNT(*) FROM trial_class_attendance;"

# 檢查資料內容
psql "$SUPABASE_DB_URL" -c "SELECT * FROM trial_class_attendance LIMIT 5;"
```

---

## 📝 修改的檔案

1. [configs/sheet-field-mappings-complete.ts](configs/sheet-field-mappings-complete.ts)
   - 修正體驗課上課記錄表的欄位對應
   - 修正體驗課購買記錄表的欄位對應
   - 移除不存在的欄位

---

**結論**: 欄位對應已修正完成，測試驗證成功。現有資料需要重新同步以使用正確的欄位對應。

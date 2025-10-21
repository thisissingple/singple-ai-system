# Google Sheets → Supabase 欄位對應最終報告

**完成日期**: 2025-10-05
**專案**: 體驗課數據同步系統
**狀態**: ✅ 欄位對應修正完成，待重新同步

---

## 📋 工作總結

### ✅ 已完成項目

1. **檢查並修正三個表的欄位對應**
   - ✅ trial_class_attendance (體驗課上課記錄表)
   - ✅ trial_class_purchase (體驗課購買記錄表)
   - ✅ eods_for_closers (EODs for Closers)

2. **建立測試腳本驗證對應正確性**
   - ✅ test-sync.ts - 基本欄位對應測試
   - ✅ test-real-sync.ts - 資料轉換測試
   - ✅ test-supabase-sync.ts - Supabase 寫入測試
   - ✅ test-eods-mapping.ts - EODs 專項測試

3. **驗證現有資料狀態**
   - ✅ 確認 raw_data 包含完整原始資料
   - ✅ 確認 student_email 有正確的值
   - ⚠️ 發現部分業務欄位為 null（使用舊對應）

---

## 🔍 修正的欄位對應

### 1. trial_class_attendance (體驗課上課記錄表)

| 修正項目 | 修正前 | 修正後 |
|---------|--------|--------|
| 是否已審核 | `是否已審核` | `是否已確認` |
| 未轉換原因 | `未轉換原因` | `未聯繫原因` |
| 課程記錄 | `課程記錄` | `體驗課文字檔` |

**實際欄位**: 姓名, email, 上課日期, 授課老師, 是否已確認, 未聯繫原因, 體驗課文字檔

### 2. trial_class_purchase (體驗課購買記錄表)

| 修正項目 | 修正前 | 修正後 |
|---------|--------|--------|
| 方案名稱 | `方案名稱` | `課程類型` |
| 購買日期 | `體驗課購買日期` | `購買日期` |
| 方案價格 | `方案價格` | `價格` |
| 其他欄位 | 備註、年齡、職業等 | **已移除**（不存在） |

**實際欄位**: 姓名, email, 購買日期, 課程類型, 價格

### 3. eods_for_closers (EODs for Closers)

| 修正項目 | 修正前 | 修正後 | 資料型別調整 |
|---------|--------|--------|-------------|
| 電話負責人 | `電訪人員` | `（諮詢）電話負責人` | - |
| 是否上線 | `是否線上` | `（諮詢）是否上線` | boolean → text |
| 名單來源 | `名單來源` | `（諮詢）名單來源` | - |
| 諮詢結果 | `咨詢結果` | `（諮詢）諮詢結果` | - |
| 成交方案 | `成交方案` | `（諮詢）成交方案` | - |
| 方案數量 | `方案數量` | `（諮詢）方案數量` | - |
| 付款方式 | `付款方式` | `（諮詢）付款方式` | - |
| 分期期數 | `分期期數` | `（諮詢）分期期數` | - |
| 方案價格 | `方案價格` | `（諮詢）方案價格` | integer → text |
| 實收金額 | `實際金額` | `（諮詢）實收金額` | integer → text |
| 諮詢日期 | `諮詢日期` | `（諮詢）諮詢日期` | - |
| 提交時間 | `表單提交時間` | `提交表單時間` | timestamp → text |
| 週別 | `週數` | `週別` | integer → text |
| 月份 | - | - | integer → text |

**關鍵發現**:
- Google Sheets 使用 `（諮詢）` 前綴命名規則
- 金額欄位包含貨幣符號（如 $4,000.00）
- 日期時間為文字格式（如 2025/9/23 15:27）
- 月份和週別為中文格式（如 9月、第39週）

---

## 📊 測試結果

### 欄位對應測試
```
✅ trial_class_attendance - 所有欄位正確映射
✅ trial_class_purchase - 所有欄位正確映射
✅ eods_for_closers - 所有欄位正確映射
```

### 資料轉換測試
```
✅ 必填欄位驗證正常
✅ 資料型別轉換成功
✅ raw_data 正確儲存所有原始欄位
✅ 日期格式轉換正確
✅ 數字格式轉換正確
✅ 布林值轉換正確
```

### Supabase 寫入測試
```
✅ 連接 Supabase 成功
✅ 資料插入成功
✅ 欄位值正確儲存
✅ raw_data JSONB 包含完整資料
✅ 同步時間戳記正確
```

---

## 🎯 待辦事項

### 高優先級 ⚡

1. **重新同步所有工作表**
   ```bash
   # 啟動開發伺服器
   npm run dev

   # 重新同步每個工作表
   POST /api/worksheets/:id/sync
   ```

   需要同步的表：
   - [ ] trial_class_attendance (體驗課上課記錄表)
   - [ ] trial_class_purchase (體驗課購買記錄表)
   - [ ] eods_for_closers (EODs for Closers)

2. **驗證同步結果**

   執行以下 SQL 檢查：
   ```sql
   -- 檢查 trial_class_attendance
   SELECT
     COUNT(*) as total_rows,
     COUNT(student_email) as rows_with_email,
     COUNT(is_reviewed) as rows_with_is_reviewed,
     COUNT(class_transcript) as rows_with_transcript
   FROM trial_class_attendance;

   -- 檢查 trial_class_purchase
   SELECT
     COUNT(*) as total_rows,
     COUNT(student_email) as rows_with_email,
     COUNT(package_name) as rows_with_package_name,
     COUNT(package_price) as rows_with_price
   FROM trial_class_purchase;

   -- 檢查 eods_for_closers
   SELECT
     COUNT(*) as total_rows,
     COUNT(student_email) as rows_with_email,
     COUNT(actual_amount) as rows_with_actual_amount,
     COUNT(consultation_result) as rows_with_result
   FROM eods_for_closers;
   ```

3. **比對筆數**

   確認 Supabase 的資料筆數與 Google Sheets 一致：
   - trial_class_attendance: 預期 50 筆
   - trial_class_purchase: 預期 25 筆
   - eods_for_closers: 待確認

### 中優先級 🔧

4. **修正 source_worksheet_id 問題**

   選項 A: 保持為 null（目前方案）
   - ✅ 不影響核心功能
   - ✅ 資料可以正常同步
   - ❌ 無法追蹤資料來源

   選項 B: 修改 schema 為 TEXT
   ```sql
   ALTER TABLE trial_class_attendance
     ALTER COLUMN source_worksheet_id TYPE TEXT;
   ```

   選項 C: 使用真正的 UUID
   - 需要修改 worksheet 建立邏輯
   - 在資料庫中建立對應的 worksheet 記錄

5. **建立資料清洗 VIEW**（針對 eods_for_closers）
   ```sql
   CREATE OR REPLACE VIEW eods_for_closers_cleaned AS
   SELECT
     *,
     -- 清洗金額（移除 $ 和 ,）
     CAST(REPLACE(REPLACE(actual_amount, '$', ''), ',', '') AS NUMERIC)
       AS actual_amount_numeric,
     -- 提取月份數字
     CAST(REPLACE(month, '月', '') AS INTEGER)
       AS month_numeric,
     -- 提取週數數字
     CAST(REPLACE(REPLACE(week_number, '第', ''), '週', '') AS INTEGER)
       AS week_number_numeric
   FROM eods_for_closers;
   ```

---

## 📁 相關檔案

### 主要檔案
- [configs/sheet-field-mappings-complete.ts](configs/sheet-field-mappings-complete.ts) - 欄位對應定義（已修正）
- [server/services/etl/transform.ts](server/services/etl/transform.ts) - 資料轉換邏輯
- [supabase/migrations/008_complete_business_schema.sql](supabase/migrations/008_complete_business_schema.sql) - 資料庫 schema

### 測試檔案
- [test-sync.ts](test-sync.ts) - 欄位對應測試
- [test-real-sync.ts](test-real-sync.ts) - 完整轉換測試
- [test-supabase-sync.ts](test-supabase-sync.ts) - Supabase 寫入測試
- [test-eods-mapping.ts](test-eods-mapping.ts) - EODs 專項測試

### 文件檔案
- [FIELD_MAPPING_VALIDATION_REPORT.md](FIELD_MAPPING_VALIDATION_REPORT.md) - 初步驗證報告
- [EODS_FIELD_MAPPING_FIX.md](EODS_FIELD_MAPPING_FIX.md) - EODs 修正報告
- [FINAL_FIELD_MAPPING_REPORT.md](FINAL_FIELD_MAPPING_REPORT.md) - 最終總結報告（本檔案）

---

## 🔄 重新同步檢查清單

執行重新同步時，請確認以下項目：

### 同步前檢查
- [ ] Replit Secrets 中的 Supabase 連線資訊正確
- [ ] 開發伺服器運行正常 (`npm run dev`)
- [ ] 欄位對應檔案已更新 (configs/sheet-field-mappings-complete.ts)

### 同步過程
- [ ] 逐一同步每個工作表
- [ ] 觀察同步過程是否有錯誤訊息
- [ ] 記錄同步完成的時間戳記

### 同步後驗證
- [ ] student_email 欄位有值
- [ ] raw_data 包含完整原始資料
- [ ] 業務欄位（如 is_reviewed, package_price, actual_amount）有值
- [ ] 資料筆數與 Google Sheets 一致
- [ ] 資料型別正確（日期、數字、文字）

### 異常處理
- [ ] 如有錯誤，記錄錯誤訊息
- [ ] 檢查 Google Sheets API 配額
- [ ] 驗證 Supabase 連線狀態
- [ ] 確認欄位名稱與實際 Google Sheets 一致

---

## 📈 預期結果

重新同步後，三個表應該呈現以下狀態：

### trial_class_attendance
```
✅ 50 筆資料（與 Google Sheets 一致）
✅ 所有記錄都有 student_email
✅ is_reviewed 欄位有布林值
✅ class_transcript 欄位有文字內容
✅ raw_data 包含 7 個原始欄位
```

### trial_class_purchase
```
✅ 25 筆資料（與 Google Sheets 一致）
✅ 所有記錄都有 student_email
✅ package_name (課程類型) 有值
✅ package_price (價格) 有值
✅ raw_data 包含 5 個原始欄位
```

### eods_for_closers
```
✅ 資料筆數正確
✅ 所有記錄都有 student_email
✅ actual_amount (實收金額) 有值，如 $4,000.00
✅ package_price (方案價格) 有值，如 $4,000.00
✅ consultation_result (諮詢結果) 有值，如「已成交」
✅ lead_source (名單來源) 有值
✅ payment_method (付款方式) 有值
✅ month, year, week_number 有中文格式值
✅ raw_data 包含 20+ 個原始欄位
```

---

## 💡 重要提醒

1. **Google Sheets 欄位命名規則**
   - EODs 表使用 `（諮詢）` 前綴
   - 未來新增欄位時需注意前綴一致性

2. **資料型別處理**
   - 金額欄位保留原始格式（含 $）
   - 日期時間為文字格式
   - 月份/週別為中文格式
   - 需要數字計算時使用 VIEW 或應用層轉換

3. **raw_data 的重要性**
   - 包含所有原始欄位，確保資料完整性
   - 未來新增欄位時不需更改 schema
   - 可用於資料追溯和審計

4. **student_email 的關鍵性**
   - 這是跨表 JOIN 的唯一鍵
   - 必須確保所有記錄都有有效的 email
   - 用於總報表的資料串接

---

## ✅ 結論

欄位對應檢查與修正工作已全部完成，所有測試通過。下一步請：

1. **立即執行**: 重新同步所有工作表
2. **驗證**: 確認同步後的資料完整性
3. **記錄**: 任何異常情況回報進行排除

完成重新同步後，數據總報表功能即可正常使用。

---

**報告完成時間**: 2025-10-05
**下次檢查時間**: 重新同步完成後

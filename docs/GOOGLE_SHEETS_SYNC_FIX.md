# Google Sheets 同步修復文件

## 📋 問題診斷

### 根本原因
已註冊的 Google Sheets 名稱不包含系統識別關鍵字，導致 `identifyTargetTable()` 返回 `null`，Supabase 同步被跳過。

**已註冊的 Google Sheets：**
- ❌ "Test Spreadsheet" (238 rows)
- ❌ "電話、諮詢每日紀錄表" (991 rows)

**原有識別規則（僅支援名稱匹配）：**
```typescript
const mappings = [
  { type: 'trial_attendance', patterns: ['體驗課上課', 'attendance', '上課打卡'] },
  { type: 'trial_purchase', patterns: ['體驗課購買', 'purchase', '學員轉單'] },
  { type: 'eods', patterns: ['eod', '成交', 'closer'] },
];
```

因為工作表名稱都不包含這些關鍵字，所以無法識別。

---

## ✅ 解決方案

### 新增智能欄位識別功能

修改了 3 個檔案，新增基於欄位結構的智能識別：

#### 1. [sheetMappingService.ts](../server/services/reporting/sheetMappingService.ts#L26-L83)

**修改內容：**
- 新增 `headers` 參數（可選）
- 優先使用名稱關鍵字識別（保留原有邏輯）
- 若名稱無法識別，則檢查欄位結構（新增功能）

**新增的欄位識別邏輯：**

```typescript
// 判斷是否為「體驗課上課記錄」
const hasAttendanceFields = [
  '上課日期', 'class date', '授課老師', 'teacher', '是否已確認', 'attended'
].some(keyword => lowerHeaders.some(h => h.includes(keyword.toLowerCase())));

// 判斷是否為「體驗課購買記錄」
const hasPurchaseFields = [
  '購買日期', 'purchase date', '體驗課', 'trial'
].some(keyword => lowerHeaders.some(h => h.includes(keyword.toLowerCase())));

// 判斷是否為「成交記錄 (EODs)」
const hasEodsFields = [
  '成交金額', 'deal amount', '成交日期', 'deal date', 'closer'
].some(keyword => lowerHeaders.some(h => h.includes(keyword.toLowerCase())));
```

#### 2. [sheet-to-supabase-mapping.ts](../server/services/reporting/sheet-to-supabase-mapping.ts#L33-L48)

**修改內容：**
- 新增 `headers` 參數
- 將 headers 傳遞給 `identifySheetType()`

#### 3. [google-sheets.ts](../server/services/google-sheets.ts#L121-L130)

**修改內容：**
- 同步時傳遞 `headers` 給 `identifyTargetTable()`
- 新增日誌輸出，顯示前 5 個欄位標題（便於 debug）

---

## 🔍 工作原理

### 同步流程（含新邏輯）

```
1. 讀取 Google Sheets → 取得 headers (欄位標題)
                        ↓
2. 呼叫 identifyTargetTable(spreadsheetName, headers)
                        ↓
3. identifySheetType() 先嘗試名稱匹配
                        ↓
             是否匹配成功？
                /            \
             是              否
              ↓               ↓
       返回表類型      檢查欄位結構
                            ↓
                     是否包含關鍵欄位？
                        /         \
                     是           否
                      ↓            ↓
              返回對應類型     返回 null
                      ↓
4. 轉換資料 → 寫入 Supabase
```

### 實際案例

**已註冊工作表：Test Spreadsheet**

欄位：`['姓名', 'email', '上課日期', '授課老師', '是否已確認', '未聯繫原因', '體驗課文字檔']`

1. 名稱匹配：❌ "Test Spreadsheet" 不包含 ['體驗課上課', 'attendance', '上課打卡']
2. 欄位匹配：✅ 包含 "上課日期"、"授課老師"、"是否已確認"
3. 識別結果：**trial_attendance** → 同步到 `trial_class_attendance` 表

---

## 🧪 測試方式

### 方法 1：透過前端手動同步

1. 前往 [https://workspace.orange32.repl.co/dashboard](https://workspace.orange32.repl.co/dashboard)
2. 找到已註冊的 Google Sheets
3. 點擊「同步」按鈕（🔄 圖示）
4. 觀察 Console 日誌：

**預期日誌輸出：**
```
✓ Identified as trial_attendance based on headers: 姓名, email, 上課日期, 授課老師, 是否已確認
📊 Syncing to Supabase table: trial_class_attendance
   Total rows: 238, Valid: xxx, Invalid: xxx
✓ Successfully synced xxx rows to trial_class_attendance
```

### 方法 2：查詢 Supabase 驗證資料

同步後執行：

```bash
curl -s 'https://vqkkqkjaywkjtraepqbg.supabase.co/rest/v1/trial_class_attendance?select=id,source_spreadsheet_id,student_name,student_email&limit=5' \
  -H "apikey: <YOUR_SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <YOUR_SERVICE_ROLE_KEY>"
```

**預期結果：**
- `source_spreadsheet_id` 應為 `1FZffolNcXjkZ...`（真實 Spreadsheet ID）
- `student_name` 應為真實學生姓名（非 "張小明"、"李小華" 等測試資料）

---

## 📝 注意事項

### 欄位關鍵字設定

目前系統支援以下欄位關鍵字（不區分大小寫）：

| 表類型 | 關鍵欄位 |
|--------|---------|
| **trial_attendance** | 上課日期, class date, 授課老師, teacher, 是否已確認, attended |
| **trial_purchase** | 購買日期, purchase date, 體驗課, trial |
| **eods** | 成交金額, deal amount, 成交日期, deal date, closer |

### 如何新增更多關鍵字

編輯 [sheetMappingService.ts:50-72](../server/services/reporting/sheetMappingService.ts#L50-L72)：

```typescript
const hasAttendanceFields = [
  '上課日期', 'class date', '授課老師', 'teacher',
  '是否已確認', 'attended',
  '新關鍵字1', '新關鍵字2'  // ← 在這裡新增
].some(keyword => lowerHeaders.some(h => h.includes(keyword.toLowerCase())));
```

---

## 🎯 預期效果

修復完成後：

1. ✅ "Test Spreadsheet" 會被識別為 `trial_attendance`
2. ✅ 真實 Google Sheets 資料會同步到 Supabase
3. ✅ 模擬資料（張小明、李小華）會被真實資料取代
4. ✅ 前端報表會顯示真實數據

---

## 🐛 疑難排解

### 問題：同步後仍顯示模擬資料

**可能原因 1：** Google Sheets 欄位名稱不符合關鍵字
- **解決方法：** 檢查 Console 日誌，查看識別失敗的欄位
- **日誌範例：** `⚠️ Could not identify sheet type from name "..." or headers: ...`

**可能原因 2：** 資料驗證失敗（缺少必填欄位）
- **解決方法：** 檢查日誌中的 `invalid records` 數量
- **日誌範例：** `⚠️ 50 invalid records: Row 0: Missing required field: student_email`

**可能原因 3：** Supabase 舊資料未刪除
- **解決方法：** 手動清空表資料後重新同步

```sql
-- 在 Supabase SQL Editor 執行
DELETE FROM trial_class_attendance WHERE source_spreadsheet_id = 'test-trial-class-attendance';
```

### 問題：同步按鈕無反應

**解決方法：**
1. 檢查 Browser Console 是否有錯誤
2. 確認 Google Sheets 服務帳號權限
3. 檢查 .env 中的 `GOOGLE_SHEETS_CREDENTIALS` 是否正確

---

## 📊 修改總結

| 檔案 | 修改內容 | 行數 |
|------|---------|------|
| [sheetMappingService.ts](../server/services/reporting/sheetMappingService.ts) | 新增欄位智能識別邏輯 | +54 行 |
| [sheet-to-supabase-mapping.ts](../server/services/reporting/sheet-to-supabase-mapping.ts) | 傳遞 headers 參數 | +8 行 |
| [google-sheets.ts](../server/services/google-sheets.ts) | 傳遞 headers 給識別函數 | +2 行 |

**總計：** 3 個檔案，+64 行程式碼

---

最後更新：2025-10-01

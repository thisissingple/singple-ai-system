# 資料庫結構與欄位對應說明

## 📊 資料庫結構

### 1️⃣ trial_class_attendance（體驗課上課記錄）
**用途**：記錄學生體驗課出席打卡資料

| Supabase 欄位 | 類型 | 說明 | Google Sheets 可能欄位名稱 |
|--------------|------|------|--------------------------|
| `student_name` | TEXT | 學生姓名 | 學生姓名、姓名、studentName、name、student |
| `student_email` | TEXT | 學生信箱 | 學員信箱、email、mail、信箱、student_email |
| `teacher_name` | TEXT | 教師姓名 | 教師、老師、teacher、teacherName、instructor |
| `class_date` | TIMESTAMPTZ | 上課日期 | 上課日期、classDate、date、日期、trialDate |
| `course_type` | TEXT | 課程類型 | 課程類型、courseType、course、類型、plan |
| `status` | TEXT | 狀態 | 狀態、status、state、stage |
| `intent_score` | NUMERIC | 意向分數 | 意向分數、intentScore、score |
| `satisfaction` | NUMERIC | 滿意度 | 滿意度、satisfaction、rating |
| `attended` | BOOLEAN | 是否出席 | 出席、attended、present、是否出席 |

---

### 2️⃣ trial_class_purchase（體驗課購買記錄）
**用途**：記錄體驗課後的購買/轉換資料

| Supabase 欄位 | 類型 | 說明 | Google Sheets 可能欄位名稱 |
|--------------|------|------|--------------------------|
| `student_name` | TEXT | 學生姓名 | 學生姓名、姓名、studentName、name |
| `student_email` | TEXT | 學生信箱 | 學員信箱、email、mail、信箱 |
| `teacher_name` | TEXT | 教師姓名 | 教師、老師、teacher、teacherName |
| `purchase_date` | TIMESTAMPTZ | 購買日期 | 購買日期、purchaseDate、buyDate、成交日期 |
| `class_date` | TIMESTAMPTZ | 上課日期 | 上課日期、classDate、date、日期 |
| `course_type` | TEXT | 課程類型 | 課程類型、courseType、course、plan |
| `plan` | TEXT | 方案名稱 | 方案、plan、planName、package |
| `status` | TEXT | 狀態 | 狀態、status、state |
| `intent_score` | NUMERIC | 意向分數 | 意向分數、intentScore、score |

---

### 3️⃣ eods_for_closers（升高階學員/成交記錄）
**用途**：記錄高階課程成交資料

| Supabase 欄位 | 類型 | 說明 | Google Sheets 可能欄位名稱 |
|--------------|------|------|--------------------------|
| `student_name` | TEXT | 學生姓名 | 學生姓名、姓名、studentName、name |
| `student_email` | TEXT | 學生信箱 | 學員信箱、email、mail、信箱 |
| `teacher_name` | TEXT | 教師姓名 | 教師、老師、teacher、teacherName |
| `deal_date` | TIMESTAMPTZ | 成交日期 | 成交日期、dealDate、closedDate、deal_date |
| `class_date` | TIMESTAMPTZ | 上課日期 | 上課日期、classDate、date |
| `course_type` | TEXT | 課程類型 | 課程類型、courseType、course |
| `deal_amount` | NUMERIC | 成交金額 | 成交金額、dealAmount、amount、金額、price |
| `status` | TEXT | 狀態 | 狀態、status、state |
| `intent_score` | NUMERIC | 意向分數 | 意向分數、intentScore、score |

---

## 🔄 前台數據總報表對應

### KPI 整體概況（summaryMetrics）
從三張表計算出來的統計指標：

| 前台顯示 | 計算來源 | 說明 |
|---------|---------|------|
| **體驗課數量** | `trial_class_attendance` 總筆數 | 總共多少人上過體驗課 |
| **成交數量** | `trial_class_purchase` 有購買的筆數 | 實際購買的人數 |
| **轉換率（%）** | `(成交數量 / 體驗課數量) × 100` | 購買轉換比例 |
| **總收入** | `eods_for_closers` 的 `deal_amount` 總和 | 所有成交金額加總 |
| **平均成交額** | `總收入 / 成交數量` | 平均每筆成交金額 |
| **待追蹤數量** | `trial_class_attendance` - `trial_class_purchase` | 上過課但未購買的人數 |
| **潛在收入** | `待追蹤數量 × 平均成交額 × 預估轉換率` | 預測可能的收入 |

---

### 教師視角（Teacher Insights）
從 `teacher_name` 分組統計：

| 前台顯示欄位 | 對應資料 |
|------------|---------|
| 教師姓名 | `trial_class_attendance.teacher_name` |
| 體驗課數 | 該教師的 `trial_class_attendance` 筆數 |
| 成交數 | 該教師的 `trial_class_purchase` 筆數 |
| 轉換率 | `(該教師成交數 / 該教師體驗課數) × 100` |
| 收入 | 該教師在 `eods_for_closers` 的 `deal_amount` 總和 |
| 平均成交額 | `該教師收入 / 該教師成交數` |

---

### 學生視角（Student Insights）
從 `student_email` 或 `student_name` 分組統計：

| 前台顯示欄位 | 對應資料 |
|------------|---------|
| 學生姓名 | `trial_class_attendance.student_name` |
| 學生信箱 | `trial_class_attendance.student_email` |
| 體驗課日期 | `trial_class_attendance.class_date` |
| 教師 | `trial_class_attendance.teacher_name` |
| 課程類型 | `trial_class_attendance.course_type` |
| 是否購買 | 是否存在於 `trial_class_purchase` |
| 購買日期 | `trial_class_purchase.purchase_date` |
| 成交金額 | `eods_for_closers.deal_amount` |
| 狀態 | `trial_class_purchase.status` 或 `eods_for_closers.status` |

---

## 🔧 欄位對應管理功能

### 功能說明
當您的 Google Sheets 欄位名稱與預設不同時，可透過「欄位對應管理」調整：

#### 操作步驟：
1. 點擊頁面右上角「欄位對應管理」按鈕
2. 選擇要調整的表格（上課記錄/購買記錄/EODs記錄）
3. 為每個 Supabase 欄位設定「別名」

#### 範例場景：
**問題**：Google Sheet 使用「學員名字」，但系統預設是「學生姓名」
**解決**：
1. 找到 `student_name` 欄位
2. 在別名輸入框輸入「學員名字」
3. 按 Enter 或點擊 `+` 按鈕
4. 點擊「儲存設定」

#### 進階設定：
- **必填欄位**：勾選後，若該欄位為空則跳過該筆記錄
- **型別轉換**：
  - 日期：自動轉換為 ISO 格式
  - 數字：轉為數值型別
  - 布林值：轉為 true/false

---

## 📋 如何查看目前欄位

### 方法 1：使用「欄位盤點」功能
1. 點擊控制面板的「欄位盤點」按鈕（Database 圖示）
2. 系統會掃描所有 Google Sheets 並列出所有欄位名稱
3. 盤點結果會顯示在頁面下方，方便您調整對應

### 方法 2：使用 CLI
```bash
npm run introspect-sheets
```
產出檔案：
- `docs/google-sheets-schema.json` - 結構化資料
- `docs/google-sheets-schema.md` - 可讀文件

---

## 🎯 快速對應檢查表

### ✅ 必須對應的核心欄位
- **學生識別**：`student_name` 或 `student_email`（至少一個）
- **教師識別**：`teacher_name`
- **時間資訊**：`class_date` / `purchase_date` / `deal_date`

### ⚠️ 選填但建議對應
- `course_type` - 課程分類統計會更準確
- `deal_amount` - 收入計算必須
- `status` - 狀態追蹤更清楚
- `attended` - 出席率統計

### 💡 提示
- 系統支援多個別名，可同時加入「姓名」「學生姓名」「name」
- 不區分大小寫，`studentName` 和 `studentname` 都能識別
- 日期欄位會自動嘗試解析常見格式（2025/10/01、2025-10-01）

---

**版本**: v1.0
**最後更新**: 2025-10-01

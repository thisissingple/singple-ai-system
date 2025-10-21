# 快速開始 - 數據總報表 v2.0

## 🚀 啟動系統

### 本地開發（免登入模式）

#### 1. 安裝依賴

```bash
npm install
```

#### 2. 設定環境變數

本專案使用 **dotenv** 自動載入 `.env` 檔案中的環境變數。

**在 Replit 環境中**，您有兩種選擇：

**選項 A：使用 `.env` 檔案（推薦用於開發）**

確認專案根目錄的 `.env` 檔案包含以下設定：

```env
SKIP_AUTH=true
```

**選項 B：使用 Replit Secrets**

1. 點擊左側面板的 🔒 **Secrets** 圖示
2. 新增一個 Secret：
   - Key: `SKIP_AUTH`
   - Value: `true`

> 💡 **注意**：`.env` 檔案的優先級高於 Replit Secrets。如果兩者都設定，會以 `.env` 的值為準。

#### 3. 啟動開發伺服器

```bash
npm run dev
```

啟動後，您應該在終端看到以下訊息：

```
🔧 Environment Configuration:
   NODE_ENV: development
   SKIP_AUTH: true
   PORT: 5000
🚀 Server running on port 5000
```

如果看到 `SKIP_AUTH: true`，表示環境變數載入成功。

#### 4. 訪問系統

打開瀏覽器訪問：

- **數據總報表**：http://localhost:5000/dashboard/total-report
- **KPI 計算器**：http://localhost:5000/dashboard/kpi-calculator

所有 API 請求都會在終端顯示 `[DEV MODE] 🔓 Skipping authentication` 訊息。

#### 5. 驗證 SKIP_AUTH 是否生效

如果您仍然收到 401 錯誤，請檢查：

```bash
# 檢查 .env 檔案
cat .env | grep SKIP_AUTH

# 應該輸出：
# SKIP_AUTH=true
```

如果沒有輸出或值不是 `true`，請編輯 `.env` 檔案並新增：

```env
SKIP_AUTH=true
```

然後重新啟動開發伺服器：

```bash
# 停止伺服器（Ctrl+C）
# 重新啟動
npm run dev
```

---

### ⚠️ 安全警告

**SKIP_AUTH=true 僅供開發使用！**

- ✅ **開發環境**：可以使用 `SKIP_AUTH=true` 方便測試
- ❌ **生產環境**：務必設為 `false` 或完全移除此變數
- ❌ **公開部署**：絕對不要在公開訪問的伺服器上啟用 SKIP_AUTH

---

### 生產環境部署

生產環境必須使用完整的 Replit 認證流程。請：

1. 移除或設定 `SKIP_AUTH=false`
2. 設定必要的 Replit 環境變數（`REPLIT_DOMAINS` 等）
3. 參考 [部署指南](docs/deployment.md) 完成設定

## 📊 使用即時資料

### 方案 A：Supabase（推薦）- 持久化資料庫

#### 1. 建立 Supabase 專案

1. 前往 [https://supabase.com](https://supabase.com) 註冊並建立專案
2. 前往 Project Settings → API
3. 複製 `URL` 和 `service_role` key（⚠️ 不是 anon key）

#### 2. 執行資料庫 Schema

1. 打開 Supabase SQL Editor
2. 複製 `docs/supabase-schema.sql` 的全部內容
3. 貼上並執行（建立 3 張表和相關索引）

#### 3. 設定環境變數

在 `.env` 檔案中加入：

```env
# Supabase 設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...（你的 service_role key）

# Google Sheets 憑證（選填，用於自動同步）
GOOGLE_SHEETS_CREDENTIALS='{"client_email":"...","private_key":"..."}'
```

#### 4. 同步測試資料

```bash
# 方法 1: 使用開發模式自動種子
npm run dev -- --seed-total-report

# 方法 2: 透過 API 手動觸發
curl -X POST http://localhost:5000/api/dev/seed-total-report \
  -H "Cookie: session=..."
```

**成功回應範例**：
```json
{
  "success": true,
  "data": {
    "spreadsheetsCreated": 3,
    "dataRowsInserted": 100,
    "supabase": true,
    "supabaseRowsInserted": 100,
    "supabaseTables": {
      "trial_class_attendance": 3,
      "trial_class_purchase": 95,
      "eods_for_closers": 2
    }
  }
}
```

#### 5. 驗證同步結果

**方法 A：使用驗證腳本（推薦）**

```bash
tsx test-sync-validation.ts
```

預期輸出：
```
Step 1: 執行資料同步...
  ✓ Total synced: 100 rows

Step 2: 驗證 Supabase 資料品質...
  📊 trial_class_attendance: 3 rows
  📊 trial_class_purchase: 95 rows
  📊 eods_for_closers: 2 rows

驗證總結：
  ✓ trial_class_attendance: 3 rows, 0 issues
  ✓ trial_class_purchase: 95 rows, 0 issues
  ✓ eods_for_closers: 2 rows, 0 issues

🎉 驗證通過！所有資料欄位對應正確。
```

**方法 B：檢查 Dashboard**

前往 `http://localhost:5000/dashboard/total-report`

- 控制面板顯示 **🟢 Supabase**
- Warnings 顯示「使用 Supabase 資料來源（100 筆記錄）」
- KPI 數字應該有值（非 0）

**方法 C：直接查詢 Supabase**

在 Supabase Dashboard → Table Editor 查看三張表：
- `trial_class_attendance` - 應有資料
- `trial_class_purchase` - 應有資料
- `eods_for_closers` - 應有資料

---

### 方案 B：Local Storage（預設）- 開發用

無需額外設定，系統會自動使用記憶體儲存。

⚠️ **注意**：重啟伺服器後資料會消失

```bash
npm run dev
# 資料來源會顯示 ⚠️ Local Storage
```

---

## 📊 欄位對應說明

Google Sheets 的欄位會自動對應到 Supabase 的標準欄位。

**支援的欄位別名**（部分範例）：
- 學生姓名：`姓名`, `學生姓名`, `studentName`, `name`, `student`
- 學生信箱：`學員信箱`, `email`, `mail`, `信箱`, `student_email`
- 上課日期：`上課日期`, `classDate`, `date`, `日期`, `trialDate`
- 成交金額：`成交金額`, `dealAmount`, `amount`, `金額`, `price`

**完整對應規則**請參考：[欄位對應指南 (FIELD_MAPPING_GUIDE.md)](docs/FIELD_MAPPING_GUIDE.md)

**工作表自動識別**：
- 名稱包含「體驗課上課」→ `trial_class_attendance` 表
- 名稱包含「體驗課購買」→ `trial_class_purchase` 表
- 名稱包含「EODs」或「成交」→ `eods_for_closers` 表

---

## 🔍 欄位盤點

### 使用 UI（推薦）

1. 前往數據總報表頁面：`http://localhost:5000/dashboard/total-report`
2. 在控制面板找到 **「欄位盤點」** 按鈕（Database 圖示）
3. 點擊執行，等待 loading 完成
4. 頁面會顯示最後盤點時間和資料表數量

**UI 顯示說明**：
- 🟢 綠色勾勾：盤點成功
- 灰色文字：顯示「最後盤點：10/01 14:30（3 表）」
- 點擊可下載完整報告

### 使用 CLI

```bash
npm run introspect-sheets
```

**產出檔案**：
- `docs/google-sheets-schema.json` - 結構化資料
- `docs/google-sheets-schema.md` - 人類可讀文件

### 使用 API

```bash
# 觸發盤點
curl -X POST http://localhost:5000/api/tools/introspect-sheets \
  -H "Cookie: session=..." \
  --include

# 取得最新結果
curl http://localhost:5000/api/tools/introspect-sheets/latest \
  -H "Cookie: session=..." \
  --include
```

**回應範例**：
```json
{
  "success": true,
  "data": {
    "generatedAt": "2025-10-01T12:00:00Z",
    "totalSheets": 3,
    "sheets": [...]
  }
}
```

---

## ⚙️ 指標設定

### 使用 UI

1. 前往數據總報表頁面
2. 點擊控制面板的 **「指標設定」** 按鈕（Settings 圖示）
3. 在對話框中：
   - 查看每個指標的預設公式
   - 輸入自訂公式（支援數學運算）
   - 留空則使用預設公式
   - 點擊「重置」恢復預設值
4. 點擊「儲存並重新整理報表」

**支援的變數**：
- `trials` - 體驗課數量
- `conversions` - 成交數量
- `purchases` - 購買數量
- `pending` - 待追蹤數量
- `totalRevenue` - 總收入
- `avgDealAmount` - 平均成交額

**範例公式**：
```
轉換率（%）: (conversions / trials) * 100
潛在收入: pending * avgDealAmount * 0.3
```

### 使用 API

```bash
# 取得所有指標設定
curl http://localhost:5000/api/report-metrics/config \
  -H "Cookie: session=..."

# 更新指標公式
curl -X POST http://localhost:5000/api/report-metrics/config \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "metricId": "conversionRate",
    "manualFormula": "(conversions / trials) * 100"
  }'

# 重置指標
curl -X DELETE http://localhost:5000/api/report-metrics/config/conversionRate \
  -H "Cookie: session=..."
```

---

## 📈 模式切換

系統會自動判斷資料模式：

| 模式 | 條件 | 提示顏色 | 資料來源 |
|------|------|---------|---------|
| **Mock** | 無 Google Sheets 資料 | 藍色 | `generateTotalReportData()` |
| **Live** | 有同步資料 | 綠色 | Database + API |

### Live 模式檢查清單

✅ 環境變數已設定
✅ Google Sheets 已同步
✅ 資料庫有資料（可在 API 回應中確認 `rows > 0`）

---

## 🛠️ 常見問題排除

### 問題：頁面一直顯示 Mock 模式

**檢查步驟**：

1. 確認 API 是否成功回應：
   ```bash
   curl 'http://localhost:5000/api/reports/total-report?period=daily' \
     -H "Cookie: session=..." --include
   ```

2. 檢查回應：
   - 若 `success: false` → 資料庫無資料，需同步 Google Sheets
   - 若 HTTP 401 → 需先登入
   - 若 HTTP 404 → 檢查路由是否正確註冊

3. 檢查 Console：
   - 前端會印出 `console.warn('API failed, using mock data:', error)`

### 問題：欄位盤點失敗

**可能原因**：

1. 憑證未設定
   ```bash
   echo $GOOGLE_SHEETS_CREDENTIALS
   # 應該回傳 JSON 字串
   ```

2. Spreadsheet ID 錯誤
   ```bash
   echo $TRIAL_CLASS_ATTENDANCE_SHEET_ID
   # 應該回傳 Google Sheets ID
   ```

3. 權限不足
   - 確認 Service Account 有 Sheets 讀取權限
   - 工作表需分享給 Service Account Email

---

## 📊 API 使用範例

### 取得日報

```bash
curl 'http://localhost:5000/api/reports/total-report?period=daily&baseDate=2025-10-01' \
  -H "Cookie: session=..." --include
```

### 取得週報

```bash
curl 'http://localhost:5000/api/reports/total-report?period=weekly&baseDate=2025-10-01' \
  -H "Cookie: session=..." --include
```

### 取得月報

```bash
curl 'http://localhost:5000/api/reports/total-report?period=monthly&baseDate=2025-10-01' \
  -H "Cookie: session=..." --include
```

---

## 🎯 前端功能測試

### 期間切換

1. 點擊「日報」「週報」「月報」按鈕
2. 確認資料範圍更新
3. 確認 KPI 與圖表重新載入

### 日期選擇

1. 點擊日期選擇器
2. 選擇歷史日期
3. 確認資料更新為該日期的報表

### 搜尋功能

1. 在搜尋框輸入教師或學生名稱
2. 確認表格即時篩選

### 排序功能

1. 點擊表格欄位標題
2. 確認升序/降序排列

### 匯出功能

1. 點擊「匯出 CSV」或「匯出 JSON」
2. 確認檔案下載
3. 開啟檔案驗證內容

### Tabs 切換

1. 點擊「教師視角」「學生視角」
2. 確認內容切換

---

## 🔧 開發除錯

### 啟用詳細 Log

```bash
# 前端
localStorage.setItem('debug', 'true')

# 後端
DEBUG=* npm run dev
```

### 檢查資料庫

```sql
-- 查看資料表數量
SELECT COUNT(*) FROM spreadsheets;

-- 查看資料筆數
SELECT spreadsheetId, COUNT(*) FROM sheet_data GROUP BY spreadsheetId;

-- 查看欄位
SELECT data FROM sheet_data LIMIT 1;
```

### TypeScript 檢查

```bash
npm run check
```

### Build 測試

```bash
npm run build
```

---

## 🔧 欄位對應管理

### 調整 Google Sheet 欄位對應

如果 Google Sheet 的欄位名稱與預設不同（例如「姓名」改成「學員名字」），無需修改程式碼，可在前端直接調整：

#### 1. 開啟欄位對應管理

在「數據總報表」頁面，點擊控制面板右側的「🔧 欄位對應管理」按鈕。

#### 2. 選擇工作表類型

選擇對應的 Tab：
- **上課記錄** - 體驗課上課打卡記錄
- **購買記錄** - 體驗課購買轉換記錄
- **EODs 記錄** - 升高階成交記錄

#### 3. 調整欄位別名

每個 Supabase 欄位可以設定多個別名：
- 輸入新的欄位名稱（如：學員名字、姓名、name）
- 按 Enter 或點擊 `+` 加入
- 點擊 `✕` 刪除不需要的別名

#### 4. 設定型別轉換

選擇欄位的資料型別：
- **無** - 不轉換（字串）
- **日期** - 轉為 ISO 日期格式
- **數字** - 轉為數值
- **布林值** - 轉為 true/false

#### 5. 標記必填欄位

勾選「必填」的欄位，若資料中該欄位為空，該筆記錄會被跳過並記錄警告。

#### 6. 儲存或重置

- **儲存設定** - 修改立即生效，下次同步時套用
- **重置為預設** - 恢復系統預設值

### 常見場景範例

**場景 1：欄位名稱不同**
- Google Sheet 欄位：`學員名字`
- Supabase 欄位：`student_name`
- 操作：在 `student_name` 的別名中加入「學員名字」

**場景 2：日期格式需要轉換**
- Google Sheet 欄位：`上課時間`（格式：2025/10/01）
- Supabase 欄位：`class_date`
- 操作：
  1. 在 `class_date` 的別名中加入「上課時間」
  2. 型別轉換選擇「日期」

**場景 3：新增替代欄位**
- 同一個資料可能出現在不同欄位（如：`email` 或 `信箱` 或 `學員信箱`）
- 操作：在 `student_email` 的別名中加入所有可能的欄位名稱

### 欄位盤點功能

使用「欄位盤點」按鈕（控制面板）可以查看目前 Google Sheets 有哪些欄位，方便調整對應關係。

盤點結果會顯示在欄位對應對話框下方，點擊欄位名稱可快速加入為別名。

---

## 📚 延伸閱讀

- [CHANGELOG_v2.md](./CHANGELOG_v2.md) - 詳細變更日誌
- [UPDATE_SUMMARY.md](./UPDATE_SUMMARY.md) - 初版實作說明
- [docs/data-overview.md](./docs/data-overview.md) - 完整文件（含欄位對應管理詳解）
- [docs/google-sheets-schema.md](./docs/google-sheets-schema.md) - 欄位結構

---

**提示**：首次使用建議先用 Mock 模式熟悉介面，確認無誤後再設定 Google Sheets 啟用 Live 模式。若遇到欄位對應問題，使用「欄位對應管理」工具即可快速調整，無需修改程式碼。

**版本**: v2.1
**最後更新**: 2025-10-01

# Supabase 報表整合 - 驗收清單

## 📋 功能驗收

### 1. Supabase 連接與同步

- [ ] **環境變數設定**
  - `.env` 檔案包含 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
  - 測試指令：`tsx test-supabase-connection.js`
  - 預期結果：所有測試通過，顯示「All tests passed!」

- [ ] **資料同步測試**
  ```bash
  tsx test-seed-and-sync.ts
  ```
  - 預期結果：
    - `✓ Supabase 同步成功：100 筆資料`
    - 顯示各表筆數：attendance=3, purchase=95, deals=2

- [ ] **API 回傳格式**
  ```bash
  curl -X POST http://localhost:5000/api/dev/seed-total-report
  ```
  - 檢查回應包含：
    - `supabase: true`
    - `supabaseRowsInserted: 100`
    - `supabaseTables` 物件包含三張表的筆數

### 2. Dashboard 資料來源顯示

- [ ] **有 Supabase 憑證時**
  - 前往：`http://localhost:5000/dashboard/total-report`
  - 控制面板顯示：**🟢 Supabase**
  - Warnings 顯示：「使用 Supabase 資料來源（X 筆記錄）」
  - Footer 顯示：「資料來源：Supabase」

- [ ] **無 Supabase 憑證時**
  - 移除 `.env` 中的 Supabase 設定
  - 重啟伺服器
  - 控制面板顯示：**⚠️ Local Storage**
  - Warnings 顯示：「Supabase 未設定（環境變數缺失），使用 local storage」

### 3. 欄位盤點功能

- [ ] **UI 操作**
  - 控制面板有「欄位盤點」按鈕（Database 圖示）
  - 點擊後按鈕顯示 loading 狀態（圖示動畫）
  - 完成後顯示 toast：「已分析 X 個資料表，共 Y 個欄位」
  - 頁面顯示：「最後盤點：10/01 14:30（3 表）」

- [ ] **API 測試**
  ```bash
  # 觸發盤點
  curl -X POST http://localhost:5000/api/tools/introspect-sheets \
    -H "Cookie: $(cat cookies.txt)"

  # 取得最新結果
  curl http://localhost:5000/api/tools/introspect-sheets/latest \
    -H "Cookie: $(cat cookies.txt)"
  ```

### 4. 指標設定功能

- [ ] **UI 操作**
  - 控制面板有「指標設定」按鈕（Settings 圖示）
  - 點擊打開對話框
  - 對話框顯示所有指標（至少 6 個）
  - 每個指標卡片包含：
    - 指標名稱
    - 預設公式
    - 自訂公式輸入框
    - 重置按鈕

- [ ] **公式編輯與儲存**
  - 在「轉換率」輸入：`(conversions / trials) * 100`
  - 點擊「儲存並重新整理報表」
  - 對話框關閉
  - Toast 顯示：「指標設定已更新」
  - 報表自動重新載入

- [ ] **API 測試**
  ```bash
  # 取得所有指標
  curl http://localhost:5000/api/report-metrics/config

  # 更新指標
  curl -X POST http://localhost:5000/api/report-metrics/config \
    -H "Content-Type: application/json" \
    -d '{"metricId":"conversionRate","manualFormula":"(conversions / trials) * 100"}'

  # 重置指標
  curl -X DELETE http://localhost:5000/api/report-metrics/config/conversionRate
  ```

### 5. Seed Data 強化

- [ ] **Supabase 成功時的 Toast**
  ```
  標題：Supabase 同步成功
  內容：已寫入 100 筆資料到 Supabase（3 上課 + 95 購買 + 2 成交）
  ```

- [ ] **Supabase 失敗時的 Toast**
  ```
  標題：測試資料已建立（僅本地）
  內容：Supabase 未設定，資料僅存於 local storage
  ```

- [ ] **自動重新整理**
  - Seed 完成後，報表資料自動更新
  - 欄位盤點資訊自動更新

### 6. Fallback 機制

- [ ] **Supabase 查詢失敗**
  - 斷開 Supabase 連線（錯誤的 URL）
  - 報表仍能顯示（使用 local storage）
  - Warnings 顯示具體錯誤訊息

- [ ] **Supabase 無資料**
  - Supabase 連線正常但表為空
  - 自動 fallback 至 storage
  - Warnings：「Supabase 查詢成功但無資料，fallback 至 local storage」

---

## 🔧 技術驗收

### 1. TypeScript 編譯

```bash
npx tsc --noEmit
```
- [ ] 無編譯錯誤
- [ ] 所有類型定義正確

### 2. Build 成功

```bash
npm run build
```
- [ ] 前端 build 成功（vite）
- [ ] 後端 build 成功（esbuild）
- [ ] 產生 `dist/` 目錄

### 3. 程式碼品質

- [ ] 無 `console.error`（除了預期的錯誤處理）
- [ ] API 回應格式統一（`{ success, data/error }`）
- [ ] 錯誤處理完整（try-catch 包覆所有異步操作）

### 4. 效能檢查

- [ ] TotalReportService 優先查詢 Supabase
- [ ] Supabase 失敗時 fallback 時間 < 2 秒
- [ ] 頁面載入時間合理（< 3 秒）

---

## 📚 文件驗收

### 1. 環境變數說明

- [ ] `.env.example` 包含 Supabase 設定範例
- [ ] 註解清楚說明如何取得憑證
- [ ] 說明 fallback 行為

### 2. 操作步驟文件

- [ ] `QUICK_START_v2.md` 包含 Supabase 設定章節
- [ ] 步驟可執行且正確
- [ ] 包含成功/失敗的預期結果

### 3. API 文件

- [ ] Seed API 回傳格式有文件說明
- [ ] 欄位盤點 API 有使用範例
- [ ] 指標設定 API 有完整說明

---

## 🎯 整合測試情境

### 情境 1：全新安裝（無 Supabase）

1. Clone 專案
2. `npm install`
3. `npm run dev`
4. 前往 `/dashboard/total-report`

**預期**：
- 顯示「⚠️ Local Storage」
- 使用 mock 資料
- 所有功能正常運作

### 情境 2：設定 Supabase

1. 建立 Supabase 專案
2. 執行 `docs/supabase-schema.sql`
3. 設定 `.env`
4. `npm run dev -- --seed-total-report`
5. 前往 `/dashboard/total-report`

**預期**：
- 顯示「🟢 Supabase」
- Toast 顯示同步成功訊息
- 報表使用 Supabase 資料

### 情境 3：Supabase 連線失敗

1. 修改 `.env` 的 `SUPABASE_URL` 為錯誤值
2. 重啟伺服器
3. 前往 `/dashboard/total-report`

**預期**：
- 顯示「⚠️ Local Storage」
- Warnings 顯示具體錯誤
- 報表使用 storage 資料

### 情境 4：欄位盤點與指標設定

1. 確保 Supabase 連線正常
2. 點擊「欄位盤點」
3. 點擊「指標設定」
4. 修改公式並儲存
5. 重新整理報表

**預期**：
- 欄位盤點顯示結果
- 指標設定成功儲存
- 報表使用新公式計算

---

## ✅ 驗收標準總結

| 項目 | 狀態 | 備註 |
|------|------|------|
| Supabase 連接測試 | ✅ | test-supabase-connection.js 通過 |
| 資料同步測試 | ✅ | test-seed-and-sync.ts 通過 |
| Dashboard 資料來源顯示 | ✅ | UI 正確顯示 Supabase/Storage |
| 欄位盤點 UI | ✅ | 按鈕與狀態顯示正常 |
| 指標設定對話框 | ✅ | 可載入、編輯、儲存 |
| Seed API 回傳強化 | ✅ | 包含 supabaseTables 資訊 |
| Fallback 機制 | ✅ | Supabase 失敗時自動切換 |
| TypeScript 編譯 | ✅ | npx tsc --noEmit 通過 |
| Build 成功 | ✅ | npm run build 通過 |
| 文件更新 | ✅ | .env.example, QUICK_START_v2.md |

---

## 🚀 下一步建議

1. **Formula Engine 整合**（已規劃但未實作）
   - 將 metric configs 的 `manualFormula` 整合到實際計算
   - 在 `TotalReportService.calculateSummaryMetrics()` 中套用

2. **欄位盤點結果顯示面板**（可選）
   - 在頁面上顯示最新盤點的詳細結果
   - 提供下載 `google-sheets-schema.md` 連結

3. **進階公式變數**
   - 加入更多內建變數（如 `avgClassPerStudent`）
   - 支援巢狀函數（如 `Math.round()`）

4. **效能優化**
   - Supabase 查詢加入 cache
   - 報表計算結果 memoization

5. **監控與日誌**
   - 記錄 Supabase 查詢時間
   - Dashboard 顯示資料來源切換次數

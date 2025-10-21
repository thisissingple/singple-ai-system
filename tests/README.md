# 🧪 測試檔案說明

本資料夾包含專案的測試腳本，用於驗證各項功能是否正常運作。

---

## 📋 測試檔案清單

### **核心功能測試**

#### `test-kpi-only.ts` ⭐ **最重要**
- **目的**: 測試 KPI Calculator 統一運算中心
- **測試內容**:
  - 所有 KPI 計算邏輯
  - Formula Engine 動態公式運算
  - 數據正確性驗證
- **執行**: `npx tsx tests/test-kpi-only.ts`
- **預期結果**: 所有 KPI 計算正確，無 NaN 或異常值

#### `test-full-flow.ts`
- **目的**: 端到端完整流程測試
- **測試內容**:
  - Supabase 連線
  - 資料同步（Google Sheets → Supabase）
  - KPI 計算
  - AI 建議生成
- **執行**: `npx tsx tests/test-full-flow.ts`
- **前置條件**: 需設定 Supabase 環境變數

---

### **資料同步測試**

#### `test-seed-and-sync.ts`
- **目的**: 測試測試資料建立與同步
- **測試內容**:
  - 建立 mock spreadsheet
  - 同步到 Supabase
  - 驗證資料完整性
- **執行**: `npx tsx tests/test-seed-and-sync.ts`

#### `test-sync-validation.ts`
- **目的**: 驗證資料同步正確性
- **測試內容**:
  - 檢查資料筆數
  - 驗證欄位對應
  - 確認時間戳記
- **執行**: `npx tsx tests/test-sync-validation.ts`

---

### **服務層測試**

#### `test-total-report-service.ts`
- **目的**: 測試數據總報表服務
- **測試內容**:
  - 報表產生邏輯
  - 資料聚合
  - AI 建議生成
- **執行**: `npx tsx tests/test-total-report-service.ts`

---

### **環境檢查**

#### `test-env-check.ts`
- **目的**: 檢查環境變數設定
- **測試內容**:
  - Supabase 連線設定
  - Google Sheets 憑證
  - 其他必要環境變數
- **執行**: `npx tsx tests/test-env-check.ts`

---

## 🚀 快速測試指令

```bash
# 測試 KPI Calculator（最常用）
npx tsx tests/test-kpi-only.ts

# 測試完整流程（需要 Supabase）
npx tsx tests/test-full-flow.ts

# 檢查環境設定
npx tsx tests/test-env-check.ts
```

---

## ✅ 測試通過標準

所有測試應該：
- ✅ 無 TypeScript 編譯錯誤
- ✅ 無運行時錯誤
- ✅ 所有數值合理且非 NaN
- ✅ 資料筆數符合預期
- ✅ 顯示「測試通過」訊息

---

## 📝 新增測試

當新增功能時，建議在此資料夾建立對應的測試檔案：

```bash
# 範例：新增 teacher-report 測試
tests/test-teacher-report.ts
```

測試檔案命名規則：`test-{功能名稱}.ts`

# 欄位盤點功能修復說明

## 🐛 問題描述

### 症狀
點擊「欄位盤點」按鈕後，顯示：
```
已分析 0 個資料表，共 0 個欄位
```

即使已經在前端新增並同步了 Google Sheets。

---

## 🔍 根本原因

### 舊的實作方式
`introspect-service.ts` 原本是從**環境變數**讀取 Sheet ID：

```typescript
const SHEETS_CONFIG = [
  {
    name: '體驗課上課記錄表',
    spreadsheetId: process.env.TRIAL_CLASS_ATTENDANCE_SHEET_ID || '', // ← 依賴環境變數
  },
  // ...
];
```

**問題**：
- 您在前端新增的 Google Sheets 會註冊到 `storage` 資料庫
- 但這些環境變數 **沒有自動設定**
- 所以欄位盤點功能找不到任何 Google Sheets

---

## ✅ 修復方案

### 新的實作方式
修改 `introspect-service.ts` 讓它從 `storage` 讀取已註冊的 Google Sheets：

```typescript
async runIntrospection(): Promise<IntrospectResult> {
  // 1. 從 storage 讀取已註冊的 Google Sheets
  const registeredSpreadsheets = await storage.listSpreadsheets();

  let sheetsConfig = [];

  if (registeredSpreadsheets.length > 0) {
    // 使用已註冊的 Google Sheets
    sheetsConfig = registeredSpreadsheets.map(s => ({
      name: s.name,
      spreadsheetId: s.spreadsheetId,
      range: s.range || 'A1:Z50',
    }));
  } else {
    // Fallback: 使用環境變數（向下相容）
    sheetsConfig = LEGACY_SHEETS_CONFIG.filter(c => c.spreadsheetId);
  }

  // 2. 分析每個 Google Sheets 的欄位
  for (const config of sheetsConfig) {
    const analysis = await this.analyzeSheet(sheets, config);
    // ...
  }
}
```

---

## 🎯 修復後的效果

### Before（修復前）
```
點擊「欄位盤點」
  ↓
讀取環境變數中的 Sheet ID
  ↓
找不到任何 Sheet ID（因為沒設定）
  ↓
顯示「已分析 0 個資料表」
```

### After（修復後）
```
點擊「欄位盤點」
  ↓
從 storage 讀取已註冊的 Google Sheets
  ↓
找到 3 張已註冊的 Google Sheets
  ↓
分析每張表的欄位結構
  ↓
顯示「已分析 3 個資料表，共 XX 個欄位」
```

---

## 📊 驗證步驟

### Step 1: 確認已註冊 Google Sheets
前往 Dashboard → Google Sheets 管理，確認有已添加的表格。

### Step 2: 前往數據總報表
點擊「數據總報表」標籤。

### Step 3: 點擊「欄位盤點」
點擊控制面板的「欄位盤點」按鈕（Database 圖示）。

### Step 4: 確認結果
應該看到：
```
✅ 欄位盤點完成
   已分析 3 個資料表，共 XX 個欄位
```

---

## 🔧 技術細節

### 修改的檔案
- `/home/runner/workspace/server/services/reporting/introspect-service.ts`

### 主要變更
1. **Import storage**：
   ```typescript
   import { storage } from '../../storage';
   ```

2. **重新命名舊配置**：
   ```typescript
   const LEGACY_SHEETS_CONFIG = [ ... ]; // 向下相容
   ```

3. **動態讀取 spreadsheets**：
   ```typescript
   const registeredSpreadsheets = await storage.listSpreadsheets();
   ```

4. **優先使用已註冊的表格**：
   - 如果 storage 中有資料 → 使用已註冊的 Google Sheets
   - 如果 storage 中沒資料 → Fallback 到環境變數（向下相容）

---

## ⚠️ 注意事項

### 向下相容
修復後的程式碼仍然支援舊的環境變數方式：
- 如果 `storage` 中沒有已註冊的 Google Sheets
- 系統會 fallback 到環境變數中的 Sheet ID
- 確保舊的設定方式仍然可用

### 不需要重新啟動
- 修改完成後，後端會自動重載（nodemon）
- 前端重新整理即可看到修復效果

---

## 📝 使用建議

### 推薦流程（新方式）
1. 在前端「Google Sheets 管理」新增表格
2. 啟用需要的工作表
3. 系統自動註冊到 storage
4. 欄位盤點功能自動讀取

### 舊方式（仍支援）
1. 設定環境變數：
   ```env
   TRIAL_CLASS_ATTENDANCE_SHEET_ID=1abc...
   TRIAL_CLASS_PURCHASE_SHEET_ID=1def...
   EODS_FOR_CLOSERS_SHEET_ID=1ghi...
   ```
2. 欄位盤點功能讀取環境變數

---

## ✨ 總結

**問題**：欄位盤點功能依賴環境變數，無法讀取前端新增的 Google Sheets

**解決**：修改為優先讀取 `storage` 中已註冊的 Google Sheets

**結果**：欄位盤點功能現在可以正確分析前端新增的所有 Google Sheets

---

**修復日期**: 2025-10-01
**影響範圍**: 欄位盤點功能
**向下相容**: ✅ 是（仍支援環境變數方式）

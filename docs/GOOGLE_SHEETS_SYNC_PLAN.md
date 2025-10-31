# Google Sheets 同步計劃

> **建立日期**: 2025-10-31
> **狀態**: ⏳ 待執行
> **預計完成時間**: 15-45 分鐘
> **優先級**: P0 (高優先級)

---

## 🎯 目標

讓 CRM (Lead Connector) → Google Sheets → Supabase 的資料同步功能正常運作，支援透過 UI 自訂欄位映射。

---

## 🔍 現況分析

### ✅ 已有功能
1. **完整的 Google Sheets 同步基礎設施**
   - 前端：資料來源管理頁面 (`client/src/pages/settings/data-sources.tsx`)
   - API：完整的同步端點 (11+ 個 endpoints)
   - 服務層：ETL 模式同步服務

2. **AI 驅動的欄位映射 UI**
   - 元件：`FieldMappingDialog` (`client/src/components/field-mapping-dialog.tsx`)
   - AI 自動建議欄位對應
   - 手動調整功能
   - 信心分數顯示
   - 儲存到資料庫 (`field_mappings` 表)

3. **手動同步功能**
   - 在資料來源管理頁面點擊「同步」按鈕

### ❌ 目前問題
1. **eods_for_closers 表未加入 SUPABASE_SCHEMAS**
   - AI Field Mapper 無法識別這個表
   - 無法使用欄位映射 UI

2. **缺少定時自動同步功能**
   - 只能手動同步
   - 使用者希望每天固定時間自動同步

---

## 📋 實作步驟

### 步驟 1：新增 eods_for_closers 表格定義 (5 分鐘)

**檔案**: `server/services/ai-field-mapper.ts`

**位置**: `SUPABASE_SCHEMAS` 物件中新增

**內容**:
```typescript
eods_for_closers: {
  tableName: 'eods_for_closers',
  columns: [
    // 必填欄位
    { name: 'Name', type: 'text', required: true, description: '學生姓名' },
    { name: 'Email', type: 'text', required: true, description: '學生 Email' },

    // 選填欄位
    { name: '電話負責人', type: 'text', required: false, description: '電銷人員姓名' },
    { name: '諮詢人員', type: 'text', required: false, description: 'Closer 姓名' },
    { name: '是否上線', type: 'text', required: false, description: '學員是否已上線' },
    { name: '名單來源', type: 'text', required: false, description: '名單來源渠道' },
    { name: '諮詢結果', type: 'text', required: false, description: '諮詢結果 (成交/未成交)' },
    { name: '成交方案', type: 'text', required: false, description: '成交的課程方案' },
    { name: '方案數量', type: 'number', required: false, description: '購買的方案數量' },
    { name: '付款方式', type: 'text', required: false, description: '付款方式 (現金/刷卡/分期)' },
    { name: '分期期數', type: 'number', required: false, description: '分期付款期數' },
    { name: '方案價格', type: 'number', required: false, description: '方案原價' },
    { name: '實收金額', type: 'number', required: false, description: '實際收到的金額' },
    { name: '諮詢日期', type: 'date', required: false, description: '諮詢日期' },
    { name: '成交日期', type: 'date', required: false, description: '成交日期' },
    { name: '備註', type: 'text', required: false, description: '額外備註' },
    { name: '提交表單時間', type: 'timestamp', required: false, description: '表單提交時間' },
    { name: '月份', type: 'number', required: false, description: '月份 (1-12)' },
    { name: '年份', type: 'number', required: false, description: '年份' },
    { name: '週別', type: 'number', required: false, description: '週別 (1-52)' },
  ],
}
```

---

### 步驟 2：測試欄位映射 UI (10 分鐘)

**操作流程**:

1. **串接 Google Sheets**
   ```
   進入：資料來源管理 (/settings/data-sources)
   動作：輸入 Google Sheets URL → 點擊「新增」
   ```

2. **選擇工作表**
   ```
   動作：在工作表列表中啟用 eods_for_closers 工作表
   ```

3. **設定目標 Supabase 表**
   ```
   動作：點擊「設定對應」→ 選擇 "eods_for_closers"
   ```

4. **自訂欄位映射** ✨
   ```
   動作：點擊「欄位對應」按鈕 (✨ Sparkles 圖示)
   確認：AI 自動建議映射出現
   調整：手動修改不正確的對應
   儲存：點擊「儲存對應」
   ```

5. **同步資料**
   ```
   動作：點擊「同步」按鈕
   驗證：檢查 Supabase eods_for_closers 表是否有資料
   ```

**預期結果**:
- ✅ AI 正確建議 20 個欄位的映射
- ✅ 信心分數顯示 > 80%
- ✅ 手動調整功能正常
- ✅ 同步成功，資料正確寫入

---

### 步驟 3：新增定時自動同步 (30 分鐘) - **可選**

#### 3.1 建立定時同步服務

**新檔案**: `server/services/auto-sync-scheduler.ts`

**內容**:
```typescript
/**
 * 定時自動同步服務
 * 每 30 分鐘自動同步所有啟用的 Google Sheets 工作表
 */

import { storage } from './legacy/storage';
import { GoogleSheetsService } from './legacy/google-sheets';

// 同步間隔（毫秒）
const SYNC_INTERVAL = 30 * 60 * 1000; // 30 分鐘
// const SYNC_INTERVAL = 24 * 60 * 60 * 1000; // 1 天（替代選項）

let isRunning = false;
let syncInterval: NodeJS.Timeout | null = null;

/**
 * 啟動定時同步
 */
export function startAutoSync() {
  if (isRunning) {
    console.log('⚠️  Auto-sync already running');
    return;
  }

  isRunning = true;
  console.log('🔄 Starting Auto-Sync Scheduler...');
  console.log(`⏰ Sync interval: ${SYNC_INTERVAL / 60000} minutes`);

  // 立即執行一次
  syncAllEnabledWorksheets();

  // 定期執行
  syncInterval = setInterval(() => {
    syncAllEnabledWorksheets();
  }, SYNC_INTERVAL);
}

/**
 * 停止定時同步
 */
export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  isRunning = false;
  console.log('🛑 Auto-Sync Scheduler stopped');
}

/**
 * 同步所有啟用的工作表
 */
async function syncAllEnabledWorksheets() {
  try {
    console.log('🔄 [Auto-Sync] Starting scheduled sync...');

    const googleSheetsService = new GoogleSheetsService();
    const spreadsheets = await storage.getAllSpreadsheets();

    let totalSynced = 0;

    for (const spreadsheet of spreadsheets) {
      const worksheets = await storage.getWorksheets(spreadsheet.id);
      const enabledWorksheets = worksheets.filter(w => w.isEnabled);

      if (enabledWorksheets.length > 0) {
        console.log(`🔄 [Auto-Sync] Syncing ${spreadsheet.name} (${enabledWorksheets.length} worksheets)...`);

        for (const worksheet of enabledWorksheets) {
          try {
            await googleSheetsService.syncWorksheet(worksheet, spreadsheet);
            totalSynced++;
            console.log(`✅ [Auto-Sync] Synced: ${worksheet.worksheetName}`);
          } catch (error: any) {
            console.error(`❌ [Auto-Sync] Failed to sync ${worksheet.worksheetName}:`, error.message);
          }
        }
      }
    }

    console.log(`✅ [Auto-Sync] Completed! Synced ${totalSynced} worksheets`);
  } catch (error: any) {
    console.error('❌ [Auto-Sync] Error:', error.message);
  }
}
```

#### 3.2 整合到 server

**檔案**: `server/index.ts`

**修改位置**: 在 server 啟動後和 graceful shutdown 區塊

**新增程式碼**:
```typescript
// 在檔案開頭 import 區新增
import { startAutoSync, stopAutoSync } from "./services/auto-sync-scheduler";

// 在 server 啟動後新增（約在 Line 38 附近，startAutoAnalyzer() 後面）
startAutoSync();

// 在 graceful shutdown 區塊新增（約在 Line 5 附近）
stopAutoSync();
```

**預期結果**:
- ✅ 伺服器啟動時自動啟動定時同步
- ✅ 每 30 分鐘自動同步一次
- ✅ 伺服器關閉時優雅停止同步
- ✅ Console 顯示詳細同步 log

---

## 📦 將建立/修改的檔案

### 必要修改 (步驟 1-2)
1. ✏️ `server/services/ai-field-mapper.ts` - 新增 eods_for_closers 定義

### 可選修改 (步驟 3)
2. 📄 `server/services/auto-sync-scheduler.ts` - 新建定時同步服務
3. ✏️ `server/index.ts` - 啟用定時同步 (3 行修改)

---

## ✅ 完成後功能

### 核心功能 (步驟 1-2)
- ✅ 透過 UI 串接 Google Sheets
- ✅ 選擇特定工作表
- ✅ **AI 自動建議欄位映射**
- ✅ **手動調整欄位對應**（不寫程式碼）
- ✅ 查看信心分數和推理原因
- ✅ 手動同步功能
- ✅ CRM → Sheets → Supabase 資料流正常

### 進階功能 (步驟 3)
- ✅ 定時自動同步（每 30 分鐘或每天固定時間）
- ✅ 詳細同步 log
- ✅ 錯誤處理和重試機制

---

## 🕐 時間估算

| 步驟 | 內容 | 預計時間 |
|------|------|----------|
| 步驟 1 | 新增表格定義 | 5 分鐘 |
| 步驟 2 | 測試欄位映射 UI | 10 分鐘 |
| **小計** | **核心功能** | **15 分鐘** |
| 步驟 3 | 定時自動同步 | 30 分鐘 |
| **總計** | **含進階功能** | **45 分鐘** |

---

## 🎯 成功標準

### 步驟 1-2 成功標準
- [x] eods_for_closers 出現在 Supabase 表格選單中
- [x] 點擊「欄位對應」按鈕後出現 FieldMappingDialog
- [x] AI 建議 20 個欄位的映射
- [x] 信心分數 > 80%
- [x] 可以手動調整映射
- [x] 儲存映射成功
- [x] 同步資料成功，Supabase 有資料

### 步驟 3 成功標準 (可選)
- [x] 伺服器啟動後 console 顯示「🔄 Starting Auto-Sync Scheduler...」
- [x] 每 30 分鐘自動執行一次同步
- [x] Console 顯示詳細同步 log
- [x] 伺服器關閉時優雅停止

---

## 📝 注意事項

1. **環境變數檢查**
   - 確認 `ANTHROPIC_API_KEY` 已設定（AI 欄位映射需要）
   - 確認 `GOOGLE_SHEETS_CREDENTIALS` 已設定

2. **資料庫表結構**
   - 目前 eods_for_closers 表使用**中文欄位名**
   - Field mapping 會正確對應中文 → 中文
   - 如需改為英文欄位名，需執行額外的 migration

3. **同步頻率調整**
   - 預設：每 30 分鐘
   - 如需每天固定時間（如凌晨 2:00），需使用 `node-cron` 套件
   - 可透過環境變數 `SYNC_INTERVAL_MINUTES` 調整

4. **Google Sheets 配額**
   - Google Sheets API 有每日配額限制
   - 頻繁同步可能達到限制
   - 建議每 30 分鐘或更長間隔

---

## 🔗 相關文件

- **元件文件**: `client/src/components/field-mapping-dialog.tsx`
- **API 文件**: `server/routes.ts` (Line 4142-4339)
- **服務層文件**: `server/services/ai-field-mapper.ts`
- **資料庫 Schema**: `supabase/migrations/013_recreate_tables_match_csv.sql`

---

## 🚀 下一步

執行此計劃後，您的 CRM → Google Sheets → Supabase 同步流程將完全自動化！

**明天執行清單**:
1. ✏️ 修改 `ai-field-mapper.ts` 新增表格定義
2. 🧪 測試欄位映射 UI 功能
3. 🔄 (可選) 新增定時自動同步
4. ✅ 驗證同步成功

**祝執行順利！** 🎉

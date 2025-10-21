# 🧪 Phase 6 最終測試指南

> **執行環境**: Replit
> **測試時間**: 約 30 分鐘
> **前置條件**: Supabase 已設定（Replit Secrets）

---

## 📋 測試檢查清單

### ✅ 前置準備

- [  ] 確認 Replit Secrets 已設定：
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ANTHROPIC_API_KEY` (選填)
  - `GOOGLE_SHEETS_CREDENTIALS` (選填)

- [ ] 執行 Migration 建立資料表

---

## 🗄️ Step 1: 執行 Migration（5 分鐘）

### 方法 1: Supabase Dashboard（推薦）

1. **登入 Supabase Dashboard**
   ```
   https://supabase.com/dashboard
   ```

2. **執行 SQL**
   - 前往「SQL Editor」
   - 新增 Query
   - 複製貼上：`supabase/migrations/011_create_field_mappings.sql`
   - 點擊「Run」

3. **驗證**
   ```bash
   npx tsx scripts/run-migration-011.ts
   ```

   **預期輸出**:
   ```
   ✅ field_mappings 表已建立
   ✅ mapping_history 表已建立
   ```

---

## 🧪 Step 2: 後端測試（10 分鐘）

### 2.1 CLI 測試 - AI Field Mapper

```bash
npx tsx tests/test-ai-field-mapper.ts
```

**預期結果**:
```
✅ 分析完成 (整體信心: 83.3%)
✅ Test 1: 體驗課上課記錄表 - 通過
✅ Test 2: 體驗課購買記錄表 - 通過
✅ Test 3: EODs for Closers - 通過
```

### 2.2 API 端點測試

**啟動伺服器**:
```bash
npm run dev
```

**執行測試**:
```bash
# 開新終端
npx tsx tests/test-field-mapping-api.ts
```

**預期結果**:
```
✅ Test 1: 取得所有 schemas - 通過
✅ Test 2: 取得特定表 schema - 通過 (3 表)
✅ Test 3: 分析欄位對應 - 通過 (2 案例)
✅ Test 4: 錯誤處理 - 通過
```

### 2.3 端到端測試

```bash
npx tsx tests/test-dynamic-mapping-e2e.ts
```

**預期結果**:
```
✅ Step 1: 儲存欄位對應設定
✅ Step 2: 讀取欄位對應
✅ Step 3: 驗證對應設定
✅ Step 4: 使用動態對應轉換資料
✅ Step 5: 清理測試資料
```

---

## 🎨 Step 3: 前端測試（5 分鐘）

### 3.1 檢查組件是否存在

```bash
ls -la client/src/components/field-mapping-dialog.tsx
```

**預期輸出**:
```
-rw-r--r-- 1 user user 11850 Oct  5 18:30 field-mapping-dialog.tsx
```

### 3.2 UI 組件功能檢查

前端組件已完成，包含：
- ✅ 欄位對應編輯對話框
- ✅ AI 建議顯示（信心分數、原因）
- ✅ 手動調整對應（下拉選單）
- ✅ 信心分數視覺化
- ✅ 儲存對應功能

**整合方式**（待手動整合到 Dashboard）:
```tsx
import { FieldMappingDialog } from '@/components/field-mapping-dialog';

// 在適當的地方使用
<FieldMappingDialog
  open={open}
  onOpenChange={setOpen}
  worksheetId={worksheetId}
  worksheetName={worksheetName}
  googleColumns={googleColumns}
  supabaseTable="trial_class_attendance"
  onSave={(mappings) => {
    console.log('Saved mappings:', mappings);
  }}
/>
```

---

## 🔄 Step 4: ETL 整合測試（5 分鐘）

### 4.1 檢查動態轉換服務

```bash
ls -la server/services/etl/dynamic-transform.ts
```

### 4.2 轉換函數測試

動態轉換服務包含 6 種轉換函數：
- ✅ `cleanText` - 去除空白
- ✅ `toDate` - 轉換為日期
- ✅ `toTimestamp` - 轉換為時間戳
- ✅ `toInteger` - 轉換為整數
- ✅ `toDecimal` - 轉換為小數
- ✅ `toBoolean` - 轉換為布林值

**已在端到端測試中驗證**。

---

## ✅ Step 5: 完整驗證（5 分鐘）

### 5.1 執行自動化驗證

```bash
./scripts/verify-phase6.sh
```

**預期輸出**:
```
✅ 檔案檢查: 通過
✅ 環境變數: 通過
✅ CLI 測試: 通過
✅ 開發伺服器: 運行中
✅ API 測試: 通過
✅ Migration: 已執行
```

### 5.2 API 端點手動測試

**測試 1: 取得所有 schemas**
```bash
curl http://localhost:5000/api/field-mapping/schemas
```

**測試 2: 分析欄位對應**
```bash
curl -X POST http://localhost:5000/api/worksheets/test/analyze-fields \
  -H "Content-Type: application/json" \
  -d '{
    "googleColumns": ["學員姓名", "Email", "體驗課日期"],
    "supabaseTable": "trial_class_attendance"
  }'
```

---

## 📊 測試結果驗收

### 必須通過的測試

- [ ] Migration 執行成功（資料表已建立）
- [ ] CLI 測試 100% 通過
- [ ] API 測試 100% 通過
- [ ] 端到端測試 100% 通過
- [ ] 自動化驗證通過

### 功能驗收

- [ ] AI 可以分析欄位並建議對應
- [ ] API 可以儲存對應設定
- [ ] API 可以讀取已儲存的對應
- [ ] 動態轉換可以使用對應設定
- [ ] 轉換函數正確運作
- [ ] 快取機制正常

---

## 🐛 常見問題排除

### Q1: Migration 失敗 - "table already exists"
**A**: 表已存在，這是正常的。執行驗證腳本確認。

### Q2: API 測試失敗 - "ECONNREFUSED"
**A**: 開發伺服器未啟動，執行 `npm run dev`

### Q3: field_mappings 表不存在
**A**: Migration 尚未執行，請透過 Supabase Dashboard 執行 SQL

### Q4: ANTHROPIC_API_KEY 警告
**A**: 這是正常的，系統會自動使用規則式對應（Fallback）

### Q5: Replit Secrets 如何設定？
**A**:
1. 點擊左側「Secrets」
2. 新增 Key-Value pairs
3. 重啟伺服器

---

## 🎯 測試成功標準

### ✅ 全部通過條件

1. **資料庫**: Migration 執行成功
2. **後端**: 所有測試 100% 通過
3. **API**: 5 個端點全部正常
4. **ETL**: 動態轉換正確運作
5. **UI**: 組件已建立並可整合

### 📊 預期測試統計

- **測試案例總數**: 18+
- **通過率**: 100%
- **API 端點**: 5 個
- **轉換函數**: 6 種
- **支援表**: 3 張

---

## 🚀 測試完成後的下一步

### 1. 整合到 Dashboard（選做）
將 `FieldMappingDialog` 整合到現有的工作表管理頁面。

### 2. 實際資料測試
使用真實的 Google Sheets 資料測試完整流程：
1. 上傳 Google Sheets
2. 分析欄位對應
3. 確認並儲存對應
4. 執行資料同步
5. 驗證資料正確轉換

### 3. 效能測試
- 測試大量資料（1000+ 筆）的轉換速度
- 驗證快取機制效能
- 檢查記憶體使用

---

## 📝 測試報告範本

```markdown
# Phase 6 測試報告

## 測試日期
2025-10-05

## 測試環境
- 平台: Replit
- Node.js: v20.x
- Supabase: 已連線

## 測試結果

### Migration
- [ ] ✅ 執行成功
- [ ] ❌ 失敗（原因：___）

### 後端測試
- [ ] ✅ CLI 測試 - 100% 通過
- [ ] ✅ API 測試 - 100% 通過
- [ ] ✅ E2E 測試 - 100% 通過

### 功能驗收
- [ ] ✅ AI 欄位分析
- [ ] ✅ 對應儲存/讀取
- [ ] ✅ 動態轉換
- [ ] ✅ UI 組件

## 問題與建議
（記錄測試中發現的問題）

## 結論
- [ ] ✅ 通過驗收，可以上線
- [ ] ❌ 需要修正（列出問題）
```

---

## 🎉 測試完成

恭喜！如果所有測試都通過，Phase 6 已經成功完成。

### 下一步
- 執行 Phase 4: 驗收測試
- 準備 Phase 5: 上線部署

### 支援文檔
- [PHASE_6_QUICK_START.md](PHASE_6_QUICK_START.md) - 快速啟動指南
- [PHASE_6_COMPLETION_REPORT.md](PHASE_6_COMPLETION_REPORT.md) - 完成報告
- [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md) - 專案進度

---

**🚀 開始測試吧！祝您測試順利！**

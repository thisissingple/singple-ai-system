# 欄位對應管理功能 - 實作總結

## 概述

本次實作完成了「欄位對應管理」工具，讓營運人員可以在前端介面直接調整 Google Sheet 欄位到 Supabase 欄位的對應關係，無需修改程式碼。

---

## 功能清單

### ✅ 已完成功能

1. **欄位對應資料模型** (`configs/sheet-mapping-defaults.ts`)
   - 定義三種 sheet 類型的預設配置
   - 支援多個欄位別名
   - 支援型別轉換設定（date, number, boolean）
   - 支援必填欄位標記
   - 支援兩種 unique key 策略

2. **後端儲存機制** (`server/storage.ts`)
   - `getSheetMappings()` - 取得所有 mapping
   - `getSheetMapping(sheetType)` - 取得特定 mapping
   - `updateSheetMapping(sheetType, updates)` - 更新 mapping
   - `resetSheetMapping(sheetType)` - 重置為預設值

3. **業務邏輯層** (`server/services/reporting/sheetMappingService.ts`)
   - `identifySheetType()` - 識別 spreadsheet 類型
   - `getMappingForSheet()` - 取得 mapping 配置
   - `resolveFieldValue()` - 根據別名解析欄位值
   - `applyTransform()` - 套用型別轉換
   - `transformToSupabaseRecord()` - 轉換原始資料為 Supabase 記錄
   - `generateUniqueKey()` - 產生 unique key
   - `batchTransformAndValidate()` - 批次轉換與驗證

4. **API 路由** (`server/routes.ts`)
   - `GET /api/sheet-mappings` - 取得所有 mapping
   - `GET /api/sheet-mappings/:sheetType` - 取得特定 mapping
   - `POST /api/sheet-mappings/:sheetType` - 更新 mapping
   - `DELETE /api/sheet-mappings/:sheetType` - 重置 mapping

5. **同步流程整合** (`server/services/reporting/sheet-to-supabase-mapping.ts`)
   - 重構 `transformToSupabaseRecord()` 使用動態 mapping
   - 重構 `batchTransformAndValidate()` 使用動態 mapping
   - 重構 `identifyTargetTable()` 使用 sheetMappingService
   - 保留向後相容性

6. **前端 UI** (`client/src/components/total-report/field-mapping-dialog.tsx`)
   - 對話框介面，支援三種 sheet 類型切換
   - 顯示所有欄位與別名
   - 支援新增/刪除別名
   - 支援修改型別轉換
   - 支援切換必填欄位
   - 整合欄位盤點結果（顯示可用欄位）
   - 支援儲存與重置功能

7. **整合到數據總報表** (`client/src/pages/dashboard-total-report.tsx`)
   - 新增「欄位對應管理」按鈕
   - 整合 FieldMappingDialog 元件
   - 支援對話框開關控制

8. **文件更新**
   - `docs/data-overview.md` - 新增欄位對應管理章節（詳細說明與 FAQ）
   - `QUICK_START_v2.md` - 新增操作指南與常見場景範例
   - `docs/field-mapping-test-guide.md` - 完整測試案例與驗收指南

---

## 技術架構

```
┌─────────────────────────────────────────────────────────────┐
│                         前端 UI                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  FieldMappingDialog (field-mapping-dialog.tsx)    │     │
│  │  - 三種 sheet 類型 Tab                             │     │
│  │  - 欄位別名管理                                    │     │
│  │  - 型別轉換設定                                    │     │
│  │  - 必填欄位標記                                    │     │
│  │  - 整合欄位盤點結果                                │     │
│  └────────────────────────────────────────────────────┘     │
│                          ↓ API 呼叫                          │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                     後端 API (routes.ts)                     │
│  GET    /api/sheet-mappings                                 │
│  GET    /api/sheet-mappings/:sheetType                      │
│  POST   /api/sheet-mappings/:sheetType                      │
│  DELETE /api/sheet-mappings/:sheetType                      │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                   儲存層 (storage.ts)                        │
│  - MemStorage.sheetMappings: Map<SheetType, Mapping>       │
│  - 初始化時載入預設值                                        │
│  - 支援 CRUD 操作                                            │
└─────────────────────────────────────────────────────────────┘
                             ↑
                    讀取預設配置
                             ↓
┌─────────────────────────────────────────────────────────────┐
│        預設配置 (configs/sheet-mapping-defaults.ts)          │
│  - SHEET_MAPPING_DEFAULTS                                   │
│  - 三種 sheet 類型的初始配置                                 │
│  - 欄位別名、型別轉換、必填標記、key 策略                     │
└─────────────────────────────────────────────────────────────┘

                    同步流程使用 ↓

┌─────────────────────────────────────────────────────────────┐
│   業務邏輯 (services/reporting/sheetMappingService.ts)       │
│  - identifySheetType()                                      │
│  - resolveFieldValue()                                      │
│  - applyTransform()                                         │
│  - transformToSupabaseRecord()                              │
│  - generateUniqueKey()                                      │
└─────────────────────────────────────────────────────────────┘
                             ↓ 被呼叫
┌─────────────────────────────────────────────────────────────┐
│  同步流程 (services/reporting/sheet-to-supabase-mapping.ts)  │
│  - transformToSupabaseRecord() [重構使用動態 mapping]        │
│  - batchTransformAndValidate() [重構使用動態 mapping]       │
│  - 向後相容，保留原有函數簽名                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 資料結構

### SheetFieldMapping

```typescript
interface SheetFieldMapping {
  sheetType: 'trial_attendance' | 'trial_purchase' | 'eods';
  sheetNamePatterns: string[];      // 用來識別 Google Sheet 名稱
  targetTable: string;              // 目標 Supabase 表名
  fields: SheetMappingField[];      // 欄位對應清單
  keyStrategy: 'spreadsheet_row' | 'email_date';  // Unique Key 策略
}
```

### SheetMappingField

```typescript
interface SheetMappingField {
  supabaseColumn: string;           // Supabase 欄位名
  aliases: string[];                // Google Sheet 可能的別名
  required?: boolean;               // 是否必填
  transform?: 'date' | 'number' | 'boolean' | null;  // 型別轉換
}
```

---

## 使用流程

### 1. 營運調整欄位對應

```
使用者開啟「欄位對應管理」對話框
  ↓
選擇 sheet 類型（上課記錄 / 購買記錄 / EODs）
  ↓
調整欄位別名、型別轉換、必填標記
  ↓
點擊「儲存設定」
  ↓
前端呼叫 POST /api/sheet-mappings/:sheetType
  ↓
後端更新 storage 中的 mapping
  ↓
下次同步時生效
```

### 2. 同步時使用 mapping

```
同步程式收到 Google Sheet 資料
  ↓
呼叫 identifySheetType(spreadsheetName) 識別類型
  ↓
呼叫 getMappingForSheet(sheetType) 取得 mapping
  ↓
遍歷每筆資料：
  - resolveFieldValue() 根據別名找欄位值
  - applyTransform() 套用型別轉換
  - 檢查必填欄位是否存在
  ↓
若成功：加入 validRecords
若失敗：加入 invalidRecords，記錄 warnings
  ↓
寫入 Supabase（使用 generateUniqueKey() 避免重複）
```

---

## 檔案清單

### 新增檔案

```
configs/
└── sheet-mapping-defaults.ts                      # 預設 mapping 配置（已存在，但已更新）

server/services/reporting/
└── sheetMappingService.ts                         # 新增：業務邏輯層

client/src/components/total-report/
└── field-mapping-dialog.tsx                       # 新增：前端 UI

docs/
└── field-mapping-test-guide.md                    # 新增：測試指南
```

### 修改檔案

```
server/
├── storage.ts                                     # 新增 mapping CRUD 方法
└── routes.ts                                      # 新增 /api/sheet-mappings 路由

server/services/reporting/
└── sheet-to-supabase-mapping.ts                   # 重構使用動態 mapping

client/src/pages/
└── dashboard-total-report.tsx                     # 整合欄位對應管理按鈕

docs/
├── data-overview.md                               # 新增欄位對應管理章節
└── QUICK_START_v2.md                              # 新增操作指南
```

---

## 測試建議

請參考 [field-mapping-test-guide.md](./docs/field-mapping-test-guide.md) 進行完整測試，包括：

1. ✅ UI 操作測試（新增/刪除別名、修改設定）
2. ✅ API 端點測試（GET/POST/DELETE）
3. ✅ 同步流程測試（欄位對應正確性）
4. ✅ 錯誤處理測試（缺失欄位、型別轉換）
5. ✅ 重置功能測試
6. ✅ 整合測試（端到端）

---

## 驗收指標

- [x] 同步時會讀取 mapping，並將有問題的欄位列在 log 和回傳統計
- [x] 前端可查看並調整 mapping，新增別名後再同步，Supabase 對應欄位會寫進正確的資料
- [x] 欄位盤點結果能在 UI 顯示，提供可用欄位參考
- [x] 報表 warnings 能提示「哪幾筆欄位缺失被忽略」
- [x] 重置功能可恢復預設值
- [x] 所有操作無需修改程式碼

---

## 未來擴充建議

### 1. 新增自定義欄位

目前只支援調整既有欄位的別名，若要支援完全自定義的欄位，需要：
- 在 UI 提供「新增欄位」功能
- 後端驗證欄位名稱合法性
- 動態修改 Supabase schema（或使用 JSONB 欄位）

### 2. 欄位對應版本控制

若需要追蹤 mapping 的歷史變更，可以：
- 在 storage 中記錄 mapping 的版本號
- 每次更新時保存快照
- 提供「回復到先前版本」功能

### 3. 批次匯入/匯出 mapping

方便在不同環境間同步設定：
- 匯出為 JSON 檔案
- 匯入 JSON 檔案並覆蓋設定

### 4. AI 輔助欄位對應

整合 AI 自動推薦欄位對應：
- 分析 Google Sheet 欄位內容
- 自動建議對應到哪個 Supabase 欄位
- 使用者確認後套用

---

## 已知限制

1. **Unique Key 策略不可在前端修改**
   - 目前在預設配置中定義
   - 若要支援動態修改，需要在 UI 提供選單並更新 API

2. **無法新增全新的 Supabase 欄位**
   - 只能調整既有欄位的對應關係
   - 新增欄位需修改程式碼與資料庫 schema

3. **型別轉換失敗時無明確錯誤訊息**
   - 轉換失敗會回傳 null
   - 可加強錯誤訊息，提示使用者資料格式問題

4. **欄位盤點結果未與 mapping 完全整合**
   - 目前只顯示可用欄位列表
   - 未來可提供「一鍵加入為別名」功能

---

## 聯絡資訊

如有問題或建議，請參考：
- [data-overview.md](./docs/data-overview.md) - 完整功能文件
- [field-mapping-test-guide.md](./docs/field-mapping-test-guide.md) - 測試指南
- [QUICK_START_v2.md](./QUICK_START_v2.md) - 快速開始指南

---

**實作版本**: v1.0
**完成日期**: 2025-10-01
**開發團隊**: Development Team

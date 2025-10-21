# 未同步資料顯示功能 - 完整說明

## ✅ 已完成功能

### 1. **修正顯示方式**
- ✅ 原本：`Row 0`（容易混淆）
- ✅ 現在：`Google Sheets 第 2 列`（清楚明確）

### 2. **新增未同步資料 Table**
在資料來源頁面新增完整的未同步資料表格，包含：

| 欄位 | 說明 |
|------|------|
| **工作表** | 顯示哪個工作表有問題 |
| **Google Sheets 位置** | 明確告訴你第幾列 |
| **原因** | 列出缺少哪些必填欄位 |
| **解決方法** | 提供 4 步驟操作指南 |

### 3. **一鍵重新同步**
- Table 底部有「重新同步」按鈕
- 修正資料後，點擊即可立即重新同步
- 無需手動重新操作

---

## 📊 UI 展示

### Alert（簡要提示）
```
⚠️ 同步時發現 1 筆無效資料                [EODs for Closers]

以下資料列缺少必填欄位，未同步到 Supabase：

Google Sheets 第 2 列: Missing required fields: closer_name

💡 提示：請檢查 Google Sheets 中這些資料列是否填寫完整必填欄位
```

### Table（詳細資訊）
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ 未同步資料 (1 筆)                                                     │
│ 以下資料因為缺少必填欄位，未能同步到 Supabase                              │
├──────────────┬────────────────┬─────────────────┬─────────────────────┤
│ 工作表        │ Google Sheets  │ 原因             │ 解決方法             │
│              │ 位置           │                  │                     │
├──────────────┼────────────────┼─────────────────┼─────────────────────┤
│ EODs for     │ 第 2 列        │ • Missing       │ 1. 開啟 Google      │
│ Closers      │                │   required      │    Sheets 🔗        │
│              │                │   fields:       │ 2. 找到第 2 列      │
│              │                │   closer_name   │ 3. 填寫缺少的       │
│              │                │                 │    必填欄位         │
│              │                │                 │ 4. 點擊下方         │
│              │                │                 │   「重新同步」      │
└──────────────┴────────────────┴─────────────────┴─────────────────────┘

💡 修正完成後，點擊「重新同步」即可將資料同步到 Supabase

                                              [🔄 重新同步]
```

---

## 🔧 技術實作

### 檔案變更

1. **[invalid-records-alert.tsx](client/src/components/invalid-records-alert.tsx)**
   - 修改顯示為「Google Sheets 第 X 列」
   - 公式：`record.rowIndex + 2`（+2 = 資料列起始 + Google Sheets 從 1 開始）

2. **[invalid-records-table.tsx](client/src/components/invalid-records-table.tsx)** (新建)
   - 完整表格顯示未同步資料
   - 包含 4 步驟解決指南
   - 提供重新同步按鈕

3. **[dashboard.tsx](client/src/pages/dashboard.tsx)**
   - 整合兩個元件到資料來源頁面
   - 實作重新同步邏輯

---

## 🎯 使用流程

### 情境：EODs 表有 1 筆資料未同步

1. **同步時發現問題**
   - Toast 顯示：`✅ 已同步 996 筆資料到 Supabase（1 筆無效）`

2. **查看詳細資訊**
   - 頁面出現紅色 Alert 和 Table
   - 清楚顯示：「Google Sheets 第 2 列」缺少 `closer_name`

3. **修正資料**
   - 開啟 Google Sheets
   - 找到第 2 列
   - 在 `closer_name` 欄位填入諮詢師名字（例如：張三）

4. **重新同步**
   - 點擊 Table 底部的「🔄 重新同步」按鈕
   - 系統自動重新同步該工作表
   - 成功後，Table 和 Alert 自動消失

5. **確認結果**
   - Supabase 變成 997 筆（全部同步成功）✅
   - 前端顯示 997 筆 ✅
   - 報表資料完整準確 ✅

---

## 🔍 為什麼顯示「第 2 列」？

### Google Sheets 結構
```
第 1 列: [closer_name] [email] [deal_date] ...  ← 欄位名稱（不同步）
第 2 列: [張三]        [...]    [2024-01-01] ... ← Row 0（第一筆資料）
第 3 列: [李四]        [...]    [2024-01-02] ... ← Row 1（第二筆資料）
```

### 計算方式
- 後端 `rowIndex = 0` → 第一筆資料
- Google Sheets 位置 = `rowIndex + 2`
  - `+1`：因為資料從第 2 列開始
  - `+1`：因為 Google Sheets 列數從 1 開始計算

**結果**：`rowIndex 0` → `Google Sheets 第 2 列` ✅

---

## 📝 相關檔案

### 前端元件
- [invalid-records-alert.tsx](client/src/components/invalid-records-alert.tsx) - 簡要提示
- [invalid-records-table.tsx](client/src/components/invalid-records-table.tsx) - 詳細表格
- [dashboard.tsx](client/src/pages/dashboard.tsx) - 整合頁面

### 後端服務
- [sheet-sync-service.ts](server/services/sheet-sync-service.ts) - 同步服務
- [google-sheets.ts](server/services/google-sheets.ts) - Google Sheets 服務
- [routes.ts](server/routes.ts) - API 路由

---

## ✨ 功能亮點

1. **清楚明確**
   - 直接顯示 Google Sheets 第幾列
   - 不用自己計算或猜測

2. **完整資訊**
   - 工作表名稱
   - 具體位置
   - 缺少的欄位
   - 解決步驟

3. **快速修正**
   - 4 步驟操作指南
   - 一鍵重新同步
   - 自動更新顯示

4. **資料準確**
   - 確保所有資料都同步
   - 報表數據完整
   - 沒有資料遺失

---

## 🚀 測試方法

1. **開啟 Dashboard**: `http://localhost:5001`
2. **進入「資料來源」頁面**
3. **選擇 EODs 工作表**
4. **點擊「✨ 欄位對應」**
5. **儲存對應後觸發同步**
6. **查看結果**：
   - 紅色 Alert 顯示簡要資訊
   - 下方 Table 顯示完整詳細資訊
   - 確認顯示「Google Sheets 第 2 列」

---

**完成時間**: 2025-10-06
**功能狀態**: ✅ 完成並測試通過

# Is_Showed 欄位顯示更新

## 更新日期
2025-11-20

## 更新內容

### 1. 舊記錄批量更新

**目的**: 將所有舊的體驗課記錄的 `is_showed` 欄位設為 `true`（預設認為舊記錄都有上線）

**執行腳本**: `scripts/backfill-is-showed-to-true.ts`

**更新結果**:
```
✅ 成功更新 184 筆記錄
📈 更新後統計:
  - 有上線 (true): 184 筆
  - 未上線 (false): 0 筆
  - 未記錄 (null): 0 筆
```

**執行命令**:
```bash
npx tsx scripts/backfill-is-showed-to-true.ts
```

### 2. 體驗課總覽頁面 UI 更新

**檔案**: [client/src/pages/reports/trial-overview-gamified.tsx](../client/src/pages/reports/trial-overview-gamified.tsx)

#### 變更 1: 學員資料結構擴充

為每個學員資料添加 `isShowed` 欄位：

```typescript
const students = [
  {
    id: 1,
    name: '王小明',
    email: 'wang@example.com',
    // ... 其他欄位
    isShowed: true,  // ✨ 新增
  },
  // ...
];
```

**範例資料分佈**:
- 王小明: `isShowed: true` (已上線)
- 李小華: `isShowed: true` (已上線)
- 陳小美: `isShowed: false` (未上線)
- 張小強: `isShowed: true` (已上線)
- 林小芳: `isShowed: true` (已上線)
- 黃大明: `isShowed: true` (已上線)
- 劉小娟: `isShowed: false` (未上線)
- 吳大華: `isShowed: true` (已上線)

#### 變更 2: 導入圖標

```typescript
import {
  // ... 其他圖標
  CheckCircle2,  // ✨ 新增 - 已上線圖標
  XCircle,       // ✨ 新增 - 未上線圖標
} from 'lucide-react';
```

#### 變更 3: 表格 Header 新增欄位

在「上課時間」和「狀態」之間插入新的表頭：

```tsx
<th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
  是否上線
</th>
```

#### 變更 4: 表格 Body 顯示邏輯

在對應位置添加顯示是否上線的儲存格：

```tsx
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex justify-center">
    {student.isShowed ? (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">已上線</span>
      </div>
    ) : (
      <div className="flex items-center gap-1 text-red-600">
        <XCircle className="w-5 h-5" />
        <span className="text-sm font-medium">未上線</span>
      </div>
    )}
  </div>
</td>
```

### 3. 視覺設計

**已上線狀態**:
- 圖標: ✅ CheckCircle2 (綠色圓圈打勾)
- 顏色: `text-green-600`
- 文字: 「已上線」

**未上線狀態**:
- 圖標: ❌ XCircle (紅色圓圈打叉)
- 顏色: `text-red-600`
- 文字: 「未上線」

### 4. 表格欄位順序

更新後的完整欄位順序：

1. 學員（姓名 + 大頭照）
2. 聯絡方式（Email + 電話）
3. 教師
4. 上課時間（日期 + 時間）
5. **是否上線** ✨ **新增**
6. 狀態（已成交/待追蹤/考慮中等）
7. 方案（課程名稱 + 金額）
8. 操作（查看按鈕）

## 測試驗證

### 視覺檢查清單

- [x] 表格新增「是否上線」欄位
- [x] 已上線學員顯示綠色勾勾圖標
- [x] 未上線學員顯示紅色叉叉圖標
- [x] 欄位置中對齊
- [x] 圖標與文字排列整齊

### 資料檢查清單

- [x] 184 筆舊記錄已更新為 `is_showed = true`
- [x] 新提交的表單可正確記錄 `is_showed` 狀態
- [x] Demo 資料包含 true/false 兩種狀態

## 後續改進建議

1. **篩選功能**: 添加「只顯示未上線」或「只顯示已上線」的篩選器
2. **統計指標**: 在 KPI 卡片中加入「上線率」指標
3. **顏色主題**: 考慮使用更柔和的顏色（如藍色/灰色）以符合 Duolingo 風格
4. **批量操作**: 提供批量修改 `is_showed` 狀態的功能
5. **排序功能**: 允許按「是否上線」欄位排序

## 相關檔案

### 腳本
- `scripts/backfill-is-showed-to-true.ts` - 批量更新舊記錄

### 前端
- `client/src/pages/reports/trial-overview-gamified.tsx` - 體驗課總覽頁面

### 文件
- `docs/IS_SHOWED_IMPLEMENTATION.md` - is_showed 欄位完整實作文件
- `docs/IS_SHOWED_DISPLAY_UPDATE.md` - 本文件（顯示更新文件）

## 變更記錄

| 日期 | 變更內容 | 狀態 |
|------|---------|------|
| 2025-11-20 | 批量更新 184 筆舊記錄 | ✅ 完成 |
| 2025-11-20 | UI 新增「是否上線」欄位 | ✅ 完成 |
| 2025-11-20 | Demo 資料更新 | ✅ 完成 |

## 截圖預覽

**表格欄位顯示**:
```
| 學員 | 聯絡方式 | 教師 | 上課時間 | 是否上線 | 狀態 | 方案 | 操作 |
|------|---------|------|---------|---------|------|------|------|
| 王小明 | ... | Karen | 2025-11-20 | ✅ 已上線 | 已成交 | ... | 查看 |
| 陳小美 | ... | 李老師 | 2025-11-19 | ❌ 未上線 | 待追蹤 | - | 查看 |
```

## 使用範例

### 前端取得資料時

當從 API 取得真實資料時，確保包含 `is_showed` 欄位：

```typescript
// API Response
{
  students: [
    {
      id: "uuid",
      name: "王小明",
      email: "wang@example.com",
      // ...
      is_showed: true,  // 從資料庫讀取
    }
  ]
}
```

### 顯示邏輯

```typescript
// 在 JSX 中直接使用
{student.isShowed ? (
  <div className="text-green-600">✅ 已上線</div>
) : (
  <div className="text-red-600">❌ 未上線</div>
)}
```

## 注意事項

1. **Demo 頁面**: 目前更新的是 demo 頁面，實際生產環境需要確保 API 回傳 `is_showed` 欄位
2. **命名一致性**: 前端使用 camelCase (`isShowed`)，資料庫使用 snake_case (`is_showed`)
3. **空值處理**: 目前所有舊記錄已設為 `true`，不再有 `null` 值
4. **顏色選擇**: 使用紅綠色可能對色盲使用者不友善，未來可考慮改用圖標形狀區分

## 完成狀態

✅ **所有任務已完成**
- ✅ 批量更新舊記錄
- ✅ UI 顯示「是否上線」欄位
- ✅ 文件撰寫完成

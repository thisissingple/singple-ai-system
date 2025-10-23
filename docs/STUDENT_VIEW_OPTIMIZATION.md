# 學生視角優化 - 視覺設計重構

**日期**: 2025-10-23
**設計靈感**: Apple, Notion, Mailerlite
**配色**: 灰階 (80%) + 橘色強調 (20%)

---

## 變更摘要

### ✅ 已完成 (Phase 1)

1. **新增組件**
   - `AttendanceLog` (attendance-log.tsx)
     - 時間軸設計顯示最近上課記錄
     - 相對日期（今天、昨天、X天前）
     - 灰階 + 橘色圓點設計
     - 支援最多 20 筆記錄

2. **移除冗餘卡片** (已封存)
   - ❌ 📞 待分配教師學生 (lines 693-743)
   - ❌ 📋 老師待跟進統計 (lines 745-803)

3. **Props 傳遞**
   - StudentInsights 現在接收 `classRecords` prop
   - Dashboard 正確傳遞 `teacherClassRecords`

---

## 設計系統規範

### 配色方案 (Gray + Orange)

| 類型 | Tailwind Class | 用途 |
|------|----------------|------|
| 主要文字 | `text-gray-900` | 標題、重要資訊 |
| 次要文字 | `text-gray-700` | 正文內容 |
| 提示文字 | `text-gray-500` | 輔助說明 |
| 圖示 | `text-gray-400` | 一般圖示 |
| 背景 | `bg-gray-50` | hover 狀態 |
| 邊框 | `border-gray-200` | 分隔線、卡片邊框 |
| **橘色強調** | `text-orange-500`<br>`bg-orange-400` | 時間軸圓點、重要按鈕 |

### 字型大小 (僅 3 種)

| 大小 | Tailwind | 用途 |
|------|----------|------|
| 標題 | `text-lg` (18px) | Card 標題、section 標題 |
| 正文 | `text-sm` (14px) | 主要內容、表格資料 |
| 說明 | `text-xs` (12px) | 輔助說明、Badge、相對時間 |

### 優先級顯示 (新方案)

**舊方案** (太多顏色):
```tsx
<span className="text-2xl">🔴</span>
<span className="font-bold text-red-700">高優先</span>
```

**新方案** (灰階 + 橘色):
```tsx
<div className="w-2 h-2 rounded-full bg-orange-500"></div>
<span className="text-sm text-gray-600">高優先</span>
```

### Badge 樣式統一

**舊方案** (5+ 種顏色變體):
```tsx
<Badge variant="destructive">未轉高</Badge>
<Badge variant="secondary">體驗中</Badge>
<Badge variant="outline">未開始</Badge>
```

**新方案** (統一灰底):
```tsx
<span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
  未轉高
</span>
```

**特殊狀態** (保留綠色/紅色):
```tsx
// 成功狀態 (綠色)
<span className="bg-green-50 text-green-700">已完成</span>

// 警示狀態 (紅色)
<span className="bg-red-50 text-red-700">缺席</span>
```

---

## 待完成工作 (Phase 2)

### 主表格視覺優化

#### 1. 卡片樣式統一
```tsx
// Current (多種顏色)
<Card className="border-orange-200 bg-orange-50/50">

// Target (統一灰色)
<Card className="border border-gray-200 shadow-sm bg-white">
```

#### 2. 優先級欄位重構
**位置**: student-insights.tsx (表格內的 priority 顯示)

**Current**:
```tsx
{student.priority === '高優先' && (
  <span className="text-2xl">🔴</span>
  <span className="font-bold text-red-700">高優先</span>
)}
```

**Target**:
```tsx
<div className="flex items-center gap-2">
  <div className={`w-2 h-2 rounded-full ${
    student.priority === '高優先' ? 'bg-orange-500' :
    student.priority === '中優先' ? 'bg-orange-300' :
    'bg-gray-300'
  }`}></div>
  <span className="text-sm text-gray-600">{student.priority}</span>
</div>
```

#### 3. 狀態 Badge 統一化
**位置**: student-insights.tsx (currentStatus 顯示)

**Target**:
```tsx
<span className={`px-2 py-1 text-xs rounded-full ${
  status === '已轉高' || status === '出席' ? 'bg-green-50 text-green-700' :
  status === '缺席' || status === '未轉高' ? 'bg-red-50 text-red-700' :
  'bg-gray-100 text-gray-700'
}`}>
  {status}
</span>
```

#### 4. 移除彩色高亮行
**Current**: 表格行有 red/yellow/green 背景色

**Target**: 統一 white 背景 + gray-50 hover

#### 5. 簡化篩選按鈕
**Current**: 多種顏色的 Badge 按鈕

**Target**: 統一灰色 + active 時橘色邊框

---

## AttendanceLog 組件設計

### 功能特點

1. **時間軸設計**
   - 橘色小圓點 (1.5px)
   - 相對日期 (今天/昨天/X天前)
   - 最多顯示 20 筆

2. **資訊顯示**
   - 教師名稱 (User icon)
   - 學生名稱 (GraduationCap icon)
   - 上課狀態 (Badge)

3. **互動效果**
   - Hover: `bg-gray-50` (淡灰色背景)
   - 過渡動畫: `transition-colors`

### 使用方式

```tsx
<AttendanceLog
  classRecords={teacherClassRecords}
  maxRecords={20}
/>
```

---

## 檔案變更清單

### 新增檔案
- ✅ `client/src/components/trial-report/attendance-log.tsx`
- ✅ `docs/STUDENT_VIEW_OPTIMIZATION.md` (本文件)

### 修改檔案
- ✅ `client/src/components/trial-report/student-insights.tsx`
  - 新增 `classRecords` prop
  - 封存兩個卡片 (lines 693-803)
  - 整合 AttendanceLog 組件

- ✅ `client/src/pages/dashboard-trial-report.tsx`
  - 傳遞 `classRecords={teacherClassRecords}` 給 StudentInsights

### 待修改檔案
- ⏳ `client/src/components/trial-report/student-insights.tsx`
  - 表格優先級顯示改為小圓點
  - 狀態 Badge 統一化
  - 移除彩色行背景
  - 簡化篩選按鈕樣式

---

## Git Commits

### Commit 1: feat: Optimize student view with timeline attendance log
- 新增 AttendanceLog 組件
- 封存冗餘卡片
- 整合新組件到 StudentInsights

---

## 設計參考

### Mailerlite
- **配色**: 灰階為主 + 單一品牌色強調
- **字型**: 僅 2-3 種大小
- **間距**: 一致的 padding/margin
- **圓角**: 統一使用 rounded-lg 或 rounded-full

### Apple
- **極簡**: 減少視覺雜訊
- **灰階**: 80% 灰色 + 20% 品牌色
- **字體**: San Francisco 風格（乾淨、易讀）

### Notion
- **卡片**: 淺灰邊框 + 白色背景
- **Hover**: 淡灰色背景 (gray-50)
- **圖示**: 一致的灰色調

---

## 下一步行動

1. ✅ 部署到 Zeabur (已觸發)
2. ⏳ 驗證 AttendanceLog 顯示正確
3. ⏳ 執行 Phase 2 表格優化
4. ⏳ 取得用戶反饋
5. ⏳ 調整細節

---

## 技術細節

### 相對日期計算
使用 `date-fns`:
```typescript
import { isToday, isYesterday, differenceInDays } from 'date-fns';

const formatRelativeDate = (dateString: string) => {
  const date = parseISO(dateString);
  if (isToday(date)) return '今天';
  if (isYesterday(date)) return '昨天';
  const daysAgo = differenceInDays(new Date(), date);
  if (daysAgo <= 7) return `${daysAgo} 天前`;
  return format(date, 'MM/dd');
};
```

### 排序邏輯
```typescript
const sortedRecords = [...classRecords]
  .filter(record => record.classDate)
  .sort((a, b) => {
    const dateA = new Date(a.classDate!);
    const dateB = new Date(b.classDate!);
    return dateB.getTime() - dateA.getTime(); // 最新在前
  })
  .slice(0, maxRecords);
```

---

**作者**: Claude Code
**用戶需求**: 簡化視覺、統一配色、減少雜訊
**設計方向**: Apple/Notion 極簡風 - 灰階 + 橘色

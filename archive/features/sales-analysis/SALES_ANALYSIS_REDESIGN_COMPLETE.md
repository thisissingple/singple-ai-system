# 🎯 推課分析頁面全面重構完成

**日期**: 2025-10-15
**MVP 測試對象**: 蔡宇翔（Karen, 2025-10-03）
**狀態**: ✅ 完成（待瀏覽器測試）

---

## 📋 重構需求回顧

### 原始需求（12 項）

1. ✅ **頁面重新定位**：從「教學品質分析」改為「推課分析頁」
2. ✅ **戰績報告整合**：與最上面一列整合，移除重複資訊
3. ✅ **學員檔案卡完整解析**：正確解析 GPT 完整結果（目標畫面、動機等）
4. ✅ **內容凸顯設計**：使用 Bold 加強內容可讀性，不與標題打架
5. ✅ **結構化框架**：設計痛點、動機、問題、目標、夢想等框架
6. ✅ **關鍵指標橫式排版**：移至戰績報告下方，橫式呈現
7. ✅ **流式排版**：從上到下、從左到右，無左右分割
8. ✅ **行動優先序橫式**：一列橫式排版
9. ✅ **成交機率整合**：可點擊展開詳細解析
10. ✅ **三階段成交話術重排**：修正破圖問題
11. ✅ **所有時間戳可跳轉**：全域時間戳點擊功能
12. ✅ **逐字稿自動高亮**：跳轉後自動滾動並高亮對應段落

---

## 🎨 全新設計架構

### **頁面結構（由上而下）**

```
┌─────────────────────────────────────┐
│ 🎯 推課分析詳情                      │
├─────────────────────────────────────┤
│ 🏆 推課戰績報告（整合 4 卡片）        │
│  ├─ 教學評分 (綠)                   │
│  ├─ 成交機率 (橙) [可點擊展開]       │
│  ├─ 課程狀態 (藍)                   │
│  └─ 購課資訊 (紫)                   │
│  └─ [展開區] 成交機率詳細分析        │
├─────────────────────────────────────┤
│ 📊 關鍵指標解析（橫式 5 欄）         │
│  - 呼應痛點程度                     │
│  - 推課引導力度                     │
│  - Double Bind / NLP 應用          │
│  - 情緒共鳴與信任                   │
│  - 節奏與收斂完整度                 │
│  └─ 總評                           │
├─────────────────────────────────────┤
│ 👤 學員檔案卡（3 大區塊）            │
│  ├─ 📇 基本資料 (藍)                │
│  ├─ ⛔️ 痛點與問題 (紅)              │
│  ├─ 🏁 夢想與動機 (紫)              │
│  └─ ⚠️ 仍需補問 (黃)                │
├─────────────────────────────────────┤
│ 🚀 下一步行動優先序（橫式 3 欄）      │
├─────────────────────────────────────┤
│ 💬 完整成交話術總結（3 版本 Tabs）    │
├─────────────────────────────────────┤
│ 📋 原始 Markdown 報告（可收合）       │
├─────────────────────────────────────┤
│ 📝 完整逐字稿（支援時間戳跳轉高亮）   │
└─────────────────────────────────────┘
```

---

## ✨ 核心功能實作

### **1. 戰績報告大屏（4 卡片整合）**

#### **教學評分卡**（綠色漸層）
- 5xl 大字體顯示分數
- 星星評級：★★★★☆（5 顆星制）
- 等級系統：S/A/B/C（自動判定）

#### **成交機率卡**（橙色漸層，可點擊）
- 5xl 大字體顯示百分比
- 火焰熱度：🔥🔥🔥🔥（機率越高越多）
- 潛力評級：極高/高/中等
- **互動功能**：點擊展開/收合詳細分析
- 展開後顯示完整的成交機率評估依據（Markdown 格式）

#### **課程狀態卡**（藍色漸層）
- Badge 顯示狀態（已成交/未成交/待跟進）
- 體驗課完成標記
- 跟進建議

#### **購課資訊卡**（紫色漸層）
- 方案名稱
- 剩餘堂數

**技術亮點**：
- 使用 `showProbabilityDetail` state 控制展開/收合
- ChevronUp/ChevronDown 圖示反饋
- 平滑動畫過渡

---

### **2. 關鍵指標解析（橫式排版）**

**設計理念**：
- 從戰績報告下方開始，橫式排列 5 個指標
- 每個指標卡片包含：
  - 指標名稱（font-semibold）
  - 分數（2xl font-bold）+ 進度條
  - 證據說明（text-xs，muted-foreground）

**響應式設計**：
- 大螢幕：5 欄（lg:grid-cols-5）
- 中螢幕：3 欄（md:grid-cols-3）
- 小螢幕：1 欄

**總評顯示**：
- 位於指標下方
- 虛線邊框 + muted 背景
- 醒目的「總評：」前綴

---

### **3. 學員檔案卡（結構化框架）**

#### **設計框架（3 大色彩區塊）**

##### **📇 基本資料**（藍色漸層）
```typescript
interface BasicInfo {
  ageGenderOccupation: string;      // 年齡/性別/職業
  decisionMaker: {                  // 決策權
    text: string;
    timestamp?: string;
  };
  paymentCapacity: {                // 付費能力
    text: string;
    timestamp?: string;
  };
}
```

**視覺設計**：
- 待補問資訊：黃色文字（text-yellow-600）
- 已提供資訊：黑色粗體（font-semibold text-foreground）
- 時間戳：藍色可點擊按鈕

##### **⛔️ 痛點與問題**（紅色漸層）
```typescript
interface PainPoints {
  voiceStatus: { text, timestamp };      // 聲音現況
  currentPainPoints: Array<{             // 現在最卡
    text, timestamp
  }>;
  pastAttempts: Array<{                  // 過去嘗試
    text, timestamp
  }>;
}
```

**視覺設計**：
- 聲音現況：紅色標籤（text-red-700）
- 現在最卡：紅色粗體標籤
- 過去嘗試：灰色標籤（text-muted-foreground）
- 所有內容：黑色粗體（font-semibold text-foreground）

##### **🏁 夢想與動機**（紫色漸層）
```typescript
interface Dreams {
  dreamVision: { text, timestamp };      // 目標畫面
  motivation: { text, timestamp };       // 當下動機
  useCase: { text, timestamp };          // 應用場景
}
```

**視覺設計**：
- 目標畫面：白色卡片 + 斜體引用格式
- 所有標籤：紫色（text-purple-700）
- 內容：黑色粗體 + 斜體

##### **⚠️ 仍需補問**（黃色警告卡）
- 黃色背景（bg-yellow-50）
- 黃色邊框（border-yellow-300）
- 列表形式顯示待補問項目

#### **複製檔案功能**
- 一鍵複製完整學員檔案（Markdown 格式）
- 包含所有結構化資訊
- 顯示「已複製」反饋（2 秒）

---

### **4. 時間戳全域跳轉系統**

#### **解析邏輯**
```typescript
function extractTextWithTimestamp(text: string): {
  text: string;
  timestamp?: string;
} {
  // 支援兩種格式
  // 1. 括號：（00:12:09）或 (00:12:09)
  // 2. 無括號：00:12:09
  const timestampRegex = /[（(]?(\d{2}:\d{2}:\d{2})[）)]?/g;
  const matches = [...text.matchAll(timestampRegex)];

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    return {
      text: text.replace(/[（(]?\d{2}:\d{2}:\d{2}[）)]?/g, '').trim(),
      timestamp: lastMatch[1],
    };
  }
  return { text: text.trim() };
}
```

#### **TimestampLink 組件**
```tsx
<button
  onClick={() => onClick?.(timestamp)}
  className="ml-1 inline-flex items-center gap-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
  title="點擊跳轉至逐字稿"
>
  📍{timestamp}
</button>
```

**設計特點**：
- 藍色背景（bg-blue-100）
- Hover 效果（hover:bg-blue-200）
- 📍 圖示 + 時間戳文字
- Tooltip 提示

#### **InfoWithTimestamp 組件**
```tsx
<div className="flex items-start gap-1 flex-wrap">
  <span className="flex-1">{text}</span>
  <TimestampLink timestamp={timestamp} onClick={onTimestampClick} />
</div>
```

**用途**：
- 所有學員檔案卡內容
- 自動處理文字 + 時間戳排版
- 支援多行文字自動換行

---

### **5. 逐字稿自動高亮跳轉**

#### **handleTimestampClick 函數**
```typescript
function handleTimestampClick(timestamp: string) {
  // 1. 展開逐字稿區域
  setShowTranscript(true);

  // 2. 設定高亮時間戳
  setHighlightedTimestamp(timestamp);

  setTimeout(() => {
    // 3. 滾動到逐字稿區域
    const transcriptSection = document.getElementById('transcript-section');
    if (transcriptSection) {
      transcriptSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    // 4. 找到對應行並滾動
    const lines = analysis.transcript_text.split('\n');
    const targetLineIndex = lines.findIndex(line =>
      line.includes(timestamp)
    );

    if (targetLineIndex !== -1) {
      const scrollPosition = targetLineIndex * 24;  // 每行約 24px
      const transcriptPre = document.querySelector('#transcript-content pre');
      if (transcriptPre) {
        transcriptPre.scrollTop = scrollPosition;
      }
    }
  }, 150);

  // 5. 3秒後移除高亮
  setTimeout(() => setHighlightedTimestamp(null), 3000);
}
```

#### **逐字稿渲染**
```tsx
{analysis.transcript_text.split('\n').map((line, index) => {
  const isHighlighted = highlightedTimestamp && line.includes(highlightedTimestamp);
  return (
    <div
      key={index}
      className={cn(
        "transition-colors duration-300",
        isHighlighted && "bg-yellow-200 font-semibold text-foreground"
      )}
    >
      {line}
    </div>
  );
})}
```

**高亮效果**：
- 黃色背景（bg-yellow-200）
- 粗體文字（font-semibold）
- 300ms 平滑過渡動畫
- 3 秒後自動消失

---

### **6. 行動優先序（橫式 3 欄）**

**設計**：
- 3 欄 grid 排版（md:grid-cols-3）
- 每個任務卡片：
  - 圓形編號（bg-primary，白色文字）
  - 任務內容（font-medium，leading-relaxed）
  - 漸層背景（from-primary/5 to-white）
  - 陰影效果（shadow-sm）

**視覺層次**：
- 編號最醒目（primary 色彩）
- 任務內容次之（foreground 色彩）
- 背景淡化（subtle gradient）

---

### **7. 三階段成交話術（修正排版）**

#### **Tabs 設計**
```tsx
<TabsList className="grid w-full grid-cols-3 gap-2 bg-transparent p-0">
  {scripts.map((script) => (
    <TabsTrigger
      className="rounded-lg border-2 border-border/80 bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:text-foreground data-[state=active]:shadow-sm"
    >
      {script.title}
    </TabsTrigger>
  ))}
</TabsList>
```

**設計改進**：
- 使用 `grid grid-cols-3` 確保等寬
- 透明背景（bg-transparent）避免衝突
- 活動狀態：
  - 主色邊框（border-primary）
  - 淡色背景（bg-primary/10）
  - 陰影效果（shadow-sm）

#### **內容區域**
```tsx
<TabsContent>
  <div className="rounded-lg border border-border/80 bg-muted/20 p-5 shadow-sm">
    <div className="prose prose-sm max-w-none">
      <MarkdownView content={script.body} />
    </div>
  </div>
</TabsContent>
```

**修正重點**：
- 移除固定高度，避免破圖
- 使用 `prose` class 自動排版
- `max-w-none` 避免寬度限制

---

## 🔧 技術實作細節

### **1. 學員檔案解析（parseStudentProfile）**

```typescript
function parseStudentProfile(body?: string): ParsedStudentProfile | undefined {
  if (!body) return undefined;

  const profile: ParsedStudentProfile = {
    basicInfo: {},
    pastAttempts: [],
    currentPainPoints: [],
  };

  // 基本資料
  const basicInfoMatch = body.match(/年齡[／\/]性別[／\/]職業[／\/]角色：(.+)/);
  if (basicInfoMatch) {
    profile.basicInfo.ageGenderOccupation = basicInfoMatch[1].trim();
  }

  // 決策權
  const decisionMatch = body.match(/是否自己決定是否購課：(.+?)(?=\n|$)/);
  if (decisionMatch) {
    profile.basicInfo.decisionMaker = extractTextWithTimestamp(decisionMatch[1]);
  }

  // ... 其他欄位解析

  return profile;
}
```

**Regex 模式**：
- 支援全形/半形斜線（`[／\/]`）
- 非貪婪匹配（`(.+?)`）
- 正確的邊界檢測（`(?=\n|$)`）
- 處理 emoji 標題（`\*\*🎤 聲音現況[^)]*\)\*\*`）

### **2. TypeScript 類型定義**

```typescript
interface ParsedStudentProfile {
  basicInfo: {
    ageGenderOccupation?: string;
    decisionMaker?: { text: string; timestamp?: string };
    paymentCapacity?: { text: string; timestamp?: string };
  };
  voiceStatus?: { text: string; timestamp?: string };
  pastAttempts?: Array<{ text: string; timestamp?: string }>;
  currentPainPoints?: Array<{ text: string; timestamp?: string }>;
  dreamVision?: { text: string; timestamp?: string };
  motivation?: { text: string; timestamp?: string };
  useCase?: { text: string; timestamp?: string };
  needsToAsk?: string[];
}
```

**設計原則**：
- 所有欄位可選（`?`）- 優雅降級
- 時間戳可選 - 支援無時間戳資料
- 陣列型別 - 支援多項痛點/嘗試

### **3. State 管理**

```typescript
const [showRaw, setShowRaw] = useState(false);
const [showTranscript, setShowTranscript] = useState(false);
const [showProbabilityDetail, setShowProbabilityDetail] = useState(false);
const [highlightedTimestamp, setHighlightedTimestamp] = useState<string | null>(null);
const [copiedPlan, setCopiedPlan] = useState(false);
const [copiedTranscript, setCopiedTranscript] = useState(false);
const [copiedProfile, setCopiedProfile] = useState(false);
```

**用途**：
- `showRaw`: 原始 Markdown 展開狀態
- `showTranscript`: 逐字稿展開狀態
- `showProbabilityDetail`: 成交機率詳情展開狀態
- `highlightedTimestamp`: 當前高亮的時間戳
- `copied*`: 複製按鈕反饋狀態

---

## 📊 GPT 報告結構對應

### **GPT Markdown 結構**

```markdown
# 🧑‍🏫 學員狀況掌握（快速掌握對象）
- **📇 基本資料（身份速寫）**
  - 年齡／性別／職業／角色：...
  - 是否自己決定是否購課：...
  - 價格敏感度／付費能力：...
- **🎤 聲音現況（目前聲音狀態）**
  ...
- **📚 過去嘗試過的方法或課程**
  曾...
  曾...
- **⛔️ 現在最卡的地方**
  ...
- **🏁 想成為什麼樣的自己（目標畫面）**
  ...
- **🎯 為什麼現在特別想學？（當下動機）**
  ...
- **🎬 想把聲音用在哪裡？（應用場景）**
  ...
- **📝 仍需補問**
  - ...

# 🧮 成交策略評估（指標制）
- 呼應痛點程度：4/5（證據：...）
- 推課引導力度：5/5（證據：...）
- ...
- **總評**：...

# 🚀 下一步成交策略建議（攻擊方向）
- ...
- ...

# 💬 完整成交話術總結（可照念）
1. **版本 A — ...**
   > ...

# 📈 預估成交機率：85%
- **評估依據：**
  - ...
```

### **解析流程**

1. **extractSections()**：分割各大章節
2. **parseStudentProfile()**：解析學員檔案
3. **parseMetrics()**：解析關鍵指標
4. **parseMissions()**：解析行動優先序
5. **parseScripts()**：解析成交話術
6. **parseProbability()**：解析成交機率

---

## 🎨 視覺設計系統

### **色彩方案**

| 區域 | 主色 | 邊框 | 背景漸層 | 用途 |
|------|------|------|---------|------|
| 教學評分 | green-600 | green-200 | green-50 → white | 成功感 |
| 成交機率 | orange-600 | orange-200 | orange-50 → white | 熱度感 |
| 課程狀態 | blue-600 | blue-200 | blue-50 → white | 穩定感 |
| 購課資訊 | purple-600 | purple-200 | purple-50 → white | 高級感 |
| 基本資料 | blue-600 | blue-200 | blue-50 → white | 信任感 |
| 痛點問題 | red-600 | red-200 | red-50 → white | 警示感 |
| 夢想動機 | purple-600 | purple-200 | purple-50 → white | 憧憬感 |
| 待補問 | yellow-700 | yellow-300 | yellow-50 | 提醒感 |

### **字體階層**

| 用途 | 大小 | 粗細 | 顏色 |
|------|------|------|------|
| 大數字（分數/機率） | text-5xl | font-bold | 主色 |
| 卡片標題 | text-lg | font-semibold | foreground |
| 內容文字 | text-sm | font-semibold | foreground |
| 標籤文字 | text-sm | font-medium | 色彩系統 |
| 說明文字 | text-xs | font-normal | muted-foreground |

### **間距系統**

- 區塊間距：`space-y-6`（24px）
- 卡片內距：`p-5`（20px）
- 元素間距：`gap-4`（16px）
- 小元素間距：`gap-2`（8px）

---

## ✅ 完成清單

- [x] 頁面標題改為「🎯 推課分析詳情」
- [x] 戰績報告整合（4 卡片 + 可展開成交機率詳情）
- [x] 學員檔案卡完整解析（3 大區塊 + 待補問）
- [x] 關鍵指標橫式排版（5 欄 + 響應式）
- [x] 行動優先序橫式排版（3 欄）
- [x] 三階段成交話術修正（Tabs + 無破圖）
- [x] 所有時間戳可點擊跳轉
- [x] 逐字稿自動高亮 + 滾動定位
- [x] 流式排版（從上到下）
- [x] 內容凸顯（Bold + 色彩系統）
- [x] TypeScript 類型檢查通過
- [x] 程式碼優化（移除未使用變數）

---

## 🧪 測試計畫

### **MVP 測試記錄**

**測試對象**：
- 學員姓名：蔡宇翔
- 授課教師：Karen
- 課程日期：2025-10-03
- 記錄 ID：`3734db4e-66b3-4494-8f2c-741791220f48`

**測試 URL**：
```
http://localhost:5000/teaching-quality/3734db4e-66b3-4494-8f2c-741791220f48
```

### **測試檢查清單**

#### **戰績報告區域**
- [ ] 4 張卡片正確顯示（教學評分、成交機率、課程狀態、購課資訊）
- [ ] 教學評分顯示 10 分、星星評級、等級
- [ ] 成交機率顯示 85%、火焰熱度、潛力評級
- [ ] 點擊成交機率卡片可展開/收合詳細分析
- [ ] 展開後顯示完整評估依據（Markdown 格式）
- [ ] ChevronUp/Down 圖示正確切換

#### **關鍵指標解析**
- [ ] 5 個指標橫式排列（大螢幕）
- [ ] 響應式：中螢幕 3 欄、小螢幕 1 欄
- [ ] 每個指標顯示：名稱、分數、進度條、證據
- [ ] 總評顯示在指標下方

#### **學員檔案卡**
- [ ] 基本資料（藍色卡片）正確顯示
  - [ ] 年齡/性別/職業（待補問顯示黃色）
  - [ ] 決策權 + 時間戳
  - [ ] 付費能力 + 時間戳
- [ ] 痛點與問題（紅色卡片）正確顯示
  - [ ] 聲音現況 + 時間戳
  - [ ] 現在最卡（列表）+ 時間戳
  - [ ] 過去嘗試（列表）+ 時間戳
- [ ] 夢想與動機（紫色卡片）正確顯示
  - [ ] 目標畫面（引用格式）+ 時間戳
  - [ ] 當下動機 + 時間戳
  - [ ] 應用場景 + 時間戳
- [ ] 待補問（黃色警告卡）正確顯示
- [ ] 複製檔案按鈕功能正常
- [ ] 複製後顯示「已複製」反饋

#### **時間戳跳轉功能**
- [ ] 所有時間戳顯示為藍色可點擊按鈕
- [ ] 時間戳格式：📍00:12:09
- [ ] Hover 效果正常（顏色變深）
- [ ] 點擊後自動展開逐字稿
- [ ] 滾動到逐字稿區域（smooth scroll）
- [ ] 對應行高亮顯示（黃色背景）
- [ ] 3 秒後高亮自動消失

#### **行動優先序**
- [ ] 3 欄橫式排列（響應式）
- [ ] 每個任務卡片顯示編號 + 內容
- [ ] 視覺效果：圓形編號 + 漸層背景

#### **三階段成交話術**
- [ ] 3 個 Tab 等寬排列
- [ ] 活動 Tab 高亮顯示
- [ ] 切換 Tab 內容正確更新
- [ ] 無破圖問題（內容完整顯示）
- [ ] Markdown 渲染正常

#### **其他功能**
- [ ] 原始 Markdown 報告展開/收合
- [ ] 複製按鈕功能正常（所有 3 處）
- [ ] 逐字稿展開/收合
- [ ] 返回列表按鈕正常
- [ ] 響應式設計在各尺寸螢幕正常

---

## 📝 相關文件

| 文件名稱 | 說明 | 狀態 |
|---------|------|------|
| `SALES_ANALYSIS_REDESIGN_COMPLETE.md` | 本文檔 - 完整重構說明 | ✅ 完成 |
| `teaching-quality-detail.tsx` | 主要程式碼檔案 | ✅ 完成 |
| `PROJECT_PROGRESS.md` | 專案進度追蹤 | 🔄 待更新 |
| `SESSION_SUMMARY_2025-10-15.md` | 本次會話總結 | 🔄 待建立 |

---

## 🚀 下一步行動

### **立即執行**
1. ✅ 完成程式碼編寫
2. ✅ TypeScript 檢查通過
3. ⏳ 啟動開發伺服器
4. ⏳ 瀏覽器訪問測試 URL
5. ⏳ 執行完整測試檢查清單

### **測試通過後**
1. 更新 `PROJECT_PROGRESS.md`
2. 建立 `SESSION_SUMMARY_2025-10-15.md`
3. Git commit 提交變更
4. 推廣到其他學員記錄

### **進階功能（未來）**
1. 時間戳跳轉後高亮具體對話者
2. 雷達圖視覺化能力指標
3. 與上次分析對比功能
4. 任務標記完成功能（PDCA 循環）
5. 匯出 PDF 功能

---

## 💡 設計亮點總結

### **1. 使用者體驗優化**
- **流式閱讀**：從上到下，無認知負擔
- **資訊層次清晰**：戰績 → 指標 → 檔案 → 行動 → 話術
- **互動反饋及時**：展開、複製、跳轉都有明確反饋
- **色彩語義化**：綠=成功、橙=熱度、紅=警示、紫=目標、黃=提醒

### **2. 資訊架構優化**
- **戰績報告整合**：4 卡片 + 可展開詳情，無重複資訊
- **學員檔案結構化**：基本資料 → 痛點 → 夢想，邏輯清晰
- **時間戳全域化**：所有資訊都可追溯至逐字稿
- **橫式排版**：充分利用螢幕寬度

### **3. 技術實作優化**
- **Regex 精準解析**：支援多種格式變體
- **TypeScript 類型安全**：完整類型定義，易於維護
- **響應式設計**：所有區塊都有 breakpoint 適配
- **效能優化**：useMemo 快取解析結果

### **4. 視覺設計優化**
- **漸層背景**：增加視覺層次
- **陰影系統**：提升立體感
- **字體階層**：清晰的視覺引導
- **動畫過渡**：平滑的狀態變化

---

**文檔版本**: v1.0
**建立時間**: 2025-10-15
**MVP 狀態**: ✅ 代碼完成，待瀏覽器測試

# 數據總報表功能文件

## 概述

「數據總報表」是一個全方位的數據分析與視覺化頁面，整合教師與學生視角，提供 KPI 總覽、趨勢圖表、以及 AI 智能建議。此功能設計為未來與 Google Sheets 串接，並支援 AI 音檔分析擴展。

## 功能目的

1. **整體概況**：快速了解轉換率、完成率、待跟進學生等關鍵指標
2. **教師視角**：分析每位教師的授課績效、轉換率、學生滿意度
3. **學生視角**：追蹤每位學生的跟進狀態、意向分數、推薦下一步行動
4. **趨勢分析**：透過漏斗圖、折線圖、柱狀圖視覺化數據變化
5. **AI 建議**：提供每日/每週/每月的智能建議與策略方向
6. **資料匯出**：支援 CSV 與 JSON 格式匯出，方便後續分析

## 檔案結構

```
client/src/
├── pages/
│   └── dashboard-total-report.tsx          # 主頁面，整合所有元件
├── components/
│   └── total-report/
│       ├── control-panel.tsx               # 控制面板（期間/日期/搜尋/排序/匯出）
│       ├── kpi-overview.tsx                # KPI 總覽卡片
│       ├── trend-charts.tsx                # 趨勢圖表（recharts）
│       ├── teacher-insights.tsx            # 教師績效分析
│       ├── student-insights.tsx            # 學生跟進狀態
│       ├── ai-suggestions.tsx              # AI 建議區塊
│       └── raw-data-table.tsx              # 原始資料表格（可收合）
├── lib/
│   ├── mock-total-report-data.ts           # 模擬資料產生器
│   └── total-report-utils.ts               # 工具函式（搜尋/排序/匯出）
├── types/
│   └── total-report.ts                     # TypeScript 型別定義
└── hooks/                                  # 可複用的 React Hooks（若需要）
```

## 元件配置

### 1. 控制面板 (ControlPanel)

**功能**：
- 日報/週報/月報切換（ToggleGroup）
- 日期選擇器（Calendar + Popover）
- 全域搜尋框（支援教師、學生、備註搜尋）
- 多欄位堆疊排序（可新增多個排序條件，顯示優先順序）
- 匯出按鈕（CSV / JSON）
- 重新整理按鈕（重新產生模擬資料）

**使用元件**：
- `ToggleGroup`, `Calendar`, `Popover`, `Input`, `Select`, `Badge`, `Button`

### 2. KPI 總覽 (KPIOverview)

**顯示指標**：
1. 轉換率（體驗課 → 付費課程）
2. 平均轉換時間（天數）
3. 體驗課完成率（預約 → 實際上課）
4. 待跟進學生數
5. 潛在升級收入（預估）
6. 總體驗課數

**特色**：
- 使用 6 張卡片呈現
- 每張卡片包含圖示、數值、副標題、趨勢提示
- 根據數值高低顯示不同顏色（綠色=優秀、灰色=一般）

### 3. 趨勢圖表 (TrendCharts)

**圖表類型**：
1. **漏斗圖（Funnel Chart）**：體驗課 → 購買意願→ 成功成交
2. **課程類別分布（Bar Chart）**：各課程類型的學生人數
3. **趨勢分析（Area Chart）**：體驗課數、轉換數、收入的時間序列
4. **聯繫率趨勢（Line Chart）**：體驗課後的學生聯繫成功率

**技術**：
- 使用 `recharts` 函式庫
- 支援響應式設計（ResponsiveContainer）
- 根據期間（日/週/月）調整 X 軸格式

### 4. 教師視角 (TeacherInsights)

**內容**：
1. **優秀教師榜**：Top 3 教師卡片，顯示轉換率、授課數、滿意度、總收入
2. **教師績效表格**：可排序表格，顯示所有教師的詳細數據與 AI 建議

**排序欄位**：
- 授課數
- 轉換率
- 平均滿意度（1-5 星）
- 總收入

**特色**：
- 點擊表格標題進行排序
- 轉換率以 Badge 顯示（不同顏色區分優劣）
- 滿意度以星星圖示呈現

### 5. 學生視角 (StudentInsights)

**內容**：
- 學生列表表格，包含：
  - 學生資訊（姓名、Email、最後聯繫日期）
  - 教師
  - 上課日期
  - 跟進狀態（待聯繫/已聯繫/已成交/已流失）
  - 意向分數（0-100，附進度條）
  - 成交金額
  - 推薦下一步行動
  - AI 備註（音檔分析 placeholder）

**篩選功能**：
- 按狀態篩選（全部/待聯繫/已聯繫/已成交/已流失）
- 顯示各狀態的學生數量

**排序功能**：
- 上課日期
- 意向分數
- 成交金額
- 狀態

### 6. AI 建議區 (AISuggestions)

**內容**：
1. **AI 智能建議**：根據當前期間（日/週/月）顯示對應建議
2. **高階策略方向**：長期發展建議
3. **音檔智能分析**：未來功能預留區塊（標示「開發中」）

**建議類型**：
- 每日建議：具體行動項目（如：優先聯繫高意向學生）
- 每週建議：中期策略（如：優化跟進流程、擴充師資）
- 每月建議：長期目標（如：設定轉換率目標、開設新課程）

**音檔分析擴展**：
- 預留 `audioInsights` 欄位
- 顯示範例分析內容
- 註明未來將自動分析上課錄音，提取關鍵資訊

### 7. 原始資料表格 (RawDataTable)

**功能**：
- 預設收合，點擊「展開」查看
- 顯示符合搜尋/排序條件的原始資料
- 包含：ID、學生姓名、Email、上課日期、教師、狀態、意向分數、最後更新時間

**技術**：
- 使用 `Collapsible` 元件
- 最大高度 500px，超出可滾動
- 與主頁面的搜尋/排序狀態同步

## 資料結構

### 主資料型別 (TotalReportData)

```typescript
interface TotalReportData {
  period: 'daily' | 'weekly' | 'monthly';
  dateRange: { start: string; end: string };
  summaryMetrics: SummaryMetrics;
  trendData: TrendDataPoint[];
  funnelData: FunnelDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
  teacherInsights: TeacherInsight[];
  studentInsights: StudentInsight[];
  aiSuggestions: AISuggestions;
  rawData: RawDataRow[];
}
```

### 教師資料 (TeacherInsight)

```typescript
interface TeacherInsight {
  teacherId: string;              // T001, T002, ...
  teacherName: string;            // 王老師, 李老師, ...
  classCount: number;             // 授課數
  conversionRate: number;         // 轉換率 (0-100)
  avgSatisfaction: number;        // 平均滿意度 (1-5)
  totalRevenue: number;           // 總收入 (NT$)
  aiSummary: string;              // AI 建議文字
  studentCount: number;           // 學生數
}
```

### 學生資料 (StudentInsight)

```typescript
interface StudentInsight {
  studentId: string;
  studentName: string;
  email: string;
  classDate: string;              // ISO date string
  teacherName: string;
  status: 'pending' | 'contacted' | 'converted' | 'lost';
  intentScore: number;            // 意向分數 (0-100)
  recommendedAction: string;      // 推薦下一步
  lastContactDate?: string;
  audioTranscriptUrl?: string;    // 音檔連結（未來功能）
  aiNotes?: string;               // AI 分析備註（未來功能）
  dealAmount?: number;            // 成交金額
}
```

完整型別定義請參考：`client/src/types/total-report.ts`

## 模擬資料產生器

檔案：`client/src/lib/mock-total-report-data.ts`

### 主函式

```typescript
generateTotalReportData(period: PeriodType, baseDate?: Date): TotalReportData
```

**功能**：
- 根據期間（日/週/月）產生對應的模擬資料
- 日報：10 位學生、24 小時趨勢數據
- 週報：20 位學生、7 天趨勢數據
- 月報：50 位學生、30 天趨勢數據

**資料生成邏輯**：
1. 教師名單：6 位（王、李、張、陳、林、黃老師）
2. 課程類型：數學、英文、物理、化學、生物、程式設計
3. 學生姓名：隨機組合姓氏與名字
4. Email：根據姓名生成 `userXXX@domain.com`
5. 轉換率：30%-65% 之間隨機
6. 意向分數：30-95 之間隨機
7. AI 建議：預設模板文字

### 欄位對應 Google Sheets

模擬資料欄位設計為未來可直接對應 Google Sheets：

| 模擬資料欄位         | Google Sheets 欄位（未來） |
|---------------------|---------------------------|
| `studentName`       | 學生姓名 / name            |
| `email`             | email                     |
| `classDate`         | 上課日期 / classDate       |
| `teacherName`       | 教師 / teacher             |
| `status`            | 狀態 / status              |
| `dealAmount`        | 成交金額 / dealAmount      |
| `audioTranscriptUrl`| 音檔連結 / transcriptUrl   |

## 工具函式

檔案：`client/src/lib/total-report-utils.ts`

### 搜尋功能

```typescript
searchReportData(data: TotalReportData, searchTerm: string)
```

- 同時搜尋教師與學生資料
- 不區分大小寫
- 搜尋欄位：姓名、Email、教師、AI 建議、推薦行動、狀態

### 排序功能

```typescript
sortWithPriority<T>(data: T[], sortConfigs: MultiSortConfig[]): T[]
```

- 支援多欄位堆疊排序
- 按 `priority` 優先順序依次排序
- 支援升序（asc）與降序（desc）

### 匯出功能

```typescript
exportToCSV(data: any[], filename: string): void
exportToJSON(data: any[], filename: string): void
```

**CSV 匯出**：
- 自動加入 BOM 以支援 Excel 中文顯示
- 欄位值包含逗號時自動加引號
- 檔名格式：`教師數據_daily_20251001-143022.csv`

**JSON 匯出**：
- 格式化輸出（縮排 2 空格）
- 包含完整資料結構與時間戳記

## 未來整合方向

### 1. Google Sheets 串接

**步驟**：
1. 使用者在「Google Sheets 管理」頁面啟用相關工作表
2. 後端 API 提供 `/api/reports/total-data` 端點
3. 前端替換 `generateTotalReportData()` 為 API 呼叫
4. 資料結構保持一致，無需修改元件

**對應工作表**：
- 體驗課上課記錄 → `studentInsights` (classDate, teacherName, studentName, email)
- 體驗課購買記錄 → `studentInsights` (status = 'converted')
- 諮詢與成交記錄 → `studentInsights` (dealAmount)
- 教師績效表 → `teacherInsights` (手動維護或由 API 計算)

### 2. AI 音檔分析

**功能擴展**：
1. 上傳上課錄音檔（支援 MP3, WAV, M4A）
2. 後端使用語音辨識 API（如 OpenAI Whisper）轉錄文字
3. 使用 LLM（如 GPT-4）分析對話內容：
   - 識別學生興趣點與疑慮
   - 評估教師授課品質
   - 提取關鍵對話片段
   - 生成個性化跟進建議
4. 將分析結果寫入 `studentInsights.aiNotes` 與 `aiSuggestions.audioInsights`

**前端調整**：
- 在 `StudentInsights` 中顯示音檔連結按鈕（已預留）
- 在 `AISuggestions` 中展示音檔分析結果（已預留）
- 新增音檔上傳介面（未來開發）

### 3. 即時更新

**WebSocket 整合**：
- 當 Google Sheets 資料更新時，後端推送通知
- 前端自動重新載入資料
- 顯示「資料已更新」提示

### 4. 更多圖表類型

**可擴展圖表**：
- 熱力圖（Heatmap）：顯示最佳上課時段
- 地理分布圖：學生來源地區分析（若有地址資料）
- 詞雲圖（Word Cloud）：從 AI 分析中提取關鍵字

## 使用方式

### 基本操作

1. **切換報表期間**：點擊「日報/週報/月報」按鈕
2. **選擇日期**：點擊日期選擇器，選擇基準日期
3. **搜尋**：在搜尋框輸入關鍵字（教師、學生、備註）
4. **排序**：
   - 在控制面板選擇欄位與方向，點擊「新增排序」
   - 可新增多個排序條件（數字 Badge 顯示順序）
   - 點擊 Badge 的 × 移除該排序
5. **篩選學生狀態**：在學生視角區塊點擊狀態按鈕
6. **查看原始資料**：點擊「原始資料表格」的展開按鈕
7. **匯出資料**：點擊「匯出 CSV」或「匯出 JSON」
8. **重新整理**：點擊「重新整理」按鈕重新產生模擬資料

### 進階功能

**多欄位排序範例**：
1. 先按「轉換率」降序排序
2. 再按「授課數」降序排序
3. 結果：轉換率高者優先，轉換率相同時比較授課數

**搜尋範例**：
- 搜尋「王」：找到王老師、姓王的學生
- 搜尋「高意向」：找到 AI 建議中提及「高意向」的資料
- 搜尋「gmail.com」：找到使用 Gmail 的學生

## 技術規格

### 前端技術棧

- **框架**：React 18 + TypeScript
- **UI 元件庫**：Shadcn/ui（基於 Radix UI）
- **樣式**：Tailwind CSS
- **圖表**：recharts 2.x
- **日期處理**：date-fns
- **狀態管理**：React useState/useMemo
- **資料擷取**：@tanstack/react-query（未來 API 整合）

### 程式碼風格

- **元件**：函式式元件 + Hooks
- **型別**：完整的 TypeScript 型別定義
- **命名**：
  - 元件：PascalCase (e.g., `KPIOverview`)
  - 函式：camelCase (e.g., `generateTotalReportData`)
  - 型別：PascalCase with Interface prefix (e.g., `TeacherInsight`)
- **檔案組織**：功能模組化，單一職責原則

### 效能優化

- 使用 `useMemo` 快取搜尋與排序結果
- 圖表使用 `ResponsiveContainer` 自適應尺寸
- 原始資料表格預設收合，減少初始渲染負擔
- 虛擬滾動（未來可加入，若資料量超過 1000 筆）

## 測試建議

### 單元測試

1. **模擬資料產生器**：
   - 測試不同期間產生的資料數量是否正確
   - 驗證資料結構符合型別定義
   - 檢查日期範圍計算正確性

2. **工具函式**：
   - 測試搜尋功能（大小寫不敏感、多欄位）
   - 測試排序功能（升序/降序、多欄位優先）
   - 測試匯出功能（CSV 格式、JSON 格式）

### 整合測試

1. **元件互動**：
   - 切換期間後，資料是否正確更新
   - 搜尋框輸入後，表格與圖表是否同步篩選
   - 新增排序後，表格順序是否正確變更

2. **使用者流程**：
   - 從選擇期間 → 搜尋 → 排序 → 匯出的完整流程
   - 切換學生狀態篩選，確認數量統計正確
   - 展開/收合原始資料表格，確認資料一致性

### E2E 測試

1. 載入頁面，驗證所有區塊正常顯示
2. 切換三個頂層分頁（Google Sheets 管理 / 戰力報表 / 數據總報表）
3. 在數據總報表中執行完整操作流程
4. 匯出 CSV 與 JSON，檢查檔案內容正確

## 維護指南

### 新增 KPI 指標

1. 在 `client/src/types/total-report.ts` 的 `SummaryMetrics` 新增欄位
2. 在 `client/src/lib/mock-total-report-data.ts` 的 `generateSummaryMetrics` 更新計算邏輯
3. 在 `client/src/components/total-report/kpi-overview.tsx` 新增對應的 `KPICard`

### 新增圖表

1. 在 `TotalReportData` 新增資料欄位
2. 在 `mock-total-report-data.ts` 新增資料產生函式
3. 在 `trend-charts.tsx` 使用 recharts 新增圖表元件
4. 更新文件說明圖表用途

### 新增教師/學生欄位

1. 更新 `TeacherInsight` 或 `StudentInsight` 型別
2. 更新模擬資料產生器
3. 在對應的 `teacher-insights.tsx` 或 `student-insights.tsx` 新增表格欄位
4. 更新匯出函式中的欄位對應

## 常見問題

### Q1: 為什麼使用模擬資料？

**A**: 目前版本先實作前端介面與邏輯，使用模擬資料驗證功能。未來整合 Google Sheets API 後，只需替換資料來源，元件邏輯無需大幅修改。

### Q2: 如何切換到真實資料？

**A**: 系統已整合真實資料 API，會自動切換模式：

**設定步驟**：
1. 設定環境變數：
   - `GOOGLE_SHEETS_CREDENTIALS` - Google API 憑證
   - `TRIAL_CLASS_ATTENDANCE_SHEET_ID` - 體驗課上課記錄表 ID
   - `TRIAL_CLASS_PURCHASE_SHEET_ID` - 體驗課購買記錄表 ID
   - `EODS_FOR_CLOSERS_SHEET_ID` - 升高階學員名單 ID
2. 在後台同步 Google Sheets 資料
3. 重新載入總報表頁面，系統自動使用即時資料

**技術細節**：
- API 端點：`GET /api/reports/total-report?period=daily&baseDate=2025-10-01`
- 前端使用 `@tanstack/react-query` 搭配明確的 `queryFn`
- 若 API 失敗，自動 fallback 到模擬資料
- 使用欄位映射 (`field-mapping.ts`) 處理多種欄位命名

**新增功能 (v2.0)**：
- 欄位盤點 API：`POST /api/tools/introspect-sheets`
- 取得盤點結果：`GET /api/tools/introspect-sheets/latest`
- 標準化欄位映射系統

### Q3: 音檔分析功能何時開發？

**A**: 音檔分析為未來擴展功能，目前已預留以下空間：
- `StudentInsight.audioTranscriptUrl` 與 `StudentInsight.aiNotes`
- `AISuggestions.audioInsights`
- `AISuggestions` 元件中的「音檔智能分析」區塊

開發時機視需求與資源而定。

### Q4: 如何調整 KPI 門檻值？

**A**: 在 `kpi-overview.tsx` 中修改判斷邏輯：

```typescript
// 範例：轉換率門檻從 50% 改為 60%
trend={metrics.conversionRate >= 60 ? 'up' : 'neutral'}
```

### Q5: 如何新增更多教師或課程類型？

**A**: 在 `mock-total-report-data.ts` 修改常數：

```typescript
const TEACHERS = ['王老師', '李老師', '新老師'];
const COURSE_TYPES = ['數學', '英文', '新課程'];
```

---

## 欄位對應管理

### 功能概述

「欄位對應管理」工具讓營運人員可以在前端直接調整 **Google Sheet 欄位 → Supabase 欄位** 的對應關係，無需修改程式碼。此功能支援：

1. **多個欄位別名**：一個 Supabase 欄位可對應多個 Google Sheet 欄位名稱
2. **型別轉換設定**：支援日期、數字、布林值的自動轉換
3. **必填欄位標記**：設定哪些欄位為必填，缺失時會跳過該筆資料
4. **即時生效**：修改後下次同步時立即套用新設定
5. **重置功能**：可隨時重置為系統預設值

### 操作流程

#### 1. 開啟欄位對應管理

在「數據總報表」頁面，點擊控制面板右側的「欄位對應管理」按鈕：

```
[控制面板]  [🔧 欄位對應管理]
```

#### 2. 選擇工作表類型

介面提供三個 Tab，分別對應三種工作表：

- **上課記錄** (`trial_attendance`) → 對應到 `trial_class_attendance` 表
- **購買記錄** (`trial_purchase`) → 對應到 `trial_class_purchase` 表
- **EODs 記錄** (`eods`) → 對應到 `eods_for_closers` 表

#### 3. 調整欄位對應

每個欄位顯示以下資訊與操作：

**欄位名稱與必填標記**：
- 左側顯示 Supabase 欄位名稱（如 `student_name`）
- 若標記為必填，會顯示紅色「必填」徽章

**型別轉換**：
- 下拉選單可選擇：無 / 日期 / 數字 / 布林值
- 選擇後，同步時會自動轉換該欄位的資料型別

**欄位別名**：
- 列出目前所有別名（如：`姓名`、`學生姓名`、`name`）
- 點擊 `X` 可刪除別名
- 在輸入框輸入新別名，按 Enter 或點擊 `+` 加入

**範例**：
```
student_name                    [必填]
├─ 型別轉換: 無
└─ 別名: 姓名 ✕  學生姓名 ✕  name ✕  學員姓名 ✕
   [輸入新別名...]  [+]
```

#### 4. 查看可用欄位提示

對話框下方會顯示「最近盤點到的欄位」（來自欄位盤點功能），方便參考 Google Sheet 實際有哪些欄位。

#### 5. 儲存或重置

- **儲存設定**：點擊「儲存設定」按鈕，修改立即生效
- **重置為預設**：點擊「重置為預設」可恢復系統預設值（需確認）

### 技術細節

#### 資料結構

欄位對應儲存在 `storage` 中，結構如下：

```typescript
interface SheetFieldMapping {
  sheetType: 'trial_attendance' | 'trial_purchase' | 'eods';
  sheetNamePatterns: string[];        // 用於識別 Sheet 名稱
  targetTable: string;                // 目標 Supabase 表名
  fields: Array<{
    supabaseColumn: string;           // Supabase 欄位名
    aliases: string[];                // Google Sheet 可能的別名
    required?: boolean;               // 是否必填
    transform?: 'date' | 'number' | 'boolean' | null;  // 型別轉換
  }>;
  keyStrategy: 'spreadsheet_row' | 'email_date';  // Unique Key 策略
}
```

#### API 端點

後端提供以下 API：

- `GET /api/sheet-mappings` - 取得所有 mapping
- `GET /api/sheet-mappings/:sheetType` - 取得特定類型的 mapping
- `POST /api/sheet-mappings/:sheetType` - 更新 mapping
- `DELETE /api/sheet-mappings/:sheetType` - 重置為預設值

#### 同步流程整合

同步時，`sheet-to-supabase-mapping.ts` 會：

1. 呼叫 `sheetMappingService.identifySheetType()` 識別 Sheet 類型
2. 使用 `sheetMappingService.transformToSupabaseRecord()` 轉換資料
3. 根據 mapping 的 `keyStrategy` 產生 unique key
4. 若欄位無法對應或必填欄位缺失，該筆記錄會被標記為 invalid 並記錄 warnings

### 常見問題

#### Q1: 欄位對應修改後何時生效？

**A**: 修改後立即生效，下次執行同步時會使用新的對應設定。

#### Q2: 如何知道 Google Sheet 有哪些欄位？

**A**: 使用「欄位盤點」功能（位於控制面板），系統會掃描所有 Sheet 並列出欄位。盤點結果會顯示在欄位對應對話框下方。

#### Q3: 如果必填欄位找不到會怎樣？

**A**: 該筆資料會被跳過，並在 `invalidRecords` 中記錄警告訊息。報表的 `warnings` 欄位會顯示「哪幾筆欄位缺失被忽略」。

#### Q4: 可以新增自定義的欄位嗎？

**A**: 目前系統只支援調整既有欄位的別名與轉換設定，無法新增全新的欄位。若需新增欄位，請修改 `configs/sheet-mapping-defaults.ts` 中的預設設定。

#### Q5: Unique Key 策略有什麼差異？

**A**:
- `spreadsheet_row`：使用 `spreadsheetId + rowIndex` 作為唯一鍵（適合固定來源的 Sheet）
- `email_date`：使用 `email + 日期` 作為唯一鍵（適合合併來自不同來源的資料）

目前策略在預設設定中已定義好，暫不支援在前端修改。

### 檔案位置

```
configs/
└── sheet-mapping-defaults.ts        # 預設 mapping 配置

server/
├── storage.ts                        # 新增 mapping CRUD 方法
└── services/
    └── reporting/
        ├── sheetMappingService.ts    # 欄位對應業務邏輯
        └── sheet-to-supabase-mapping.ts  # 重構為使用動態 mapping

server/routes.ts                      # 新增 /api/sheet-mappings 路由

client/src/
├── components/
│   └── total-report/
│       └── field-mapping-dialog.tsx  # 欄位對應管理 UI
└── pages/
    └── dashboard-total-report.tsx    # 整合欄位對應管理按鈕
```

## 授權與貢獻

此功能為專案內部開發，遵循專案既有授權規範。如需修改或擴展，請參考本文件與程式碼註解。

---

**文件版本**: 1.0.0
**最後更新**: 2025-10-01
**維護者**: Development Team

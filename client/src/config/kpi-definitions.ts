/**
 * KPI Definitions for Trial Report
 * 體驗課報表 KPI 定義
 */

export interface KPIDefinition {
  id: string;
  title: string;
  shortDesc: string;  // Hover 顯示的簡短描述
  fullDesc: string;   // 點擊編輯後顯示的完整定義
  formula: string;    // 計算公式
  unit: string;       // 單位
}

export const KPI_DEFINITIONS: Record<string, KPIDefinition> = {
  conversionRate: {
    id: 'conversionRate',
    title: '轉換率',
    shortDesc: '已轉高學生數 ÷ 已上完課學生數',
    fullDesc: `
**定義**：在完成體驗課的學生中，成功轉為高階課程學員的比例

**計算公式**：
- 分子：已轉高學生數（從「體驗課購買記錄」表，狀態 = "已轉高"）
- 分母：已上完課學生數（狀態 IN ["已轉高", "未轉高"]）

**業務意義**：衡量體驗課的轉換效果，是評估課程品質和銷售策略的核心指標
    `.trim(),
    formula: '(已轉高學生數 / 已上完課學生數) × 100',
    unit: '%'
  },

  avgConversionTime: {
    id: 'avgConversionTime',
    title: '平均轉換時間',
    shortDesc: '從體驗課到成交的平均天數',
    fullDesc: `
**定義**：學生從上體驗課到完成高階課程購買的平均時間

**計算方式**：
- 對每筆成交記錄，計算「成交日期 - 體驗課日期」
- 取所有有效配對的平均值

**業務意義**：了解銷售週期，優化跟進時機和策略，預測成交時間
    `.trim(),
    formula: '總轉換天數 / 有效配對數',
    unit: '天'
  },

  trialCompletionRate: {
    id: 'trialCompletionRate',
    title: '體驗課完成率',
    shortDesc: '已上完課學生數 ÷ 所有體驗課學員',
    fullDesc: `
**定義**：購買體驗課的學生中，實際完成體驗課程的比例

**計算公式**：
- 分子：已上完課學生數（狀態 IN ["已轉高", "未轉高"]）
- 分母：所有體驗課學員（購買記錄中的唯一學生數）

**業務意義**：反映學員參與度，過低表示可能存在排課或溝通問題
    `.trim(),
    formula: '(已上完課學生數 / 所有體驗課學員) × 100',
    unit: '%'
  },

  pendingStudents: {
    id: 'pendingStudents',
    title: '待跟進學生',
    shortDesc: '體驗中 + 未開始的學生數',
    fullDesc: `
**定義**：需要主動聯繫和跟進的學生總數

**包含狀態**：
- 體驗中：已購買但尚未完成體驗課
- 未開始：已購買但尚未開始體驗課

**業務意義**：行銷和客服的重點工作對象，需要定期跟進確保完課率
    `.trim(),
    formula: 'COUNT(狀態 = "體驗中" OR "未開始")',
    unit: '人'
  },

  potentialRevenue: {
    id: 'potentialRevenue',
    title: '已轉高實收金額',
    shortDesc: '已轉高學員的高階方案總收益',
    fullDesc: `
**定義**：已轉高學生在 EODs 表中「高階一對一」方案的實收金額總和

**計算邏輯**：
1. 篩選「已轉高」學生的 Email
2. 在成交記錄（EODs）中找到對應的高階方案
3. 只計算方案名稱包含「高階一對一」或「高音」的記錄
4. 加總實收金額

**業務意義**：體驗課轉換帶來的實際高階課程收益，衡量轉換質量
    `.trim(),
    formula: 'SUM(已轉高學員的高階方案實收金額)',
    unit: 'NT$'
  },

  totalStudents: {
    id: 'totalStudents',
    title: '總學生數',
    shortDesc: '購買體驗課的唯一學生數',
    fullDesc: `
**定義**：體驗課購買記錄表中的唯一學生數（已按 Email 去重）

**計算方式**：
- 從「體驗課購買記錄」表統計
- 按 Email 去重（同一學生只計算一次）

**業務意義**：體驗課的總觸及人數，衡量市場推廣效果和業務規模
    `.trim(),
    formula: 'COUNT(DISTINCT student_email)',
    unit: '人'
  }
};

/**
 * Get KPI definition by ID
 */
export function getKPIDefinition(id: string): KPIDefinition | undefined {
  return KPI_DEFINITIONS[id];
}

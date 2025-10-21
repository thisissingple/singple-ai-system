/**
 * Type definitions for Total Report feature
 * Designed for future integration with Google Sheets and AI audio analysis
 */

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'all';

export type StudentStatus = 'pending' | 'contacted' | 'converted' | 'lost';

export interface DateRange {
  start: string; // ISO date string
  end: string;   // ISO date string
}

export interface SummaryMetrics {
  conversionRate: number;        // Percentage (0-100)
  avgConversionTime: number;     // Days
  trialCompletionRate: number;   // Percentage (0-100)
  pendingStudents: number;       // Count
  potentialRevenue: number;      // Amount in NT$
  totalTrials: number;           // Total trial classes
  totalConversions: number;      // Total successful conversions
  totalStudents?: number;        // 總學生數 (from purchase records)
}

export interface TrendDataPoint {
  date: string;                  // ISO date string or period label
  trials: number;                // Number of trial classes
  conversions: number;           // Number of conversions
  revenue: number;               // Revenue in NT$
  contactRate?: number;          // Percentage
}

export interface TeacherInsight {
  teacherId: string;
  teacherName: string;
  classCount: number;            // 授課數 - Number of classes taught
  studentCount: number;          // 學生數 - Total students
  conversionRate: number;        // 轉換率 - Percentage (0-100)
  totalRevenue: number;          // 實收金額 - Revenue in NT$ (已轉高學生的高階方案總額)
  avgDealAmount: number;         // 平均客單價 - Average deal amount per converted student
  revenuePerClass: number;       // ROI效率 - Revenue per class (totalRevenue / classCount)
  pendingStudents: number;       // 待跟進學生數 - Students in progress or not started
  lostStudents: number;          // 流失學生數 - Students who didn't convert (未轉高)
  lostRate: number;              // 流失率 - Lost rate percentage
  avgConversionDays: number;     // 平均轉換天數 - Average days from trial to conversion
  lastClassDate: string | null;  // 最近一次上課日 - Last class date (ISO string)
  performanceScore: number;      // 績效評分 - Weighted performance score (0-100)
  aiSummary: string;             // AI建議 - AI-generated summary
}

export interface StudentInsight {
  studentId: string;
  studentName: string;
  email: string;
  classDate: string;             // ISO date string - 首次上課日期
  teacherName: string;
  status: StudentStatus;
  intentScore: number;           // Score (0-100)
  recommendedAction: string;     // Next step recommendation
  lastContactDate?: string;      // ISO date string
  audioTranscriptUrl?: string;   // URL to audio transcript (for future AI analysis)
  aiNotes?: string;              // AI-generated notes from audio analysis
  dealAmount?: number;           // Deal amount if converted
  // 新增欄位
  totalTrialClasses?: number;    // 體驗課總堂數
  remainingTrialClasses?: number; // 剩餘體驗課堂數
  attendedClasses?: number;      // 已上課堂數
  lastClassDate?: string;        // 最近一次上課日期 (ISO string)
  currentStatus?: string;        // 目前狀態（從購買記錄取得）
  packageName?: string;          // 方案名稱
  purchaseDate?: string;         // 購買日期 (ISO string)
}

export interface FunnelDataPoint {
  stage: string;                 // Stage name (e.g., "未開始", "體驗中", "已轉高")
  value: number;                 // Count or percentage
  fill: string;                  // Color for visualization
  lostStudents?: number;         // Number of lost students (未轉高) - shown on final stage
}

export interface CategoryBreakdown {
  name: string;                  // Category name
  value: number;                 // Count or amount
  percentage: number;            // Percentage of total
}

export interface AISuggestions {
  daily: string[];               // Daily action items
  weekly: string[];              // Weekly strategic suggestions
  monthly: string[];             // Monthly high-level insights
  audioInsights?: string[];      // Future: insights from audio analysis
}

export interface TotalReportData {
  mode?: 'mock' | 'live';        // Data source mode
  period: PeriodType;
  dateRange: DateRange;
  warnings?: string[];           // Data quality warnings
  summaryMetrics: SummaryMetrics;
  trendData: TrendDataPoint[];
  funnelData: FunnelDataPoint[];
  categoryBreakdown: CategoryBreakdown[];
  teacherInsights: TeacherInsight[];
  studentInsights: StudentInsight[];
  aiSuggestions: AISuggestions;
  rawData: RawDataRow[];         // For expandable raw data table
  dataSourceMeta?: {             // Metadata about data sources
    trialClassAttendance?: { rows: number; lastSync: string | null };
    trialClassPurchase?: { rows: number; lastSync: string | null };
    eodsForClosers?: { rows: number; lastSync: string | null };
  };
  filtersApplied?: {             // Applied filters for this report
    period: PeriodType;
    startDate: string;
    endDate: string;
  };
}

export interface RawDataRow {
  id: string;
  data: Record<string, any>;     // Flexible structure matching Google Sheets
  source: string;                // Source worksheet name
  lastUpdated: string;           // ISO date string
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface MultiSortConfig extends SortConfig {
  priority: number;              // For stacked sorting (1 = highest priority)
}

export interface FilterConfig {
  searchTerm: string;
  statusFilter?: StudentStatus[];
  teacherFilter?: string[];
  dateRangeFilter?: DateRange;
}

export interface ExportFormat {
  type: 'csv' | 'json';
  filename: string;
  data: any[];
}

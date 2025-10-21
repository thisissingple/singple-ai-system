/**
 * Mock data generator for Total Report
 * Generates realistic mock data for daily/weekly/monthly reports
 * Designed to match future Google Sheets integration schema
 */

import { subDays, format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { nanoid } from 'nanoid';
import type {
  TotalReportData,
  PeriodType,
  DateRange,
  SummaryMetrics,
  TrendDataPoint,
  TeacherInsight,
  StudentInsight,
  StudentStatus,
  FunnelDataPoint,
  CategoryBreakdown,
  AISuggestions,
  RawDataRow,
} from '@/types/trial-report';

const TEACHERS = ['王老師', '李老師', '張老師', '陳老師', '林老師', '黃老師'];
const FIRST_NAMES = ['小明', '小華', '小芳', '小美', '小強', '小玲', '小傑', '小雯', '小偉', '小婷', '小龍', '曉東', '曉芬', '志明', '春嬌'];
const LAST_NAMES = ['王', '李', '張', '陳', '林', '黃', '吳', '劉', '蔡', '楊', '許', '鄭', '謝', '郭'];
const COURSE_TYPES = ['數學', '英文', '物理', '化學', '生物', '程式設計'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateName(): string {
  return `${randomChoice(LAST_NAMES)}${randomChoice(FIRST_NAMES)}`;
}

function generateEmail(name: string): string {
  const domain = randomChoice(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']);
  const prefix = name.replace(/[\u4e00-\u9fa5]/g, 'user') + randomInt(100, 999);
  return `${prefix}@${domain}`;
}

/**
 * Get date range based on period type
 */
function getDateRange(period: PeriodType, baseDate: Date = new Date()): DateRange {
  switch (period) {
    case 'daily':
      return {
        start: format(baseDate, 'yyyy-MM-dd'),
        end: format(baseDate, 'yyyy-MM-dd'),
      };
    case 'weekly':
      return {
        start: format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    case 'monthly':
      return {
        start: format(startOfMonth(baseDate), 'yyyy-MM-dd'),
        end: format(endOfMonth(baseDate), 'yyyy-MM-dd'),
      };
  }
}

/**
 * Generate summary metrics
 */
function generateSummaryMetrics(period: PeriodType): SummaryMetrics {
  const baseMultiplier = period === 'daily' ? 1 : period === 'weekly' ? 7 : 30;
  const totalTrials = randomInt(10, 30) * baseMultiplier;
  const totalConversions = Math.floor(totalTrials * randomFloat(0.3, 0.6));

  return {
    conversionRate: randomFloat(30, 65),
    avgConversionTime: randomFloat(3, 14),
    trialCompletionRate: randomFloat(75, 95),
    pendingStudents: randomInt(5, 20),
    potentialRevenue: randomInt(50000, 300000),
    totalTrials,
    totalConversions,
  };
}

/**
 * Generate trend data points
 */
function generateTrendData(period: PeriodType, dateRange: DateRange): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  let points: number;
  switch (period) {
    case 'daily':
      points = 24; // Hourly data for one day
      for (let i = 0; i < points; i++) {
        data.push({
          date: `${i}:00`,
          trials: randomInt(0, 5),
          conversions: randomInt(0, 3),
          revenue: randomInt(0, 50000),
          contactRate: randomFloat(60, 90),
        });
      }
      break;
    case 'weekly':
      points = 7; // Daily data for one week
      for (let i = 0; i < points; i++) {
        const date = addDays(startDate, i);
        data.push({
          date: format(date, 'yyyy-MM-dd'),
          trials: randomInt(5, 20),
          conversions: randomInt(2, 10),
          revenue: randomInt(10000, 100000),
          contactRate: randomFloat(65, 85),
        });
      }
      break;
    case 'monthly':
      points = 30; // Daily data for one month
      for (let i = 0; i < points; i++) {
        const date = addDays(startDate, i);
        data.push({
          date: format(date, 'yyyy-MM-dd'),
          trials: randomInt(3, 15),
          conversions: randomInt(1, 8),
          revenue: randomInt(5000, 80000),
          contactRate: randomFloat(60, 88),
        });
      }
      break;
  }

  return data;
}

/**
 * Generate funnel data
 */
function generateFunnelData(metrics: SummaryMetrics): FunnelDataPoint[] {
  const { totalTrials, totalConversions } = metrics;
  const purchases = Math.floor(totalConversions * 1.2); // Some purchased but not all converted to deals

  return [
    { stage: '體驗課', value: totalTrials, fill: '#3b82f6' },
    { stage: '購買意願', value: purchases, fill: '#8b5cf6' },
    { stage: '成功成交', value: totalConversions, fill: '#10b981' },
  ];
}

/**
 * Generate category breakdown (by course type)
 */
function generateCategoryBreakdown(): CategoryBreakdown[] {
  const total = randomInt(80, 150);
  const breakdown = COURSE_TYPES.map(course => ({
    name: course,
    value: randomInt(5, 30),
    percentage: 0,
  }));

  const sum = breakdown.reduce((acc, item) => acc + item.value, 0);
  breakdown.forEach(item => {
    item.percentage = Math.round((item.value / sum) * 100);
  });

  return breakdown;
}

/**
 * Generate teacher insights
 */
function generateTeacherInsights(count: number = 6): TeacherInsight[] {
  return TEACHERS.slice(0, count).map((teacher, index) => ({
    teacherId: `T${String(index + 1).padStart(3, '0')}`,
    teacherName: teacher,
    classCount: randomInt(10, 50),
    conversionRate: randomFloat(25, 75),
    avgSatisfaction: randomFloat(3.5, 5.0, 1),
    totalRevenue: randomInt(50000, 500000),
    aiSummary: `${teacher}在過去期間表現${randomFloat(0, 1) > 0.5 ? '優異' : '穩定'}，建議${randomChoice(['持續關注高意向學生', '加強課後跟進', '優化教學方法', '增加互動環節'])}。`,
    studentCount: randomInt(8, 40),
  }));
}

/**
 * Generate student insights
 */
function generateStudentInsights(count: number = 15): StudentInsight[] {
  const statuses: StudentStatus[] = ['pending', 'contacted', 'converted', 'lost'];
  const baseDate = new Date();

  return Array.from({ length: count }, (_, i) => {
    const name = generateName();
    const status = randomChoice(statuses);
    const classDate = format(subDays(baseDate, randomInt(1, 30)), 'yyyy-MM-dd');

    const student: StudentInsight = {
      studentId: nanoid(8),
      studentName: name,
      email: generateEmail(name),
      classDate,
      teacherName: randomChoice(TEACHERS),
      status,
      intentScore: randomInt(30, 95),
      recommendedAction: '',
    };

    // Generate recommended action based on status
    switch (status) {
      case 'pending':
        student.recommendedAction = randomChoice([
          '立即致電確認上課意願',
          '發送課程資訊與優惠方案',
          '安排試聽課程',
        ]);
        break;
      case 'contacted':
        student.recommendedAction = randomChoice([
          '追蹤試聽課程反饋',
          '提供客製化學習方案',
          '安排進階諮詢',
        ]);
        student.lastContactDate = format(subDays(new Date(classDate), -randomInt(1, 5)), 'yyyy-MM-dd');
        break;
      case 'converted':
        student.recommendedAction = '維持良好關係，爭取續約或推薦';
        student.dealAmount = randomInt(8000, 50000);
        student.lastContactDate = format(subDays(new Date(classDate), -randomInt(5, 15)), 'yyyy-MM-dd');
        break;
      case 'lost':
        student.recommendedAction = randomChoice([
          '三個月後重新聯繫',
          '分析流失原因',
          '提供特殊優惠挽回',
        ]);
        break;
    }

    // Add placeholder for future audio transcript
    if (status === 'contacted' || status === 'converted') {
      student.audioTranscriptUrl = `https://example.com/transcripts/${student.studentId}.txt`;
      student.aiNotes = `【AI 分析】學生對${randomChoice(COURSE_TYPES)}課程表現出高度興趣，建議重點推薦相關進階課程。`;
    }

    return student;
  });
}

/**
 * Generate AI suggestions
 */
function generateAISuggestions(period: PeriodType): AISuggestions {
  const suggestions: AISuggestions = {
    daily: [],
    weekly: [],
    monthly: [],
  };

  // Daily suggestions
  suggestions.daily = [
    '今日有 3 位高意向學生待跟進，建議優先聯繫',
    '王老師班級轉換率較低，建議進行教學輔導',
    '數學課程詢問度上升，可增加體驗課時段',
  ];

  // Weekly suggestions
  suggestions.weekly = [
    '本週轉換率較上週提升 12%，持續優化跟進流程',
    '英文課程需求增加，建議擴充師資',
    '週末時段體驗課完課率最高，可增加排課',
    '李老師學生滿意度最高，可分享教學經驗',
  ];

  // Monthly suggestions
  suggestions.monthly = [
    '本月整體轉換率 45%，建議設定下月目標 50%',
    '新學期招生高峰將至，提前準備行銷方案',
    '建議開設程式設計課程，市場需求持續成長',
    '優化諮詢流程，縮短平均轉換時間至 7 天內',
  ];

  // Future: Add audio insights placeholder
  suggestions.audioInsights = [
    '【音檔分析】體驗課中提及「價格考量」的學生，轉換率降低 30%，建議優化價值溝通話術',
    '【音檔分析】教師在課程中提問互動次數與學生滿意度呈正相關',
  ];

  return suggestions;
}

/**
 * Generate raw data rows (for expandable table)
 */
function generateRawData(studentInsights: StudentInsight[]): RawDataRow[] {
  return studentInsights.map(student => ({
    id: student.studentId,
    data: {
      studentName: student.studentName,
      email: student.email,
      classDate: student.classDate,
      teacherName: student.teacherName,
      status: student.status,
      intentScore: student.intentScore,
      lastContactDate: student.lastContactDate || '',
      dealAmount: student.dealAmount || 0,
      recommendedAction: student.recommendedAction,
    },
    source: '體驗課上課記錄',
    lastUpdated: new Date().toISOString(),
  }));
}

/**
 * Main function: Generate complete total report data
 */
export function generateTotalReportData(period: PeriodType, baseDate?: Date): TotalReportData {
  const dateRange = getDateRange(period, baseDate);
  const summaryMetrics = generateSummaryMetrics(period);
  const teacherInsights = generateTeacherInsights();
  const studentInsights = generateStudentInsights(period === 'daily' ? 10 : period === 'weekly' ? 20 : 50);

  return {
    mode: 'mock',
    period,
    dateRange,
    summaryMetrics,
    trendData: generateTrendData(period, dateRange),
    funnelData: generateFunnelData(summaryMetrics),
    categoryBreakdown: generateCategoryBreakdown(),
    teacherInsights,
    studentInsights,
    aiSuggestions: generateAISuggestions(period),
    rawData: generateRawData(studentInsights),
    dataSourceMeta: {
      trialClassAttendance: { rows: 0, lastSync: null },
      trialClassPurchase: { rows: 0, lastSync: null },
      eodsForClosers: { rows: 0, lastSync: null },
    },
  };
}

/**
 * Refresh mock data (for refresh button)
 */
export function refreshMockData(currentPeriod: PeriodType): TotalReportData {
  return generateTotalReportData(currentPeriod);
}

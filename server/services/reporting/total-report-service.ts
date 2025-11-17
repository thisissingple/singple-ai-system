/**
 * Total Report Service
 * 負責整合 Google Sheets 資料，產生數據總報表
 */

import { storage } from '../legacy-stub';
import { subDays, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { findField, extractStandardFields } from './field-mapping';
import { resolveField, parseDateField, parseNumberField, FIELD_ALIASES } from './field-mapping-v2';
import { supabaseReportRepository, type SupabaseDataRow } from './supabase-report-repository';
import { directSqlRepository } from './direct-sql-repository';
import { calculateAllKPIs } from '../kpi-calculator';
import { buildPermissionFilter } from '../permission-filter-service';
import { createPool, queryDatabase } from '../pg-client';

export type PeriodType = 'daily' | 'weekly' | 'lastWeek' | 'monthly' | 'day' | 'week' | 'month' | 'custom';

export interface TotalReportData {
  mode: 'mock' | 'live';
  period: PeriodType;
  dateRange: {
    start: string;
    end: string;
  };
  warnings?: string[];
  dataQualityIssues?: {
    missingEmailRecords?: Array<{
      id: string;
      studentName?: string;
      purchaseDate?: string;
      packageName?: string;
    }>;
  };
  summaryMetrics: {
    conversionRate: number;
    avgConversionTime: number;
    trialCompletionRate: number;
    pendingStudents: number;
    potentialRevenue: number;
    totalTrials: number;
    totalConversions: number;
  };
  calculationDetail?: {
    step1_baseVariables?: Record<string, {value: number; source: string}>;
    [key: string]: any;
  };
  trendData: Array<{
    date: string;
    trials: number;
    conversions: number;
    revenue: number;
    contactRate?: number;
  }>;
  funnelData: Array<{
    stage: string;
    value: number;
    fill: string;
  }>;
  categoryBreakdown: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  teacherInsights: Array<{
    teacherId: string;
    teacherName: string;
    classCount: number;
    conversionRate: number;
    avgSatisfaction: number;
    totalRevenue: number;
    completionRate: number;
    inTrialStudents: number;
    convertedStudents: number;
    studentCount: number;
  }>;
  studentInsights: Array<{
    studentId: string;
    studentName: string;
    email: string;
    classDate: string;
    teacherName: string;
    status: 'pending' | 'contacted' | 'converted' | 'lost';
    intentScore: number;
    recommendedAction: string;
    lastContactDate?: string;
    audioTranscriptUrl?: string;
    aiNotes?: string;
    dealAmount?: number;
  }>;
  aiSuggestions: {
    daily: string[];
    weekly: string[];
    monthly: string[];
    audioInsights?: string[];
  };
  rawData: Array<{
    id: string;
    data: Record<string, any>;
    source: string;
    lastUpdated: string;
  }>;
  dataSourceMeta?: {
    trialClassAttendance?: { rows: number; lastSync: string | null };
    trialClassPurchase?: { rows: number; lastSync: string | null };
    eodsForClosers?: { rows: number; lastSync: string | null };
  };
  filtersApplied?: {
    period: PeriodType;
    startDate: string;
    endDate: string;
  };
}

export interface GenerateTotalReportRequest {
  period: PeriodType;
  baseDate?: string; // ISO date string
  startDate?: string; // For custom period
  endDate?: string; // For custom period
  includedSources?: string[]; // Optional filter for data sources
  userId?: string; // 用戶 ID（用於權限過濾）
}

export class TotalReportService {
  /**
   * 產生總報表
   */
  async generateReport(request: GenerateTotalReportRequest): Promise<TotalReportData | null> {
    const baseDate = request.baseDate ? new Date(request.baseDate) : new Date();
    const startDate = request.startDate ? new Date(request.startDate) : undefined;
    const endDate = request.endDate ? new Date(request.endDate) : undefined;
    const dateRange = this.getDateRange(request.period, baseDate, startDate, endDate);
    const warnings: string[] = [];
    const structuredWarnings: any[] = []; // 🆕 Structured warnings array

    try {
      // 優化：並行查詢當期和前期資料，減少等待時間
      const shouldFetchPrevious = this.shouldFetchPreviousPeriod(request.period);
      const previousDateRange = shouldFetchPrevious
        ? this.getPreviousPeriodDateRange(request.period, baseDate)
        : null;

      // 並行執行當期和前期資料查詢
      const [currentData, previousData] = await Promise.all([
        this.fetchRawData(dateRange, warnings, request.userId),
        shouldFetchPrevious && previousDateRange
          ? this.fetchRawData(previousDateRange, warnings, request.userId)
          : Promise.resolve(null)
      ]);

      const { attendanceData, purchaseData, eodsData, dataSource } = currentData;

      // 組裝前期資料
      let previousPeriodData: { attendanceData: any[]; purchaseData: any[]; eodsData: any[] } | null = null;
      if (previousData) {
        previousPeriodData = {
          attendanceData: previousData.attendanceData,
          purchaseData: previousData.purchaseData,
          eodsData: previousData.eodsData
        };
      }

      if (attendanceData.length === 0 && purchaseData.length === 0 && eodsData.length === 0) {
        console.log('無資料來源，回傳 null');
        return null;
      }

      // 為了相容性，保留 sheet 資訊（用於 dataSourceMeta）
      let trialAttendanceSheet: any = null;
      let trialPurchaseSheet: any = null;
      let eodsSheet: any = null;

      if (dataSource === 'storage') {
        const spreadsheets = await storage.listSpreadsheets();
        trialAttendanceSheet = spreadsheets.find(s =>
          s.name.includes('體驗課上課記錄') || s.name.includes('上課打卡')
        );
        trialPurchaseSheet = spreadsheets.find(s =>
          s.name.includes('體驗課購買記錄') || s.name.includes('體驗課學員名單')
        );
        eodsSheet = spreadsheets.find(s =>
          s.name.includes('EODs for Closers') || s.name.includes('升高階學員')
        );
      }

      // 計算各項指標（傳入 warnings 和 structuredWarnings）
      const summaryResult = await this.calculateSummaryMetrics(
        attendanceData,
        purchaseData,
        eodsData,
        warnings,
        structuredWarnings
      );
      const summaryMetrics = summaryResult.metrics;
      const calculationDetail = summaryResult.calculationDetail;

      // 🆕 如果有前一期資料，計算前一期的指標並生成對比
      if (previousPeriodData) {
        const previousResult = await this.calculateSummaryMetrics(
          previousPeriodData.attendanceData,
          previousPeriodData.purchaseData,
          previousPeriodData.eodsData,
          [] // 前一期不需要 warnings
        );
        const previousMetrics = previousResult.metrics;

        // 計算對比
        summaryMetrics.comparison = {
          conversionRate: this.calculateMetricComparison(
            summaryMetrics.conversionRate,
            previousMetrics.conversionRate
          ),
          avgConversionTime: this.calculateMetricComparison(
            summaryMetrics.avgConversionTime,
            previousMetrics.avgConversionTime
          ),
          trialCompletionRate: this.calculateMetricComparison(
            summaryMetrics.trialCompletionRate,
            previousMetrics.trialCompletionRate
          ),
          totalTrials: this.calculateMetricComparison(
            summaryMetrics.totalTrials,
            previousMetrics.totalTrials
          ),
          totalConversions: this.calculateMetricComparison(
            summaryMetrics.totalConversions,
            previousMetrics.totalConversions
          ),
        };
      }

      // 🆕 先計算學生數據，因為教師數據需要使用學生的計算結果
      const studentInsights = await this.calculateStudentInsights(
        attendanceData,
        purchaseData,
        eodsData,
        warnings,
        structuredWarnings
      );

      // 🆕 計算教師數據時傳入學生數據，確保狀態一致
      const teacherInsights = await this.calculateTeacherInsights(
        attendanceData,
        purchaseData,
        eodsData,
        warnings,
        studentInsights
      );

      // 🆕 如果有前一期資料，計算教師對比
      if (previousPeriodData) {
        // 先計算前一期的學生數據（不需要收集警告，所以傳入空陣列）
        const previousStudentInsights = await this.calculateStudentInsights(
          previousPeriodData.attendanceData,
          previousPeriodData.purchaseData,
          previousPeriodData.eodsData,
          [],
          []
        );

        // 再計算前一期的教師數據
        const previousTeacherInsights = await this.calculateTeacherInsights(
          previousPeriodData.attendanceData,
          previousPeriodData.purchaseData,
          previousPeriodData.eodsData,
          [],
          previousStudentInsights
        );

        // 為每位教師加入對比資料
        teacherInsights.forEach((teacher) => {
          const previousTeacher = previousTeacherInsights.find(
            (t) => t.teacherId === teacher.teacherId
          );

          if (previousTeacher) {
            teacher.comparison = {
              classCount: this.calculateMetricComparison(
                teacher.classCount,
                previousTeacher.classCount
              ),
              conversionRate: this.calculateMetricComparison(
                teacher.conversionRate,
                previousTeacher.conversionRate
              ),
              totalRevenue: this.calculateMetricComparison(
                teacher.totalRevenue,
                previousTeacher.totalRevenue
              ),
              performanceScore: this.calculateMetricComparison(
                teacher.performanceScore,
                previousTeacher.performanceScore
              ),
            };
          }
        });
      }

      const funnelData = this.calculateFunnelData(purchaseData);

      const categoryBreakdown = this.calculateCategoryBreakdown(purchaseData);

      const trendData = this.calculateTrendData(
        request.period,
        dateRange,
        attendanceData,
        purchaseData
      );

      const aiSuggestions = this.generateAISuggestions(
        summaryMetrics,
        teacherInsights,
        studentInsights,
        request.period,
        previousPeriodData ? (await this.calculateSummaryMetrics(
          previousPeriodData.attendanceData,
          previousPeriodData.purchaseData,
          previousPeriodData.eodsData,
          []
        )).metrics : undefined
      );

      // 🚀 效能優化：移除 rawData 傳輸，減少 ~70% 資料量
      // rawData 僅用於除錯，前端不需要
      // const rawData = [...]; // 已註解

      return {
        mode: 'live',
        period: request.period,
        dateRange,
        warnings: warnings.length > 0 ? warnings : undefined,
        structuredWarnings: structuredWarnings.length > 0 ? structuredWarnings : undefined, // 🆕 Include structured warnings
        summaryMetrics,
        calculationDetail, // 🆕 Include calculation details for KPI transparency
        trendData,
        funnelData,
        categoryBreakdown,
        teacherInsights,
        studentInsights,
        aiSuggestions,
        // rawData, // 🚀 已移除以提升效能
        dataSourceMeta: {
          trialClassAttendance: {
            rows: attendanceData.length,
            lastSync: trialAttendanceSheet?.lastSyncAt?.toISOString() || null,
          },
          trialClassPurchase: {
            rows: purchaseData.length,
            lastSync: trialPurchaseSheet?.lastSyncAt?.toISOString() || null,
          },
          eodsForClosers: {
            rows: summaryMetrics.totalConsultations || eodsData.length,
            lastSync: eodsSheet?.lastSyncAt?.toISOString() || null,
          },
        },
        filtersApplied: {
          period: request.period,
          startDate: dateRange.start,
          endDate: dateRange.end,
        },
      };
    } catch (error) {
      console.error('產生總報表失敗:', error);
      return null;
    }
  }

  /**
   * 統一資料取得入口（Supabase 優先 → Storage fallback）（公開 helper）
   */
  public async fetchRawData(dateRange: { start: string; end: string }, warnings: string[], userId?: string): Promise<{
    attendanceData: any[];
    purchaseData: any[];
    eodsData: any[];
    dataSource: 'supabase' | 'storage';
  }> {
    // 優先使用直接 SQL 查詢（繞過 PostgREST schema cache 問題）
    if (directSqlRepository.isAvailable()) {
      try {
        console.log('📊 Fetching data from Supabase (Direct SQL)...');
        const [supabaseAttendance, supabasePurchases, supabaseDeals] = await Promise.all([
          directSqlRepository.getAttendance(dateRange),
          directSqlRepository.getPurchases(dateRange),
          directSqlRepository.getDeals(dateRange),
        ]);

        const totalRecords = supabaseAttendance.length + supabasePurchases.length + supabaseDeals.length;
        console.log(`✓ Supabase data: ${supabaseAttendance.length} attendance, ${supabasePurchases.length} purchases, ${supabaseDeals.length} deals`);

        if (totalRecords > 0) {
          // 轉換為內部格式
          let attendanceData = this.convertSupabaseToInternalFormat(supabaseAttendance);
          let purchaseData = this.convertSupabaseToInternalFormat(supabasePurchases);
          let eodsData = this.convertSupabaseToInternalFormat(supabaseDeals);

          // 如果有 userId，進行權限過濾
          if (userId) {
            attendanceData = await this.filterDataByPermission(attendanceData, userId, 'trial_class_attendance');
            purchaseData = await this.filterDataByPermission(purchaseData, userId, 'trial_class_purchases');
            eodsData = await this.filterDataByPermission(eodsData, userId, 'eods_for_closers');  // ✅ 修正：使用正確的表名
          }

          warnings.push(`使用 Supabase 資料來源（過濾後：${attendanceData.length + purchaseData.length + eodsData.length} 筆記錄）`);
          return {
            attendanceData,
            purchaseData,
            eodsData,
            dataSource: 'supabase',
          };
        } else {
          console.warn('⚠️  Supabase returned no data, falling back to storage');
          warnings.push('Supabase 查詢成功但無資料，fallback 至 local storage');
        }
      } catch (error) {
        console.error('❌ Supabase query failed:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        warnings.push(`Supabase 查詢失敗（${errorMsg}），fallback 至 local storage`);
      }
    } else {
      console.log('ℹ️  Supabase not available, using local storage');
      warnings.push('Supabase 未設定（環境變數缺失），使用 local storage');
    }

    // Fallback to storage
    console.log('📁 Fetching data from local storage...');
    const spreadsheets = await storage.listSpreadsheets();

    if (spreadsheets.length === 0) {
      return {
        attendanceData: [],
        purchaseData: [],
        eodsData: [],
        dataSource: 'storage',
      };
    }

    const trialAttendanceSheet = spreadsheets.find(s =>
      s.name.includes('體驗課上課記錄') || s.name.includes('上課打卡')
    );
    const trialPurchaseSheet = spreadsheets.find(s =>
      s.name.includes('體驗課購買記錄') || s.name.includes('體驗課學員名單')
    );
    const eodsSheet = spreadsheets.find(s =>
      s.name.includes('EODs for Closers') || s.name.includes('升高階學員')
    );

    const [storageAttendance, storagePurchase, storageEods] = await Promise.all([
      trialAttendanceSheet ? storage.getSheetData(trialAttendanceSheet.spreadsheetId) : Promise.resolve([]),
      trialPurchaseSheet ? storage.getSheetData(trialPurchaseSheet.spreadsheetId) : Promise.resolve([]),
      eodsSheet ? storage.getSheetData(eodsSheet.spreadsheetId) : Promise.resolve([]),
    ]);

    const attendanceData = this.filterDataByDateRange(storageAttendance, dateRange);
    const purchaseData = this.filterDataByDateRange(storagePurchase, dateRange);
    const eodsData = this.filterDataByDateRange(storageEods, dateRange);

    console.log(`✓ Storage data: ${attendanceData.length} attendance, ${purchaseData.length} purchases, ${eodsData.length} deals`);

    return {
      attendanceData,
      purchaseData,
      eodsData,
      dataSource: 'storage',
    };
  }

  /**
   * 計算日期範圍（公開 helper）
   */
  public getDateRange(period: PeriodType, baseDate: Date, startDate?: Date, endDate?: Date): { start: string; end: string } {
    switch (period) {
      case 'all':
        // Return a very wide date range to include all data
        return {
          start: '1970-01-01',  // Unix epoch start
          end: '2099-12-31',    // Far future date
        };
      case 'daily':
      case 'day':
        return {
          start: format(baseDate, 'yyyy-MM-dd'),
          end: format(baseDate, 'yyyy-MM-dd'),
        };
      case 'weekly':
      case 'week':
        return {
          start: format(startOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(baseDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        };
      case 'lastWeek':
        const lastWeekDate = subWeeks(baseDate, 1);
        return {
          start: format(startOfWeek(lastWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(lastWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        };
      case 'monthly':
      case 'month':
        return {
          start: format(startOfMonth(baseDate), 'yyyy-MM-dd'),
          end: format(endOfMonth(baseDate), 'yyyy-MM-dd'),
        };
      case 'custom':
        if (!startDate || !endDate) {
          throw new Error('Custom period requires startDate and endDate');
        }
        return {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
        };
      default:
        // Default to current month if period is unrecognized
        return {
          start: format(startOfMonth(baseDate), 'yyyy-MM-dd'),
          end: format(endOfMonth(baseDate), 'yyyy-MM-dd'),
        };
    }
  }

  /**
   * 依日期範圍篩選資料
   */
  private filterDataByDateRange(data: any[], dateRange: { start: string; end: string }): any[] {
    return data.filter(row => {
      const dateFields = ['date', 'classDate', 'purchaseDate', 'createdAt', '日期', '上課日期', '購買日期'];
      let rowDate: string | null = null;

      for (const field of dateFields) {
        if (row.data[field]) {
          rowDate = this.normalizeDate(row.data[field]);
          break;
        }
      }

      if (!rowDate) return false;

      return rowDate >= dateRange.start && rowDate <= dateRange.end;
    });
  }

  /**
   * 正規化日期格式
   */
  private normalizeDate(dateValue: any): string | null {
    if (!dateValue) return null;

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return null;
      return format(date, 'yyyy-MM-dd');
    } catch {
      return null;
    }
  }

  /**
   * 計算總結指標（使用統一的 KPI Calculator）
   */
  private async calculateSummaryMetrics(
    attendanceData: any[],
    purchaseData: any[],
    eodsData: any[],
    warnings: string[],
    structuredWarnings?: any[] // 🆕 Optional structured warnings array
  ): Promise<{ metrics: TotalReportData['summaryMetrics']; calculationDetail: any }> {
    // 使用新的 KPI Calculator（整合 Formula Engine）
    const result = await calculateAllKPIs({
      attendance: attendanceData,
      purchases: purchaseData,
      deals: eodsData,
    });

    // 合併 warnings
    warnings.push(...result.warnings);

    // 🆕 合併 structuredWarnings（去重）
    if (structuredWarnings && result.structuredWarnings) {
      const existingTypes = new Set(structuredWarnings.map(w => `${w.type}:${w.message}`));
      result.structuredWarnings.forEach(warning => {
        const key = `${warning.type}:${warning.message}`;
        if (!existingTypes.has(key)) {
          structuredWarnings.push(warning);
          existingTypes.add(key);
        }
      });
    }

    // 計算總學生數（購買記錄中的獨立 email 數量）
    const uniqueStudents = new Set<string>();
    purchaseData.forEach(row => {
      const email = (
        resolveField(row.data, 'studentEmail') ||
        row.data?.學員信箱 ||
        row.data?.email ||
        ''
      ).toLowerCase();
      if (email) {
        uniqueStudents.add(email);
      }
    });

    return {
      metrics: {
        ...result.summaryMetrics,
        totalStudents: uniqueStudents.size,
      },
      calculationDetail: result.calculationDetail,
    };
  }

  /**
   * 計算教師數據（全新商業指標）
   */
  private async calculateTeacherInsights(
    attendanceData: any[],
    purchaseData: any[],
    eodsData: any[],
    warnings: string[],
    studentInsights: TotalReportData['studentInsights']
  ): Promise<TotalReportData['teacherInsights']> {
    const teacherMap = new Map<string, {
      classCount: number;
      students: Set<string>;
      classDates: Date[];
      convertedStudents: Set<string>;  // 已轉高學生
      lostStudents: Set<string>;        // 未轉高學生
      inTrialStudents: Set<string>;     // 體驗中學生
      highLevelDeals: Array<{ amount: number; date: Date; studentEmail: string }>;
      conversionDays: number[];         // 轉換天數陣列
      totalPurchasedClasses: number;    // 該教師所有學生的購買堂數總和
      totalAttendedClasses: number;     // 該教師所有學生的已上堂數總和
    }>();

    // Step 0: 建立學生 email → 教師名稱的對應表（從 attendance 建立）
    const studentTeacherMap = new Map<string, string>();
    const studentClassDataMap = new Map<string, { purchased: number; attended: number }>();
    let missingTeacherCount = 0;

    // 優化：Step 1 - 統計教師授課記錄，同時建立學生→教師對應
    // 同時收集 class date 資訊供後續轉換天數計算使用
    const studentClassDatesMap = new Map<string, Date[]>();

    attendanceData.forEach(row => {
      const teacher = resolveField(row.data, 'teacher');
      const studentEmail = resolveField(row.data, 'studentEmail');
      const classDateRaw = resolveField(row.data, 'classDate');
      const classDate = parseDateField(classDateRaw);

      if (!teacher) {
        missingTeacherCount++;
        return;
      }

      if (!teacherMap.has(teacher)) {
        teacherMap.set(teacher, {
          classCount: 0,
          students: new Set(),
          classDates: [],
          convertedStudents: new Set(),
          lostStudents: new Set(),
          inTrialStudents: new Set(),
          highLevelDeals: [],
          conversionDays: [],
          totalPurchasedClasses: 0,
          totalAttendedClasses: 0,
        });
      }

      const stats = teacherMap.get(teacher)!;
      stats.classCount++;

      if (studentEmail) {
        const email = studentEmail.toLowerCase();
        stats.students.add(email);
        studentTeacherMap.set(email, teacher);

        // 累計學生已上堂數
        if (!studentClassDataMap.has(email)) {
          studentClassDataMap.set(email, { purchased: 0, attended: 0 });
        }
        if (classDate) {
          studentClassDataMap.get(email)!.attended++;
          // 同時保存上課日期供後續使用
          if (!studentClassDatesMap.has(email)) {
            studentClassDatesMap.set(email, []);
          }
          studentClassDatesMap.get(email)!.push(classDate);
        }
      }

      if (classDate) stats.classDates.push(classDate);
    });

    if (missingTeacherCount > 0) {
      warnings.push(`${missingTeacherCount} 筆上課記錄缺少教師姓名`);
    }

    // Step 1.5: 🆕 從 course_plans 表批量查詢購買堂數
    const planTotalClassesMap = new Map<string, number>();
    const planNamesSet = new Set<string>();

    purchaseData.forEach((row) => {
      const packageName = row.plan || row.data?.成交方案 || row.data?.plan || '';
      if (packageName) planNamesSet.add(packageName);
    });

    // Note: This is synchronous blocking code - consider making the whole function async if needed
    // For now, we'll skip the query and use fallback values

    // Step 2: 從購買記錄統計購買堂數（使用 studentTeacherMap 找到教師）
    purchaseData.forEach(row => {
      const studentEmail = resolveField(row.data, 'studentEmail');

      if (!studentEmail) return;

      const email = studentEmail.toLowerCase();
      const teacher = studentTeacherMap.get(email);

      if (!teacher || !teacherMap.has(teacher)) return;

      // 🆕 累計購買堂數
      const packageName = row.plan || row.data?.成交方案 || row.data?.plan || '';
      const totalClasses = row.trial_class_count || parseNumberField(row.data?.體驗堂數) || 0;

      if (!studentClassDataMap.has(email)) {
        studentClassDataMap.set(email, { purchased: 0, attended: 0 });
      }
      studentClassDataMap.get(email)!.purchased = totalClasses;
    });

    // 🆕 Step 2.5: 使用 studentInsights 的計算結果來統計學生狀態
    // 這樣可以確保前端和後端使用相同的狀態定義
    studentInsights.forEach(student => {
      const email = student.email.toLowerCase();
      // 🔧 Fix: 使用 student.teacherName（從 studentInsights），而不是 studentTeacherMap
      // 因為 studentInsights 已經正確計算了每個學生的 teacherName（最近一次上課的教師）
      const teacher = student.teacherName;

      if (!teacher || !teacherMap.has(teacher)) return;

      const stats = teacherMap.get(teacher)!;
      const status = student.currentStatus;

      if (status === '已轉高') {
        stats.convertedStudents.add(email);
      } else if (status === '未轉高') {
        stats.lostStudents.add(email);
      } else if (status === '體驗中') {
        stats.inTrialStudents.add(email);
      }
    });

    // 優化：Step 3 - 從 EODs 統計高階方案實收金額，同時計算轉換天數
    // 合併原本的 Step 3 和 Step 4，避免重複遍歷
    eodsData.forEach((row, idx) => {
      const studentEmail = resolveField(row.data, 'studentEmail');
      const plan = (
        row.data?.成交方案 ||
        row.data?.deal_package ||
        resolveField(row.data, 'dealPackage') ||
        resolveField(row.data, 'courseType') ||
        ''
      );
      const amountStr = (
        row.data?.實收金額 ||
        row.data?.actual_amount ||
        resolveField(row.data, 'actualAmount') ||
        resolveField(row.data, 'dealAmount') ||
        '0'
      );
      const dealDateRaw = row.data?.成交日期 || resolveField(row.data, 'dealDate');
      const dealDate = parseDateField(dealDateRaw);

      if (!studentEmail) return;

      const email = studentEmail.toLowerCase();
      const teacher = studentTeacherMap.get(email);

      if (!teacher || !teacherMap.has(teacher)) return;

      // 只計算高階方案
      if (!plan.includes('高階一對一') && !plan.includes('高音')) return;

      const amount = parseFloat(amountStr.toString().replace(/[^0-9.]/g, '')) || 0;

      if (amount > 0) {
        const stats = teacherMap.get(teacher)!;
        const dealRecord = {
          amount,
          date: dealDate || new Date(),
          studentEmail: email,
        };
        stats.highLevelDeals.push(dealRecord);

        // 優化：同時計算轉換天數，使用已保存的上課日期
        const classDates = studentClassDatesMap.get(email);
        if (classDates && classDates.length > 0 && dealRecord.date) {
          // 找到最早的上課日期
          const firstClassDate = classDates.reduce((earliest, current) =>
            current < earliest ? current : earliest
          );
          const days = Math.floor((dealRecord.date.getTime() - firstClassDate.getTime()) / (1000 * 60 * 60 * 24));
          if (days >= 0 && days < 365) {  // 合理範圍內
            stats.conversionDays.push(days);
          }
        }
      }
    });

    // Step 4.5: 🆕 累加每位教師所有學生的購買和已上堂數
    teacherMap.forEach((stats, teacherName) => {
      stats.students.forEach((email) => {
        const classData = studentClassDataMap.get(email);
        if (classData) {
          stats.totalPurchasedClasses += classData.purchased;
          stats.totalAttendedClasses += classData.attended;
        }
      });
    });

    // Step 5: 轉換為陣列並計算所有指標
    const insights: TotalReportData['teacherInsights'] = [];
    let index = 0;

    teacherMap.forEach((stats, teacherName) => {
      const studentCount = stats.students.size;
      const convertedCount = stats.convertedStudents.size;
      const lostCount = stats.lostStudents.size;
      const inTrialCount = stats.inTrialStudents.size;
      const completedCount = convertedCount + lostCount;

      // 轉換率 = 已轉高 ÷ (已轉高 + 未轉高)
      const conversionRate = completedCount > 0
        ? Math.round((convertedCount / completedCount) * 10000) / 100
        : 0;

      // 實收金額 = 所有高階方案的總和
      const totalRevenue = stats.highLevelDeals.reduce((sum, deal) => sum + deal.amount, 0);

      // 平均客單價 = 實收金額 ÷ 成交學生數
      const avgDealAmount = convertedCount > 0
        ? Math.round(totalRevenue / convertedCount)
        : 0;

      // ROI效率 = 實收金額 ÷ 授課數
      const revenuePerClass = stats.classCount > 0
        ? Math.round(totalRevenue / stats.classCount)
        : 0;

      // 流失率 = 未轉高 ÷ (已轉高 + 未轉高)
      const lostRate = completedCount > 0
        ? Math.round((lostCount / completedCount) * 10000) / 100
        : 0;

      // 平均轉換天數
      const avgConversionDays = stats.conversionDays.length > 0
        ? Math.round(stats.conversionDays.reduce((sum, d) => sum + d, 0) / stats.conversionDays.length)
        : 0;

      // 最近一次上課日
      const lastClassDate = stats.classDates.length > 0
        ? format(new Date(Math.max(...stats.classDates.map(d => d.getTime()))), 'yyyy-MM-dd')
        : null;

      // 🆕 完課率 = 已上堂數總和 ÷ 購買堂數總和
      const completionRate = stats.totalPurchasedClasses > 0
        ? Math.round((stats.totalAttendedClasses / stats.totalPurchasedClasses) * 10000) / 100
        : 0;

      // 績效評分（0-100）：轉換率 40% + ROI效率 30% + 完課率 20% + 活躍度 10%
      const conversionScore = Math.min(conversionRate / 50 * 40, 40);  // 50% 轉換率 = 滿分
      const roiScore = Math.min(revenuePerClass / 30000 * 30, 30);      // 3萬/堂 = 滿分
      const completionScore = Math.min(completionRate / 100 * 20, 20);  // 100% 完課 = 滿分
      const activityScore = lastClassDate ? 10 : 0;  // 有最近上課 = 滿分

      const performanceScore = Math.round(conversionScore + roiScore + completionScore + activityScore);

      insights.push({
        teacherId: `teacher-${index++}`,
        teacherName,
        classCount: stats.classCount,
        studentCount,
        conversionRate,
        totalRevenue,
        avgDealAmount,
        revenuePerClass,
        completionRate,
        inTrialStudents: inTrialCount,
        convertedStudents: convertedCount,
        lostStudents: lostCount,
        lostRate,
        avgConversionDays,
        lastClassDate,
        performanceScore,
      });
    });

    // 預設按轉換率排序
    return insights.sort((a, b) => b.conversionRate - a.conversionRate);
  }

  /**
   * 從 course_plans 表查詢方案的總堂數
   */
  private async getCoursePlanTotalClasses(planName: string): Promise<number | null> {
    if (!planName) return null;

    try {
      const result = await queryDatabase(
        'SELECT total_classes FROM course_plans WHERE plan_name = $1 AND is_active = TRUE',
        [planName]
      );

      if (result.rows.length > 0) {
        return result.rows[0].total_classes;
      }
      return null;
    } catch (error) {
      console.error(`Error querying course_plans for plan "${planName}":`, error);
      return null;
    }
  }

  /**
   * 計算學生數據
   */
  private async calculateStudentInsights(
    attendanceData: any[],
    purchaseData: any[],
    eodsData: any[],
    warnings: string[],
    structuredWarnings: any[]
  ): Promise<TotalReportData['studentInsights']> {
    const insights: TotalReportData['studentInsights'] = [];
    const studentMap = new Map<string, any>();
    const studentsWithoutPurchase: string[] = []; // Track students in attendance but not in purchase

    // 🆕 直接從資料庫查詢「已轉高」學生名單（使用正確定義）
    const convertedStudentsSet = new Set<string>();
    try {
      const convertedQuery = `
        SELECT DISTINCT LOWER(TRIM(t.student_email)) as email
        FROM trial_class_purchases t
        INNER JOIN eods_for_closers e
          ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
        WHERE e.actual_amount IS NOT NULL
          AND e.actual_amount != 'NT$0.00'
          AND e.deal_date IS NOT NULL
          AND e.deal_date >= t.purchase_date
          AND (e.plan LIKE '%高階一對一訓練%')
      `;
      const convertedResult = await queryDatabase(convertedQuery);
      convertedResult.rows.forEach((row: any) => {
        convertedStudentsSet.add(row.email);
      });
      console.log('✅ 已轉高學生數（SQL 查詢 - 學生列表）:', convertedStudentsSet.size);
    } catch (error) {
      console.warn('⚠️ 無法查詢已轉高學生（學生列表），將使用原有邏輯');
    }

    // Step 0: 批量查詢所有方案的總堂數（提升效能）
    const planNamesSet = new Set<string>();
    const studentPlanMap = new Map<string, { studentName: string; email: string; wrongPlan: string }[]>();

    purchaseData.forEach((row) => {
      const packageName = row.data?.plan || row.data?.成交方案 || row.data?.packageName || '';
      if (packageName) {
        planNamesSet.add(packageName);

        // 記錄使用此方案的學員
        if (!studentPlanMap.has(packageName)) {
          studentPlanMap.set(packageName, []);
        }
        studentPlanMap.get(packageName)!.push({
          studentName: row.data?.studentName || row.data?.學員姓名 || '未知',
          email: row.data?.studentEmail || row.data?.學員信箱 || '',
          wrongPlan: packageName
        });
      }
    });

    const planTotalClassesMap = new Map<string, number>();
    const missingPlans: string[] = [];

    try {
      const result = await queryDatabase(
        'SELECT plan_name, total_classes FROM course_plans WHERE is_active = TRUE'
      );

      result.rows.forEach((row: any) => {
        planTotalClassesMap.set(row.plan_name, row.total_classes);
      });

      // 檢查缺少的方案
      planNamesSet.forEach((planName) => {
        if (!planTotalClassesMap.has(planName)) {
          missingPlans.push(planName);
        }
      });

      if (missingPlans.length > 0) {
        // 找出相似的正確方案名稱建議
        const availablePlans = Array.from(planTotalClassesMap.keys());

        // 為每個錯誤方案找出學員和建議
        missingPlans.forEach(wrongPlan => {
          const students = studentPlanMap.get(wrongPlan) || [];
          const similar = availablePlans.find(correctPlan => {
            const normalize = (s: string) => s.replace(/[\s\-–—]/g, '').toLowerCase();
            return normalize(correctPlan).includes(normalize(wrongPlan)) ||
                   normalize(wrongPlan).includes(normalize(correctPlan));
          });

          students.forEach(student => {
            const warningMessage = similar
              ? `學員「${student.studentName}」的方案名稱「${wrongPlan}」需改為「${similar}」`
              : `學員「${student.studentName}」的方案名稱「${wrongPlan}」找不到對應方案，請檢查拼寫`;

            structuredWarnings.push({
              message: warningMessage,
              type: 'missing_plan',
              severity: 'warning',
              actionLabel: '前往資料庫瀏覽器',
              actionRoute: '/tools/database-browser',
              actionParams: { studentEmail: student.email, wrongPlan }
            });
          });
        });
      }
    } catch (error) {
      console.error('Error querying course_plans:', error);
      const errorMsg = '⚠️ 無法查詢 course_plans 表，將使用原始資料的堂數';

      // 🆕 使用 structured warning
      structuredWarnings.push({
        message: errorMsg,
        type: 'db_error',
        severity: 'error',
        actionLabel: '檢查資料庫連線',
        actionRoute: '/settings/data-sources'
      });
    }

    // 記錄缺少信箱和重複購買記錄的學員
    const studentsWithoutEmail: string[] = [];
    const duplicatePurchases = new Map<string, Array<{ name: string; plan: string; date: string }>>(); // email+plan -> 購買記錄列表（同一方案重複購買）
    const multiplePlanStudents = new Map<string, Array<{ plan: string; date: string }>>(); // email -> 購買方案列表（同一學員購買多個方案）
    const seenPurchases = new Map<string, { name: string; date: string }>(); // "email|plan" -> 第一筆記錄
    const studentPurchaseCount = new Map<string, { name: string; plans: Set<string> }>(); // email -> 購買方案集合

    // Step 1: Build from purchase records (most complete info)
    purchaseData.forEach((row, index) => {
      const email = (
        resolveField(row.data, 'studentEmail') ||
        row.data?.學員信箱 ||
        row.data?.email ||
        ''
      ).toLowerCase();

      const name = resolveField(row.data, 'studentName') || row.data?.學員姓名 || '';

      if (!email) {
        studentsWithoutEmail.push(name || '未命名學員');
        return;
      }

      const packageName = row.data?.plan || row.data?.成交方案 || row.data?.packageName || '';
      const purchaseDateStr = row.data?.purchaseDate || row.data?.purchase_date || row.data?.購買日期 || '';

      // 追蹤每個學員購買的方案
      if (!studentPurchaseCount.has(email)) {
        studentPurchaseCount.set(email, { name, plans: new Set() });
      }
      studentPurchaseCount.get(email)!.plans.add(packageName);

      // 檢查是否已存在「相同 email + 相同方案」的組合（表示重複購買同一方案）
      const purchaseKey = `${email}|${packageName}`;
      if (seenPurchases.has(purchaseKey)) {
        // 發現重複購買同一方案
        if (!duplicatePurchases.has(purchaseKey)) {
          const firstPurchase = seenPurchases.get(purchaseKey)!;
          duplicatePurchases.set(purchaseKey, [
            { name: firstPurchase.name, plan: packageName, date: firstPurchase.date }
          ]);
        }
        duplicatePurchases.get(purchaseKey)!.push({ name, plan: packageName, date: purchaseDateStr });
        // 繼續處理，但不加入 studentMap（避免重複）
        return;
      }

      // 記錄這筆購買
      seenPurchases.set(purchaseKey, { name, date: purchaseDateStr });

      // 🆕 優先從 course_plans 表查詢總堂數
      let totalTrialClasses: number;
      const planTotalFromDB = packageName ? planTotalClassesMap.get(packageName) : null;

      if (planTotalFromDB !== null && planTotalFromDB !== undefined) {
        // ✅ 從 course_plans 表取得總堂數
        totalTrialClasses = planTotalFromDB;
      } else {
        // ⚠️ Fallback: 使用原始資料的堂數
        totalTrialClasses = row.trial_class_count || parseNumberField(row.data?.體驗堂數) || 0;
      }

      // 🆕 已上堂數初始化為 0，稍後從 attendance 計算
      let attendedClasses = 0;
      let remainingTrialClasses = totalTrialClasses;

      // 🆕 currentStatus 稍後在 Step 3.5 計算，這裡初始化為空字串
      const purchaseDateRaw = row.purchase_date || row.data?.購買日期 || row.data?.purchaseDate || '';
      const purchaseDate = parseDateField(purchaseDateRaw);

      studentMap.set(email, {
        studentId: `student-${index}`,
        studentName: name,
        email,
        totalTrialClasses,
        remainingTrialClasses,
        attendedClasses,
        currentStatus: '',  // 🆕 稍後計算
        packageName,
        purchaseDate: purchaseDate ? format(purchaseDate, 'yyyy-MM-dd') : undefined,
        classDates: [] as Date[],
        teacherName: '',
        intentScore: 50,
        hasPurchaseRecord: true,
      });
    });

    // 🆕 檢查購買多個方案的學員（提醒，不是錯誤）
    studentPurchaseCount.forEach((data, email) => {
      if (data.plans.size > 1) {
        const plansList = Array.from(data.plans).filter(p => p).join('、');
        multiplePlanStudents.set(email, Array.from(data.plans).map(plan => ({ plan, date: '' })));
      }
    });

    // Step 2: Process attendance data (create students if not in purchase records)
    let attendanceIndex = purchaseData.length;
    attendanceData.forEach((row) => {
      const email = (resolveField(row.data, 'studentEmail') || '').toLowerCase();
      if (!email) return;

      const name = resolveField(row.data, 'studentName') || '';
      const teacher = resolveField(row.data, 'teacher') || '';
      const classDateRaw = resolveField(row.data, 'classDate');
      const classDate = parseDateField(classDateRaw);
      const intentScoreRaw = parseNumberField(resolveField(row.data, 'intentScore'));

      // Create student if not exists (from attendance only, no purchase record)
      if (!studentMap.has(email)) {
        studentsWithoutPurchase.push(`${name} (${email})`);
        studentMap.set(email, {
          studentId: `student-${attendanceIndex++}`,
          studentName: name,
          email,
          totalTrialClasses: 0,
          remainingTrialClasses: 0,
          attendedClasses: 0,
          currentStatus: '',
          packageName: '',
          purchaseDate: undefined,
          classDates: [] as Date[],
          teacherName: teacher,
          intentScore: intentScoreRaw !== null && intentScoreRaw >= 0 && intentScoreRaw <= 100 ? intentScoreRaw : 50,
          hasPurchaseRecord: false,
        });
      }

      const student = studentMap.get(email)!;

      // Collect class dates and track teacher with date
      if (classDate) {
        student.classDates.push(classDate);

        // 記錄每次上課的教師和日期（用於找出最近一次的教師）
        if (!student.teacherHistory) {
          student.teacherHistory = [];
        }
        if (teacher) {
          student.teacherHistory.push({ teacher, date: classDate });
        }

        // 🆕 累計已上堂數（每次有 classDate 就 +1）
        student.attendedClasses = (student.attendedClasses || 0) + 1;
      }

      // Update intent score if available
      if (intentScoreRaw !== null && intentScoreRaw >= 0 && intentScoreRaw <= 100) {
        student.intentScore = intentScoreRaw;
      }
    });

    // 🆕 Step 2.5: 重新計算剩餘堂數 = 購買堂數 - 已上堂數
    studentMap.forEach((student) => {
      if (student.hasPurchaseRecord) {
        student.remainingTrialClasses = Math.max(0, student.totalTrialClasses - student.attendedClasses);
      }
    });

    // 🆕 Step 2.6: 初始化 dealAmount（稍後在 Step 3 累計）
    studentMap.forEach((student) => {
      student.dealAmount = 0;
    });

    // 🆕 Add structured warning if students found in attendance but not in purchase
    if (studentsWithoutPurchase.length > 0) {
      const warningMessage = `⚠️ 發現 ${studentsWithoutPurchase.length} 位學生有上課記錄但缺少購買記錄，請盡快處理：\n` +
        studentsWithoutPurchase.slice(0, 10).join('\n') +
        (studentsWithoutPurchase.length > 10 ? `\n...以及其他 ${studentsWithoutPurchase.length - 10} 位學生` : '');

      structuredWarnings.push({
        message: warningMessage,
        type: 'missing_purchase',
        severity: 'warning',
        actionLabel: '前往資料庫瀏覽器',
        actionRoute: '/tools/database-browser',
        actionParams: { students: studentsWithoutPurchase }
      });
    }

    // Step 3: Integrate EOD data (deal amounts)
    // 🆕 直接從資料庫查詢每位學生的累積成交金額（與已轉高定義完全一致）
    try {
      const dealAmountQuery = `
        SELECT
          LOWER(TRIM(t.student_email)) as email,
          SUM(CAST(REGEXP_REPLACE(e.actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)) as total_amount
        FROM trial_class_purchases t
        INNER JOIN eods_for_closers e
          ON LOWER(TRIM(e.student_email)) = LOWER(TRIM(t.student_email))
        WHERE e.actual_amount IS NOT NULL
          AND e.actual_amount != 'NT$0.00'
          AND e.deal_date IS NOT NULL
          AND e.deal_date >= t.purchase_date
          AND (e.plan LIKE '%高階一對一訓練%')
        GROUP BY LOWER(TRIM(t.student_email))
      `;

      const dealAmountResult = await queryDatabase(dealAmountQuery);
      const dealAmountMap = new Map<string, number>();

      dealAmountResult.rows.forEach((row: any) => {
        dealAmountMap.set(row.email, parseFloat(row.total_amount) || 0);
      });

      console.log(`✅ 查詢到 ${dealAmountMap.size} 位學生的累積成交金額`);

      // 設置每位學生的累積金額
      studentMap.forEach((student) => {
        const normalizedEmail = student.email.toLowerCase().trim();
        const amount = dealAmountMap.get(normalizedEmail) || 0;
        if (amount > 0) {
          student.dealAmount = amount;
        }
      });
    } catch (error) {
      console.warn('⚠️ 無法查詢累積成交金額:', error);
    }

    // 🆕 Step 3.5: 重新計算目前狀態（基於新的邏輯）
    // 優先級：已轉高 > 未轉高 > 體驗中 > 未開始
    studentMap.forEach((student) => {
      const hasAttendance = student.classDates.length > 0;
      const noRemainingClasses = student.remainingTrialClasses === 0;

      // 🆕 使用 SQL 查詢結果判斷是否已轉高（更準確）
      const normalizedEmail = student.email ? student.email.toLowerCase().trim() : '';
      const isConverted = convertedStudentsSet.has(normalizedEmail);

      if (isConverted) {
        // 1. 優先級最高：符合已轉高定義 → 已轉高
        student.currentStatus = '已轉高';
      } else if (noRemainingClasses && hasAttendance) {
        // 2. 剩餘堂數 = 0 且沒有成交 → 未轉高
        student.currentStatus = '未轉高';
      } else if (hasAttendance) {
        // 3. 有打卡記錄 → 體驗中
        student.currentStatus = '體驗中';
      } else {
        // 4. 沒有打卡記錄 → 未開始
        student.currentStatus = '未開始';
      }
    });

    // Step 4: Assemble final insights with calculated fields
    studentMap.forEach((student) => {
      // Calculate first and last class dates
      student.classDates.sort((a: Date, b: Date) => a.getTime() - b.getTime());
      const firstClassDate = student.classDates.length > 0
        ? format(student.classDates[0], 'yyyy-MM-dd')
        : student.purchaseDate || format(new Date(), 'yyyy-MM-dd');
      const lastClassDate = student.classDates.length > 0
        ? format(student.classDates[student.classDates.length - 1], 'yyyy-MM-dd')
        : undefined;

      // 從 teacherHistory 中找出最近一次上課的教師
      if (student.teacherHistory && student.teacherHistory.length > 0) {
        // 按日期排序，最近的在最後
        student.teacherHistory.sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
        const latestTeacher = student.teacherHistory[student.teacherHistory.length - 1];
        student.teacherName = latestTeacher.teacher;
      }

      // Map status: 未開始→pending, 體驗中→contacted, 未轉高→lost, 已轉高→converted
      let mappedStatus: 'pending' | 'contacted' | 'converted' | 'lost' = 'pending';
      if (student.currentStatus === '已轉高') {
        mappedStatus = 'converted';
      } else if (student.currentStatus === '未轉高') {
        mappedStatus = 'lost';
      } else if (student.currentStatus === '體驗中') {
        mappedStatus = 'contacted';
      } else if (student.currentStatus === '未開始') {
        mappedStatus = 'pending';
      }

      // Adjust intent score based on status if not set from attendance
      if (student.intentScore === 50) {
        student.intentScore = mappedStatus === 'converted' ? 85
          : mappedStatus === 'contacted' ? 70
          : mappedStatus === 'lost' ? 30
          : 50;
      }

      insights.push({
        studentId: student.studentId,
        studentName: student.studentName,
        email: student.email,
        classDate: firstClassDate,
        teacherName: student.teacherName || '未知教師',
        status: mappedStatus,
        intentScore: student.intentScore,
        recommendedAction: this.getRecommendedAction(mappedStatus, student.intentScore),
        dealAmount: student.dealAmount,
        totalTrialClasses: student.totalTrialClasses,
        remainingTrialClasses: student.remainingTrialClasses,
        attendedClasses: student.attendedClasses,
        lastClassDate,
        currentStatus: student.currentStatus,
        packageName: student.packageName,
        purchaseDate: student.purchaseDate,
      });
    });

    // 🆕 Add structured warnings for data quality issues
    console.log(`[Debug] purchaseData.length: ${purchaseData.length}, insights.length: ${insights.length}, studentsWithoutEmail: ${studentsWithoutEmail.length}, duplicatePurchases: ${duplicatePurchases.size}`);

    // 1. 缺少信箱警告
    if (studentsWithoutEmail.length > 0) {
      studentsWithoutEmail.forEach(studentName => {
        structuredWarnings.push({
          message: `學員「${studentName}」缺少學員信箱，請補充以利後續追蹤`,
          type: 'missing_email',
          severity: 'warning',
          actionLabel: '前往資料庫瀏覽器',
          actionRoute: '/tools/database-browser'
        });
      });
    }

    // 2. 重複購買記錄警告（同一學員購買同一方案多次）- 這是錯誤，需要修正
    if (duplicatePurchases.size > 0) {
      duplicatePurchases.forEach((purchases, purchaseKey) => {
        const [email, plan] = purchaseKey.split('|');
        const studentName = purchases[0].name;
        const dates = purchases.map(p => p.date).filter(d => d).join('、');

        structuredWarnings.push({
          message: `學員「${studentName}」(${email}) 重複購買方案「${plan}」${purchases.length} 次${dates ? `，購買日期：${dates}` : ''}，請確認並刪除重複資料`,
          type: 'missing_email', // 暫時使用 missing_email type，可以考慮新增 duplicate_purchase type
          severity: 'warning',
          actionLabel: '前往資料庫瀏覽器',
          actionRoute: '/tools/database-browser'
        });
      });
    }

    // 3. 購買多個方案提醒（同一學員購買不同方案）- 這不是錯誤，只是提醒特殊情況
    if (multiplePlanStudents.size > 0) {
      multiplePlanStudents.forEach((plans, email) => {
        const studentData = studentPurchaseCount.get(email);
        if (!studentData) return;

        const plansList = Array.from(studentData.plans).filter(p => p).join('、');

        structuredWarnings.push({
          message: `💡 學員「${studentData.name}」(${email}) 購買了 ${studentData.plans.size} 個方案：${plansList}`,
          type: 'missing_email', // 使用 info type 來區分這不是錯誤
          severity: 'info',
          actionLabel: '查看學員資料',
          actionRoute: '/tools/database-browser'
        });
      });
    }

    return insights;
  }

  /**
   * 取得建議行動
   */
  private getRecommendedAction(status: string, intentScore: number): string {
    if (status === 'converted') return '已成交，進行後續服務';
    if (status === 'contacted') return '追蹤購買進度';
    if (intentScore > 80) return '立即聯繫，高意願學員';
    if (intentScore > 60) return '24小時內聯繫';
    return '觀察意願，適時跟進';
  }

  /**
   * 計算漏斗數據（基於學生狀態）
   */
  private calculateFunnelData(purchaseData: any[]): TotalReportData['funnelData'] {
    // 統計各狀態的學生數
    const statusCounts = {
      未開始: 0,
      體驗中: 0,
      已轉高: 0,
      未轉高: 0,
    };

    purchaseData.forEach(row => {
      const status = resolveField(row.data, 'status') ||
                     resolveField(row.data, 'currentStatus') ||
                     '';

      if (status === '未開始') statusCounts.未開始++;
      else if (status === '體驗中') statusCounts.體驗中++;
      else if (status === '已轉高') statusCounts.已轉高++;
      else if (status === '未轉高') statusCounts.未轉高++;
    });

    return [
      {
        stage: '未開始',
        value: statusCounts.未開始,
        fill: 'hsl(var(--chart-1))'
      },
      {
        stage: '體驗中',
        value: statusCounts.體驗中,
        fill: 'hsl(var(--chart-2))'
      },
      {
        stage: '已轉高',
        value: statusCounts.已轉高,
        fill: 'hsl(var(--chart-3))',
        lostStudents: statusCounts.未轉高  // 添加流失學生數
      },
    ];
  }

  /**
   * 計算課程類別分佈
   */
  private calculateCategoryBreakdown(purchaseData: any[]): TotalReportData['categoryBreakdown'] {
    const categoryMap = new Map<string, number>();
    const total = purchaseData.length;

    purchaseData.forEach(row => {
      const category = row.data.courseType || row.data.plan || row.data['課程類型'] || '未分類';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const breakdown: TotalReportData['categoryBreakdown'] = [];
    categoryMap.forEach((count, name) => {
      breakdown.push({
        name,
        value: count,
        percentage: Math.round((count / total) * 10000) / 100,
      });
    });

    return breakdown.sort((a, b) => b.value - a.value);
  }

  /**
   * 計算趨勢數據
   */
  private calculateTrendData(
    period: PeriodType,
    dateRange: { start: string; end: string },
    attendanceData: any[],
    purchaseData: any[]
  ): TotalReportData['trendData'] {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const trendData: TotalReportData['trendData'] = [];

    // 根據期間類型產生不同粒度的數據點
    if (period === 'daily') {
      // Daily: 按小時統計（簡化版：返回當日總計）
      const dayData: Record<string, { trials: number; conversions: number; revenue: number }> = {};

      attendanceData.forEach(row => {
        const dateValue = parseDateField(resolveField(row.data, 'classDate'));
        if (dateValue) {
          const dateKey = format(dateValue, 'yyyy-MM-dd');
          if (!dayData[dateKey]) {
            dayData[dateKey] = { trials: 0, conversions: 0, revenue: 0 };
          }
          dayData[dateKey].trials++;
        }
      });

      purchaseData.forEach(row => {
        const dateValue = parseDateField(resolveField(row.data, 'purchaseDate')) ||
                          parseDateField(resolveField(row.data, 'classDate'));
        const revenueValue = parseNumberField(resolveField(row.data, 'dealAmount')) || 45000;

        if (dateValue) {
          const dateKey = format(dateValue, 'yyyy-MM-dd');
          if (!dayData[dateKey]) {
            dayData[dateKey] = { trials: 0, conversions: 0, revenue: 0 };
          }
          dayData[dateKey].conversions++;
          dayData[dateKey].revenue += revenueValue;
        }
      });

      Object.keys(dayData).sort().forEach(dateKey => {
        const data = dayData[dateKey];
        trendData.push({
          date: dateKey,
          trials: data.trials,
          conversions: data.conversions,
          revenue: data.revenue,
          contactRate: data.trials > 0 ? (data.conversions / data.trials) * 100 : 0,
        });
      });
    } else if (period === 'weekly') {
      // Weekly: 按天統計
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      days.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');

        const dayTrials = attendanceData.filter(row => {
          const dateValue = parseDateField(resolveField(row.data, 'classDate'));
          return dateValue && format(dateValue, 'yyyy-MM-dd') === dayKey;
        }).length;

        const dayPurchases = purchaseData.filter(row => {
          const dateValue = parseDateField(resolveField(row.data, 'purchaseDate')) ||
                            parseDateField(resolveField(row.data, 'classDate'));
          return dateValue && format(dateValue, 'yyyy-MM-dd') === dayKey;
        });

        const dayRevenue = dayPurchases.reduce((sum, row) => {
          const amount = parseNumberField(resolveField(row.data, 'dealAmount')) || 45000;
          return sum + amount;
        }, 0);

        trendData.push({
          date: dayKey,
          trials: dayTrials,
          conversions: dayPurchases.length,
          revenue: dayRevenue,
          contactRate: dayTrials > 0 ? (dayPurchases.length / dayTrials) * 100 : 0,
        });
      });
    } else if (period === 'monthly') {
      // Monthly: 按天統計
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      days.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');

        const dayTrials = attendanceData.filter(row => {
          const dateValue = parseDateField(resolveField(row.data, 'classDate'));
          return dateValue && format(dateValue, 'yyyy-MM-dd') === dayKey;
        }).length;

        const dayPurchases = purchaseData.filter(row => {
          const dateValue = parseDateField(resolveField(row.data, 'purchaseDate')) ||
                            parseDateField(resolveField(row.data, 'classDate'));
          return dateValue && format(dateValue, 'yyyy-MM-dd') === dayKey;
        });

        const dayRevenue = dayPurchases.reduce((sum, row) => {
          const amount = parseNumberField(resolveField(row.data, 'dealAmount')) || 45000;
          return sum + amount;
        }, 0);

        trendData.push({
          date: dayKey,
          trials: dayTrials,
          conversions: dayPurchases.length,
          revenue: dayRevenue,
          contactRate: dayTrials > 0 ? (dayPurchases.length / dayTrials) * 100 : 0,
        });
      });
    }

    // 如果沒有任何數據，返回期間起始日的空數據點
    if (trendData.length === 0) {
      return [{
        date: dateRange.start,
        trials: 0,
        conversions: 0,
        revenue: 0,
        contactRate: 0,
      }];
    }

    return trendData;
  }

  /**
   * 產生 AI 建議（根據 KPI 動態生成）
   */
  private generateAISuggestions(
    metrics: TotalReportData['summaryMetrics'],
    teachers: TotalReportData['teacherInsights'],
    students: TotalReportData['studentInsights'],
    period: PeriodType,
    previousMetrics?: any
  ): TotalReportData['aiSuggestions'] {
    const daily: string[] = [];
    const weekly: string[] = [];
    const monthly: string[] = [];
    let periodComparison: string | undefined;

    // ========================================
    // Daily 建議（立即行動）
    // ========================================
    const highIntentStudents = students.filter(s => s.intentScore > 80 && s.status === 'pending');
    const mediumIntentStudents = students.filter(s => s.intentScore > 60 && s.intentScore <= 80 && s.status === 'pending');
    const contactedStudents = students.filter(s => s.status === 'contacted');

    if (highIntentStudents.length > 0) {
      daily.push(`🔥 緊急：${highIntentStudents.length} 位高意願學員待聯繫（意願分數 > 80）`);
    }
    if (mediumIntentStudents.length > 0) {
      daily.push(`⚠️ 重要：${mediumIntentStudents.length} 位中意願學員建議 24 小時內聯繫`);
    }
    if (contactedStudents.length > 5) {
      daily.push(`📞 追蹤：${contactedStudents.length} 位學員已聯繫，待確認成交狀態`);
    }
    if (metrics.totalTrials > 0 && metrics.totalConversions === 0) {
      daily.push(`⚡ 注意：今日有 ${metrics.totalTrials} 位體驗課學員，但尚無成交記錄`);
    }

    // ========================================
    // Weekly 建議（策略調整）
    // ========================================
    if (metrics.conversionRate < 15) {
      weekly.push(`📉 轉換率 ${metrics.conversionRate.toFixed(1)}% 低於目標（15%），建議檢視聯繫話術與流程`);
    } else if (metrics.conversionRate > 25) {
      weekly.push(`📈 轉換率 ${metrics.conversionRate.toFixed(1)}% 表現優異，維持當前策略`);
    }

    if (metrics.avgConversionTime > 10) {
      weekly.push(`⏰ 平均轉換時間 ${metrics.avgConversionTime} 天偏長，建議加強即時跟進`);
    } else if (metrics.avgConversionTime < 5) {
      weekly.push(`⚡ 平均轉換時間 ${metrics.avgConversionTime} 天，成交速度優秀`);
    }

    if (teachers.length > 0) {
      const topTeacher = teachers[0];
      const bottomTeacher = teachers[teachers.length - 1];
      weekly.push(`🏆 ${topTeacher.teacherName} 表現最佳，轉換率 ${topTeacher.conversionRate.toFixed(1)}%（${topTeacher.classCount} 堂課）`);
      if (teachers.length > 1 && bottomTeacher.conversionRate < 10) {
        weekly.push(`📚 ${bottomTeacher.teacherName} 轉換率 ${bottomTeacher.conversionRate.toFixed(1)}%，建議安排培訓或觀摩`);
      }
    }

    if (metrics.trialCompletionRate < 50) {
      weekly.push(`⚠️ 體驗課完成率僅 ${metrics.trialCompletionRate.toFixed(1)}%，建議檢視課程吸引力`);
    }

    // ========================================
    // Monthly 建議（長期規劃）
    // ========================================
    if (metrics.pendingStudents > 10) {
      monthly.push(`💰 本月累積 ${metrics.pendingStudents} 位待追蹤學員，潛在收益 NT$ ${metrics.potentialRevenue.toLocaleString()}`);
    }

    if (metrics.totalTrials < 20) {
      monthly.push(`📊 本月體驗課人數 ${metrics.totalTrials} 位偏低，建議加強招生活動`);
    } else if (metrics.totalTrials > 50) {
      monthly.push(`🎯 本月體驗課人數 ${metrics.totalTrials} 位，招生成效良好`);
    }

    if (metrics.totalConversions > 0) {
      const avgRevenue = metrics.potentialRevenue / Math.max(1, metrics.pendingStudents);
      monthly.push(`💵 平均客單價約 NT$ ${avgRevenue.toLocaleString()}，已成交 ${metrics.totalConversions} 位`);
    }

    // 整體評估
    if (metrics.conversionRate > 20 && metrics.avgConversionTime < 7) {
      monthly.push(`🎉 整體表現優秀！轉換率與速度都達標，建議擴大招生規模`);
    } else if (metrics.conversionRate < 10 || metrics.avgConversionTime > 14) {
      monthly.push(`🔍 建議深入分析流失原因：轉換率或轉換時間需要改善`);
    }

    // ========================================
    // 🆕 AI 期間對比分析
    // ========================================
    if (previousMetrics && metrics.comparison) {
      const insights: string[] = [];
      const { comparison } = metrics;

      // 轉換率分析
      if (comparison.conversionRate) {
        const { trend, changePercent, current, previous } = comparison.conversionRate;
        if (trend === 'up' && changePercent > 10) {
          insights.push(`✨ 轉換率顯著提升 ${Math.abs(changePercent).toFixed(1)}%（${previous.toFixed(1)}% → ${current.toFixed(1)}%），表現優異`);
        } else if (trend === 'down' && Math.abs(changePercent) > 10) {
          insights.push(`⚠️ 轉換率下降 ${Math.abs(changePercent).toFixed(1)}%（${previous.toFixed(1)}% → ${current.toFixed(1)}%），需要關注`);
        } else if (trend === 'stable') {
          insights.push(`📊 轉換率維持穩定（${current.toFixed(1)}%）`);
        }
      }

      // 體驗課數量分析
      if (comparison.totalTrials) {
        const { trend, change, current, previous } = comparison.totalTrials;
        if (trend === 'up' && change > 5) {
          insights.push(`📈 體驗課數量增加 ${change} 位（${previous} → ${current}），招生動能良好`);
        } else if (trend === 'down' && Math.abs(change) > 5) {
          insights.push(`📉 體驗課數量減少 ${Math.abs(change)} 位（${previous} → ${current}），建議加強招生`);
        }
      }

      // 成交數分析
      if (comparison.totalConversions) {
        const { trend, change, current, previous } = comparison.totalConversions;
        if (trend === 'up' && change > 0) {
          insights.push(`💰 成交數增加 ${change} 位（${previous} → ${current}）`);
        } else if (trend === 'down' && change < 0) {
          insights.push(`⚠️ 成交數減少 ${Math.abs(change)} 位（${previous} → ${current}）`);
        }
      }

      // 完課率分析
      if (comparison.trialCompletionRate) {
        const { trend, changePercent, current, previous } = comparison.trialCompletionRate;
        if (trend === 'up' && changePercent > 5) {
          insights.push(`👍 完課率提升（${previous.toFixed(1)}% → ${current.toFixed(1)}%），學員參與度提高`);
        } else if (trend === 'down' && Math.abs(changePercent) > 5) {
          insights.push(`📌 完課率下降（${previous.toFixed(1)}% → ${current.toFixed(1)}%），建議檢視課程安排`);
        }
      }

      // 綜合建議
      if (insights.length === 0) {
        periodComparison = '📊 本期與前期表現相近，建議持續優化現有流程。';
      } else if (insights.filter(i => i.includes('✨') || i.includes('📈') || i.includes('💰')).length >= 2) {
        periodComparison = `🎉 整體表現向上！${insights.join('；')}。請繼續保持並分享成功經驗。`;
      } else if (insights.filter(i => i.includes('⚠️') || i.includes('📉')).length >= 2) {
        periodComparison = `⚠️ 多項指標下滑。${insights.join('；')}。建議召開團隊會議檢討改善方案。`;
      } else {
        periodComparison = insights.join('；') + '。';
      }
    }

    return { daily, weekly, monthly, periodComparison };
  }

  /**
   * Convert Supabase data to internal format
   */
  private convertSupabaseToInternalFormat(supabaseData: SupabaseDataRow[]): any[] {
    return supabaseData.map(row => {
      // Parse dealAmount from raw_data if not in normalized fields
      let dealAmount = row.deal_amount;
      if (!dealAmount && row.raw_data) {
        const rawAmount = resolveField(row.raw_data, 'dealAmount');
        dealAmount = parseNumberField(rawAmount) || undefined;
      }

      // Parse actual_amount（eods_for_closers 專用）
      // actual_amount 可能是字串格式（如 "NT$68,000.00"），需要解析為數字
      let actualAmount: number | undefined = undefined;
      if (row.actual_amount) {
        actualAmount = parseNumberField(row.actual_amount) || undefined;
      } else if (row.raw_data) {
        const rawActualAmount = resolveField(row.raw_data, 'actualAmount');
        actualAmount = parseNumberField(rawActualAmount) || undefined;
      }

      return {
        id: row.id,
        data: {
          // Use normalized fields from Supabase
          studentName: row.student_name,
          studentEmail: row.student_email,
          teacher: row.teacher_name || row.teacher_name,
          teacherName: row.teacher_name,
          classDate: row.class_date,
          purchaseDate: row.purchase_date,
          dealDate: row.deal_date,
          courseType: row.course_type,
          dealAmount: dealAmount,  // Use parsed amount
          actual_amount: actualAmount,  // ✅ 新增：eods_for_closers 的實收金額
          status: row.status,
          intentScore: row.intent_score,
          satisfaction: row.satisfaction,
          attended: row.attended,
          plan: row.plan,
          // Include original raw_data for any additional fields
          ...row.raw_data,
        },
        lastUpdated: new Date(row.synced_at),
      };
    });
  }

  /**
   * 根據用戶權限過濾資料
   */
  private async filterDataByPermission(data: any[], userId: string, tableName: string): Promise<any[]> {
    try {
      // 開發模式跳過權限過濾
      if (process.env.SKIP_AUTH === 'true') {
        console.log(`[Permission Filter] SKIP_AUTH enabled - no filtering`);
        return data;
      }

      // 取得使用者資訊（包含業務身份）
      const userResult = await queryDatabase('SELECT id, roles FROM users WHERE id = $1', [userId]);

      if (userResult.rows.length === 0) {
        console.warn(`User not found: ${userId}`);
        return [];
      }

      const user = userResult.rows[0];
      const userRoles: string[] = user.roles || [];

      // 如果是 admin 或 manager，看所有資料
      if (userRoles.includes('admin') || userRoles.includes('super_admin') || userRoles.includes('manager')) {
        console.log(`[Permission Filter] Admin/Manager user ${userId} - no filtering`);
        return data;
      }

      // 🆕 新權限系統：檢查 scope 設定
      // 取得該資料表對應的權限模組
      const moduleIdMap: { [key: string]: string } = {
        'trial_class_attendance': 'trial_class_report',
        'trial_class_purchases': 'trial_class_report',
        'eods_for_closers': 'trial_class_report',  // ✅ 新增：eods_for_closers 也屬於體驗課報表
        'telemarketing_calls': 'telemarketing_system',
      };

      const moduleId = moduleIdMap[tableName];
      if (moduleId) {
        // 查詢使用者對該模組的權限 scope
        const permissionResult = await queryDatabase(`
          SELECT scope
          FROM user_permissions
          WHERE user_id = $1 AND module_id = $2 AND is_active = true
        `, [userId, moduleId]);

        if (permissionResult.rows.length > 0) {
          const scope = permissionResult.rows[0].scope;
          console.log(`[Permission Filter] User ${userId} has ${moduleId} permission with scope: ${scope}`);

          // 如果 scope 是 'all'，直接回傳所有資料
          if (scope === 'all') {
            console.log(`[Permission Filter] Scope is 'all' - returning all data`);
            return data;
          }

          // 如果 scope 是 'own_only'，繼續使用下面的過濾邏輯
          console.log(`[Permission Filter] Scope is 'own_only' - filtering by identity`);
        }
      }

      // 取得主要角色（用於過濾邏輯）
      const primaryRole = userRoles.find(r => ['teacher', 'consultant', 'setter'].includes(r)) || userRoles[0];

      // 取得業務身份
      const identitiesResult = await queryDatabase(`
        SELECT identity_type, identity_code
        FROM business_identities
        WHERE user_id = $1 AND is_active = true
      `, [userId]);

      const identities: { [key: string]: string[] } = {};
      identitiesResult.rows.forEach((row: any) => {
        const type = row.identity_type;
        if (!identities[type]) {
          identities[type] = [];
        }
        identities[type].push(row.identity_code);
      });

      console.log(`[Permission Filter] User ${userId} primaryRole=${primaryRole}, roles=${userRoles.join(',')}, identities:`, identities);

      // 根據資料表類型進行過濾（需要 await，因為 matchTrialClassAttendance 是 async）
      const filteredData: any[] = [];
      for (const item of data) {
        const itemData = item.data || item;
        let matches = false;

        switch (tableName) {
          case 'trial_class_attendance':
            matches = await this.matchTrialClassAttendance(itemData, primaryRole, userRoles, identities, userId);
            break;

          case 'trial_class_purchases':
            matches = await this.matchTrialClassPurchases(itemData, primaryRole, userRoles, identities, userId);
            break;

          case 'telemarketing_calls':
            matches = this.matchTelemarketingCalls(itemData, primaryRole, userRoles, identities, userId);
            break;

          default:
            // 預設：只看自己創建的
            matches = itemData.created_by === userId;
        }

        if (matches) {
          filteredData.push(item);
        }
      }

      console.log(`[Permission Filter] ${tableName}: ${data.length} -> ${filteredData.length} records`);
      return filteredData;

    } catch (error) {
      console.error('Error filtering data by permission:', error);
      // 發生錯誤時，為了安全起見，回傳空陣列
      return [];
    }
  }

  /**
   * 檢查體驗課出席記錄是否符合權限
   */
  private async matchTrialClassAttendance(item: any, primaryRole: string, allRoles: string[], identities: any, userId: string): Promise<boolean> {
    // Manager 看所有
    if (allRoles.includes('manager')) {
      return true;
    }

    // Teacher 看自己的課
    if (allRoles.includes('teacher')) {
      const teacherCode = item.teacher_code || item.teacherCode || item.raw_data?.teacher_code;

      // 如果有 teacher_code，比對 teacher_code
      if (teacherCode && identities.teacher && identities.teacher.includes(teacherCode)) {
        return true;
      }

      // 如果沒有 teacher_code，比對 teacher_name
      const teacherName = item.teacher_name || item.teacherName || item.raw_data?.teacher_name || item.raw_data?.授課老師;
      if (teacherName) {
        // 取得該 teacher_name 對應的使用者
        const userResult = await queryDatabase('SELECT id, first_name FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length > 0) {
          const userName = userResult.rows[0].first_name;
          if (teacherName.includes(userName)) {
            return true;
          }
        }
      }
    }

    // Consultant 看自己的學生
    if (allRoles.includes('consultant')) {
      const consultantCode = item.consultant_code || item.consultantCode || item.raw_data?.consultant_code;
      if (consultantCode && identities.consultant && identities.consultant.includes(consultantCode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 檢查購買記錄是否符合權限
   */
  private async matchTrialClassPurchases(item: any, primaryRole: string, allRoles: string[], identities: any, userId: string): Promise<boolean> {
    // Manager 看所有
    if (allRoles.includes('manager')) {
      return true;
    }

    // 檢查購買記錄中的教師/諮詢師資訊
    const teacherCode = item.teacher_code || item.teacherCode || item.raw_data?.teacher_code;
    const consultantCode = item.consultant_code || item.consultantCode || item.raw_data?.consultant_code;
    const studentName = item.student_name || item.studentName || item.raw_data?.student_name || item.raw_data?.學員姓名;

    // Teacher 看自己相關的購買記錄
    if (allRoles.includes('teacher')) {
      // 方法1: 通過 teacher_code 過濾
      if (teacherCode && identities.teacher && identities.teacher.includes(teacherCode)) {
        return true;
      }

      // 方法2: 如果沒有 teacher_code，嘗試通過學生姓名關聯到出席記錄
      if (studentName) {
        try {
          const attendanceResult = await queryDatabase(`
            SELECT teacher_code, teacher_name
            FROM trial_class_attendance
            WHERE student_name = $1
            LIMIT 1
          `, [studentName]);

          if (attendanceResult.rows.length > 0) {
            const attendanceTeacherCode = attendanceResult.rows[0].teacher_code;
            if (attendanceTeacherCode && identities.teacher && identities.teacher.includes(attendanceTeacherCode)) {
              return true;
            }
          }
        } catch (error) {
          console.error('Error querying attendance for purchase filtering:', error);
        }
      }
    }

    // Consultant 看自己相關的購買記錄
    if (allRoles.includes('consultant')) {
      if (consultantCode && identities.consultant && identities.consultant.includes(consultantCode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 檢查電訪記錄是否符合權限
   */
  private matchTelemarketingCalls(item: any, primaryRole: string, allRoles: string[], identities: any, userId: string): boolean {
    // Manager 看所有
    if (allRoles.includes('manager')) {
      return true;
    }

    // Consultant 看自己的電訪
    if (allRoles.includes('consultant')) {
      const consultantCode = item.closer_code || item.closerCode;
      if (consultantCode && identities.consultant && identities.consultant.includes(consultantCode)) {
        return true;
      }
    }

    // Setter 看自己的電訪
    if (allRoles.includes('setter')) {
      const setterCode = item.setter_code || item.setterCode;
      if (setterCode && identities.setter && identities.setter.includes(setterCode)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 判斷是否需要取得前一時段資料
   */
  private shouldFetchPreviousPeriod(period: PeriodType): boolean {
    // 'all' 和 'custom' 不需要對比
    return !['all', 'custom'].includes(period);
  }

  /**
   * 計算前一時段的日期範圍
   */
  private getPreviousPeriodDateRange(period: PeriodType, baseDate: Date): { start: string; end: string } {
    switch (period) {
      case 'daily':
      case 'day':
        const previousDay = subDays(baseDate, 1);
        return {
          start: format(previousDay, 'yyyy-MM-dd'),
          end: format(previousDay, 'yyyy-MM-dd'),
        };
      case 'weekly':
      case 'week':
        const previousWeekDate = subWeeks(baseDate, 1);
        return {
          start: format(startOfWeek(previousWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(previousWeekDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        };
      case 'lastWeek':
        // lastWeek 的前一期是兩週前
        const twoWeeksAgo = subWeeks(baseDate, 2);
        return {
          start: format(startOfWeek(twoWeeksAgo, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          end: format(endOfWeek(twoWeeksAgo, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        };
      case 'monthly':
      case 'month':
        const previousMonth = subMonths(baseDate, 1);
        return {
          start: format(startOfMonth(previousMonth), 'yyyy-MM-dd'),
          end: format(endOfMonth(previousMonth), 'yyyy-MM-dd'),
        };
      default:
        return {
          start: format(startOfMonth(baseDate), 'yyyy-MM-dd'),
          end: format(endOfMonth(baseDate), 'yyyy-MM-dd'),
        };
    }
  }

  /**
   * 計算指標比較
   */
  private calculateMetricComparison(current: number, previous: number): {
    current: number;
    previous: number;
    change: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  } {
    const change = current - previous;
    const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
    let trend: 'up' | 'down' | 'stable' = 'stable';

    if (Math.abs(changePercent) < 1) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      current,
      previous,
      change,
      changePercent,
      trend
    };
  }
}

export const totalReportService = new TotalReportService();

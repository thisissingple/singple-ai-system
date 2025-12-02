/**
 * KPI Calculator - 統一運算中心
 * 所有 KPI 計算邏輯集中在這裡
 * AI 只需修改這個檔案就能新增 KPI
 */

import { reportMetricConfigService } from './reporting/report-metric-config-service';
import { formulaEngine } from './reporting/formula-engine';
import { resolveField, parseDateField, parseNumberField } from './reporting/field-mapping-v2';
import { queryDatabase } from './pg-client';

export interface RawData {
  attendance: any[];
  purchases: any[];
  deals: any[];
}

export interface CalculatedKPIs {
  conversionRate: number;
  avgConversionTime: number;
  trialCompletionRate: number;
  pendingStudents: number;      // Deprecated, use startRate instead
  startRate: number;            // 開始率：已開始學員 / 總學員數 * 100
  potentialRevenue: number;
  totalTrials: number;
  totalConsultations: number;   // 總諮詢記錄數（來自 eods_for_closers 表）
  totalConversions: number;     // 已成交數（有成交金額的記錄）
  pendingConsultations: number; // 待成交數
}

export interface BaseVariable {
  value: number;
  source: string;
  originalValue?: number;
}

export interface IntermediateCalculation {
  value: number;
  calculation?: {
    [key: string]: any;
    formula: string;
    result: number;
  };
  warnings?: string[];
}

export interface KPICalculationDetail {
  metricId: string;
  label: string;
  description: string;
  formula: string;
  isCustomFormula: boolean;
  variables: Record<string, number>;
  substitutedFormula: string;
  rawResult: number;
  finalResult: number;
  unit?: string;
  warnings?: string[];
}

export interface CalculationDetail {
  step1_baseVariables: Record<string, BaseVariable>;
  step2_intermediateCalculations: Record<string, IntermediateCalculation>;
  step3_formulaContext: Record<string, number>;
  step4_kpiCalculations: KPICalculationDetail[];
}

// 🆕 Structured warning with actionable fix button
export interface DataQualityWarning {
  message: string;
  type: 'missing_plan' | 'missing_email' | 'db_error' | 'generic';
  severity: 'error' | 'warning' | 'info';
  actionLabel?: string;
  actionRoute?: string;
  actionParams?: Record<string, any>;
}

export interface KPICalculationResult {
  summaryMetrics: CalculatedKPIs;
  calculationDetail: CalculationDetail;
  warnings: string[];
  structuredWarnings?: DataQualityWarning[]; // 🆕 Structured warnings
}

/**
 * 計算所有 KPI（新版：回傳詳細計算過程）
 * @param rawData 原始資料（來自 Supabase 或 Storage）
 * @returns 包含 summaryMetrics、calculationDetail 和 warnings 的完整結果
 */
export async function calculateAllKPIs(
  rawData: RawData
): Promise<KPICalculationResult> {
  const warnings: string[] = [];
  const structuredWarnings: DataQualityWarning[] = [];
  const { attendance, purchases, deals } = rawData;

  // ========================================
  // 第 1 步：準備基礎變數（從 raw data 萃取）
  // ========================================
  const totalTrials = attendance.length;

  // 💡 直接從資料庫查詢總諮詢記錄數（不受權限過濾影響）
  let totalConsultations = deals.length; // 預設值
  try {
    const result = await queryDatabase('SELECT COUNT(*) as count FROM eods_for_closers');
    totalConsultations = parseInt(result.rows[0].count, 10);
    console.log('📊 資料庫實際諮詢記錄數:', totalConsultations);
  } catch (error) {
    console.warn('⚠️ 無法查詢諮詢記錄總數，使用 deals.length:', deals.length);
  }

  // ========================================
  // 💡 動態計算學生狀態（不依賴 current_status 欄位）
  // 邏輯與 total-report-service.ts 的 calculateStudentInsights 一致
  // ========================================

  console.log('🔍 購買記錄總數:', purchases.length);
  console.log('🔍 體驗課打卡記錄:', attendance.length);
  console.log('🔍 成交記錄:', deals.length);

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
    console.log('✅ 已轉高學生數（SQL 查詢）:', convertedStudentsSet.size);
  } catch (error) {
    console.warn('⚠️ 無法查詢已轉高學生，將使用原有邏輯');
  }

  // Step 0: 批量查詢所有方案的總堂數（提升效能）
  const planNamesSet = new Set<string>();
  purchases.forEach((purchase) => {
    const packageName = purchase.plan || purchase.data?.成交方案 || purchase.data?.plan || '';
    if (packageName) planNamesSet.add(packageName);
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
      const warningMessage = `⚠️ 以下 ${missingPlans.length} 個方案尚未定義在 course_plans 表中，將使用原始資料的堂數：\n` +
        missingPlans.map(p => `  - "${p}"`).join('\n');
      warnings.push(warningMessage);

      // 🆕 Add structured warning with action button
      structuredWarnings.push({
        message: warningMessage,
        type: 'missing_plan',
        severity: 'warning',
        actionLabel: '前往課程方案設定',
        actionRoute: '/settings/course-plans',
        actionParams: { missingPlans }
      });
    }
  } catch (error) {
    console.error('Error querying course_plans:', error);
    const errorMsg = '⚠️ 無法查詢 course_plans 表，將使用原始資料的堂數';
    warnings.push(errorMsg);

    // 🆕 Add structured warning for database error
    structuredWarnings.push({
      message: errorMsg,
      type: 'db_error',
      severity: 'error',
      actionLabel: '檢查資料庫連線',
      actionRoute: '/settings/data-sources'
    });
  }

  console.log(`📋 已載入 ${planTotalClassesMap.size} 個方案的堂數定義`);

  // 建立學生資料結構（以 email 為 key）
  const studentMap = new Map<string, {
    email: string;
    totalTrialClasses: number;
    attendedClasses: number;
    remainingClasses: number;
    classDates: Date[];
    dealAmount: number;
    currentStatus: '未開始' | '體驗中' | '已轉高' | '未轉高';
    trialPurchaseDate: Date | null;  // 🆕 體驗課購買日期
  }>();

  // Step 1: 從 purchases 建立學生基礎資料
  purchases.forEach((purchase) => {
    const email = (
      purchase.student_email ||
      purchase.data?.student_email ||
      purchase.data?.studentEmail ||
      purchase.data?.email ||
      resolveField(purchase.data, 'studentEmail') ||
      ''
    ).toString().trim().toLowerCase();

    if (!email) return;

    const packageName = purchase.plan || purchase.data?.成交方案 || purchase.data?.plan || '';

    // 🆕 優先從 course_plans 表查詢總堂數
    let totalTrialClasses: number;
    const planTotalFromDB = packageName ? planTotalClassesMap.get(packageName) : null;

    if (planTotalFromDB !== null && planTotalFromDB !== undefined) {
      // ✅ 從 course_plans 表取得總堂數
      totalTrialClasses = planTotalFromDB;
    } else {
      // ⚠️ Fallback: 從方案名稱提取數字（如 "4堂"）
      const match = packageName?.match(/(\d+)堂/);
      if (match) {
        totalTrialClasses = parseInt(match[1], 10);
      } else {
        // 找不到則警告並設為 0
        console.warn(`⚠️ [KPI] 未知課程方案「${packageName}」，請到 course_plans 表新增`);
        totalTrialClasses = 0;
      }
    }

    // 🆕 取得體驗課購買日期
    const trialPurchaseDate = parseDateField(
      purchase.purchase_date ||
      purchase.data?.purchase_date ||
      purchase.data?.purchaseDate ||
      purchase.data?.購買日期
    );

    studentMap.set(email, {
      email,
      totalTrialClasses,
      attendedClasses: 0,
      remainingClasses: totalTrialClasses,
      classDates: [],
      dealAmount: 0,
      currentStatus: '未開始',
      trialPurchaseDate,  // 🆕 儲存體驗課購買日期
    });
  });

  // Step 2: 從 attendance 收集上課日期
  attendance.forEach((att) => {
    const email = (
      att.student_email ||
      att.data?.student_email ||
      att.data?.studentEmail ||
      resolveField(att.data, 'studentEmail') ||
      ''
    ).toString().trim().toLowerCase();

    if (!email) return;

    const classDate = parseDateField(resolveField(att.data, 'classDate'));

    if (!studentMap.has(email)) {
      // 有打卡記錄但沒有購買記錄的學生
      studentMap.set(email, {
        email,
        totalTrialClasses: 0,
        attendedClasses: 0,
        remainingClasses: 0,
        classDates: [],
        dealAmount: 0,
        currentStatus: '未開始',
        trialPurchaseDate: null,  // 🆕 沒有購買記錄
      });
    }

    const student = studentMap.get(email)!;
    if (classDate) {
      student.classDates.push(classDate);
      student.attendedClasses += 1;
    }
  });

  // Step 3: 從 deals 累計高階方案成交金額（只計算體驗課後的成交）
  const trialStudentEmails = new Set(studentMap.keys());
  const dateValidationWarnings: string[] = [];
  let skippedDealsCount = 0;

  deals.forEach((deal) => {
    const email = (
      deal.student_email ||
      deal.data?.student_email ||
      deal.data?.studentEmail ||
      deal.data?.email ||
      ''
    ).toString().trim().toLowerCase();

    if (!email || !trialStudentEmails.has(email)) return;

    const plan = (
      deal.plan ||
      deal.data?.plan ||
      deal.data?.成交方案 ||
      ''
    );

    const isHighLevel = plan.includes('高階一對一訓練');

    if (isHighLevel) {
      const student = studentMap.get(email)!;

      // 🆕 取得成交日期
      const dealDate = parseDateField(
        deal.deal_date ||
        deal.data?.deal_date ||
        deal.data?.dealDate ||
        deal.data?.成交日期
      );

      // 🆕 使用體驗課購買日期作為基準（而非上課日期）
      const trialPurchaseDate = student.trialPurchaseDate;

      // 🆕 嚴格檢查：只計算「體驗課購買後」的成交
      if (!trialPurchaseDate) {
        // 學生沒有體驗課購買記錄，無法判斷時序
        if (!dateValidationWarnings.includes(`學員 ${email} 無體驗課購買記錄，無法計算轉換`)) {
          dateValidationWarnings.push(`學員 ${email} 無體驗課購買記錄，無法計算轉換`);
        }
        skippedDealsCount++;
        return;
      }

      if (!dealDate) {
        // 成交記錄缺少日期
        if (!dateValidationWarnings.includes(`學員 ${email} 的成交記錄缺少成交日期`)) {
          dateValidationWarnings.push(`學員 ${email} 的成交記錄缺少成交日期`);
        }
        skippedDealsCount++;
        return;
      }

      // ✅ 只計算「體驗課購買日期當天或之後」的成交
      if (dealDate >= trialPurchaseDate) {
        const amount = parseNumberField(
          deal.actual_amount ||
          deal.data?.actual_amount ||
          resolveField(deal.data, 'dealAmount')
        ) || 0;
        student.dealAmount += amount;
      } else {
        // 成交日期在體驗課購買日期之前，不計入
        skippedDealsCount++;
      }
    }
  });

  // 🆕 記錄日期驗證警告
  if (dateValidationWarnings.length > 0) {
    warnings.push(`❗ 資料品質警告：${dateValidationWarnings.length} 筆成交記錄因日期問題被跳過`);
    warnings.push(...dateValidationWarnings.slice(0, 5));  // 最多顯示 5 筆詳細警告
    if (dateValidationWarnings.length > 5) {
      warnings.push(`... 以及其他 ${dateValidationWarnings.length - 5} 筆`);
    }
  }

  // Step 4: 重新計算剩餘堂數和狀態
  studentMap.forEach((student) => {
    student.remainingClasses = Math.max(0, student.totalTrialClasses - student.attendedClasses);

    const hasAttendance = student.classDates.length > 0;
    const noRemainingClasses = student.remainingClasses === 0;

    // 🆕 使用 SQL 查詢結果判斷是否已轉高（更準確）
    const normalizedEmail = student.email.toLowerCase().trim();
    const isConverted = convertedStudentsSet.has(normalizedEmail);

    // 狀態計算邏輯
    if (isConverted) {
      student.currentStatus = '已轉高';
    } else if (noRemainingClasses && hasAttendance) {
      student.currentStatus = '未轉高';
    } else if (hasAttendance) {
      student.currentStatus = '體驗中';
    } else {
      student.currentStatus = '未開始';
    }
  });

  console.log('📊 去重後學生數:', studentMap.size);

  // 統計各狀態的學生數
  const statusCounts = {
    '已轉高': 0,
    '未轉高': 0,
    '體驗中': 0,
    '未開始': 0,
  };

  studentMap.forEach((student) => {
    statusCounts[student.currentStatus]++;
  });

  console.log('📊 狀態分布:', statusCounts);

  // 計算「已轉高」的唯一學生數
  const convertedStudentsCount = statusCounts['已轉高'];

  // 計算「已上完課」的唯一學生數（已轉高 + 未轉高）
  const completedStudentsCount = statusCounts['已轉高'] + statusCounts['未轉高'];

  // 計算已成交數（從 deals 表，有 actual_amount > 0 的記錄）
  const totalConversions = deals.filter(deal => {
    const amount = parseNumberField(deal.actual_amount || deal.data?.actual_amount);
    return amount && amount > 0;
  }).length;

  // 待成交數
  const pendingConsultations = totalConsultations - totalConversions;

  const totalPurchases = purchases.length;
  const totalStudents = studentMap.size; // 總學生數

  // 💡 待跟進學生數 = 體驗中 + 未開始
  const pending = statusCounts['體驗中'] + statusCounts['未開始'];

  // 💡 開始率 = 已開始學員（體驗中 + 未轉高 + 已轉高）/ 總學員數 * 100
  const startedStudents = statusCounts['體驗中'] + statusCounts['未轉高'] + statusCounts['已轉高'];
  const startRate = totalStudents > 0 ? (startedStudents / totalStudents) * 100 : 0;

  // 記錄 Step 1 詳情
  // ========================================
  // 第 2 步：中間計算（平均轉換時間、總收益等）
  // ========================================

  // 計算平均轉換時間（從最早上課日期到成交日期）
  let avgConversionDays = 0; // 🔧 修正：預設值改為 0（無資料時顯示 0，而非誤導性的 7）
  let conversionTimeCount = 0;
  let totalConversionDays = 0;
  const conversionWarnings: string[] = [];

  // 🆕 只計算「已轉高」學生的轉換時間
  studentMap.forEach((student) => {
    if (student.currentStatus !== '已轉高' || student.dealAmount === 0) return;

    // 計算最早上課日期
    const firstClassDate = student.classDates.length > 0
      ? new Date(Math.min(...student.classDates.map(d => d.getTime())))
      : null;

    if (!firstClassDate) {
      // 已轉高但沒有上課記錄（異常情況）
      conversionWarnings.push(`學員 ${student.email} 已轉高但無上課記錄`);
      return;
    }

    // 找出該學生的高階方案成交記錄（且在上課後）
    deals.forEach((deal) => {
      const dealEmail = (
        deal.student_email ||
        deal.data?.student_email ||
        deal.data?.studentEmail ||
        deal.data?.email ||
        ''
      ).toString().trim().toLowerCase();

      if (dealEmail !== student.email) return;

      const plan = deal.plan || deal.data?.成交方案 || '';
      const isHighLevel = plan.includes('高階一對一訓練');

      if (!isHighLevel) return;

      const dealDate = parseDateField(
        deal.deal_date ||
        deal.data?.deal_date ||
        deal.data?.dealDate ||
        deal.data?.成交日期
      );

      if (!dealDate) return;

      // ✅ 只計算上課後的成交
      if (dealDate >= firstClassDate) {
        const daysDiff = Math.floor(
          (dealDate.getTime() - firstClassDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        totalConversionDays += daysDiff;
        conversionTimeCount++;
      }
    });
  });

  const unmatchedDeals = deals.length - conversionTimeCount;
  if (conversionTimeCount > 0) {
    avgConversionDays = Math.round(totalConversionDays / conversionTimeCount);
  } else if (statusCounts['已轉高'] > 0) {
    const warning = '無法計算平均轉換時間：已轉高學生缺少成交日期或上課日期';
    warnings.push(warning);
    conversionWarnings.push(warning);
  }

  // ========================================
  // 計算已成交金額和平均客單價（從 studentMap 取得）
  // ========================================
  const revenueWarnings: string[] = [];

  // 從 studentMap 計算總收益（已轉高學生的成交金額總和）
  let totalRevenue = 0;
  let highLevelStudentCount = 0;

  studentMap.forEach((student) => {
    if (student.dealAmount > 0) {
      totalRevenue += student.dealAmount;
      highLevelStudentCount++;
    }
  });

  // 平均客單價（基於已轉高學生）
  let avgDealAmount = 50000; // 預設值
  if (highLevelStudentCount > 0) {
    avgDealAmount = Math.round(totalRevenue / highLevelStudentCount);
  }

  // 計算各狀態學生數（用於待跟進學生 KPI）
  let inProgressStudents = 0;
  let notStartedStudents = 0;
  studentMap.forEach((student) => {
    if (student.currentStatus === '體驗中') inProgressStudents++;
    if (student.currentStatus === '未開始') notStartedStudents++;
  });

  const step1_baseVariables: Record<string, BaseVariable> = {
    totalTrials: {
      value: totalTrials,
      source: 'attendance.length',
    },
    totalConsultations: {
      value: totalConsultations,
      source: 'deals.length (包含已成交和未成交)',
    },
    convertedStudents: {
      value: convertedStudentsCount,
      source: '動態計算：有高階方案成交記錄的唯一學生數',
    },
    completedStudents: {
      value: completedStudentsCount,
      source: '動態計算：「已轉高」+「未轉高」的唯一學生數',
    },
    totalConversions: {
      value: totalConversions,
      source: 'deals.filter(actual_amount > 0).length',
    },
    pendingConsultations: {
      value: pendingConsultations,
      source: 'totalConsultations - totalConversions',
    },
    totalPurchases: {
      value: totalPurchases,
      source: 'purchases.length',
    },
    totalStudents: {
      value: totalStudents,
      source: 'studentMap.size (去重後的學生數)',
    },
    pending: {
      value: pending,
      source: '動態計算：「體驗中」+「未開始」的學生數',
    },
    startedStudents: {
      value: startedStudents,
      source: '動態計算：「體驗中」+「未轉高」+「已轉高」的學生數',
    },
    startRate: {
      value: startRate,
      source: '動態計算：startedStudents / totalStudents * 100',
    },
    // 🆕 平均轉換時間相關變數
    totalConversionDays: {
      value: totalConversionDays,
      source: '所有已轉高學生從體驗課到成交的天數總和',
    },
    validConversionPairs: {
      value: conversionTimeCount,
      source: '成功配對體驗課日期和成交日期的學生數',
    },
    // 🆕 已轉高實收金額
    potentialRevenue: {
      value: totalRevenue,
      source: '已轉高學生的高階方案實收金額總和',
    },
    // 🆕 待跟進學生相關變數
    inProgressStudents: {
      value: inProgressStudents,
      source: '動態計算：狀態為「體驗中」的學生數',
    },
    notStartedStudents: {
      value: notStartedStudents,
      source: '動態計算：狀態為「未開始」的學生數',
    },
  };

  // pending 自動修正為 0，不需警告
  // 成交記錄包含整個工作室，不只體驗課學生，無法對應是正常的

  // 記錄 Step 2 詳情
  const step2_intermediateCalculations: Record<string, IntermediateCalculation> = {
    avgConversionDays: {
      value: avgConversionDays,
      calculation: {
        totalDays: totalConversionDays,
        validPairs: conversionTimeCount,
        unmatchedDeals: unmatchedDeals,
        formula: 'totalDays / validPairs',
        result: avgConversionDays,
      },
      ...(conversionWarnings.length > 0 && { warnings: conversionWarnings }),
    },
    avgDealAmount: {
      value: avgDealAmount,
      calculation: {
        totalRevenue: totalRevenue,
        validDeals: highLevelStudentCount,
        totalDeals: deals.length,
        trialStudents: studentMap.size,
        highLevelStudents: highLevelStudentCount,
        formula: 'totalRevenue / highLevelStudentCount',
        result: avgDealAmount,
      },
      ...(revenueWarnings.length > 0 && { warnings: revenueWarnings }),
    },
    totalRevenue: {
      value: totalRevenue,
      calculation: {
        source: '從 studentMap 動態計算：已轉高學生的成交金額總和',
        trialStudents: studentMap.size,
        highLevelStudents: highLevelStudentCount,
        totalAmount: totalRevenue,
        formula: 'SUM(已轉高學生的成交金額)',
        result: totalRevenue,
      },
    },
  };

  // ========================================
  // 第 3 步：準備公式運算 context
  // ========================================
  const step3_formulaContext = {
    trials: totalTrials,
    consultations: totalConsultations,     // 總諮詢記錄數（來自 eods_for_closers 表）
    conversions: totalConversions,         // 已成交數（actual_amount > 0 的記錄）
    convertedStudents: convertedStudentsCount,  // 💡 新增：已轉高學生數（從 purchases 表）
    completedStudents: completedStudentsCount,  // 💡 新增：已上完課學生數（從 purchases 表）
    attendedStudents: completedStudentsCount,   // 別名：已上課學生數
    pendingConsultations: pendingConsultations, // 待成交數
    purchases: totalPurchases,
    pending,
    totalStudents,  // 總學生數
    startedStudents,  // 已開始學員數
    startRate,  // 開始率（%）
    totalRevenue,
    totalDealAmount: totalRevenue,
    avgDealAmount,
    avgConversionDays,
    revenue: totalRevenue, // alias
  };

  // ========================================
  // 第 4 步：使用 Formula Engine 計算所有 metrics
  // ========================================
  const configs = await reportMetricConfigService.getAllConfigs();
  const calculatedMetrics: Record<string, number> = {};
  const step4_kpiCalculations: KPICalculationDetail[] = [];

  for (const config of configs) {
    const kpiWarnings: string[] = [];
    let finalResult: number;
    let rawResult: number;
    let formula: string = config.defaultFormula;
    let debugResult: any = { result: null, substitutedFormula: '' };

    // Check if this metric has a custom AI definition
    const hasAIDefinition = config.metadata &&
      config.metadata.parsedDefinition &&
      typeof config.manualFormula === 'string';

    if (hasAIDefinition && config.manualFormula && config.metadata) {
      // Use AI-defined calculation
      formula = config.manualFormula; // Natural language definition
      try {
        const { calculatePreview } = await import('./ai-kpi-definition-parser');
        const { getSupabaseClient } = await import('./supabase-client');
        const supabase = getSupabaseClient();

        const preview = await calculatePreview(
          config.metricId,
          config.metadata.parsedDefinition,
          config.metadata.parameters || {},
          supabase
        );

        rawResult = preview.value;
        finalResult = rawResult;
        calculatedMetrics[config.metricId] = rawResult;
        debugResult.substitutedFormula = `AI Calculated: ${preview.numeratorCount}/${preview.denominatorCount} * 100`;

        if (!preview.isValid) {
          const warning = `${config.label} AI 定義計算結果可能有誤`;
          warnings.push(warning);
          kpiWarnings.push(warning);
        }
      } catch (error) {
        const warning = `${config.label} AI 定義計算失敗，使用預設計算`;
        warnings.push(warning);
        kpiWarnings.push(warning);

        // Fallback to formula calculation
        formula = config.defaultFormula;
        debugResult = formulaEngine.calculateMetricWithDebug(formula, step3_formulaContext);
        rawResult = debugResult.result !== null ? debugResult.result : 0;
        finalResult = rawResult;
        calculatedMetrics[config.metricId] = rawResult;
      }
    } else {
      // Use formula calculation
      formula = config.manualFormula || config.defaultFormula;
      debugResult = formulaEngine.calculateMetricWithDebug(formula, step3_formulaContext);

      if (debugResult.result !== null) {
        rawResult = debugResult.result;
        finalResult = rawResult;
        calculatedMetrics[config.metricId] = rawResult;
      } else {
        // 公式計算失敗，使用預設值
        const warning = `${config.label} 公式計算失敗，使用預設計算`;
        warnings.push(warning);
        kpiWarnings.push(warning);
        rawResult = 0;
        finalResult = 0;
        calculatedMetrics[config.metricId] = 0;
      }
    }

    const isCustomFormula = hasAIDefinition || !!config.manualFormula;

    // 檢查異常數值
    if (config.metricId === 'conversionRate' && finalResult > 100) {
      const warning = `轉換率 ${finalResult.toFixed(2)}% 超過 100%，可能數據異常`;
      warnings.push(warning);
      kpiWarnings.push(warning);
    }

    // 提取變數值
    const variables: Record<string, number> = {};
    for (const field of config.sourceFields) {
      if (field in step3_formulaContext) {
        variables[field] = step3_formulaContext[field as keyof typeof step3_formulaContext];
      }
    }

    // 記錄詳細計算過程
    step4_kpiCalculations.push({
      metricId: config.metricId,
      label: config.label,
      description: config.description,
      formula,
      isCustomFormula,
      variables,
      substitutedFormula: debugResult.substitutedFormula,
      rawResult,
      finalResult,
      unit: config.metricId.includes('Rate') ? '%' :
            config.metricId.includes('Time') ? '天' :
            config.metricId.includes('Revenue') || config.metricId.includes('Amount') ? '' : undefined,
      ...(kpiWarnings.length > 0 && { warnings: kpiWarnings }),
    });
  }

  // ========================================
  // 第 5 步：組裝回傳結果（修正為正確的體驗課 KPI）
  // ========================================

  // 修正後的 KPI 計算（符合規則引擎驗證）
  const correctConversionRate = completedStudentsCount > 0
    ? Math.round((convertedStudentsCount / completedStudentsCount) * 10000) / 100
    : 0;

  const correctTrialCompletionRate = studentMap.size > 0
    ? Math.round((completedStudentsCount / studentMap.size) * 10000) / 100
    : 0;

  // 計算待追蹤學生（體驗中 + 未開始）
  const correctPendingStudents = Array.from(studentMap.values())
    .filter(student => student.currentStatus === '體驗中' || student.currentStatus === '未開始').length;

  const summaryMetrics: CalculatedKPIs = {
    conversionRate: correctConversionRate,  // 已轉高 ÷ (已轉高+未轉高)
    avgConversionTime: Math.round(calculatedMetrics.avgConversionTime !== undefined ? calculatedMetrics.avgConversionTime : avgConversionDays),
    trialCompletionRate: correctTrialCompletionRate,  // (已轉高+未轉高) ÷ 總購買數
    pendingStudents: correctPendingStudents,  // 體驗中 + 未開始 (deprecated)
    startRate: startRate,  // 開始率：已開始學員 / 總學員數 * 100
    potentialRevenue: Math.round(totalRevenue),  // 修正：已成交金額（高階方案）
    totalTrials,  // 上課記錄總數
    totalConsultations: totalConsultations,  // 總諮詢記錄數（來自 eods_for_closers 表）
    totalConversions: totalConversions,    // 已成交數（actual_amount > 0 的記錄）
    pendingConsultations: pendingConsultations,  // 待成交數
  };

  const calculationDetail: CalculationDetail = {
    step1_baseVariables,
    step2_intermediateCalculations,
    step3_formulaContext,
    step4_kpiCalculations,
  };

  return {
    summaryMetrics,
    calculationDetail,
    warnings,
    structuredWarnings, // 🆕 Include structured warnings
  };
}

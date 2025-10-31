/**
 * KPI Calculator - 統一運算中心
 * 所有 KPI 計算邏輯集中在這裡
 * AI 只需修改這個檔案就能新增 KPI
 */

import { reportMetricConfigService } from './reporting/report-metric-config-service';
import { formulaEngine } from './reporting/formula-engine';
import { resolveField, parseDateField, parseNumberField } from './reporting/field-mapping-v2';

export interface RawData {
  attendance: any[];
  purchases: any[];
  deals: any[];
}

export interface CalculatedKPIs {
  conversionRate: number;
  avgConversionTime: number;
  trialCompletionRate: number;
  pendingStudents: number;
  potentialRevenue: number;
  totalTrials: number;
  totalConsultations: number;  // 總諮詢數（包含已成交和未成交）
  totalConversions: number;     // 已成交數
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

export interface KPICalculationResult {
  summaryMetrics: CalculatedKPIs;
  calculationDetail: CalculationDetail;
  warnings: string[];
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
  const { attendance, purchases, deals } = rawData;

  // ========================================
  // 第 1 步：準備基礎變數（從 raw data 萃取）
  // ========================================
  const totalTrials = attendance.length;
  const totalConsultations = deals.length; // 總諮詢數（包含已成交和未成交）

  // ========================================
  // 💡 新邏輯：基於「目前狀態」計算轉換率
  // ========================================

  // 從 purchases 表提取唯一學生的狀態
  const studentStatusMap = new Map<string, string>();
  console.log('🔍 購買記錄總數:', purchases.length);
  if (purchases.length > 0) {
    console.log('📋 第一筆購買記錄結構:', Object.keys(purchases[0]));
    console.log('📋 第一筆完整資料:', JSON.stringify(purchases[0]).substring(0, 500));
  }

  purchases.forEach((purchase, index) => {
    // 支援多種資料格式：Supabase 正規化後的 + raw_data + 原始格式
    const email = (
      purchase.student_email ||
      purchase.data?.student_email ||
      purchase.data?.email ||
      resolveField(purchase.data, 'studentEmail') ||
      purchase.email ||
      ''
    ).trim().toLowerCase();

    const status = (
      purchase.status ||
      purchase.data?.status ||
      purchase.data?.current_status ||
      purchase.data?.currentStatus ||
      resolveField(purchase.data, 'currentStatus') ||
      purchase['目前狀態（自動計算）'] ||
      ''
    );

    if (index < 3) {
      console.log(`  [${index}] email: "${email}", status: "${status}"`);
      console.log(`       raw purchase:`, {
        student_email: purchase.student_email,
        status: purchase.status,
        data_status: purchase.data?.status
      });
    }

    if (email && status) {
      studentStatusMap.set(email, status);
    }
  });

  console.log('📊 去重後學生數:', studentStatusMap.size);

  // 計算「已轉高」的唯一學生數
  const convertedStudentEmails = Array.from(studentStatusMap.entries())
    .filter(([email, status]) => status === '已轉高')
    .map(([email]) => email);

  const convertedStudentsCount = convertedStudentEmails.length;

  // 計算「已上完課」的唯一學生數（已轉高 + 未轉高）
  const completedStudentEmails = Array.from(studentStatusMap.entries())
    .filter(([email, status]) => status === '已轉高' || status === '未轉高')
    .map(([email]) => email);

  const completedStudentsCount = completedStudentEmails.length;

  // 計算已成交數（從 deals 表，有 deal_date 和 deal_amount 的記錄）
  const totalConversions = deals.filter(deal => {
    const dealDate = resolveField(deal.data, 'dealDate') || deal.data.deal_date;
    const dealAmount = parseNumberField(resolveField(deal.data, 'dealAmount') || deal.data.deal_amount);
    return dealDate && dealAmount && dealAmount > 0;
  }).length;

  // 待成交數
  const pendingConsultations = totalConsultations - totalConversions;

  const totalPurchases = purchases.length;
  const pendingOriginal = totalPurchases - totalConversions;
  const pending = Math.max(0, pendingOriginal);

  // 記錄 Step 1 詳情
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
      source: 'purchases 表中「目前狀態」= "已轉高" 的唯一學生數',
    },
    completedStudents: {
      value: completedStudentsCount,
      source: 'purchases 表中「目前狀態」IN ["已轉高", "未轉高"] 的唯一學生數',
    },
    totalConversions: {
      value: totalConversions,
      source: 'deals.filter(有 deal_date 且 deal_amount > 0).length',
    },
    pendingConsultations: {
      value: pendingConsultations,
      source: 'totalConsultations - totalConversions',
    },
    totalPurchases: {
      value: totalPurchases,
      source: 'purchases.length',
    },
    pending: {
      value: pending,
      source: 'max(0, purchases - conversions)',
      ...(pendingOriginal < 0 && { originalValue: pendingOriginal }),
    },
  };

  // pending 自動修正為 0，不需警告

  // ========================================
  // 第 2 步：中間計算（平均轉換時間、總收益等）
  // ========================================

  // 計算平均轉換時間（從體驗課到成交）
  let avgConversionDays = 7; // 預設值
  let conversionTimeCount = 0;
  let totalConversionDays = 0;
  const conversionWarnings: string[] = [];

  deals.forEach(deal => {
    const studentEmail = resolveField(deal.data, 'studentEmail');
    const dealDate = parseDateField(resolveField(deal.data, 'dealDate'));

    if (studentEmail && dealDate) {
      const attendanceRecord = attendance.find(
        a => resolveField(a.data, 'studentEmail') === studentEmail
      );
      if (attendanceRecord) {
        const classDate = parseDateField(resolveField(attendanceRecord.data, 'classDate'));
        if (classDate) {
          const daysDiff = Math.floor(
            (dealDate.getTime() - classDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysDiff >= 0) {
            totalConversionDays += daysDiff;
            conversionTimeCount++;
          }
        }
      }
    }
  });

  const unmatchedDeals = deals.length - conversionTimeCount;
  if (conversionTimeCount > 0) {
    avgConversionDays = Math.round(totalConversionDays / conversionTimeCount);
  } else if (deals.length > 0) {
    const warning = '無法計算平均轉換時間：缺少體驗課日期或成交日期';
    warnings.push(warning);
    conversionWarnings.push(warning);
  }

  // 成交記錄包含整個工作室，不只體驗課學生，無法對應是正常的

  // ========================================
  // 計算已成交金額（修正邏輯 2025-10-31）
  // 新邏輯：
  // 1. 取得所有 trial_class_purchases 中的學生 email
  // 2. 在 eods_for_closers 中找到這些學生，且方案名稱包含「高階一對一」
  // 3. 計算這些成交記錄的實收金額總和
  // ========================================
  const revenueWarnings: string[] = [];

  // 取得所有體驗課學生的 email（不管目前狀態）
  const trialStudentEmails = new Set<string>();
  purchases.forEach((purchase) => {
    const email = (
      purchase.student_email ||
      purchase.data?.student_email ||
      purchase.data?.email ||
      resolveField(purchase.data, 'studentEmail') ||
      purchase.email ||
      ''
    ).trim().toLowerCase();

    if (email) {
      trialStudentEmails.add(email);
    }
  });

  console.log(`📊 體驗課學員總數: ${trialStudentEmails.size}`);
  console.log(`📊 eods_for_closers 總筆數: ${deals.length}`);

  // Debug: 檢查前 3 筆 deals 的結構
  if (deals.length > 0) {
    console.log('🔍 前 3 筆 deals 結構：');
    deals.slice(0, 3).forEach((deal, idx) => {
      console.log(`  [${idx + 1}] email: ${deal.student_email || deal.data?.student_email || 'N/A'}`);
      console.log(`      plan: ${deal.plan || deal.data?.plan || 'N/A'}`);
      console.log(`      actual_amount: ${deal.actual_amount || deal.data?.actual_amount || 'N/A'}`);
    });
  }

  // 在 eods_for_closers 中找到體驗課學生，且方案包含「高階一對一」
  const highLevelDeals = deals.filter(deal => {
    // 1. 檢查這個 deal 的學生是否來自體驗課
    const email = (
      deal.student_email ||
      deal.data?.student_email ||
      deal.data?.email ||
      ''
    ).trim().toLowerCase();

    if (!email || !trialStudentEmails.has(email)) {
      return false; // 不是體驗課學生
    }

    // 2. 檢查方案名稱是否包含「高階一對一」
    const plan = (
      deal.plan ||                     // ✅ 優先：頂層欄位（從資料庫直接讀取）
      deal.data?.plan ||               // ✅ 次要：data 中的 plan
      deal.data?.成交方案 ||
      deal.data?.deal_package ||
      resolveField(deal.data, 'dealPackage') ||
      ''
    );
    const isHighLevel = plan.includes('高階一對一') || plan.includes('高音');

    if (isHighLevel) {
      console.log(`✅ 找到高階方案: ${email} - ${plan}`);
    }

    return isHighLevel;
  });

  console.log(`💰 體驗課轉高階成交數: ${highLevelDeals.length}`);

  const totalRevenue = highLevelDeals.reduce((sum, deal) => {
    const amountStr = (
      deal.actual_amount ||            // ✅ 優先：頂層欄位（從資料庫直接讀取）
      deal.deal_amount ||              // ✅ 次要：頂層 deal_amount
      deal.data?.actual_amount ||      // data 中的欄位
      deal.data?.實收金額 ||
      '0'
    ).toString().replace(/[^0-9.]/g, '');
    const amount = parseFloat(amountStr) || 0;
    return sum + amount;
  }, 0);

  console.log(`💰 體驗課轉高階總收益: NT$ ${totalRevenue.toLocaleString()}`);

  // 不再警告高階方案缺失，這是正常的業務情況

  // 平均客單價（基於高階方案）
  let avgDealAmount = 50000; // 預設值
  if (highLevelDeals.length > 0) {
    avgDealAmount = Math.round(totalRevenue / highLevelDeals.length);
  }

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
        validDeals: highLevelDeals.length,
        totalDeals: deals.length,
        trialStudents: trialStudentEmails.size,
        highLevelDeals: highLevelDeals.length,
        formula: 'totalRevenue / highLevelDeals.length',
        result: avgDealAmount,
      },
      ...(revenueWarnings.length > 0 && { warnings: revenueWarnings }),
    },
    totalRevenue: {
      value: totalRevenue,
      calculation: {
        source: '體驗課學員在 eods_for_closers 中「高階一對一」或「高音」方案的實收金額總和',
        trialStudents: trialStudentEmails.size,
        highLevelDeals: highLevelDeals.length,
        totalAmount: totalRevenue,
      },
    },
  };

  // ========================================
  // 第 3 步：準備公式運算 context
  // ========================================
  const step3_formulaContext = {
    trials: totalTrials,
    consultations: totalConsultations,     // 總諮詢數
    conversions: totalConversions,         // 已成交數（從 deals 表）
    convertedStudents: convertedStudentsCount,  // 💡 新增：已轉高學生數（從 purchases 表）
    completedStudents: completedStudentsCount,  // 💡 新增：已上完課學生數（從 purchases 表）
    attendedStudents: completedStudentsCount,   // 別名：已上課學生數
    pendingConsultations: pendingConsultations, // 待成交數
    purchases: totalPurchases,
    pending,
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

  const correctTrialCompletionRate = studentStatusMap.size > 0
    ? Math.round((completedStudentsCount / studentStatusMap.size) * 10000) / 100
    : 0;

  // 計算待追蹤學生（體驗中 + 未開始）
  const correctPendingStudents = Array.from(studentStatusMap.values())
    .filter(status => status === '體驗中' || status === '未開始').length;

  const summaryMetrics: CalculatedKPIs = {
    conversionRate: correctConversionRate,  // 已轉高 ÷ (已轉高+未轉高)
    avgConversionTime: Math.round(calculatedMetrics.avgConversionTime || avgConversionDays),
    trialCompletionRate: correctTrialCompletionRate,  // (已轉高+未轉高) ÷ 總購買數
    pendingStudents: correctPendingStudents,  // 體驗中 + 未開始
    potentialRevenue: Math.round(totalRevenue),  // 修正：已成交金額（高階方案）
    totalTrials,  // 上課記錄總數
    totalConsultations: convertedStudentsCount,  // 修正：已轉高學生數（不是 deals）
    totalConversions: convertedStudentsCount,    // 修正：已轉高學生數
    pendingConsultations: correctPendingStudents,  // 修正：待追蹤學生數
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
  };
}

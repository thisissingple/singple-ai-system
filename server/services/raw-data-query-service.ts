/**
 * Raw Data Query Service
 * 直接從 raw_data (jsonb) 查詢，不依賴 ETL 轉換的標準欄位
 * 支援跨表 JOIN 查詢（記憶體計算）
 */

import { getSupabaseClient } from './supabase-client';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from 'date-fns';

const supabase = getSupabaseClient();

/**
 * 智能提取數字
 * "2 堂" → 2
 * "NT$ 12,000" → 12000
 * "7天" → 7
 */
export function extractNumber(value: any): number | null {
  if (typeof value === 'number') return value;
  if (!value) return null;

  const str = String(value);

  // 處理金額格式（NT$, $, 逗號）
  if (str.includes('NT$') || str.includes('$')) {
    const cleaned = str.replace(/[NT$,\s]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  // 提取第一個數字
  const match = str.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  return null;
}

/**
 * 智能匹配
 * "0 堂" = 0 ✓
 * "已轉高" = "已轉高" ✓
 */
export function smartMatch(value: any, target: any): boolean {
  if (value === target) return true;

  // 嘗試數字比較
  const valueNum = extractNumber(value);
  const targetNum = extractNumber(target);

  if (valueNum !== null && targetNum !== null) {
    return valueNum === targetNum;
  }

  // 字串比較（去空格）
  const valueStr = String(value || '').trim().toLowerCase();
  const targetStr = String(target || '').trim().toLowerCase();

  return valueStr === targetStr;
}

/**
 * 檢查日期是否在指定月份
 */
function isInMonth(dateValue: any, month: string): boolean {
  if (!dateValue || !month) return true; // 沒指定月份就不過濾

  try {
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
    const targetMonth = parseISO(month + '-01');

    const dateMonth = format(date, 'yyyy-MM');
    const targetMonthStr = format(targetMonth, 'yyyy-MM');

    return dateMonth === targetMonthStr;
  } catch (error) {
    return false;
  }
}

/**
 * 取得原始資料
 */
export async function fetchRawData(tableName: string, limit?: number) {
  const { data, error } = await supabase
    .from(tableName)
    .select('student_email, raw_data')
    .not('raw_data', 'is', null)
    .neq('raw_data', '{}')
    .limit(limit || 1000);

  if (error) {
    console.error(`Error fetching raw data from ${tableName}:`, error);
    return [];
  }

  return data || [];
}

/**
 * 跨表查詢（封裝複雜的 JOIN 邏輯）
 *
 * 範例：Vicky 老師本月升高階的學生
 * {
 *   teacher: 'Vicky',
 *   status: '已轉高',
 *   month: '2025-10'
 * }
 */
export async function crossTableQuery(config: {
  teacher?: string;
  status?: string;
  month?: string;
  package?: string;
  minIntention?: number;
}) {
  console.log('🔍 開始跨表查詢:', config);

  // 1. 並行取得 3 張表資料
  const [attendanceData, purchaseData, eodsData] = await Promise.all([
    fetchRawData('trial_class_attendance'),
    fetchRawData('trial_class_purchase'),
    fetchRawData('eods_for_closers')
  ]);

  console.log('📊 資料量:', {
    attendance: attendanceData.length,
    purchase: purchaseData.length,
    eods: eodsData.length
  });

  // 2. 過濾：Vicky 的學生（從 trial_class_attendance）
  let filteredEmails = new Set<string>();

  if (config.teacher) {
    attendanceData.forEach(row => {
      const teacher = row.raw_data?.['教師'] ||
                     row.raw_data?.['授課老師'] ||
                     row.raw_data?.['teacher'];

      if (teacher && smartMatch(teacher, config.teacher)) {
        if (row.student_email) {
          filteredEmails.add(row.student_email);
        }
      }
    });

    console.log(`👨‍🏫 ${config.teacher} 的學生:`, filteredEmails.size);
  } else {
    // 沒指定老師，取所有學生
    attendanceData.forEach(row => {
      if (row.student_email) {
        filteredEmails.add(row.student_email);
      }
    });
  }

  // 3. 過濾：符合狀態和月份的學生（從 trial_class_purchase）
  const upgradedEmails = new Set<string>();

  purchaseData.forEach(row => {
    // 檢查是否在前一步的學生名單中
    if (config.teacher && !filteredEmails.has(row.student_email)) {
      return;
    }

    // 檢查狀態
    if (config.status) {
      const status = row.raw_data?.['目前狀態（自動計算）'] ||
                    row.raw_data?.['目前狀態'] ||
                    row.raw_data?.['current_status'];

      if (!status || !smartMatch(status, config.status)) {
        return;
      }
    }

    // 檢查月份
    if (config.month) {
      const date = row.raw_data?.['購課日期'] ||
                  row.raw_data?.['purchase_date'];

      if (!isInMonth(date, config.month)) {
        return;
      }
    }

    // 檢查課程方案
    if (config.package) {
      const pkg = row.raw_data?.['方案名稱'] ||
                 row.raw_data?.['package_name'];

      if (!pkg || !smartMatch(pkg, config.package)) {
        return;
      }
    }

    if (row.student_email) {
      upgradedEmails.add(row.student_email);
    }
  });

  console.log('✅ 符合條件的學生:', upgradedEmails.size);

  // 4. JOIN eods 取得成交資訊
  const result = eodsData
    .filter(row => upgradedEmails.has(row.student_email))
    .map(row => {
      const rawData = row.raw_data || {};

      return {
        studentName: rawData['Name'] ||
                    rawData['學員姓名'] ||
                    rawData['name'] ||
                    rawData['student_name'] ||
                    'Unknown',
        studentEmail: row.student_email ||
                     rawData['Email'] ||
                     rawData['email'],
        package: rawData['（諮詢）成交方案'] ||
                rawData['Package'] ||
                rawData['方案名稱'] ||
                rawData['package_name'] ||
                rawData['deal_package'],
        amount: extractNumber(
          rawData['（諮詢）實收金額'] ||
          rawData['（諮詢）方案價格'] ||
          rawData['Amount'] ||
          rawData['成交金額'] ||
          rawData['actual_amount'] ||
          rawData['deal_amount'] ||
          rawData['amount']
        ),
        dealDate: rawData['（諮詢）成交日期'] ||
                 rawData['Date'] ||
                 rawData['成交日期'] ||
                 rawData['deal_date'] ||
                 rawData['date'],
        intention: extractNumber(
          rawData['Intention'] ||
          rawData['意向分數'] ||
          rawData['intention_score']
        ),
        status: rawData['（諮詢）諮詢結果'] ||
               rawData['Status'] ||
               rawData['狀態'] ||
               rawData['status'],
        rawData: rawData
      };
    })
    .filter(item => {
      // 過濾意向分數
      if (config.minIntention && item.intention) {
        return item.intention >= config.minIntention;
      }
      return true;
    });

  console.log('📋 最終結果:', result.length);

  return result;
}

/**
 * 計算 KPI
 */
export async function calculateKPIs(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
  console.log('📊 計算 KPI:', period);

  // 1. 取得資料
  const [trials, purchases, eods] = await Promise.all([
    fetchRawData('trial_class_attendance'),
    fetchRawData('trial_class_purchase'),
    fetchRawData('eods_for_closers')
  ]);

  // 2. 計算轉換率
  const trialEmails = new Set(
    trials.map(t => t.student_email).filter(Boolean)
  );

  const purchaseEmails = new Set(
    purchases.map(p => p.student_email).filter(Boolean)
  );

  const converted = [...trialEmails].filter(e => purchaseEmails.has(e));
  const conversionRate = trialEmails.size > 0
    ? (converted.length / trialEmails.size) * 100
    : 0;

  // 3. 計算平均轉換時間（簡化版）
  const avgConversionTime = 23; // TODO: 實際計算

  // 4. 體驗課完成率
  const completedTrials = trials.filter(row => {
    const remaining = extractNumber(
      row.raw_data?.['剩餘堂數（自動計算）'] ||
      row.raw_data?.['剩餘堂數']
    );
    return remaining === 0;
  });

  const trialCompletionRate = trials.length > 0
    ? (completedTrials.length / trials.length) * 100
    : 0;

  // 5. 待跟進學生
  const pendingStudents = eods.filter(row => {
    const status = row.raw_data?.['狀態'];
    return status === '待聯繫' || status === '待跟進';
  }).length;

  // 6. 總營收
  const totalRevenue = eods.reduce((sum, row) => {
    const amount = extractNumber(
      row.raw_data?.['成交金額'] ||
      row.raw_data?.['actual_amount']
    );
    return sum + (amount || 0);
  }, 0);

  return {
    conversionRate,
    avgConversionTime,
    trialCompletionRate,
    pendingStudents,
    potentialRevenue: 0, // TODO
    totalTrials: trials.length,
    totalConversions: converted.length,
    totalRevenue
  };
}

/**
 * 教師績效統計
 */
export async function getTeacherStats() {
  const classes = await fetchRawData('trial_class_attendance');

  // 按老師分組
  const teacherMap = new Map();

  classes.forEach(row => {
    const teacher = row.raw_data?.['教師'] ||
                   row.raw_data?.['授課老師'] ||
                   'Unknown';

    if (!teacherMap.has(teacher)) {
      teacherMap.set(teacher, {
        name: teacher,
        classCount: 0,
        students: new Set()
      });
    }

    const stat = teacherMap.get(teacher);
    stat.classCount++;

    if (row.student_email) {
      stat.students.add(row.student_email);
    }
  });

  // 轉換為陣列並排序
  return Array.from(teacherMap.values())
    .map(stat => ({
      name: stat.name,
      classCount: stat.classCount,
      studentCount: stat.students.size,
      conversionRate: 0, // TODO: 計算轉換率
      avgRevenue: 0, // TODO
      totalRevenue: 0 // TODO
    }))
    .sort((a, b) => b.classCount - a.classCount);
}

/**
 * 學生跟進狀態統計
 */
export async function getStudentPipeline() {
  const eods = await fetchRawData('eods_for_closers');

  const pipeline = {
    total: eods.length,
    pending: 0,     // 待聯繫
    contacted: 0,   // 已聯繫
    completed: 0,   // 已成交
    lost: 0         // 已流失
  };

  eods.forEach(row => {
    const status = row.raw_data?.['狀態'] || '';

    if (status.includes('待聯繫') || status.includes('待跟進')) {
      pipeline.pending++;
    } else if (status.includes('已聯繫')) {
      pipeline.contacted++;
    } else if (status.includes('已成交')) {
      pipeline.completed++;
    } else if (status.includes('已流失')) {
      pipeline.lost++;
    }
  });

  return pipeline;
}

/**
 * AI 智能學習查詢服務
 * 使用 OpenAI API 分析自然語言問題，並將學習結果儲存到 Supabase
 */

import OpenAI from 'openai';
import { getSupabaseClient } from './supabase-client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = getSupabaseClient();

// 查詢分析結果結構
export interface QueryAnalysis {
  intent: string;           // 查詢意圖描述
  tables: string[];         // 需要的資料表
  filters: {                // 過濾條件
    teacher?: string;
    timeRange?: string;     // 'this_week', 'this_month', 'last_week', etc.
    status?: string;
    dateField?: string;
  };
  aggregation: string;      // 統計方式：count_unique_students, sum_amount, etc.
  confidence: number;       // AI 的信心度 0-1
  explanation?: string;     // 解釋給使用者看的
}

// 學習記錄結構
export interface LearnedQuery {
  id: string;
  question: string;
  question_pattern: string;
  intent: string;
  query_config: any;
  teacher_id?: string;
  confirmed_by_user: boolean;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

/**
 * 分析自然語言問題
 * 使用 OpenAI API 理解問題意圖並生成查詢設定
 */
export async function analyzeQuestion(question: string, teacherId?: string): Promise<QueryAnalysis> {
  console.log('🤖 AI 分析問題:', question);

  const systemPrompt = `你是教育機構數據分析助手。你的任務是分析老師的自然語言問題，並轉換成結構化的查詢設定。

可用資料表：
1. trial_class_attendance (上課記錄)
   - 欄位：student_email, teacher, class_date
   - 用途：查詢上課人數、老師授課記錄

2. trial_class_purchase (購買記錄)
   - 欄位：student_email, status, purchase_date, amount
   - 用途：查詢購買人數、轉換率

3. eods_for_closers (成交記錄)
   - 欄位：student_email, deal_package, actual_amount, deal_date
   - 用途：查詢成交金額、業績

時間範圍選項：
- "this_week": 本週（週日到今天）
- "this_month": 本月
- "last_week": 上週
- "last_month": 上個月

統計方式選項：
- "count_unique_students": 計算唯一學生數量
- "count_records": 計算記錄筆數
- "sum_amount": 計算總金額
- "list_students": 列出學生清單

請分析問題並以 JSON 格式回答（不要額外的文字說明）：
{
  "intent": "清楚的查詢意圖描述",
  "tables": ["需要查詢的表名"],
  "filters": {
    "teacher": "老師名稱（如果有提到）",
    "timeRange": "時間範圍代碼",
    "status": "狀態（如：已成交、已上線）",
    "dateField": "要過濾的日期欄位名"
  },
  "aggregation": "統計方式代碼",
  "confidence": 0.95,
  "explanation": "用白話解釋你的理解，例如：查詢本週 Vicky 老師的上課學生數量"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",  // 使用 GPT-3.5（便宜且夠用）
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: question
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3  // 降低隨機性，提高一致性
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    console.log('✅ AI 分析完成:', result);

    return result as QueryAnalysis;
  } catch (error) {
    console.error('❌ OpenAI API 錯誤:', error);
    throw new Error('AI 分析失敗，請稍後再試');
  }
}

/**
 * 檢查是否已經學過類似的問題
 * 使用關鍵字匹配找出相似問題
 */
export async function checkLearnedPattern(question: string, teacherId?: string): Promise<LearnedQuery | null> {
  const keywords = extractKeywords(question);

  console.log('🔍 檢查學習記憶:', { question, keywords, teacherId });

  try {
    // 建立查詢條件
    let query = supabase
      .from('ai_learned_queries')
      .select('*')
      .eq('confirmed_by_user', true);

    // 如果有 teacherId，優先找該老師的學習記錄
    if (teacherId) {
      query = query.or(`teacher_id.eq.${teacherId},teacher_id.is.null`);
    }

    // 關鍵字匹配
    const keywordArray = keywords.split(' ').filter(k => k.length > 1);
    if (keywordArray.length > 0) {
      const likeConditions = keywordArray.map(k => `question_pattern.ilike.%${k}%`).join(',');
      query = query.or(likeConditions);
    }

    query = query
      .order('usage_count', { ascending: false })
      .order('last_used_at', { ascending: false })
      .limit(1);

    const { data, error } = await query;

    if (error) {
      console.error('檢查學習記憶失敗:', error);
      return null;
    }

    if (data && data.length > 0) {
      const learned = data[0];

      // 更新使用次數
      await supabase
        .from('ai_learned_queries')
        .update({
          usage_count: learned.usage_count + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', learned.id);

      console.log('✅ 找到學習記錄:', learned.question, `(使用 ${learned.usage_count + 1} 次)`);

      return {
        ...learned,
        usage_count: learned.usage_count + 1
      };
    }

    console.log('ℹ️  沒有找到學習記錄，需要 AI 分析');
    return null;
  } catch (error) {
    console.error('檢查學習記憶錯誤:', error);
    return null;
  }
}

/**
 * 儲存學習結果
 * 將確認過的查詢設定儲存到資料庫
 */
export async function saveLearnedQuery(
  question: string,
  analysis: QueryAnalysis,
  teacherId?: string
): Promise<void> {
  const keywords = extractKeywords(question);

  console.log('💾 儲存學習記錄:', { question, intent: analysis.intent, teacherId });

  try {
    const { error } = await supabase
      .from('ai_learned_queries')
      .insert({
        question,
        question_pattern: keywords,
        intent: analysis.intent,
        query_config: analysis,
        teacher_id: teacherId,
        confirmed_by_user: true,
        usage_count: 1
      });

    if (error) {
      console.error('儲存學習記錄失敗:', error);
      throw error;
    }

    console.log('✅ 學習記錄已儲存');
  } catch (error) {
    console.error('儲存學習記錄錯誤:', error);
    throw new Error('儲存學習失敗');
  }
}

/**
 * 提取關鍵字
 * 移除無意義的詞彙，保留重要關鍵字
 */
function extractKeywords(question: string): string {
  // 常見的停用詞（無意義的詞）
  const stopWords = [
    '我', '的', '了', '嗎', '呢', '啊', '吧', '是', '有', '在', '和', '與',
    '？', '?', '！', '!', '，', ',', '。', '.', '、',
    '可以', '能夠', '想要', '想', '請', '幫我', '幫', '給我'
  ];

  // 清理並分詞
  const cleaned = question
    .toLowerCase()
    .trim();

  // 移除標點符號，保留中文、英文、數字
  const words = cleaned
    .split(/[\s\u3000]+/)  // 按空白分割
    .map(word => word.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''))  // 移除標點
    .filter(word => word.length > 0)
    .filter(word => !stopWords.includes(word));

  return words.join(' ');
}

/**
 * 根據分析結果執行查詢
 * 將 AI 的分析結果轉換成實際的資料庫查詢
 */
export async function executeQueryFromAnalysis(analysis: QueryAnalysis, teacherId?: string): Promise<any> {
  console.log('🔍 執行查詢:', analysis);

  const rawDataService = await import('./raw-data-query-service');

  // 判斷查詢類型
  const queryType = determineQueryType(analysis);

  if (queryType === 'attendance') {
    // 上課記錄查詢
    return await queryAttendance(analysis, teacherId, rawDataService);
  } else if (queryType === 'cross-table') {
    // 跨表查詢（購買、成交）
    return await queryCrossTable(analysis, teacherId, rawDataService);
  } else {
    // 簡單查詢
    return await querySimple(analysis, rawDataService);
  }
}

/**
 * 判斷查詢類型
 */
function determineQueryType(analysis: QueryAnalysis): string {
  // 防禦性檢查：確保 tables 存在且為陣列
  if (!analysis.tables || !Array.isArray(analysis.tables)) {
    console.warn('⚠️  analysis.tables is missing or invalid:', analysis);
    return 'simple';
  }

  const tables = analysis.tables.join(',');

  if (tables.includes('trial_class_attendance') && !tables.includes('purchase') && !tables.includes('eods')) {
    return 'attendance';
  } else if (tables.includes('purchase') || tables.includes('eods')) {
    return 'cross-table';
  }

  return 'simple';
}

/**
 * 查詢上課記錄
 */
async function queryAttendance(analysis: QueryAnalysis, teacherId: string | undefined, rawDataService: any) {
  const attendanceData = await rawDataService.fetchRawData('trial_class_attendance');

  let filtered = attendanceData;

  // 過濾老師
  if (analysis.filters.teacher || teacherId) {
    const targetTeacher = analysis.filters.teacher || teacherId;
    filtered = filtered.filter((row: any) => {
      const teacher = row.raw_data?.['老師'] || row.raw_data?.['Teacher'] || row.teacher;
      return teacher && teacher.toLowerCase().includes(targetTeacher.toLowerCase());
    });
  }

  // 過濾時間
  if (analysis.filters.timeRange) {
    const { startDate, endDate } = getTimeFilter(analysis.filters.timeRange);
    filtered = filtered.filter((row: any) => {
      const date = row.raw_data?.['上課日期'] || row.raw_data?.['Date'] || row.class_date;
      if (!date) return false;

      const dateStr = date.toString().slice(0, 10); // 取 YYYY-MM-DD
      return dateStr >= startDate && dateStr <= endDate;
    });
  }

  // 統計
  if (analysis.aggregation === 'count_unique_students') {
    const uniqueStudents = new Set();
    const students = filtered.map((row: any) => {
      const rawData = row.raw_data || {};
      const studentName = rawData['學員姓名'] || rawData['Name'] || 'Unknown';
      const studentEmail = row.student_email || rawData['Email'];

      uniqueStudents.add(studentEmail || studentName);

      return {
        studentName,
        studentEmail,
        classDate: rawData['上課日期'] || rawData['Date'],
        teacher: rawData['老師'] || rawData['Teacher']
      };
    });

    return {
      type: 'attendance',
      count: uniqueStudents.size,
      total: filtered.length,
      students
    };
  }

  return { type: 'attendance', data: filtered };
}

/**
 * 跨表查詢
 */
async function queryCrossTable(analysis: QueryAnalysis, teacherId: string | undefined, rawDataService: any) {
  const config: any = {
    teacher: analysis.filters.teacher || teacherId,
    status: analysis.filters.status,
  };

  if (analysis.filters.timeRange) {
    const { startDate } = getTimeFilter(analysis.filters.timeRange);
    config.month = startDate.slice(0, 7); // 取 YYYY-MM
  }

  const result = await rawDataService.crossTableQuery(config);

  return {
    type: 'cross-table',
    count: result.length,
    students: result,
    totalAmount: result.reduce((sum: number, s: any) => sum + (s.amount || 0), 0)
  };
}

/**
 * 簡單查詢
 */
async function querySimple(analysis: QueryAnalysis, rawDataService: any) {
  if (analysis.intent.includes('KPI') || analysis.intent.includes('績效')) {
    const kpis = await rawDataService.calculateKPIs();
    return { type: 'kpi', data: kpis };
  }

  if (analysis.intent.includes('老師') || analysis.intent.includes('教師')) {
    const stats = await rawDataService.getTeacherStats();
    return { type: 'teacher_stats', data: stats };
  }

  return { type: 'unknown', message: '無法理解查詢意圖' };
}

/**
 * 取得時間過濾條件（返回開始日期和結束日期）
 */
function getTimeFilter(timeRange: string): { startDate: string; endDate: string } {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  switch (timeRange) {
    case 'this_week': {
      // 本週：從週日到今天
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      return {
        startDate: startOfWeek.toISOString().slice(0, 10),
        endDate: today
      };
    }
    case 'this_month': {
      // 本月：從月初到今天
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString().slice(0, 10),
        endDate: today
      };
    }
    case 'last_week': {
      // 上週：上週日到上週六
      const dayOfWeek = now.getDay();
      const startOfLastWeek = new Date(now);
      startOfLastWeek.setDate(now.getDate() - dayOfWeek - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      return {
        startDate: startOfLastWeek.toISOString().slice(0, 10),
        endDate: endOfLastWeek.toISOString().slice(0, 10)
      };
    }
    case 'last_month': {
      // 上個月：整個月
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        startDate: startOfLastMonth.toISOString().slice(0, 10),
        endDate: endOfLastMonth.toISOString().slice(0, 10)
      };
    }
    default: {
      // 預設：本月
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: startOfMonth.toISOString().slice(0, 10),
        endDate: today
      };
    }
  }
}

/**
 * 格式化回答
 */
export function formatAnswer(queryResult: any, analysis: QueryAnalysis): string {
  if (queryResult.type === 'attendance') {
    const { count, total } = queryResult;
    return `根據查詢結果，共有 ${count} 位學生上課（${total} 堂課）`;
  }

  if (queryResult.type === 'cross-table') {
    const { count, totalAmount } = queryResult;
    return `找到 ${count} 位學生，總金額 NT$ ${totalAmount.toLocaleString()}`;
  }

  if (queryResult.type === 'kpi') {
    return `目前 KPI 數據已準備好`;
  }

  return '查詢完成';
}

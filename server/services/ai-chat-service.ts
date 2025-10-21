/**
 * AI Chat Service
 * 提供自然語言問答功能，分析 Supabase 資料並生成回答
 * 支援 OpenAI GPT-4 和 Anthropic Claude
 */

import OpenAI from 'openai';
import { supabaseReportRepository } from './reporting/supabase-report-repository';
import { totalReportService } from './reporting/total-report-service';
import { parseNumberField, parseDateField } from './reporting/field-mapping-v2';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  answer: string;
  data?: any;
  chartData?: any;
  sql?: string;
  confidence: number;
}

type AIProvider = 'openai' | 'anthropic';

export class AIChatService {
  private openaiClient: OpenAI | null = null;
  private provider: AIProvider = 'openai';
  private initialized: boolean = false;

  constructor() {
    // 不在 constructor 中初始化，改為延遲初始化
  }

  /**
   * 確保 Service 已初始化
   */
  private ensureInitialized() {
    if (this.initialized) {
      return;
    }

    // 優先使用 OpenAI
    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
      this.provider = 'openai';
      this.initialized = true;
      console.log('✓ AI Chat Service 初始化成功 (OpenAI GPT-4)');
      return;
    }

    // 如果沒有任何 API Key，拋出錯誤
    throw new Error('AI Chat Service 未初始化，請設定 OPENAI_API_KEY');
  }

  /**
   * 處理使用者問題
   */
  async chat(question: string, history: ChatMessage[] = []): Promise<ChatResponse> {
    // 延遲初始化：在第一次呼叫時才檢查環境變數
    this.ensureInitialized();

    try {
      // 1. 分析問題類型並取得相關資料
      const context = await this.getDataContext(question);

      // 2. 建立 Prompt
      const prompt = this.buildPrompt(question, context, history);

      // 3. 根據 provider 呼叫對應的 API
      let answer: string;

      if (this.provider === 'openai' && this.openaiClient) {
        console.log('🤖 呼叫 OpenAI GPT-4...');
        const response = await this.openaiClient.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: '你是一個教育機構的數據分析助理，專門幫助 CEO/COO 分析業務數據。請用繁體中文回答，直接且清晰。',
            },
            ...history.map(msg => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2048,
        });

        answer = response.choices[0]?.message?.content || '無法生成回答';
      } else {
        throw new Error('AI Provider 未初始化');
      }

      return {
        answer,
        data: context.data,
        chartData: context.chartData,
        confidence: 0.9,
      };
    } catch (error) {
      console.error('❌ AI Chat 失敗:', error);
      throw error;
    }
  }

  /**
   * 根據問題取得資料上下文
   */
  private async getDataContext(question: string): Promise<any> {
    const lowerQ = question.toLowerCase();
    const context: any = { data: {}, chartData: null };

    try {
      // 判斷時間範圍
      let dateRange = this.parseTimeRange(question);

      // 取得資料
      const warnings: string[] = [];
      const { attendanceData, purchaseData, eodsData } = await totalReportService.fetchRawData(
        dateRange,
        warnings
      );

      context.data.attendanceCount = attendanceData.length;
      context.data.purchaseCount = purchaseData.length;
      context.data.dealsCount = eodsData.length;
      context.dateRange = dateRange; // 將 dateRange 放在 context 層級

      // 根據問題類型準備特定資料
      if (lowerQ.includes('老師') || lowerQ.includes('教師') || lowerQ.includes('teacher')) {
        context.data.teachers = this.calculateTeacherStats(attendanceData, purchaseData, eodsData);
      }

      if (lowerQ.includes('諮詢') || lowerQ.includes('closer') || lowerQ.includes('consultant')) {
        context.data.consultants = this.calculateConsultantStats(eodsData);
      }

      if (lowerQ.includes('營收') || lowerQ.includes('收入') || lowerQ.includes('revenue')) {
        context.data.revenue = this.calculateRevenue(eodsData);
      }

      if (lowerQ.includes('學員') || lowerQ.includes('student')) {
        context.data.students = this.calculateStudentStats(attendanceData, purchaseData, eodsData);
      }

      if (lowerQ.includes('轉換') || lowerQ.includes('conversion')) {
        context.data.conversion = this.calculateConversion(attendanceData, purchaseData, eodsData);
      }

      return context;
    } catch (error) {
      console.error('取得資料上下文失敗:', error);
      return context;
    }
  }

  /**
   * 解析時間範圍
   */
  private parseTimeRange(question: string): { start: string; end: string } {
    const today = new Date();
    const lowerQ = question.toLowerCase();

    // 本週
    if (lowerQ.includes('本週') || lowerQ.includes('這週') || lowerQ.includes('this week')) {
      return {
        start: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        end: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    }

    // 本月
    if (lowerQ.includes('本月') || lowerQ.includes('這個月') || lowerQ.includes('this month')) {
      return {
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    }

    // 昨天
    if (lowerQ.includes('昨天') || lowerQ.includes('yesterday')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: format(yesterday, 'yyyy-MM-dd'),
        end: format(yesterday, 'yyyy-MM-dd'),
      };
    }

    // 今天
    if (lowerQ.includes('今天') || lowerQ.includes('today')) {
      return {
        start: format(today, 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    }

    // 預設：全部資料
    return {
      start: '1970-01-01',
      end: '2099-12-31',
    };
  }

  /**
   * 計算教師統計資料
   */
  private calculateTeacherStats(attendanceData: any[], purchaseData: any[], eodsData: any[]): any[] {
    const teacherMap = new Map<string, any>();

    // 統計授課數
    attendanceData.forEach((row) => {
      const teacher = row.data.teacherName || row.data.teacher;
      const studentEmail = row.data.studentEmail;

      if (!teacher) return;

      if (!teacherMap.has(teacher)) {
        teacherMap.set(teacher, {
          name: teacher,
          classCount: 0,
          students: new Set(),
          conversions: 0,
          revenue: 0,
        });
      }

      const stats = teacherMap.get(teacher)!;
      stats.classCount++;
      if (studentEmail) stats.students.add(studentEmail);
    });

    // 統計購買轉換（通過 email 關聯）
    const purchaseEmails = new Set(purchaseData.map((p) => p.data.studentEmail).filter(Boolean));

    teacherMap.forEach((stats) => {
      stats.students.forEach((email: string) => {
        if (purchaseEmails.has(email)) {
          stats.conversions++;
        }
      });
      stats.conversionRate = stats.classCount > 0 ? (stats.conversions / stats.classCount) * 100 : 0;
      stats.studentCount = stats.students.size;
      delete stats.students; // 移除 Set（無法序列化）
    });

    return Array.from(teacherMap.values()).sort((a, b) => b.revenue - a.revenue || b.classCount - a.classCount);
  }

  /**
   * 計算諮詢師統計資料
   */
  private calculateConsultantStats(eodsData: any[]): any[] {
    const consultantMap = new Map<string, any>();

    eodsData.forEach((row) => {
      const consultant = row.data.closer_name || row.data['（諮詢）諮詢人員'];
      const dealAmount = parseNumberField(row.data.dealAmount || row.data.actual_amount || row.data['（諮詢）實收金額']);
      const dealDate = row.data.deal_date || row.data['（諮詢）成交日期'];

      if (!consultant) return;

      if (!consultantMap.has(consultant)) {
        consultantMap.set(consultant, {
          name: consultant,
          dealCount: 0,
          totalRevenue: 0,
        });
      }

      const stats = consultantMap.get(consultant)!;

      // EOD 表記錄的是成交記錄，每筆都是已成交的
      if (dealDate && dealAmount && dealAmount > 0) {
        stats.dealCount++;
        stats.totalRevenue += dealAmount;
      }
    });

    consultantMap.forEach((stats) => {
      stats.avgDealAmount = stats.dealCount > 0 ? Math.round(stats.totalRevenue / stats.dealCount) : 0;
    });

    // 按總營收排序
    return Array.from(consultantMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  /**
   * 計算營收
   */
  private calculateRevenue(eodsData: any[]): any {
    let totalRevenue = 0;
    let dealCount = 0;

    eodsData.forEach((row) => {
      const dealAmount = parseNumberField(row.data.dealAmount || row.data.actual_amount || row.data['（諮詢）實收金額']);
      const dealDate = row.data.deal_date || row.data['（諮詢）成交日期'];

      if (dealDate && dealAmount && dealAmount > 0) {
        totalRevenue += dealAmount;
        dealCount++;
      }
    });

    return {
      totalRevenue,
      dealCount,
      avgDealAmount: dealCount > 0 ? Math.round(totalRevenue / dealCount) : 0,
    };
  }

  /**
   * 計算學員統計
   */
  private calculateStudentStats(attendanceData: any[], purchaseData: any[], eodsData: any[]): any {
    const totalStudents = new Set(attendanceData.map((a) => a.data.studentEmail).filter(Boolean)).size;
    const purchasedStudents = new Set(purchaseData.map((p) => p.data.studentEmail).filter(Boolean)).size;
    const convertedStudents = new Set(
      eodsData
        .filter((d) => {
          const amount = parseNumberField(d.data.dealAmount || d.data.actual_amount || d.data['（諮詢）實收金額']);
          return amount && amount > 0;
        })
        .map((d) => d.data.studentEmail || d.data.student_email || d.data.Email)
        .filter(Boolean)
    ).size;

    return {
      totalStudents,
      purchasedStudents,
      convertedStudents,
      purchaseRate: totalStudents > 0 ? (purchasedStudents / totalStudents) * 100 : 0,
      conversionRate: totalStudents > 0 ? (convertedStudents / totalStudents) * 100 : 0,
    };
  }

  /**
   * 計算轉換率
   */
  private calculateConversion(attendanceData: any[], purchaseData: any[], eodsData: any[]): any {
    const trialCount = attendanceData.length;
    const purchaseCount = purchaseData.length;
    const dealCount = eodsData.filter((d) => {
      const amount = parseNumberField(d.data.dealAmount || d.data.actual_amount || d.data['（諮詢）實收金額']);
      return amount && amount > 0;
    }).length;

    return {
      trialToPurchase: trialCount > 0 ? (purchaseCount / trialCount) * 100 : 0,
      purchaseToDeal: purchaseCount > 0 ? (dealCount / purchaseCount) * 100 : 0,
      trialToDeal: trialCount > 0 ? (dealCount / trialCount) * 100 : 0,
    };
  }

  /**
   * 建立 AI Prompt
   */
  private buildPrompt(question: string, context: any, history: ChatMessage[]): string {
    const { data, dateRange } = context;

    return `你是一個教育機構的數據分析助理，專門幫助 CEO/COO 分析業務數據。

**當前資料範圍**: ${dateRange.start} 到 ${dateRange.end}

**可用資料**:
${JSON.stringify(data, null, 2)}

**使用者問題**: ${question}

**回答要求**:
1. 用繁體中文回答
2. 直接回答問題，不要囉嗦
3. 使用清楚的格式（標題、列表、表格）
4. 如果有數字，要格式化（例如：NT$ 1,234,567）
5. 如果有排行，使用 🏆、🥈、🥉 等 emoji
6. 如果資料不足，誠實說明並建議如何改善

**重要提醒**:
- consultants 資料中的 dealCount 是「成交筆數」，totalRevenue 是「總營收」
- 請按「總營收」排序回答諮詢師排行（不是成交率）
- 顯示每位諮詢師的成交筆數、總營收、平均成交金額

請開始回答：`;
  }
}

export const aiChatService = new AIChatService();

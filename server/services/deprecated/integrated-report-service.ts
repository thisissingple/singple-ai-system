import { storage } from '../legacy/storage';
import { randomUUID } from 'crypto';

interface GenerateReportRequest {
  type: 'daily' | 'weekly';
  date: string;
}

interface ReportMetrics {
  classCount: number;
  purchaseCount: number;
  dealCount: number;
  totalRevenue: number;
}

interface ReportDetails {
  classes: Array<{ email: string; name: string; date: string; teacher: string }>;
  purchases: Array<{ email: string; name: string; date: string; plan: string }>;
  deals: Array<{ email: string; name: string; date: string; amount: number }>;
}

interface Report {
  id: string;
  type: 'daily' | 'weekly';
  reportDate: string;
  data: {
    period: { start: string; end: string };
    metrics: ReportMetrics;
    details: ReportDetails;
  };
  aiInsights: string;
  userModifiedInsights?: string;
  createdAt: string;
  updatedAt: string;
}

class IntegratedReportService {
  private reports = new Map<string, Report>();

  async generateReport(request: GenerateReportRequest): Promise<Report> {
    const reportDate = new Date(request.date);

    // 計算報表期間
    const { startDate, endDate } = this.calculatePeriod(request.type, reportDate);

    // 從現有的 sheetData 表獲取數據
    const periodData = await this.getPeriodDataFromStorage(startDate, endDate);

    // 計算指標
    const metrics = this.calculateMetrics(periodData);

    // 提取詳細數據
    const details = this.extractDetails(periodData);

    // 生成 AI 洞察
    const aiInsights = await this.generateAIInsights(metrics, details, request.type);

    // 創建報表
    const report: Report = {
      id: randomUUID(),
      type: request.type,
      reportDate: reportDate.toISOString(),
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        metrics,
        details,
      },
      aiInsights,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  private calculatePeriod(type: 'daily' | 'weekly', date: Date) {
    const startDate = new Date(date);
    const endDate = new Date(date);

    if (type === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // 週報：從週一到週日
      const dayOfWeek = startDate.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(startDate.getDate() - daysFromMonday);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }

  private async getPeriodDataFromStorage(startDate: Date, endDate: Date) {
    // 獲取所有 spreadsheets
    const spreadsheets = await storage.listSpreadsheets();

    const classRecords = [];
    const purchaseRecords = [];
    const consultationRecords = [];

    console.log(`[Report] Fetching data for period: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    console.log(`[Report] Found ${spreadsheets.length} spreadsheets`);

    // 遍歷每個 spreadsheet，獲取其啟用的 worksheets
    for (const spreadsheet of spreadsheets) {
      const worksheets = await storage.getWorksheets(spreadsheet.id);
      const enabledWorksheets = worksheets.filter(ws => ws.isEnabled);

      console.log(`[Report] Spreadsheet "${spreadsheet.name}": ${enabledWorksheets.length} enabled worksheets`);

      for (const worksheet of enabledWorksheets) {
        // 根據 worksheet 名稱判斷類型
        const worksheetType = this.classifyWorksheetType(worksheet.worksheetName);

        if (!worksheetType) {
          console.log(`[Report] Skipping worksheet "${worksheet.worksheetName}" - unknown type`);
          continue;
        }

        console.log(`[Report] Processing worksheet "${worksheet.worksheetName}" as ${worksheetType}`);

        // 獲取該 worksheet 的所有資料
        const worksheetData = await storage.getWorksheetData(worksheet.id);
        console.log(`[Report] Worksheet "${worksheet.worksheetName}" has ${worksheetData.length} rows`);

        // 處理每一行資料
        for (const data of worksheetData) {
          if (!data.data) continue;

          // 提取日期
          const recordDate = this.extractDateFromData(data.data);
          if (!recordDate) {
            console.log(`[Report] Row ${data.rowIndex}: no date found`, Object.keys(data.data));
            continue;
          }

          // 檢查是否在期間內
          if (recordDate < startDate || recordDate > endDate) {
            continue;
          }

          const email = this.extractEmail(data.data);

          // 根據 worksheet 類型分類
          if (worksheetType === 'class') {
            classRecords.push({
              ...data,
              extractedDate: recordDate,
              email,
              worksheetName: worksheet.worksheetName
            });
          } else if (worksheetType === 'purchase') {
            purchaseRecords.push({
              ...data,
              extractedDate: recordDate,
              email,
              worksheetName: worksheet.worksheetName
            });
          } else if (worksheetType === 'consultation') {
            consultationRecords.push({
              ...data,
              extractedDate: recordDate,
              email,
              worksheetName: worksheet.worksheetName
            });
          }
        }
      }
    }

    console.log(`[Report] Final counts: ${classRecords.length} classes, ${purchaseRecords.length} purchases, ${consultationRecords.length} consultations`);

    return {
      classes: classRecords,
      purchases: purchaseRecords,
      consultations: consultationRecords,
    };
  }

  private classifyWorksheetType(worksheetName: string): 'class' | 'purchase' | 'consultation' | null {
    const nameLower = worksheetName.toLowerCase();

    // 上課記錄
    if (nameLower.includes('上課') || nameLower.includes('class') || nameLower.includes('授課')) {
      return 'class';
    }

    // 購買記錄
    if (nameLower.includes('購買') || nameLower.includes('purchase') || nameLower.includes('體驗課購買')) {
      return 'purchase';
    }

    // 諮詢/成交記錄
    if (nameLower.includes('諮詢') || nameLower.includes('成交') ||
        nameLower.includes('eods') || nameLower.includes('closer') ||
        nameLower.includes('consultation') || nameLower.includes('deal')) {
      return 'consultation';
    }

    return null;
  }

  private extractDateFromData(data: Record<string, any>): Date | null {
    // 常見的日期欄位名稱
    const dateFields = [
      '上課日期', '體驗課購買日期', '（諮詢）諮詢日期', '成交日期',
      'date', 'Date', '日期', '時間'
    ];

    for (const field of dateFields) {
      const dateValue = data[field];
      if (dateValue) {
        const parsedDate = this.parseDate(dateValue.toString());
        if (parsedDate) return parsedDate;
      }
    }

    return null;
  }

  private parseDate(dateStr: string): Date | null {
    if (!dateStr) return null;

    // 嘗試多種日期格式
    const formats = [
      // YYYY/MM/DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    ];

    for (const format of formats) {
      const match = dateStr.trim().match(format);
      if (match) {
        let year, month, day;
        if (format === formats[2]) {
          // MM/DD/YYYY
          [, month, day, year] = match;
        } else {
          // YYYY/MM/DD or YYYY-MM-DD
          [, year, month, day] = match;
        }

        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // 嘗試 JavaScript 原生解析
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  }

  private extractEmail(data: Record<string, any>): string {
    const emailFields = ['email', 'Email', 'EMAIL', '電子郵件', '郵箱'];
    for (const field of emailFields) {
      if (data[field]) {
        return data[field].toString().toLowerCase().trim();
      }
    }
    return '';
  }

  private isClassRecord(data: Record<string, any>): boolean {
    const indicators = ['上課日期', '授課老師', '體驗課文字檔', '是否已評價'];
    return indicators.some(indicator => data.hasOwnProperty(indicator));
  }

  private isPurchaseRecord(data: Record<string, any>): boolean {
    const indicators = ['體驗課購買日期', '方案名稱', '體驗堂數', '目前狀態'];
    return indicators.some(indicator => data.hasOwnProperty(indicator));
  }

  private isConsultationRecord(data: Record<string, any>): boolean {
    const indicators = ['（諮詢）諮詢日期', '（諮詢）實收金額', '（諮詢）成交方案', '（諮詢）諮詢結果'];
    return indicators.some(indicator => data.hasOwnProperty(indicator));
  }

  private calculateMetrics(periodData: any): ReportMetrics {
    const classCount = periodData.classes.length;
    const purchaseCount = periodData.purchases.length;

    // 計算成交數據
    let dealCount = 0;
    let totalRevenue = 0;

    for (const consultation of periodData.consultations) {
      const data = consultation.data;

      // 檢查是否有成交（實收金額 > 0）
      const revenueFields = ['（諮詢）實收金額', '實收金額', '成交金額', '金額'];
      let revenue = 0;

      for (const field of revenueFields) {
        if (data[field]) {
          const amount = this.parseNumber(data[field]);
          if (amount > 0) {
            revenue = amount;
            break;
          }
        }
      }

      if (revenue > 0) {
        dealCount++;
        totalRevenue += revenue;
      }
    }

    return {
      classCount,
      purchaseCount,
      dealCount,
      totalRevenue,
    };
  }

  private extractDetails(periodData: any): ReportDetails {
    // 提取上課記錄詳情
    const classes = periodData.classes.map((item: any) => ({
      email: item.email,
      name: item.data['姓名'] || item.data['Name'] || '',
      date: this.formatDate(item.extractedDate),
      teacher: item.data['授課老師'] || item.data['老師'] || '',
    }));

    // 提取購買記錄詳情
    const purchases = periodData.purchases.map((item: any) => ({
      email: item.email,
      name: item.data['姓名'] || item.data['Name'] || '',
      date: this.formatDate(item.extractedDate),
      plan: item.data['方案名稱'] || item.data['方案'] || '',
    }));

    // 提取成交記錄詳情
    const deals = periodData.consultations
      .filter((item: any) => {
        const revenueFields = ['（諮詢）實收金額', '實收金額', '成交金額', '金額'];
        return revenueFields.some(field => this.parseNumber(item.data[field]) > 0);
      })
      .map((item: any) => {
        const revenueFields = ['（諮詢）實收金額', '實收金額', '成交金額', '金額'];
        let amount = 0;
        for (const field of revenueFields) {
          amount = this.parseNumber(item.data[field]);
          if (amount > 0) break;
        }

        return {
          email: item.email,
          name: item.data['Name'] || item.data['姓名'] || '',
          date: this.formatDate(item.extractedDate),
          amount,
        };
      });

    return { classes, purchases, deals };
  }

  private async generateAIInsights(
    metrics: ReportMetrics,
    details: ReportDetails,
    reportType: string
  ): Promise<string> {
    const insights = [];

    // 基本數據分析
    insights.push(`📊 ${reportType === 'daily' ? '今日' : '本週'}戰力總覽：`);
    insights.push(`- 上課次數：${metrics.classCount} 次`);
    insights.push(`- 體驗課購買：${metrics.purchaseCount} 人`);
    insights.push(`- 成交人數：${metrics.dealCount} 人`);
    insights.push(`- 成交金額：NT$ ${metrics.totalRevenue.toLocaleString()}`);

    // 轉換率分析
    if (metrics.classCount > 0) {
      const classToPurchaseRate = ((metrics.purchaseCount / metrics.classCount) * 100).toFixed(1);
      insights.push(`\n📈 轉換分析：`);
      insights.push(`- 體驗課轉購買率：${classToPurchaseRate}%`);

      if (metrics.purchaseCount > 0) {
        const purchaseToDealRate = ((metrics.dealCount / metrics.purchaseCount) * 100).toFixed(1);
        insights.push(`- 購買轉成交率：${purchaseToDealRate}%`);
      }
    }

    // 老師效率分析
    if (details.classes.length > 0) {
      const teacherStats = this.analyzeTeacherPerformance(details.classes);
      insights.push(`\n👨‍🏫 老師表現：`);
      insights.push(`- 最活躍老師：${teacherStats.mostActive} (${teacherStats.maxClasses} 堂課)`);
    }

    // 策略建議
    insights.push(`\n💡 策略建議：`);

    if (metrics.classCount === 0) {
      insights.push(`- 建議增加體驗課安排，提升學員接觸機會`);
    } else if (metrics.purchaseCount === 0) {
      insights.push(`- 體驗課後續轉換需要加強，建議優化課後跟進流程`);
    } else if (metrics.dealCount === 0) {
      insights.push(`- 諮詢轉成交需要改善，建議檢視銷售策略`);
    } else {
      // 成功案例分析
      if (metrics.dealCount > 0 && metrics.totalRevenue > 0) {
        const avgDealValue = metrics.totalRevenue / metrics.dealCount;
        insights.push(`- 平均成交價值：NT$ ${avgDealValue.toLocaleString()}`);
        if (avgDealValue < 5000) {
          insights.push(`- 建議推廣高價值方案，提升客單價`);
        }
      }
    }

    return insights.join('\n');
  }

  private analyzeTeacherPerformance(classes: any[]) {
    const teacherCount = new Map<string, number>();

    for (const classItem of classes) {
      const teacher = classItem.teacher || 'Unknown';
      teacherCount.set(teacher, (teacherCount.get(teacher) || 0) + 1);
    }

    let mostActive = 'N/A';
    let maxClasses = 0;

    for (const [teacher, count] of Array.from(teacherCount.entries())) {
      if (count > maxClasses) {
        maxClasses = count;
        mostActive = teacher;
      }
    }

    return { mostActive, maxClasses };
  }

  private parseNumber(value: any): number {
    if (!value) return 0;

    // 移除非數字字符（除了小數點和負號）
    const cleanValue = value.toString().replace(/[^\d.-]/g, '');
    const number = parseFloat(cleanValue);

    return isNaN(number) ? 0 : number;
  }

  private formatDate(date: Date | undefined): string {
    if (!date) return '';

    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  async getReports(type?: string, limit = 10): Promise<Report[]> {
    const reports = Array.from(this.reports.values());
    const filtered = type ? reports.filter(r => r.type === type) : reports;
    return filtered
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async getReport(reportId: string): Promise<Report | null> {
    return this.reports.get(reportId) || null;
  }

  async updateReportInsights(reportId: string, insights: string): Promise<Report | null> {
    const report = this.reports.get(reportId);
    if (report) {
      report.userModifiedInsights = insights;
      report.updatedAt = new Date().toISOString();
      this.reports.set(reportId, report);
      return report;
    }
    return null;
  }
}

export const integratedReportService = new IntegratedReportService();
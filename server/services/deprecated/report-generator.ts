import { simpleStorage } from '../simple-storage';
import type { GenerateReportRequest, Report } from '@shared/simple-schema';

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

class ReportGenerator {

  async generateReport(request: GenerateReportRequest): Promise<Report> {
    const reportDate = new Date(request.date);

    // 獲取指定期間的數據
    const periodData = await simpleStorage.getDataByPeriod(request.type, reportDate);

    // 計算指標
    const metrics = this.calculateMetrics(periodData);

    // 提取詳細數據
    const details = this.extractDetails(periodData);

    // 生成 AI 洞察
    const aiInsights = await this.generateAIInsights(metrics, details, request.type);

    // 創建報表
    const report = await simpleStorage.addReport({
      type: request.type,
      reportDate,
      data: {
        period: periodData.period,
        metrics,
        details,
      },
      aiInsights,
    });

    return report;
  }

  private calculateMetrics(periodData: any): ReportMetrics {
    const classCount = periodData.classes.length;
    const purchaseCount = periodData.purchases.length;

    // 計算成交數據
    let dealCount = 0;
    let totalRevenue = 0;

    for (const consultation of periodData.consultations) {
      const rowData = consultation.rowData;

      // 檢查是否有成交（實收金額 > 0）
      const revenueFields = ['（諮詢）實收金額', '實收金額', '成交金額', '金額'];
      let revenue = 0;

      for (const field of revenueFields) {
        if (rowData[field]) {
          const amount = this.parseNumber(rowData[field]);
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
      name: item.rowData['姓名'] || item.rowData['Name'] || '',
      date: this.formatDate(item.extractedDate),
      teacher: item.rowData['授課老師'] || item.rowData['老師'] || '',
    }));

    // 提取購買記錄詳情
    const purchases = periodData.purchases.map((item: any) => ({
      email: item.email,
      name: item.rowData['姓名'] || item.rowData['Name'] || '',
      date: this.formatDate(item.extractedDate),
      plan: item.rowData['方案名稱'] || item.rowData['方案'] || '',
    }));

    // 提取成交記錄詳情
    const deals = periodData.consultations
      .filter((item: any) => {
        const revenueFields = ['（諮詢）實收金額', '實收金額', '成交金額', '金額'];
        return revenueFields.some(field => this.parseNumber(item.rowData[field]) > 0);
      })
      .map((item: any) => {
        const revenueFields = ['（諮詢）實收金額', '實收金額', '成交金額', '金額'];
        let amount = 0;
        for (const field of revenueFields) {
          amount = this.parseNumber(item.rowData[field]);
          if (amount > 0) break;
        }

        return {
          email: item.email,
          name: item.rowData['Name'] || item.rowData['姓名'] || '',
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
    // 簡化的 AI 洞察生成（實際應用中可以整合真正的 AI API）
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

  // 獲取歷史報表
  async getReports(type?: string, limit = 10): Promise<Report[]> {
    return await simpleStorage.getReports(type, limit);
  }

  // 更新報表的 AI 建議
  async updateReportInsights(reportId: string, insights: string): Promise<Report | null> {
    return await simpleStorage.updateReportInsights(reportId, insights);
  }

  // 獲取特定報表
  async getReport(reportId: string): Promise<Report | null> {
    return await simpleStorage.getReport(reportId);
  }
}

export const reportGenerator = new ReportGenerator();
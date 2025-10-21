import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis,
  ResponsiveContainer 
} from 'recharts';
import { 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Download,
  Mail,
  Printer
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { type Spreadsheet, type SheetData } from '@shared/schema';

interface ReportsViewProps {
  spreadsheet: Spreadsheet | null;
  sheetData: SheetData[];
  totalRecords: number;
  activeRecords: number;
  onExport: (data: any[], format: 'csv' | 'json') => void;
}

interface PerformanceMetrics {
  activeRate: string;
  recentActivityRate: string;
  categoryDiversity: number;
  statusDiversity: number;
  averagePerCategory: number;
}

const COLORS = [
  'hsl(215, 100%, 50%)',
  'hsl(140, 70%, 45%)',
  'hsl(45, 100%, 55%)',
  'hsl(330, 80%, 55%)',
  'hsl(260, 85%, 58%)',
  'hsl(195, 100%, 50%)',
];

const chartConfig = {
  value: { label: "數值" },
  count: { label: "數量" },
};

export function ReportsView({ 
  spreadsheet, 
  sheetData, 
  totalRecords, 
  activeRecords,
  onExport 
}: ReportsViewProps) {
  const [reportPeriod, setReportPeriod] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('status');

  // Generate comprehensive reports
  const reports = useMemo(() => {
    if (sheetData.length === 0) {
      return {
        summary: {},
        statusReport: [],
        categoryReport: [],
        trendReport: [],
        performanceMetrics: {
          activeRate: '0',
          recentActivityRate: '0',
          categoryDiversity: 0,
          statusDiversity: 0,
          averagePerCategory: 0
        },
        insights: []
      };
    }

    // Status distribution
    const statusCount: Record<string, number> = {};
    const categoryCount: Record<string, number> = {};
    const dailyTrend: Record<string, number> = {};
    
    let totalActive = 0;
    let totalInactive = 0;
    let recentlyUpdated = 0;
    
    const now = new Date();
    const periodDays = reportPeriod === '7d' ? 7 : reportPeriod === '30d' ? 30 : 90;
    const periodStart = subDays(now, periodDays);

    sheetData.forEach(row => {
      const data = row.data;
      
      // Process status
      const status = data.Status || data.status || data.狀態 || 'unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
      
      if (String(status).toLowerCase().includes('active') || String(status).toLowerCase().includes('正常')) {
        totalActive++;
      } else {
        totalInactive++;
      }
      
      // Process categories
      const category = data.Category || data.category || data.類別 || data.Type || 'other';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
      
      // Process trend data
      const updateDate = new Date(row.lastUpdated || now);
      if (updateDate >= periodStart) {
        recentlyUpdated++;
        const dateKey = format(updateDate, 'yyyy-MM-dd');
        dailyTrend[dateKey] = (dailyTrend[dateKey] || 0) + 1;
      }
    });

    const statusReport = Object.entries(statusCount)
      .map(([status, count]) => ({
        name: status,
        value: count,
        percentage: ((count / totalRecords) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value);

    const categoryReport = Object.entries(categoryCount)
      .map(([category, count]) => ({
        name: category,
        value: count,
        percentage: ((count / totalRecords) * 100).toFixed(1)
      }))
      .sort((a, b) => b.value - a.value);

    const trendReport = Object.entries(dailyTrend)
      .map(([date, count]) => ({
        date,
        count,
        formattedDate: format(new Date(date), 'MM/dd')
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Performance metrics
    const performanceMetrics = {
      activeRate: totalRecords > 0 ? ((totalActive / totalRecords) * 100).toFixed(1) : '0',
      recentActivityRate: totalRecords > 0 ? ((recentlyUpdated / totalRecords) * 100).toFixed(1) : '0',
      categoryDiversity: Object.keys(categoryCount).length,
      statusDiversity: Object.keys(statusCount).length,
      averagePerCategory: totalRecords > 0 ? Math.round(totalRecords / Object.keys(categoryCount).length) : 0
    };

    // Generate insights
    const insights = [];
    if (parseFloat(performanceMetrics.activeRate || '0') > 80) {
      insights.push({
        type: 'positive',
        title: '高活躍度',
        description: `${performanceMetrics.activeRate}% 的記錄處於活躍狀態，表現優異。`
      });
    }
    if (parseFloat(performanceMetrics.recentActivityRate || '0') < 20) {
      insights.push({
        type: 'warning',
        title: '近期活動較少',
        description: `只有 ${performanceMetrics.recentActivityRate || '0'}% 的記錄在最近 ${periodDays} 天內有更新。`
      });
    }
    if ((performanceMetrics.categoryDiversity || 0) < 3) {
      insights.push({
        type: 'info',
        title: '類別集中度高',
        description: `數據主要集中在 ${performanceMetrics.categoryDiversity || 0} 個類別中。`
      });
    }

    return {
      summary: performanceMetrics,
      statusReport,
      categoryReport,
      trendReport,
      performanceMetrics,
      insights
    };
  }, [sheetData, totalRecords, reportPeriod]);

  const generateReport = (format: 'pdf' | 'email') => {
    const reportData = {
      spreadsheet: spreadsheet?.name,
      generatedAt: new Date().toISOString(),
      period: reportPeriod,
      totalRecords,
      activeRecords,
      summary: reports.summary,
      statusDistribution: reports.statusReport,
      categoryDistribution: reports.categoryReport,
      insights: reports.insights
    };

    if (format === 'email') {
      // Simulate email report
      const subject = `數據報告 - ${spreadsheet?.name} (${new Date().toISOString().split('T')[0]})`;
      const body = `
親愛的用戶，

這是您的 ${spreadsheet?.name} 數據報告摘要：

總記錄數：${totalRecords}
活躍記錄數：${activeRecords}
活躍率：${'activeRate' in reports.summary ? reports.summary.activeRate : '0'}%

主要洞察：
${reports.insights.map(insight => `• ${insight.title}: ${insight.description}`).join('\n')}

完整報告請參見附件。

此致
Oh Sheet 系統
      `;
      
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl);
    } else {
      // Export report data as JSON (PDF generation would require additional libraries)
      onExport([reportData], 'json');
    }
  };

  if (!spreadsheet) {
    return (
      <Card className="glass-card dark:glass-card-dark border-0">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">No Reports Available</h3>
            <p className="text-sm text-muted-foreground">
              Please select a spreadsheet to generate reports
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="reports-view">
      {/* Report Header */}
      <Card className="glass-card dark:glass-card-dark border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                報告分析
              </CardTitle>
              <CardDescription>
                {spreadsheet.name} 的綜合分析報告
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger className="w-32 glass dark:glass-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">過去 7 天</SelectItem>
                  <SelectItem value="30d">過去 30 天</SelectItem>
                  <SelectItem value="90d">過去 90 天</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateReport('pdf')}
                className="glass dark:glass-dark"
                data-testid="generate-pdf"
              >
                <Download className="h-4 w-4 mr-2" />
                導出報告
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateReport('email')}
                className="glass dark:glass-dark"
                data-testid="email-report"
              >
                <Mail className="h-4 w-4 mr-2" />
                郵寄報告
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">活躍率</p>
                <p className="text-3xl font-bold text-green-600">
                  {'activeRate' in reports.summary ? reports.summary.activeRate : '0'}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-600" />
            </div>
            <Progress value={parseFloat(String('activeRate' in reports.summary ? reports.summary.activeRate : '0'))} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">近期活動</p>
                <p className="text-3xl font-bold text-blue-600">
                  {'recentActivityRate' in reports.summary ? reports.summary.recentActivityRate : '0'}%
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {reportPeriod === '7d' ? '過去 7 天' : reportPeriod === '30d' ? '過去 30 天' : '過去 90 天'}
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">類別多樣性</p>
                <p className="text-3xl font-bold text-purple-600">
                  {'categoryDiversity' in reports.summary ? reports.summary.categoryDiversity : 0}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              平均每類別 {'averagePerCategory' in reports.summary ? reports.summary.averagePerCategory : 0} 筆記錄
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card dark:glass-card-dark border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">狀態類型</p>
                <p className="text-3xl font-bold text-amber-600">
                  {'statusDiversity' in reports.summary ? reports.summary.statusDiversity : 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              不同狀態類型數量
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="glass-card dark:glass-card-dark border-0">
          <CardHeader>
            <CardTitle className="text-lg">狀態分佈</CardTitle>
            <CardDescription>各狀態的數量和比例</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={reports.statusReport}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reports.statusReport.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="mt-4 space-y-2">
              {reports.statusReport.slice(0, 3).map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span>{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.value}</span>
                    <Badge variant="outline">{item.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Analysis */}
        <Card className="glass-card dark:glass-card-dark border-0">
          <CardHeader>
            <CardTitle className="text-lg">類別分析</CardTitle>
            <CardDescription>各類別的記錄數量</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={reports.categoryReport.slice(0, 5)}>
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="hsl(260, 85%, 58%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      {reports.trendReport.length > 0 && (
        <Card className="glass-card dark:glass-card-dark border-0">
          <CardHeader>
            <CardTitle className="text-lg">活動趨勢</CardTitle>
            <CardDescription>
              {reportPeriod === '7d' ? '過去 7 天' : reportPeriod === '30d' ? '過去 30 天' : '過去 90 天'}的更新趨勢
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <LineChart data={reports.trendReport}>
                <XAxis dataKey="formattedDate" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(215, 100%, 50%)" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Insights and Recommendations */}
      {reports.insights.length > 0 && (
        <Card className="glass-card dark:glass-card-dark border-0">
          <CardHeader>
            <CardTitle className="text-lg">洞察與建議</CardTitle>
            <CardDescription>基於數據分析的重點發現</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-4 glass dark:glass-dark rounded-lg">
                  {insight.type === 'positive' && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />}
                  {insight.type === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />}
                  {insight.type === 'info' && <Activity className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />}
                  <div>
                    <h4 className="font-medium text-foreground">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
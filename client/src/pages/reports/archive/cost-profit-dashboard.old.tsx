import { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Calendar, Sparkles, AlertTriangle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CostProfitData {
  id: string;
  category_name: string;
  item_name: string;
  amount: string | number;
  notes: string;
  month: string;
  year: number;
  is_confirmed: boolean;
  created_at: string;
}

interface MonthlyMetrics {
  month: string;
  revenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

// 顏色配置
const COLORS = {
  revenue: '#10b981',
  cost: '#ef4444',
  profit: '#3b82f6',
  人力成本: '#8b5cf6',
  廣告費用: '#f59e0b',
  系統費用: '#06b6d4',
  軟體服務: '#ec4899',
  通訊費用: '#14b8a6',
  金流費用: '#f97316',
  網站費用: '#84cc16',
  顧問服務: '#6366f1',
  稅金費用: '#f43f5e',
  其他費用: '#64748b',
};

// 月份映射
const MONTH_MAP: Record<string, number> = {
  'January': 1, 'February': 2, 'March': 3, 'April': 4,
  'May': 5, 'June': 6, 'July': 7, 'August': 8,
  'September': 9, 'October': 10, 'November': 11, 'December': 12
};

export default function CostProfitDashboard() {
  // 獲取成本獲利數據
  const { data: costProfitData = [], isLoading } = useQuery<CostProfitData[]>({
    queryKey: ['/api/cost-profit'],
    queryFn: async () => {
      const response = await fetch('/api/cost-profit', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('API response:', data.length, 'records');
      return Array.isArray(data) ? data : [];
    },
  });

  // 獲取可用的月份列表
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    costProfitData.forEach(item => {
      months.add(`${item.year}-${item.month}`);
    });
    return Array.from(months).sort((a, b) => {
      const [yearA, monthA] = a.split('-');
      const [yearB, monthB] = b.split('-');
      const dateA = parseInt(yearA) * 100 + (MONTH_MAP[monthA] || 0);
      const dateB = parseInt(yearB) * 100 + (MONTH_MAP[monthB] || 0);
      return dateB - dateA; // 最新的在前面
    });
  }, [costProfitData]);

  // 預設選擇最新月份
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(2025);

  // 當數據載入完成後，設定預設月份為當前日期的月份
  useEffect(() => {
    if (!selectedMonth && !isLoading) {
      // 獲取當前日期的月份
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonthIndex = today.getMonth(); // 0-11
      const monthNames = Object.keys(MONTH_MAP);
      const currentMonthName = monthNames[currentMonthIndex];

      console.log('Setting default to current date:', currentYear, currentMonthName);

      // 直接使用當前月份，不管有沒有數據
      setSelectedMonth(currentMonthName);
      setSelectedYear(currentYear);
    }
  }, [selectedMonth, isLoading]);

  // 篩選當前選擇月份的數據
  const filteredData = useMemo(() => {
    if (!selectedMonth) return [];
    const filtered = costProfitData.filter(item =>
      item.month === selectedMonth && item.year === selectedYear
    );
    console.log('Filtered data:', filtered.length, 'items for', selectedMonth, selectedYear);
    return filtered;
  }, [costProfitData, selectedMonth, selectedYear]);

  // 計算當月關鍵指標
  const currentMonthMetrics = useMemo(() => {
    let revenue = 0;
    let totalCost = 0;

    filteredData.forEach((item) => {
      const amount = parseFloat(item.amount as string) || 0;
      if (item.category_name === '收入金額') {
        revenue += amount;
      } else {
        totalCost += amount;
      }
    });

    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    console.log('Current month metrics:', { revenue, totalCost, profit, profitMargin });
    return { revenue, totalCost, profit, profitMargin };
  }, [filteredData]);

  // 計算上月數據進行對比
  const previousMonthMetrics = useMemo(() => {
    const currentMonthIndex = MONTH_MAP[selectedMonth] || 0;
    let prevMonth = '';
    let prevYear = selectedYear;

    if (currentMonthIndex === 1) {
      prevMonth = 'December';
      prevYear = selectedYear - 1;
    } else {
      prevMonth = Object.keys(MONTH_MAP).find(key => MONTH_MAP[key] === currentMonthIndex - 1) || '';
    }

    const prevData = costProfitData.filter(item =>
      item.month === prevMonth && item.year === prevYear
    );

    let revenue = 0;
    let totalCost = 0;

    prevData.forEach((item) => {
      const amount = parseFloat(item.amount as string) || 0;
      if (item.category_name === '收入金額') {
        revenue += amount;
      } else {
        totalCost += amount;
      }
    });

    const profit = revenue - totalCost;
    return { revenue, totalCost, profit };
  }, [costProfitData, selectedMonth, selectedYear]);

  // 計算變化率
  const changes = useMemo(() => {
    const revenueChange = previousMonthMetrics.revenue > 0
      ? ((currentMonthMetrics.revenue - previousMonthMetrics.revenue) / previousMonthMetrics.revenue) * 100
      : 0;
    const costChange = previousMonthMetrics.totalCost > 0
      ? ((currentMonthMetrics.totalCost - previousMonthMetrics.totalCost) / previousMonthMetrics.totalCost) * 100
      : 0;
    const profitChange = previousMonthMetrics.profit !== 0
      ? ((currentMonthMetrics.profit - previousMonthMetrics.profit) / Math.abs(previousMonthMetrics.profit)) * 100
      : 0;

    return { revenueChange, costChange, profitChange };
  }, [currentMonthMetrics, previousMonthMetrics]);

  // 計算分類佔比
  const categoryBreakdown = useMemo((): CategoryBreakdown[] => {
    const categoryTotals = new Map<string, number>();
    let totalCost = 0;

    filteredData.forEach((item) => {
      if (item.category_name !== '收入金額') {
        const amount = parseFloat(item.amount as string) || 0;
        const current = categoryTotals.get(item.category_name) || 0;
        categoryTotals.set(item.category_name, current + amount);
        totalCost += amount;
      }
    });

    return Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCost > 0 ? (amount / totalCost) * 100 : 0,
        color: COLORS[category as keyof typeof COLORS] || '#64748b',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredData]);

  // 計算所有月份趨勢
  const monthlyTrend = useMemo((): MonthlyMetrics[] => {
    const monthlyData = new Map<string, { revenue: number; cost: number }>();

    costProfitData.forEach((item) => {
      const key = `${item.year}-${item.month}`;
      if (!monthlyData.has(key)) {
        monthlyData.set(key, { revenue: 0, cost: 0 });
      }

      const data = monthlyData.get(key)!;
      const amount = parseFloat(item.amount as string) || 0;

      if (item.category_name === '收入金額') {
        data.revenue += amount;
      } else {
        data.cost += amount;
      }
    });

    return Array.from(monthlyData.entries())
      .map(([key, data]) => {
        const profit = data.revenue - data.cost;
        const profitMargin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0;
        return {
          month: key,
          revenue: data.revenue,
          totalCost: data.cost,
          profit,
          profitMargin,
        };
      })
      .sort((a, b) => {
        const [yearA, monthA] = a.month.split('-');
        const [yearB, monthB] = b.month.split('-');
        const dateA = parseInt(yearA) * 100 + (MONTH_MAP[monthA] || 0);
        const dateB = parseInt(yearB) * 100 + (MONTH_MAP[monthB] || 0);
        return dateA - dateB;
      });
  }, [costProfitData]);

  // AI 評估與建議
  const aiInsights = useMemo(() => {
    const { revenue, totalCost, profit, profitMargin } = currentMonthMetrics;
    const insights: { type: 'success' | 'warning' | 'danger', message: string }[] = [];

    // 毛利率評估
    if (profitMargin >= 30) {
      insights.push({ type: 'success', message: `毛利率 ${profitMargin.toFixed(1)}% 表現優秀，財務狀況健康！` });
    } else if (profitMargin >= 20) {
      insights.push({ type: 'warning', message: `毛利率 ${profitMargin.toFixed(1)}%，建議優化成本結構以提升獲利空間` });
    } else if (profitMargin >= 0) {
      insights.push({ type: 'danger', message: `毛利率 ${profitMargin.toFixed(1)}% 偏低，需立即檢討成本控制策略` });
    } else {
      insights.push({ type: 'danger', message: `當月虧損 ${formatCurrency(Math.abs(profit))}，需緊急改善財務狀況` });
    }

    // 人力成本評估
    const laborCost = categoryBreakdown.find(c => c.category === '人力成本');
    if (laborCost && revenue > 0) {
      const laborRatio = (laborCost.amount / revenue) * 100;
      if (laborRatio > 50) {
        insights.push({ type: 'warning', message: `人力成本佔營收 ${laborRatio.toFixed(1)}%，建議評估人員配置效率` });
      }
    }

    // 廣告費用評估
    const adCost = categoryBreakdown.find(c => c.category === '廣告費用');
    if (adCost && revenue > 0) {
      const adRatio = (adCost.amount / revenue) * 100;
      const adROI = ((revenue - totalCost) / adCost.amount) * 100;
      if (adRatio > 15) {
        insights.push({ type: 'warning', message: `廣告費用佔營收 ${adRatio.toFixed(1)}%，ROI 為 ${adROI.toFixed(0)}%，建議優化投放策略` });
      } else if (adROI > 200) {
        insights.push({ type: 'success', message: `廣告 ROI ${adROI.toFixed(0)}% 表現良好，可考慮適度增加投放` });
      }
    }

    // 成本變化評估
    if (Math.abs(changes.costChange) > 10) {
      if (changes.costChange > 0) {
        insights.push({ type: 'warning', message: `成本較上月增加 ${changes.costChange.toFixed(1)}%，需關注成本控制` });
      } else {
        insights.push({ type: 'success', message: `成本較上月降低 ${Math.abs(changes.costChange).toFixed(1)}%，成本控制有效！` });
      }
    }

    return insights;
  }, [currentMonthMetrics, categoryBreakdown, changes]);

  // 格式化金額
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // 格式化百分比
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <DashboardLayout sidebarSections={sidebarConfig} title="成本獲利分析報表">
        <div className="flex items-center justify-center h-screen">
          <div className="text-lg">載入中...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="成本獲利分析報表">
      <div className="container mx-auto p-6 space-y-6">
        {/* 標題與篩選 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">成本獲利分析報表</h1>
            <p className="text-muted-foreground mt-1">
              即時掌握營運狀況與成本結構
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025 年</SelectItem>
                <SelectItem value="2024">2024 年</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="選擇月份" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(MONTH_MAP).map(month => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 無數據提示 */}
        {filteredData.length === 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                當前月份暫無數據
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-yellow-700 mb-3">
                {selectedYear} 年 {selectedMonth} 目前沒有成本獲利數據。
              </p>
              <p className="text-sm text-yellow-600">
                可選擇其他有數據的月份：
                {availableMonths.length > 0 ? (
                  <span className="font-medium ml-1">
                    {availableMonths.slice(0, 3).map(m => m.replace('-', ' 年 ')).join('、')}
                  </span>
                ) : (
                  <span className="ml-1">目前系統中無任何數據</span>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* 關鍵指標卡片 */}
        {filteredData.length > 0 && (
        <>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* 營收 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總營收</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentMonthMetrics.revenue)}
              </div>
              <div className="flex items-center text-xs mt-1">
                {changes.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={changes.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(changes.revenueChange)}
                </span>
                <span className="text-muted-foreground ml-1">vs 上月</span>
              </div>
            </CardContent>
          </Card>

          {/* 總成本 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">總成本</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(currentMonthMetrics.totalCost)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                佔營收 {currentMonthMetrics.revenue > 0
                  ? ((currentMonthMetrics.totalCost / currentMonthMetrics.revenue) * 100).toFixed(1)
                  : '0'}%
              </div>
            </CardContent>
          </Card>

          {/* 淨利 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">淨利潤</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${currentMonthMetrics.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(currentMonthMetrics.profit)}
              </div>
              <div className="flex items-center text-xs mt-1">
                {changes.profitChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                )}
                <span className={changes.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPercentage(changes.profitChange)}
                </span>
                <span className="text-muted-foreground ml-1">vs 上月</span>
              </div>
            </CardContent>
          </Card>

          {/* 毛利率 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">毛利率</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {currentMonthMetrics.profitMargin.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {currentMonthMetrics.profitMargin >= 30
                  ? '✓ 健康水平'
                  : currentMonthMetrics.profitMargin >= 20
                  ? '⚠ 需注意'
                  : currentMonthMetrics.profitMargin >= 0
                  ? '⚠ 偏低'
                  : '✗ 虧損'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI 評估與建議 */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI 智能分析與建議
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiInsights.map((insight, index) => (
              <div
                key={index}
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  insight.type === 'success' ? 'bg-green-100 text-green-800' :
                  insight.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}
              >
                {insight.type === 'success' && <TrendingUp className="h-5 w-5 mt-0.5" />}
                {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 mt-0.5" />}
                {insight.type === 'danger' && <TrendingDown className="h-5 w-5 mt-0.5" />}
                <p className="text-sm font-medium">{insight.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 圖表與分析 */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">總覽</TabsTrigger>
            <TabsTrigger value="cost-structure">成本結構</TabsTrigger>
            <TabsTrigger value="trend">趨勢分析</TabsTrigger>
            <TabsTrigger value="details">明細</TabsTrigger>
          </TabsList>

          {/* 總覽頁籤 */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* 月度收支對比 */}
              <Card>
                <CardHeader>
                  <CardTitle>月度收支對比</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="revenue" name="營收" fill={COLORS.revenue} />
                      <Bar dataKey="totalCost" name="成本" fill={COLORS.cost} />
                      <Bar dataKey="profit" name="淨利" fill={COLORS.profit} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 成本結構圓餅圖 */}
              <Card>
                <CardHeader>
                  <CardTitle>成本結構分析</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percentage }) =>
                          `${category} ${percentage.toFixed(1)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* 成本分類排名 */}
            <Card>
              <CardHeader>
                <CardTitle>成本項目排名</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categoryBreakdown.map((item, index) => (
                    <div key={item.category} className="flex items-center gap-4">
                      <div className="text-sm font-medium w-6 text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">{item.category}</span>
                          <span className="text-sm font-bold">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground w-16 text-right">
                        {item.percentage.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 成本結構頁籤 */}
          <TabsContent value="cost-structure" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {categoryBreakdown.slice(0, 9).map((item) => (
                <Card key={item.category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      {item.category}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(item.amount)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      佔總成本 {item.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      佔營收 {currentMonthMetrics.revenue > 0
                        ? ((item.amount / currentMonthMetrics.revenue) * 100).toFixed(1)
                        : '0'}%
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* 趨勢分析頁籤 */}
          <TabsContent value="trend" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>獲利趨勢</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      name="營收"
                      stroke={COLORS.revenue}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="totalCost"
                      name="成本"
                      stroke={COLORS.cost}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="profit"
                      name="淨利"
                      stroke={COLORS.profit}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="profitMargin"
                      name="毛利率 (%)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 明細頁籤 */}
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>成本明細 ({selectedMonth} {selectedYear})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>分類</TableHead>
                      <TableHead>項目</TableHead>
                      <TableHead className="text-right">金額</TableHead>
                      <TableHead>備註</TableHead>
                      <TableHead>狀態</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData
                      .filter((item) => item.category_name !== '收入金額')
                      .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.category_name}
                          </TableCell>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(item.amount as string) || 0)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.notes || '-'}
                          </TableCell>
                          <TableCell>
                            {item.is_confirmed ? (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                已確認
                              </span>
                            ) : (
                              <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                                未確認
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}

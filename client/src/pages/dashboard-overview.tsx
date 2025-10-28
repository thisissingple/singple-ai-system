/**
 * 儀表板總覽頁面
 * 整合關鍵指標、待辦事項、資料品質警告
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  Clock,
  Target,
  Calendar,
  Activity,
  XCircle,
} from 'lucide-react';
import { Link } from 'wouter';
import ReportsLayout from './reports-layout';

interface OverviewMetrics {
  // 體驗課數據
  trialConversionRate: number;
  pendingStudents: number;
  weeklyTrials: number;

  // 財務數據
  monthlyRevenue: number;
  monthlyTarget: number;
  profitMargin: number;

  // 整體數據
  totalStudents: number;
  newStudentsThisMonth: number;

  // 本週趨勢（vs 上週）
  weeklyTrends?: {
    trials: { current: number; previous: number };
    conversions: { current: number; previous: number };
    revenue: { current: number; previous: number };
  };
}

interface DataQualityIssue {
  type: 'error' | 'warning';
  title: string;
  description: string;
  count: number;
  actionUrl?: string;
}

export default function DashboardOverview() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 取得總覽指標 - 使用真實 API
  const { data: metrics, isLoading, refetch } = useQuery<OverviewMetrics>({
    queryKey: ['/api/reports/overview'],
    queryFn: async () => {
      return await apiRequest<OverviewMetrics>('GET', '/api/reports/overview');
    },
  });

  // 資料品質警告 - 暫時隱藏所有警告
  const dataQualityIssues: DataQualityIssue[] = [];

  // 以下是原本硬編碼的警告，暫時註解掉
  /*
  const dataQualityIssues: DataQualityIssue[] = [
    {
      type: 'error',
      title: '無效資料記錄',
      description: '972 筆成交記錄無法找到對應的學生資料',
      count: 972,
      actionUrl: '/settings/data-sources',
    },
    {
      type: 'warning',
      title: '缺少購買記錄',
      description: '發現 2 位學生有上課記錄但缺少購買記錄',
      count: 2,
      actionUrl: '/reports/trial-report',
    },
    {
      type: 'warning',
      title: '待處理訂單',
      description: 'pending 計算結果為負數（-474 筆）',
      count: 474,
      actionUrl: '/settings/data-sources',
    },
  ];
  */

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const revenueProgress = metrics
    ? Math.min((metrics.monthlyRevenue / metrics.monthlyTarget) * 100, 100)
    : 0;

  // 計算趨勢變化百分比
  const calculateTrendPercentage = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const weeklyTrends = metrics?.weeklyTrends;
  const trialsTrend = weeklyTrends ? calculateTrendPercentage(weeklyTrends.trials.current, weeklyTrends.trials.previous) : 0;
  const conversionsTrend = weeklyTrends ? calculateTrendPercentage(weeklyTrends.conversions.current, weeklyTrends.conversions.previous) : 0;
  const revenueTrend = weeklyTrends ? calculateTrendPercentage(weeklyTrends.revenue.current, weeklyTrends.revenue.previous) : 0;

  return (
    <ReportsLayout title="儀表板總覽">
      <div className="p-6 space-y-6">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">儀表板總覽</h1>
            <p className="text-muted-foreground mt-1">
              整體經營狀況與關鍵指標
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
        </div>

      {/* 資料品質警告 */}
      {dataQualityIssues.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-semibold">資料品質警告</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1 mt-2">
              {dataQualityIssues.map((issue, index) => (
                <li key={index}>
                  {issue.title}：{issue.description}
                  {issue.actionUrl && (
                    <Link href={issue.actionUrl}>
                      <Button variant="link" className="h-auto p-0 ml-2 text-xs">
                        處理 →
                      </Button>
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* 關鍵指標卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 本月營收 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">本月營收</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              NT$ {metrics?.monthlyRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-green-600 h-full transition-all"
                  style={{ width: `${revenueProgress}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {revenueProgress.toFixed(0)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              目標：NT$ {metrics?.monthlyTarget.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* 毛利率 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">毛利率</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.profitMargin}%</div>
            <div className="flex items-center text-xs mt-1">
              {(metrics?.profitMargin ?? 0) >= 20 ? (
                <>
                  <CheckCircle className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">健康水平</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-600 mr-1" />
                  <span className="text-amber-600">需注意</span>
                </>
              )}
            </div>
            <Link href="/reports/cost-profit">
              <Button variant="link" className="h-auto p-0 mt-1 text-xs">
                查看成本獲利報表 →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 待跟進學生 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待跟進學生</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {metrics?.pendingStudents} 位
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              本週體驗課：{metrics?.weeklyTrials} 堂
            </p>
            <Link href="/reports/trial-report">
              <Button variant="link" className="h-auto p-0 mt-1 text-xs">
                查看學生名單 →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 新增學生 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">新增學生</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.newStudentsThisMonth} 位
            </div>
            <div className="flex items-center text-xs mt-1">
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
              <span className="text-green-600">本月新增</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              總學生數：{metrics?.totalStudents} 位
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 待辦事項 */}
      <Card>
        <CardHeader>
          <CardTitle>待辦事項</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="font-medium">66 位待跟進學生</div>
                <div className="text-sm text-muted-foreground">
                  體驗課轉換率：30.9%
                </div>
              </div>
            </div>
            <Link href="/reports/trial-report">
              <Button size="sm">
                查看名單 <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="font-medium">處理 pending 訂單問題</div>
                <div className="text-sm text-muted-foreground">
                  pending 計算結果為負數（-474 筆）
                </div>
              </div>
            </div>
            <Link href="/settings/data-sources">
              <Button size="sm" variant="outline">
                檢查資料來源 <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 本週數據趨勢 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            本週數據趨勢
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* 體驗課數量 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">體驗課數量</span>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {weeklyTrends?.trials.current || 0}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {trialsTrend >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">
                      +{trialsTrend.toFixed(1)}% vs 上週
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-600">
                      {trialsTrend.toFixed(1)}% vs 上週
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                上週：{weeklyTrends?.trials.previous || 0} 堂
              </p>
            </div>

            {/* 成交數量 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">成交數量</span>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                {weeklyTrends?.conversions.current || 0}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {conversionsTrend >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">
                      +{conversionsTrend.toFixed(1)}% vs 上週
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-600">
                      {conversionsTrend.toFixed(1)}% vs 上週
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                上週：{weeklyTrends?.conversions.previous || 0} 位
              </p>
            </div>

            {/* 營收金額 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">營收金額</span>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">
                NT$ {(weeklyTrends?.revenue.current || 0).toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {revenueTrend >= 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-green-600">
                      +{revenueTrend.toFixed(1)}% vs 上週
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-xs text-red-600">
                      {revenueTrend.toFixed(1)}% vs 上週
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                上週：NT$ {(weeklyTrends?.revenue.previous || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 資料品質儀表板 - 暫時隱藏 */}
      {false && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                無效資料
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">972</div>
              <p className="text-xs text-muted-foreground mt-1">
                成交記錄無法找到對應學生
              </p>
              <Link href="/settings/data-sources">
                <Button variant="link" className="h-auto p-0 mt-2 text-xs text-red-600">
                  立即處理 →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                缺少購買記錄
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">2</div>
              <p className="text-xs text-muted-foreground mt-1">
                有上課記錄但缺少購買記錄
              </p>
              <Link href="/reports/trial-report">
                <Button variant="link" className="h-auto p-0 mt-2 text-xs text-amber-600">
                  查看詳情 →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                待處理訂單
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">-474</div>
              <p className="text-xs text-muted-foreground mt-1">
                pending 計算結果異常
              </p>
              <Link href="/settings/data-sources">
                <Button variant="link" className="h-auto p-0 mt-2 text-xs text-amber-600">
                  檢查資料來源 →
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </ReportsLayout>
  );
}

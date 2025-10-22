/**
 * 廣告成效報表頁面
 * 功能：三階段轉換率分析、各廣告活動成效對比
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart3, TrendingUp, Users, DollarSign, Target, RefreshCw } from 'lucide-react';
import { format, startOfWeek, startOfMonth, subMonths } from 'date-fns';

interface PerformanceData {
  summary: {
    total_leads: number;
    stage1_converted: number;
    stage2_converted: number;
    stage3_converted: number;
    trial_only: number;
    total_revenue: number;
    stage1_conversion_rate: string;
    stage2_conversion_rate: string;
    stage3_conversion_rate: string;
    overall_conversion_rate: string;
  };
  campaigns: Array<{
    campaign_name: string;
    campaign_id: string;
    total_leads: number;
    stage1_converted: number;
    stage2_converted: number;
    stage3_converted: number;
    trial_only: number;
    total_revenue: number;
    stage1_conversion_rate: string;
    stage2_conversion_rate: string;
    stage3_conversion_rate: string;
    overall_conversion_rate: string;
  }>;
}

export default function AdPerformanceReport() {
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 查詢成效報表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/reports/ad-performance', period, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/reports/ad-performance?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('載入報表失敗');
      }

      return response.json();
    },
  });

  const performanceData: PerformanceData | null = data?.data || null;

  // 設定快速時間範圍
  const setQuickRange = (range: 'week' | 'month' | 'last_month' | 'all') => {
    const now = new Date();
    switch (range) {
      case 'week':
        setStartDate(format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        setPeriod('week');
        break;
      case 'month':
        setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        setPeriod('month');
        break;
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0), 'yyyy-MM-dd'));
        setPeriod('month');
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        setPeriod('all');
        break;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold">廣告成效報表</h1>
          <p className="text-muted-foreground">
            追蹤 Facebook Lead Ads 三階段轉換率與各廣告活動成效
          </p>
        </div>

        {/* 時間篩選 */}
        <Card>
          <CardHeader>
            <CardTitle>時間範圍</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button
                variant={period === 'week' ? 'default' : 'outline'}
                onClick={() => setQuickRange('week')}
              >
                本週
              </Button>
              <Button
                variant={period === 'month' ? 'default' : 'outline'}
                onClick={() => setQuickRange('month')}
              >
                本月
              </Button>
              <Button
                variant="outline"
                onClick={() => setQuickRange('last_month')}
              >
                上個月
              </Button>
              <Button
                variant={period === 'all' ? 'default' : 'outline'}
                onClick={() => setQuickRange('all')}
              >
                全部
              </Button>
              <Button
                variant="outline"
                onClick={() => refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                重新整理
              </Button>
            </div>

            {startDate && endDate && (
              <div className="mt-4 text-sm text-muted-foreground">
                顯示期間：{startDate} 至 {endDate}
              </div>
            )}
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">載入中...</div>
        ) : !performanceData ? (
          <div className="text-center py-12 text-muted-foreground">
            無資料
          </div>
        ) : (
          <>
            {/* 總覽指標 */}
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    總名單數
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performanceData.summary.total_leads}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    已預約
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceData.summary.stage1_converted}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    轉換率：{performanceData.summary.stage1_conversion_rate}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    已上線
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceData.summary.stage2_converted}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    上線率：{performanceData.summary.stage2_conversion_rate}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    已成交
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {performanceData.summary.stage3_converted}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    成交率：{performanceData.summary.stage3_conversion_rate}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    總收益
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${performanceData.summary.total_revenue.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    總轉換率：{performanceData.summary.overall_conversion_rate}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 轉換漏斗 */}
            <Card>
              <CardHeader>
                <CardTitle>轉換漏斗</CardTitle>
                <CardDescription>三階段轉換流程視覺化</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 階段 1 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">階段 1：預約諮詢</span>
                      <span className="text-sm text-muted-foreground">
                        {performanceData.summary.stage1_converted} / {performanceData.summary.total_leads}
                        （{performanceData.summary.stage1_conversion_rate}）
                      </span>
                    </div>
                    <div className="h-8 bg-blue-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: performanceData.summary.stage1_conversion_rate,
                        }}
                      />
                    </div>
                  </div>

                  {/* 階段 2 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">階段 2：是否上線</span>
                      <span className="text-sm text-muted-foreground">
                        {performanceData.summary.stage2_converted} / {performanceData.summary.stage1_converted}
                        （{performanceData.summary.stage2_conversion_rate}）
                      </span>
                    </div>
                    <div className="h-8 bg-purple-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all"
                        style={{
                          width: performanceData.summary.stage2_conversion_rate,
                        }}
                      />
                    </div>
                  </div>

                  {/* 階段 3 */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">階段 3：高階成交</span>
                      <span className="text-sm text-muted-foreground">
                        {performanceData.summary.stage3_converted} / {performanceData.summary.stage2_converted}
                        （{performanceData.summary.stage3_conversion_rate}）
                      </span>
                    </div>
                    <div className="h-8 bg-green-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{
                          width: performanceData.summary.stage3_conversion_rate,
                        }}
                      />
                    </div>
                  </div>

                  {/* 總轉換率 */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">總轉換率</span>
                      <span className="text-sm font-bold text-orange-600">
                        {performanceData.summary.stage3_converted} / {performanceData.summary.total_leads}
                        （{performanceData.summary.overall_conversion_rate}）
                      </span>
                    </div>
                    <div className="h-10 bg-orange-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-orange-500 transition-all"
                        style={{
                          width: performanceData.summary.overall_conversion_rate,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 各廣告活動成效 */}
            <Card>
              <CardHeader>
                <CardTitle>各廣告活動成效</CardTitle>
                <CardDescription>
                  依廣告活動分析轉換率與收益
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceData.campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    尚無廣告活動資料
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>廣告活動</TableHead>
                        <TableHead className="text-right">總名單</TableHead>
                        <TableHead className="text-right">已預約</TableHead>
                        <TableHead className="text-right">已上線</TableHead>
                        <TableHead className="text-right">已成交</TableHead>
                        <TableHead className="text-right">僅體驗課</TableHead>
                        <TableHead className="text-right">總收益</TableHead>
                        <TableHead className="text-right">總轉換率</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceData.campaigns.map((campaign) => (
                        <TableRow key={campaign.campaign_id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {campaign.campaign_name}
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.total_leads}
                          </TableCell>
                          <TableCell className="text-right">
                            <div>{campaign.stage1_converted}</div>
                            <div className="text-xs text-muted-foreground">
                              {campaign.stage1_conversion_rate}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>{campaign.stage2_converted}</div>
                            <div className="text-xs text-muted-foreground">
                              {campaign.stage2_conversion_rate}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="font-bold text-green-600">
                              {campaign.stage3_converted}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {campaign.stage3_conversion_rate}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {campaign.trial_only}
                          </TableCell>
                          <TableCell className="text-right font-bold text-orange-600">
                            ${campaign.total_revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {campaign.overall_conversion_rate}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* 其他統計 */}
            <Card>
              <CardHeader>
                <CardTitle>其他統計</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label className="text-muted-foreground">僅購買體驗課</Label>
                    <div className="text-2xl font-bold mt-1">
                      {performanceData.summary.trial_only}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      未升高階但購買體驗課的學員數
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">平均客單價</Label>
                    <div className="text-2xl font-bold mt-1">
                      ${performanceData.summary.stage3_converted > 0
                        ? Math.round(performanceData.summary.total_revenue / performanceData.summary.stage3_converted).toLocaleString()
                        : 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      總收益 ÷ 成交數
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">每名單成本</Label>
                    <div className="text-2xl font-bold mt-1">
                      ${performanceData.summary.total_leads > 0
                        ? Math.round(performanceData.summary.total_revenue / performanceData.summary.total_leads).toLocaleString()
                        : 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      總收益 ÷ 總名單數
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

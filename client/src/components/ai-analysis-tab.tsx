/**
 * AI 分析 Tab 內容組件
 * 包含 AI 對話框 + 6 個核心卡片
 */

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Users, DollarSign, AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import { AIChatCompact } from '@/components/ai-chat-compact';
import { apiRequest } from '@/lib/queryClient';

interface AIInsightsData {
  topTeachers: Array<{
    name: string;
    classCount: number;
    studentCount: number;
    conversions: number;
    conversionRate: number;
  }>;
  topConsultants: Array<{
    name: string;
    dealCount: number;
    totalRevenue: number;
    avgDealAmount: number;
  }>;
  revenue: {
    totalRevenue: number;
    dealCount: number;
    avgDealAmount: number;
  };
  students: {
    totalStudents: number;
    purchasedStudents: number;
    convertedStudents: number;
    purchaseRate: number;
    conversionRate: number;
  };
  dataQuality: {
    warnings: string[];
    attendanceCount: number;
    purchaseCount: number;
    dealsCount: number;
  };
}

export function AIAnalysisTabContent() {
  const { data: insights, isLoading } = useQuery<{ data: AIInsightsData }>({
    queryKey: ['/api/ai/insights'],
    queryFn: async () => apiRequest<{ data: AIInsightsData }>('GET', '/api/ai/insights'),
    staleTime: 60000, // 1 分鐘
  });

  const formatCurrency = (amount: number) => {
    return `NT$ ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* AI 對話框 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI 數據助理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AIChatCompact className="h-[400px]" />
        </CardContent>
      </Card>

      {/* 6 個核心卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. TOP 3 教師成交排行 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              TOP 3 教師成交排行
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : insights?.data?.topTeachers && insights.data.topTeachers.length > 0 ? (
              <div className="space-y-3">
                {insights.data.topTeachers.map((teacher, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-lg">{['🏆', '🥈', '🥉'][idx]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{teacher.name}</p>
                      <p className="text-xs text-muted-foreground">
                        授課 {teacher.classCount} 次 · {teacher.studentCount} 學員
                      </p>
                      <p className="text-xs text-muted-foreground">
                        轉換率 {teacher.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暫無資料</p>
            )}
          </CardContent>
        </Card>

        {/* 2. TOP 3 諮詢師成交排行 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              TOP 3 諮詢師成交排行
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : insights?.data?.topConsultants && insights.data.topConsultants.length > 0 ? (
              <div className="space-y-3">
                {insights.data.topConsultants.map((consultant, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-lg">{['🏆', '🥈', '🥉'][idx]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{consultant.name}</p>
                      <p className="text-xs text-muted-foreground">
                        成交 {consultant.dealCount} 筆
                      </p>
                      <p className="text-xs font-medium text-green-600">
                        {formatCurrency(consultant.totalRevenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暫無資料</p>
            )}
          </CardContent>
        </Card>

        {/* 3. 本月營收總覽 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-yellow-500" />
              本月營收總覽
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : insights?.data?.revenue ? (
              <div className="space-y-2">
                <div>
                  <p className="text-2xl font-bold">
                    {formatCurrency(insights.data.revenue.totalRevenue)}
                  </p>
                  <p className="text-xs text-muted-foreground">總營收</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-sm font-medium">{insights.data.revenue.dealCount}</p>
                    <p className="text-xs text-muted-foreground">成交筆數</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {formatCurrency(insights.data.revenue.avgDealAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">平均成交</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暫無資料</p>
            )}
          </CardContent>
        </Card>

        {/* 4. 學員統計 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              學員統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : insights?.data?.students ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-lg font-bold">{insights.data.students.totalStudents}</p>
                    <p className="text-xs text-muted-foreground">總學員</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{insights.data.students.purchasedStudents}</p>
                    <p className="text-xs text-muted-foreground">已購買</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{insights.data.students.convertedStudents}</p>
                    <p className="text-xs text-muted-foreground">已成交</p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <p className="text-sm">
                    購買率: <span className="font-medium">{insights.data.students.purchaseRate.toFixed(1)}%</span>
                  </p>
                  <p className="text-sm">
                    轉換率: <span className="font-medium">{insights.data.students.conversionRate.toFixed(1)}%</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暫無資料</p>
            )}
          </CardContent>
        </Card>

        {/* 5. 資料品質警告 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              資料品質
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : insights?.data?.dataQuality ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <p className="text-lg font-bold">{insights.data.dataQuality.attendanceCount}</p>
                    <p className="text-xs text-muted-foreground">體驗課</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{insights.data.dataQuality.purchaseCount}</p>
                    <p className="text-xs text-muted-foreground">購買記錄</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{insights.data.dataQuality.dealsCount}</p>
                    <p className="text-xs text-muted-foreground">成交記錄</p>
                  </div>
                </div>
                {insights.data.dataQuality.warnings.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-orange-600">
                      ⚠️ {insights.data.dataQuality.warnings.length} 個警告
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暫無資料</p>
            )}
          </CardContent>
        </Card>

        {/* 6. 快速統計 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              快速統計
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : insights?.data ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">TOP 教師</span>
                  <span className="text-sm font-medium">
                    {insights.data.topTeachers[0]?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">TOP 諮詢師</span>
                  <span className="text-sm font-medium">
                    {insights.data.topConsultants[0]?.name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">本月營收</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(insights.data.revenue?.totalRevenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">總學員數</span>
                  <span className="text-sm font-medium">
                    {insights.data.students?.totalStudents || 0}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">暫無資料</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * AI 使用量儀表板
 * 統整系統所有 AI API 呼叫的費用和使用量
 */

import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { sidebarConfig } from '@/config/sidebar-config';
import { Loader2, DollarSign, Zap, Clock, TrendingUp, Calendar, BarChart3, RefreshCw, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

// ============================================================================
// Types
// ============================================================================

interface AIUsageBySource {
  source: string;
  sourceName: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  avgTokensPerCall: number;
  avgCostPerCall: number;
  avgResponseTimeMs: number;
}

interface AIUsageByDate {
  date: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
}

interface AIUsageByModel {
  model: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
}

interface AIUsageSummary {
  period: {
    start: string;
    end: string;
  };
  totals: {
    totalCalls: number;
    totalTokens: number;
    totalCostUsd: number;
    totalCostTwd: number;
    avgTokensPerCall: number;
    avgCostPerCall: number;
  };
  bySource: AIUsageBySource[];
  byDate: AIUsageByDate[];
  byModel: AIUsageByModel[];
  topConsumers: {
    type: string;
    name: string;
    totalCalls: number;
    totalCostUsd: number;
  }[];
}

interface AIUsageRecord {
  id: string;
  source: string;
  sourceName: string;
  userId: string | null;
  model: string;
  tokensUsed: number;
  responseTimeMs: number;
  apiCostUsd: number;
  createdAt: string;
  studentEmail?: string;
  questionType?: string;
}

interface AIUsageRecordsResult {
  records: AIUsageRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================================================
// Constants
// ============================================================================

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00C49F'];

// ============================================================================
// Component
// ============================================================================

function AIUsageDashboardContent() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AIUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'all' | 'custom'>('month');

  // Custom date range
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Records tab state
  const [records, setRecords] = useState<AIUsageRecordsResult | null>(null);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [recordsPage, setRecordsPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  // 計算日期範圍
  const dateRange = useMemo(() => {
    const today = new Date();
    const end = today.toISOString().split('T')[0];

    if (period === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    } else if (period === 'week') {
      const start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString().split('T')[0], end };
    } else if (period === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: start.toISOString().split('T')[0], end };
    } else {
      // All time - past 90 days
      const start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      return { start: start.toISOString().split('T')[0], end };
    }
  }, [period, customStartDate, customEndDate]);

  // Fetch summary data
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/ai-usage/summary?start_date=${dateRange.start}&end_date=${dateRange.end}`
      );
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || '載入失敗');
      }
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
      setError('無法連線到伺服器');
    } finally {
      setLoading(false);
    }
  };

  // Fetch records data
  const fetchRecords = async (page: number = 1) => {
    setRecordsLoading(true);

    try {
      const sourceParam = sourceFilter !== 'all' ? `&source=${sourceFilter}` : '';
      const response = await fetch(
        `/api/ai-usage/records?start_date=${dateRange.start}&end_date=${dateRange.end}&page=${page}&page_size=20${sourceParam}`
      );
      const result = await response.json();

      if (result.success) {
        setRecords(result.data);
        setRecordsPage(page);
      }
    } catch (err) {
      console.error('Failed to fetch AI usage records:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Format functions
  const formatUSD = (value: number) => `$${value.toFixed(4)}`;
  const formatTWD = (value: number) => `NT$${value.toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value.toLocaleString('zh-TW');
  const formatDateTime = (isoString: string) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Handle custom date apply
  const handleApplyCustomDate = () => {
    if (customStartDate && customEndDate) {
      setPeriod('custom');
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          重試
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">沒有資料</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI 使用量儀表板</h1>
          <p className="text-muted-foreground mt-1">
            統計所有 OpenAI API 呼叫的費用和使用量
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant={period === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('week')}
          >
            本週
          </Button>
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('month')}
          >
            本月
          </Button>
          <Button
            variant={period === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setPeriod('all')}
          >
            過去 90 天
          </Button>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Custom Date Range */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">開始日期</Label>
              <Input
                id="start-date"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">結束日期</Label>
              <Input
                id="end-date"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              onClick={handleApplyCustomDate}
              disabled={!customStartDate || !customEndDate}
              variant={period === 'custom' ? 'default' : 'outline'}
            >
              套用自訂日期
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto">
              <Calendar className="w-4 h-4" />
              <span>目前統計期間：{data.period.start} ~ {data.period.end}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" onValueChange={(value) => {
        if (value === 'records' && !records) {
          fetchRecords(1);
        }
      }}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="w-4 h-4 mr-2" />
            總覽
          </TabsTrigger>
          <TabsTrigger value="records">
            <List className="w-4 h-4 mr-2" />
            詳細記錄
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">總費用 (USD)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatUSD(data.totals.totalCostUsd)}</div>
                <p className="text-xs text-muted-foreground">
                  約 {formatTWD(data.totals.totalCostTwd)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">總呼叫次數</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.totals.totalCalls)}</div>
                <p className="text-xs text-muted-foreground">
                  平均每次 {formatUSD(data.totals.avgCostPerCall)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">總 Token 使用量</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatNumber(data.totals.totalTokens)}</div>
                <p className="text-xs text-muted-foreground">
                  平均每次 {formatNumber(data.totals.avgTokensPerCall)} tokens
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">日均費用</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.byDate.length > 0
                    ? formatUSD(data.totals.totalCostUsd / data.byDate.length)
                    : '$0.0000'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.byDate.length} 天內有使用
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Daily Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>每日使用趨勢</CardTitle>
                <CardDescription>每天的 API 呼叫次數和費用</CardDescription>
              </CardHeader>
              <CardContent>
                {data.byDate.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.byDate}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value) => value.slice(5)}
                        fontSize={12}
                      />
                      <YAxis yAxisId="left" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" fontSize={12} />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'totalCostUsd') return [formatUSD(value), '費用'];
                          if (name === 'totalCalls') return [value, '呼叫次數'];
                          return [value, name];
                        }}
                        labelFormatter={(label) => `日期: ${label}`}
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="totalCalls"
                        name="呼叫次數"
                        stroke="#8884d8"
                        strokeWidth={2}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="totalCostUsd"
                        name="費用 (USD)"
                        stroke="#82ca9d"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    沒有趨勢數據
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Source Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>費用來源分佈</CardTitle>
                <CardDescription>各功能模組的 AI 費用佔比</CardDescription>
              </CardHeader>
              <CardContent>
                {data.bySource.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.bySource}
                        dataKey="totalCostUsd"
                        nameKey="sourceName"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ sourceName, percent }) =>
                          `${sourceName}: ${(percent * 100).toFixed(1)}%`
                        }
                        labelLine={false}
                      >
                        {data.bySource.map((entry, index) => (
                          <Cell key={entry.source} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatUSD(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    沒有來源數據
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Source Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>各功能模組使用詳情</CardTitle>
              <CardDescription>按功能模組分類的詳細使用統計</CardDescription>
            </CardHeader>
            <CardContent>
              {data.bySource.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>功能模組</TableHead>
                      <TableHead className="text-right">呼叫次數</TableHead>
                      <TableHead className="text-right">總 Tokens</TableHead>
                      <TableHead className="text-right">平均 Tokens</TableHead>
                      <TableHead className="text-right">平均回應時間</TableHead>
                      <TableHead className="text-right">總費用 (USD)</TableHead>
                      <TableHead className="text-right">佔比</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bySource.map((source) => (
                      <TableRow key={source.source}>
                        <TableCell className="font-medium">{source.sourceName}</TableCell>
                        <TableCell className="text-right">{formatNumber(source.totalCalls)}</TableCell>
                        <TableCell className="text-right">{formatNumber(source.totalTokens)}</TableCell>
                        <TableCell className="text-right">{formatNumber(source.avgTokensPerCall)}</TableCell>
                        <TableCell className="text-right">
                          {source.avgResponseTimeMs > 0 ? `${formatNumber(source.avgResponseTimeMs)} ms` : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatUSD(source.totalCostUsd)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">
                            {data.totals.totalCostUsd > 0
                              ? `${((source.totalCostUsd / data.totals.totalCostUsd) * 100).toFixed(1)}%`
                              : '0%'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  沒有使用數據
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Usage */}
          {data.byModel.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI 模型使用統計</CardTitle>
                <CardDescription>各 OpenAI 模型的使用情況</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>模型</TableHead>
                      <TableHead className="text-right">呼叫次數</TableHead>
                      <TableHead className="text-right">總 Tokens</TableHead>
                      <TableHead className="text-right">總費用 (USD)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byModel.map((model) => (
                      <TableRow key={model.model}>
                        <TableCell className="font-medium">
                          <Badge variant="secondary">{model.model}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(model.totalCalls)}</TableCell>
                        <TableCell className="text-right">{formatNumber(model.totalTokens)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatUSD(model.totalCostUsd)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          {/* Filter */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-4">
                <div className="space-y-1.5">
                  <Label>篩選來源</Label>
                  <Select value={sourceFilter} onValueChange={(value) => {
                    setSourceFilter(value);
                    // Re-fetch with new filter
                    setTimeout(() => fetchRecords(1), 0);
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部來源</SelectItem>
                      <SelectItem value="teaching_quality_analysis">體驗課品質分析</SelectItem>
                      <SelectItem value="consultation_quality_analysis">諮詢品質分析</SelectItem>
                      <SelectItem value="teacher_ai_conversations">老師 AI 對話</SelectItem>
                      <SelectItem value="consultant_ai_conversations">諮詢師 AI 對話</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchRecords(recordsPage)}
                  className="mt-auto"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  重新整理
                </Button>
                {records && (
                  <div className="ml-auto text-sm text-muted-foreground">
                    共 {formatNumber(records.total)} 筆記錄
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle>每筆 AI 呼叫記錄</CardTitle>
              <CardDescription>顯示每一次 AI API 呼叫的詳細資訊</CardDescription>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : records && records.records.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>時間</TableHead>
                        <TableHead>來源</TableHead>
                        <TableHead>用戶</TableHead>
                        <TableHead>模型</TableHead>
                        <TableHead className="text-right">Tokens</TableHead>
                        <TableHead className="text-right">回應時間</TableHead>
                        <TableHead className="text-right">費用 (USD)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.records.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="text-sm">
                            {formatDateTime(record.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {record.sourceName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.userId || '-'}
                            {record.studentEmail && (
                              <div className="text-xs text-muted-foreground">
                                學生: {record.studentEmail}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {record.model}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(record.tokensUsed)}
                          </TableCell>
                          <TableCell className="text-right">
                            {record.responseTimeMs > 0
                              ? `${formatNumber(record.responseTimeMs)} ms`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatUSD(record.apiCostUsd)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {records.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        第 {records.page} / {records.totalPages} 頁
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchRecords(recordsPage - 1)}
                          disabled={recordsPage <= 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          上一頁
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchRecords(recordsPage + 1)}
                          disabled={recordsPage >= records.totalPages}
                        >
                          下一頁
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  沒有記錄
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AIUsageDashboard() {
  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="AI 使用量統計">
      <AIUsageDashboardContent />
    </DashboardLayout>
  );
}

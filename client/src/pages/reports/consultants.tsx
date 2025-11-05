/**
 * 諮詢師報表頁面
 * 提供諮詢師業績分析、成交數據、AI 洞見等功能
 */

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useFilteredSidebar } from '@/hooks/use-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Clock,
  AlertCircle,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
  MessageCircle,
  Send,
  X,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// 型別定義
type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
type DealStatus = 'all' | 'closed' | 'in_progress' | 'lost';
type TrendGrouping = 'day' | 'week' | 'month' | 'quarter';

interface ConsultantReportParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  consultantName?: string;
  leadSource?: string[];
  planType?: string[];
  dealStatus?: DealStatus;
  compareWithPrevious?: boolean;
  compareWithLastYear?: boolean;
}

interface KPIData {
  consultationCount: number;
  dealCount: number;
  closingRate: number;
  totalPackagePrice: number;
  totalActualAmount: number;
  avgDealAmount: number;
  pendingCount: number;
  potentialRevenue: number;
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  totalActualAmountChange?: number;
}

interface ChartDataItem {
  name: string;
  value: number;
  [key: string]: any;
}

interface ConsultantRanking {
  consultantName: string;
  consultationCount: number;
  dealCount: number;
  closingRate: number;
  totalRevenue: number;
  actualAmount: number;
  avgDealAmount: number;
  lastDealDate: string | null;
  topSetters: string[];
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  actualAmountChange?: number;
}

interface SetterRanking {
  setterName: string;
  consultationCount: number;
  dealCount: number;
  closingRate: number;
  totalRevenue: number;
  actualAmount: number;
  avgDealAmount: number;
  lastDealDate: string | null;
  topClosers: string[];
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  actualAmountChange?: number;
}

interface AIInsight {
  type: 'trend' | 'anomaly' | 'collaboration' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  actionItems?: string[];
  severity: 'info' | 'warning' | 'success';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConsultantReport {
  kpiData: KPIData;
  charts: {
    leadSourcePie: ChartDataItem[];
    planPie: ChartDataItem[];
    trendLine: ChartDataItem[];
    setterCloserMatrix: any[];
    funnel: ChartDataItem[];
  };
  ranking: ConsultantRanking[];
  setterRanking: SetterRanking[]; // 電訪人員排行榜
  aiInsights: AIInsight[];
  metadata: {
    period: PeriodType;
    dateRange: { start: string; end: string };
    filters: Partial<ConsultantReportParams>;
  };
}

function ConsultantReportContent() {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [dealStatus, setDealStatus] = useState<DealStatus>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [compareWithPrevious, setCompareWithPrevious] = useState(false);
  const [compareWithLastYear, setCompareWithLastYear] = useState(false);
  const [trendGrouping, setTrendGrouping] = useState<TrendGrouping>('day');
  const [consultationListOpen, setConsultationListOpen] = useState(false);
  const [selectedConsultantName, setSelectedConsultantName] = useState<string | null>(null);
  const [selectedSetterName, setSelectedSetterName] = useState<string | null>(null);

  // AI 對話窗狀態
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // 查詢報表數據
  const { data: reportData, isLoading, error } = useQuery<{ success: boolean; data: ConsultantReport }>({
    queryKey: ['consultant-report', period, dealStatus, startDate, endDate, compareWithPrevious, compareWithLastYear, trendGrouping],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        dealStatus,
        compareWithPrevious: compareWithPrevious.toString(),
        compareWithLastYear: compareWithLastYear.toString(),
        trendGrouping,
      });

      // 如果是自訂期間，加入開始和結束日期
      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/reports/consultants?${params}`);
      if (!response.ok) throw new Error('Failed to fetch consultant report');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });

  const report = reportData?.data;

  // 查詢諮詢名單（當 Dialog 開啟時才查詢）
  const { data: consultationListData, isLoading: listLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['consultation-list', period, dealStatus, startDate, endDate, selectedConsultantName, selectedSetterName],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        dealStatus,
      });

      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      // 如果有選擇的諮詢師，加入篩選
      if (selectedConsultantName) {
        params.append('consultantName', selectedConsultantName);
      }

      // 如果有選擇的 Setter，加入篩選
      if (selectedSetterName) {
        params.append('setterName', selectedSetterName);
      }

      const response = await fetch(`/api/reports/consultants/consultation-list?${params}`);
      if (!response.ok) throw new Error('Failed to fetch consultation list');
      return response.json();
    },
    enabled: consultationListOpen, // 只有在 Dialog 開啟時才查詢
    staleTime: 5 * 60 * 1000,
  });

  const consultationList = consultationListData?.data || [];

  // 處理點擊諮詢師排行榜數值
  const handleConsultantClick = (consultantName: string) => {
    setSelectedConsultantName(consultantName);
    setSelectedSetterName(null); // 清除 Setter 篩選
    setConsultationListOpen(true);
  };

  // 處理點擊 Setter 排行榜數值
  const handleSetterClick = (setterName: string) => {
    setSelectedSetterName(setterName);
    setSelectedConsultantName(null); // 清除諮詢師篩選
    setConsultationListOpen(true);
  };

  // 處理點擊總諮詢數 KPI
  const handleAllConsultationsClick = () => {
    setSelectedConsultantName(null);
    setSelectedSetterName(null);
    setConsultationListOpen(true);
  };

  // 處理 AI 對話發送
  const handleSendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      // 構建報表摘要作為上下文
      const reportContext = `
當前報表數據：
- 時間範圍：${report?.metadata.dateRange.start} 至 ${report?.metadata.dateRange.end}
- 諮詢數：${kpiData.consultationCount}
- 成交數：${kpiData.dealCount}
- 成交率：${kpiData.closingRate.toFixed(1)}%
- 實收金額：${kpiData.totalActualAmount}
- 諮詢師排行榜前三名：${ranking.slice(0, 3).map(c => `${c.consultantName} (成交${c.dealCount}筆)`).join(', ')}
- 電訪人員排行榜前三名：${setterRanking.slice(0, 3).map(s => `${s.setterName} (約訪${s.consultationCount}筆)`).join(', ')}
      `;

      // 模擬 AI 回應（實際應用中應該調用 OpenAI API）
      await new Promise(resolve => setTimeout(resolve, 1000));

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: `我已經了解你的問題："${userMessage.content}"。\n\n根據當前報表數據分析：\n\n這是一個模擬回覆。實際應用中，這裡會調用 OpenAI API 並結合報表數據提供深入分析。目前你可以看到報表包含 ${kpiData.consultationCount} 筆諮詢記錄，成交率為 ${kpiData.closingRate.toFixed(1)}%。\n\n如需深入分析，請提供更具體的問題！`,
        timestamp: new Date(),
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI 回應失敗:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '抱歉，AI 暫時無法回應。請稍後再試。',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">載入報表時發生錯誤</div>
      </div>
    );
  }

  const { kpiData, charts, ranking, setterRanking, aiInsights } = report;

  // 圖表顏色
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316'];

  // 格式化數字
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('zh-TW').format(num);
  };

  // 格式化貨幣
  const formatCurrency = (num: number) => {
    return `NT$${formatNumber(num)}`;
  };

  // 格式化百分比
  const formatPercent = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  // 格式化日期（移除時間部分）
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // 自訂圓餅圖標籤（顯示名稱和數量）
  const renderCustomLabel = ({ name, value, percent }: any) => {
    return `${name}: ${value} (${(percent * 100).toFixed(0)}%)`;
  };

  // 渲染對比指標 (完整版 - 用於 KPI 卡片)
  const renderComparisonIndicator = (change?: number) => {
    if (change === undefined || change === null) return null;

    const isPositive = change > 0;
    const isNegative = change < 0;
    const isZero = change === 0;

    return (
      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
        isPositive ? 'text-green-600' :
        isNegative ? 'text-red-600' :
        'text-gray-500'
      }`}>
        {isPositive && <ArrowUp className="h-3 w-3" />}
        {isNegative && <ArrowDown className="h-3 w-3" />}
        {isZero && <Minus className="h-3 w-3" />}
        <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
        <span className="text-muted-foreground">
          vs {compareWithPrevious ? '前期' : compareWithLastYear ? '去年同期' : ''}
        </span>
      </div>
    );
  };

  // 渲染對比指標 (精簡版 - 用於排行榜表格)
  const renderCompactChange = (change?: number) => {
    if (change === undefined || change === null || (!compareWithPrevious && !compareWithLastYear)) return null;

    const isPositive = change > 0;
    const isNegative = change < 0;

    return (
      <span className={`text-[10px] ml-1 ${
        isPositive ? 'text-green-600' :
        isNegative ? 'text-red-600' :
        'text-gray-500'
      }`}>
        ({isPositive ? '+' : ''}{change.toFixed(1)}%)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">諮詢師報表</h1>
            <p className="text-muted-foreground mt-1">
              分析諮詢師業績、成交數據與協作效果
            </p>
          </div>
        </div>

        {/* 篩選控件 */}
        <div className="flex flex-wrap gap-3">
          <select
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value as PeriodType);
              // 如果切換到非自訂期間，清空日期
              if (e.target.value !== 'custom') {
                setStartDate('');
                setEndDate('');
              }
            }}
            className="border rounded-md px-3 py-2"
          >
            <option value="today">今日</option>
            <option value="week">本週</option>
            <option value="month">本月</option>
            <option value="quarter">本季</option>
            <option value="year">今年</option>
            <option value="all">全部</option>
            <option value="custom">自訂區間</option>
          </select>

          {/* 自訂日期選擇器 */}
          {period === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="開始日期"
              />
              <span className="flex items-center">至</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded-md px-3 py-2"
                placeholder="結束日期"
              />
            </>
          )}

          <select
            value={dealStatus}
            onChange={(e) => setDealStatus(e.target.value as DealStatus)}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">全部狀態</option>
            <option value="closed">已成交</option>
            <option value="in_progress">跟進中</option>
            <option value="lost">已流失</option>
          </select>

          {/* 對比選項 */}
          <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={compareWithPrevious}
              onChange={(e) => setCompareWithPrevious(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">對比前期</span>
          </label>

          <label className="flex items-center gap-2 border rounded-md px-3 py-2 cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={compareWithLastYear}
              onChange={(e) => setCompareWithLastYear(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">對比去年</span>
          </label>
        </div>
      </div>

      {/* KPI 卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 諮詢數 - 可點擊查看名單 */}
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleAllConsultationsClick}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">諮詢數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpiData.consultationCount)}</div>
            {renderComparisonIndicator(kpiData.consultationCountChange)}
            <p className="text-xs text-blue-600 font-medium mt-1">
              點擊查看名單詳情 →
            </p>
            <p className="text-xs text-muted-foreground">
              待跟進: {formatNumber(kpiData.pendingCount)}
            </p>
          </CardContent>
        </Card>

        {/* 成交數 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成交數</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpiData.dealCount)}</div>
            {renderComparisonIndicator(kpiData.dealCountChange)}
            <p className="text-xs text-muted-foreground mt-1">
              成交率: {formatPercent(kpiData.closingRate)}
            </p>
          </CardContent>
        </Card>

        {/* 實收金額 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">實收金額</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.totalActualAmount)}</div>
            {renderComparisonIndicator(kpiData.totalActualAmountChange)}
            <p className="text-xs text-muted-foreground mt-1">
              方案總額: {formatCurrency(kpiData.totalPackagePrice)}
            </p>
          </CardContent>
        </Card>

        {/* 平均成交金額 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均成交金額</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.avgDealAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              潛在營收: {formatCurrency(kpiData.potentialRevenue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 圖表區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 名單來源分佈 */}
        <Card>
          <CardHeader>
            <CardTitle>名單來源分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.leadSourcePie}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {charts.leadSourcePie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 方案分佈 */}
        <Card>
          <CardHeader>
            <CardTitle>方案銷售分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={charts.planPie}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={renderCustomLabel}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {charts.planPie.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 趨勢折線圖 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>諮詢與成交趨勢</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={trendGrouping === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendGrouping('day')}
                >
                  日線
                </Button>
                <Button
                  variant={trendGrouping === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendGrouping('week')}
                >
                  週線
                </Button>
                <Button
                  variant={trendGrouping === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendGrouping('month')}
                >
                  月線
                </Button>
                <Button
                  variant={trendGrouping === 'quarter' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendGrouping('quarter')}
                >
                  季線
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={charts.trendLine}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                />
                <YAxis />
                <Tooltip
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('zh-TW');
                  }}
                />
                <Line type="monotone" dataKey="consultations" stroke="#3b82f6" name="諮詢數" strokeWidth={2} />
                <Line type="monotone" dataKey="deals" stroke="#10b981" name="成交數" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 諮詢師排行榜 */}
      <Card>
        <CardHeader>
          <CardTitle>諮詢師排行榜</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">排名</th>
                  <th className="text-left py-3 px-4">諮詢師</th>
                  <th className="text-right py-3 px-4">諮詢數</th>
                  <th className="text-right py-3 px-4">成交數</th>
                  <th className="text-right py-3 px-4">成交率</th>
                  <th className="text-right py-3 px-4">實收金額</th>
                  <th className="text-right py-3 px-4">平均成交</th>
                  <th className="text-left py-3 px-4">最後成交</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((consultant, index) => (
                  <tr key={consultant.consultantName} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${index < 3 ? 'text-yellow-600' : ''}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{consultant.consultantName}</td>
                    <td
                      className="py-3 px-4 text-right cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={() => handleConsultantClick(consultant.consultantName)}
                      title="點擊查看諮詢名單"
                    >
                      {formatNumber(consultant.consultationCount)}
                      {renderCompactChange(consultant.consultationCountChange)}
                    </td>
                    <td
                      className="py-3 px-4 text-right cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={() => handleConsultantClick(consultant.consultantName)}
                      title="點擊查看成交名單"
                    >
                      {formatNumber(consultant.dealCount)}
                      {renderCompactChange(consultant.dealCountChange)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatPercent(consultant.closingRate)}
                      {renderCompactChange(consultant.closingRateChange)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(consultant.actualAmount)}
                      {renderCompactChange(consultant.actualAmountChange)}
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(consultant.avgDealAmount)}</td>
                    <td className="py-3 px-4">
                      {consultant.lastDealDate
                        ? new Date(consultant.lastDealDate).toLocaleDateString('zh-TW')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 電訪人員（Setter）排行榜 */}
      <Card>
        <CardHeader>
          <CardTitle>電訪人員排行榜</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">排名</th>
                  <th className="text-left py-3 px-4">電訪人員</th>
                  <th className="text-right py-3 px-4">約訪數</th>
                  <th className="text-right py-3 px-4">成交數</th>
                  <th className="text-right py-3 px-4">成交率</th>
                  <th className="text-right py-3 px-4">實收金額</th>
                  <th className="text-right py-3 px-4">平均成交</th>
                  <th className="text-left py-3 px-4">TOP 3 合作 Closer</th>
                </tr>
              </thead>
              <tbody>
                {setterRanking.map((setter, index) => (
                  <tr key={setter.setterName} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4">
                      <span className={`font-semibold ${index < 3 ? 'text-yellow-600' : ''}`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{setter.setterName}</td>
                    <td
                      className="py-3 px-4 text-right cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={() => handleSetterClick(setter.setterName)}
                      title="點擊查看約訪名單"
                    >
                      {formatNumber(setter.consultationCount)}
                      {renderCompactChange(setter.consultationCountChange)}
                    </td>
                    <td
                      className="py-3 px-4 text-right cursor-pointer text-blue-600 hover:text-blue-800 hover:underline"
                      onClick={() => handleSetterClick(setter.setterName)}
                      title="點擊查看成交名單"
                    >
                      {formatNumber(setter.dealCount)}
                      {renderCompactChange(setter.dealCountChange)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatPercent(setter.closingRate)}
                      {renderCompactChange(setter.closingRateChange)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(setter.actualAmount)}
                      {renderCompactChange(setter.actualAmountChange)}
                    </td>
                    <td className="py-3 px-4 text-right">{formatCurrency(setter.avgDealAmount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {setter.topClosers.map((closer, i) => (
                          <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                            {closer}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* AI 洞見 - 移到最後 */}
      {aiInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI 洞見與建議
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    insight.severity === 'warning'
                      ? 'bg-yellow-50 border-yellow-200'
                      : insight.severity === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {insight.severity === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                    {insight.severity === 'success' && <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />}
                    {insight.severity === 'info' && <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />}
                    <div>
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
                      {insight.actionItems && insight.actionItems.length > 0 && (
                        <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                          {insight.actionItems.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 諮詢名單 Dialog */}
      <Dialog open={consultationListOpen} onOpenChange={setConsultationListOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              諮詢名單詳情
              {selectedConsultantName && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  （諮詢師：{selectedConsultantName}）
                </span>
              )}
              {selectedSetterName && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  （電訪人員：{selectedSetterName}）
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {listLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : (
            <div className="mt-4">
              <div className="mb-4 text-sm text-muted-foreground">
                共 {consultationList.length} 筆諮詢記錄
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left py-3 px-4 font-medium">學生姓名</th>
                      <th className="text-left py-3 px-4 font-medium">Email</th>
                      <th className="text-left py-3 px-4 font-medium">諮詢日期</th>
                      <th className="text-left py-3 px-4 font-medium">諮詢師</th>
                      <th className="text-left py-3 px-4 font-medium">電訪人員</th>
                      <th className="text-left py-3 px-4 font-medium">狀態</th>
                      <th className="text-right py-3 px-4 font-medium">實收金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultationList.map((item: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-4">{item.studentName || '-'}</td>
                        <td className="py-3 px-4 text-sm">{item.studentEmail || '-'}</td>
                        <td className="py-3 px-4 text-sm">
                          {item.consultationDate ? new Date(item.consultationDate).toLocaleDateString('zh-TW') : '-'}
                        </td>
                        <td className="py-3 px-4">{item.consultantName || '-'}</td>
                        <td className="py-3 px-4">{item.setterName || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.status === '已成交'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.actualAmount ? formatCurrency(parseFloat(item.actualAmount.replace(/[^0-9.-]/g, ''))) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI 對話窗 - 固定在右下角 */}
      {chatOpen ? (
        <div className="fixed bottom-4 right-4 w-96 bg-white border rounded-lg shadow-2xl z-50 flex flex-col" style={{ height: '500px' }}>
          {/* 標題列 */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">AI 報表助手</h3>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 對話內容區域 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>你好！我是 AI 報表助手</p>
                <p className="mt-2">你可以問我關於報表數據的任何問題</p>
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${
                      msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {msg.timestamp.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 輸入區域 */}
          <div className="p-3 border-t bg-gray-50 rounded-b-lg">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="輸入你的問題..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                disabled={chatLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || chatLoading}
                size="sm"
                className="px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              按 Enter 發送 • AI 回應僅供參考
            </p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

// AI Analysis Tab Component
function ConsultationAnalysisTab() {
  const [subTab, setSubTab] = useState<'all' | 'analyzed'>('all');
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  // Query consultation records
  const { data, isLoading, error, refetch } = useQuery<{ success: boolean; data: { records: any[]; closers: any[] } }>({
    queryKey: ['consultation-analysis-list', subTab],
    queryFn: async () => {
      const analyzed = subTab === 'analyzed' ? 'true' : 'all';
      const response = await fetch(`/api/consultation-quality/list?analyzed=${analyzed}`);
      if (!response.ok) throw new Error('Failed to fetch consultation records');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const records = data?.data?.records || [];

  // Handle AI analysis trigger
  const handleAnalyze = async (eodId: string) => {
    if (analyzing) return;

    try {
      setAnalyzing(eodId);
      const response = await fetch(`/api/consultation-quality/${eodId}/analyze`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'AI 分析失敗');
      }

      // Refetch list to update status
      await refetch();
      alert('AI 分析完成！');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setAnalyzing(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">載入資料時發生錯誤</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">AI 分析紀錄</h2>
        <p className="text-muted-foreground mt-1">
          手動觸發諮詢品質 AI 分析（需要諮詢轉錄文字）
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2">
        <Button
          variant={subTab === 'all' ? 'default' : 'outline'}
          onClick={() => setSubTab('all')}
        >
          全部諮詢 ({records.length})
        </Button>
        <Button
          variant={subTab === 'analyzed' ? 'default' : 'outline'}
          onClick={() => setSubTab('analyzed')}
        >
          已分析 ({records.filter(r => r.has_analysis).length})
        </Button>
      </div>

      {/* Records Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">學員姓名</th>
                  <th className="text-left py-3 px-4">諮詢師</th>
                  <th className="text-left py-3 px-4">諮詢日期</th>
                  <th className="text-center py-3 px-4">轉錄狀態</th>
                  <th className="text-center py-3 px-4">分析狀態</th>
                  <th className="text-center py-3 px-4">總分</th>
                  <th className="text-center py-3 px-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      沒有資料
                    </td>
                  </tr>
                ) : (
                  records.map((record: any) => (
                    <tr key={record.eod_id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{record.student_name}</td>
                      <td className="py-3 px-4">{record.closer_name}</td>
                      <td className="py-3 px-4">
                        {record.consultation_date
                          ? new Date(record.consultation_date).toLocaleDateString('zh-TW')
                          : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.has_transcript ? (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">有</span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">無</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.has_analysis ? (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">已分析</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">未分析</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {record.overall_rating ? (
                          <span className="font-semibold">{record.overall_rating} / 10</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!record.has_transcript ? (
                          <Button size="sm" variant="outline" disabled>
                            無轉錄內容
                          </Button>
                        ) : record.has_analysis ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.location.href = `/consultation-quality/${record.eod_id}`}
                          >
                            查看分析
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAnalyze(record.eod_id)}
                            disabled={analyzing === record.eod_id}
                          >
                            {analyzing === record.eod_id ? '分析中...' : '生成分析'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConsultantsPage() {
  const filteredSidebar = useFilteredSidebar();

  return (
    <DashboardLayout sidebarSections={filteredSidebar} title="諮詢師報表">
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="report">報表</TabsTrigger>
          <TabsTrigger value="ai-analysis">AI 分析紀錄</TabsTrigger>
        </TabsList>

        <TabsContent value="report">
          <ConsultantReportContent />
        </TabsContent>

        <TabsContent value="ai-analysis">
          <ConsultationAnalysisTab />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}

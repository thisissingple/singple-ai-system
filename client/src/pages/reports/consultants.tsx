/**
 * 諮詢師報表頁面
 * 提供諮詢師業績分析、成交數據、AI 洞見等功能
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useFilteredSidebar } from '@/hooks/use-sidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useQuery, useMutation } from '@tanstack/react-query';
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
  ArrowUpDown,
  Minus,
  MessageCircle,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  Sparkles,
  RefreshCw,
  FileText,
  Loader2,
  Copy,
  Check,
  MessageSquare,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 型別定義
type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
type DealStatus = 'all' | 'closed' | 'not_closed' | 'pending';
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
  showCount: number;  // 新增：上線數
  notShowCount: number;  // 新增：未上線數
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  totalActualAmountChange?: number;
  showCountChange?: number;  // 新增：上線數變化
  notShowCountChange?: number;  // 新增：未上線數變化
  // 前期實際值
  prevConsultationCount?: number;
  prevDealCount?: number;
  prevTotalActualAmount?: number;
  prevShowCount?: number;
  prevNotShowCount?: number;
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

interface LeadSourceTableRow {
  leadSource: string;
  consultationCount: number;
  showCount: number;  // 新增：上線數
  dealCount: number;
  closingRate: number;
  actualAmount: number;
  // 對比數據 - 與歷史平均值對比
  avgConsultationCount?: number;  // 歷史平均諮詢數
  avgActualAmount?: number;  // 歷史平均實收金額
  consultationCountChange?: number;  // 與平均值的變化百分比
  showCountChange?: number;  // 新增：上線數變化
  dealCountChange?: number;
  closingRateChange?: number;
  actualAmountChange?: number;  // 與平均值的變化百分比
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
  leadSourceTable: LeadSourceTableRow[]; // 新增：來源分析表格
  aiInsights: AIInsight[];
  metadata: {
    period: PeriodType;
    dateRange: { start: string; end: string };
    filters: Partial<ConsultantReportParams>;
  };
}

function ConsultantReportContent() {
  const [, setLocation] = useLocation();

  const [period, setPeriod] = useState<PeriodType>('month');  // 改為預設本月
  const [dealStatus, setDealStatus] = useState<DealStatus>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [compareWithPrevious, setCompareWithPrevious] = useState(true);  // 預設開啟前期對比
  const [compareWithLastYear, setCompareWithLastYear] = useState(false);
  const [trendGrouping, setTrendGrouping] = useState<TrendGrouping>('week');
  const [consultationListOpen, setConsultationListOpen] = useState(false);
  const [selectedConsultantName, setSelectedConsultantName] = useState<string | null>(null);
  const [selectedSetterName, setSelectedSetterName] = useState<string | null>(null);

  // 新增：名單篩選器狀態
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('consultation_date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  // 新增：本期諮詢名單分頁狀態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  // 新增：自訂日期 Dialog 狀態
  const [customDateDialogOpen, setCustomDateDialogOpen] = useState(false);

  // 新增：平均值詳細資料 Dialog 狀態
  const [averageDetailsOpen, setAverageDetailsOpen] = useState(false);
  const [selectedLeadSourceForAverage, setSelectedLeadSourceForAverage] = useState<string>('');
  const [averageDetailsSortBy, setAverageDetailsSortBy] = useState<string>('consultationDate');
  const [averageDetailsSortOrder, setAverageDetailsSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // AI 對話窗狀態
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // 新增：學生詳細資料 Dialog 狀態
  const [studentDetailOpen, setStudentDetailOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // AI 報告狀態
  interface AIReportSection {
    title: string;
    content: string;
  }
  interface AIReport {
    summary: string;
    sections: AIReportSection[];
    generatedAt: string;
    period: string;
    dateRange: { start: string; end: string };
    fromCache?: boolean;  // 是否來自快取
  }
  const [aiReport, setAiReport] = useState<AIReport | null>(null);
  const [aiReportExpanded, setAiReportExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isSendingToSlack, setIsSendingToSlack] = useState(false);

  // 查詢報表數據（移除 trendGrouping 避免整頁重新載入）
  const { data: reportData, isLoading, error } = useQuery<{ success: boolean; data: ConsultantReport }>({
    queryKey: ['consultant-report', period, dealStatus, startDate, endDate, compareWithPrevious, compareWithLastYear],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        dealStatus,
        compareWithPrevious: compareWithPrevious.toString(),
        compareWithLastYear: compareWithLastYear.toString(),
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
    enabled: period !== 'custom' || (period === 'custom' && !!startDate && !!endDate), // 自訂模式必須有日期才查詢
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });

  const report = reportData?.data;

  // 獨立查詢趨勢圖資料（避免整頁重新載入）
  const { data: trendData, isLoading: trendLoading } = useQuery<{ success: boolean; data: Array<{ date: string; consultations: number; deals: number }> }>({
    queryKey: ['consultant-trend', trendGrouping],
    queryFn: async () => {
      const params = new URLSearchParams({
        trendGrouping,
      });

      const response = await fetch(`/api/reports/consultants/trend?${params}`);
      if (!response.ok) throw new Error('Failed to fetch trend data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 分鐘
  });

  // 查詢諮詢名單（戰報模式下始終查詢，或當 Dialog 開啟時查詢）
  const { data: consultationListData, isLoading: listLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['consultation-list', period, dealStatus, startDate, endDate, selectedConsultantName, selectedSetterName, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        dealStatus,
        sortBy,
        sortOrder,
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
    enabled: period !== 'custom' || (period === 'custom' && !!startDate && !!endDate),
    staleTime: 5 * 60 * 1000,
  });

  // 查詢來源平均值詳細資料
  const { data: averageDetailsData, isLoading: averageDetailsLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ['lead-source-average-details', selectedLeadSourceForAverage, period, startDate, endDate, selectedConsultantName],
    queryFn: async () => {
      const params = new URLSearchParams({
        leadSource: selectedLeadSourceForAverage,
        period,
      });

      if (period === 'custom' && startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      if (selectedConsultantName) {
        params.append('consultantName', selectedConsultantName);
      }

      const response = await fetch(`/api/reports/consultants/lead-source-average-details?${params}`);
      if (!response.ok) throw new Error('Failed to fetch average details');
      return response.json();
    },
    enabled: averageDetailsOpen && !!selectedLeadSourceForAverage,
    staleTime: 5 * 60 * 1000,
  });

  // 查詢學生的 AI 分析記錄
  const studentAIAnalysis = useQuery({
    queryKey: ['studentAIAnalysis', selectedStudent?.studentEmail],
    queryFn: async () => {
      if (!selectedStudent?.studentEmail) return null;
      const response = await fetch(`/api/teaching-quality/student-records?studentEmail=${encodeURIComponent(selectedStudent.studentEmail)}`);
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
    enabled: !!selectedStudent?.studentEmail && studentDetailOpen,
  });

  // AI 報告生成 mutation（支持 forceRefresh 參數）
  const generateAIReportMutation = useMutation({
    mutationFn: async (forceRefresh: boolean = false) => {
      const response = await fetch('/api/reports/consultants/ai-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period,
          startDate,
          endDate,
          dealStatus,
          compareWithPrevious,
          forceRefresh,  // 強制重新生成（跳過快取）
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate AI report');
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        setAiReport(data.data);
      }
    },
  });

  // 追蹤上一次載入的期間，用於偵測期間變化
  const lastLoadedPeriodRef = useRef<string | null>(null);

  // 當期間變化時，自動載入對應期間的快取報告
  useEffect(() => {
    // 確保報表資料已載入且不在 pending 狀態
    if (!report || isLoading || generateAIReportMutation.isPending) {
      return;
    }

    // 建立當前期間的唯一識別（包含自訂日期範圍）
    const currentPeriodKey = period === 'custom'
      ? `${period}-${startDate}-${endDate}`
      : period;

    // 如果期間沒變，不重複載入
    if (lastLoadedPeriodRef.current === currentPeriodKey) {
      return;
    }

    // 更新追蹤的期間並載入 AI 報告
    lastLoadedPeriodRef.current = currentPeriodKey;
    setAiReport(null);  // 先清空舊報告
    generateAIReportMutation.mutate(false);  // 載入快取（不強制刷新）
  }, [report, isLoading, period, startDate, endDate]);

  // 手動重新生成報告（強制刷新，跳過快取）
  const handleGenerateAIReport = () => {
    generateAIReportMutation.mutate(true);  // 手動點擊時強制重新生成
  };

  // 將 AI 報告轉換為純文字格式
  const formatAIReportAsText = () => {
    if (!aiReport) return '';

    const periodLabel = {
      today: '今日',
      yesterday: '昨日',
      week: '過去七天',
      month: '本月',
      quarter: '本季',
      year: '本年',
      all: '全部',
      custom: '自訂期間',
    }[aiReport.period] || aiReport.period;

    let text = `📊 諮詢師業績報告 - ${periodLabel}\n`;
    text += `📅 ${aiReport.dateRange.start} ~ ${aiReport.dateRange.end}\n`;
    text += `⏰ 生成時間：${new Date(aiReport.generatedAt).toLocaleString('zh-TW')}\n`;
    text += `\n`;
    text += `📝 總覽\n${aiReport.summary}\n`;

    aiReport.sections.forEach(section => {
      text += `\n📌 ${section.title}\n${section.content}\n`;
    });

    return text;
  };

  // 複製 AI 報告到剪貼簿
  const handleCopyAIReport = async () => {
    const text = formatAIReportAsText();
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // 傳送 AI 報告到 Slack
  const handleSendToSlack = async () => {
    if (!aiReport) return;

    setIsSendingToSlack(true);
    try {
      const response = await fetch('/api/slack/send-ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report: aiReport,
          period: aiReport.period,
          dateRange: aiReport.dateRange,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send to Slack');
      }

      alert('已成功傳送至 Slack！');
    } catch (err) {
      console.error('Failed to send to Slack:', err);
      alert('傳送失敗，請確認 Slack 設定是否正確');
    } finally {
      setIsSendingToSlack(false);
    }
  };

  const consultationListRaw = consultationListData?.data || [];

  // 合併同一人的記錄（以 studentEmail 為 key）
  const mergedConsultationMap = useMemo(() => {
    const map = new Map<string, { latest: any; allRecords: any[]; dealTypes: Set<string> }>();

    consultationListRaw.forEach((item: any) => {
      const key = item.studentEmail || item.studentName || `unknown-${Math.random()}`;

      if (!map.has(key)) {
        map.set(key, {
          latest: item,
          allRecords: [item],
          dealTypes: new Set(item.dealType ? [item.dealType] : []),
        });
      } else {
        const existing = map.get(key)!;
        existing.allRecords.push(item);
        if (item.dealType) {
          existing.dealTypes.add(item.dealType);
        }
        // 更新為最新的記錄（根據諮詢日期）
        const existingDate = new Date(existing.latest.consultationDate || 0);
        const newDate = new Date(item.consultationDate || 0);
        if (newDate > existingDate) {
          existing.latest = item;
        }
      }
    });

    return map;
  }, [consultationListRaw]);

  // 轉換為陣列，包含合併資訊
  const consultationList = useMemo(() => {
    return Array.from(mergedConsultationMap.values()).map(({ latest, allRecords, dealTypes }) => {
      // 計算所有記錄的實收金額總和
      const totalActualAmount = allRecords.reduce((sum, record) => {
        // 處理多種可能的格式：null, undefined, 數字, 字串（如 "NT$1,000" 或 "1000"）
        let amount = 0;
        if (record.actualAmount != null) {
          if (typeof record.actualAmount === 'number') {
            amount = record.actualAmount;
          } else if (typeof record.actualAmount === 'string') {
            // 移除所有非數字字元（保留小數點和負號）
            const cleaned = record.actualAmount.replace(/[^0-9.-]/g, '');
            amount = parseFloat(cleaned) || 0;
          }
        }
        return sum + amount;
      }, 0);

      return {
        ...latest,
        _recordCount: allRecords.length,
        _allRecords: allRecords,
        _allDealTypes: Array.from(dealTypes),
        _totalActualAmount: totalActualAmount, // 合併後的總金額
      };
    });
  }, [mergedConsultationMap]);

  // 調試：檢查資料
  if (consultationListRaw.length > 0) {
    console.log('=== 諮詢名單資料範例 ===');
    console.log('Total raw records:', consultationListRaw.length);
    console.log('Merged records:', consultationList.length);
    console.log('First record:', consultationList[0]);
  }

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
  const formatPercent = (num: number | undefined | null) => {
    if (num === undefined || num === null || isNaN(num)) return '-';
    return `${num.toFixed(1)}%`;
  };

  // 格式化 AI 報告內容 - 數字和重點行動加粗
  const formatAIContent = (text: string | string[] | unknown): React.ReactNode => {
    // 處理非字串類型
    if (!text) return null;
    if (Array.isArray(text)) {
      // 如果是陣列，遞迴處理每個元素
      return text.map((item, idx) => (
        <div key={idx}>{formatAIContent(item)}</div>
      ));
    }
    if (typeof text !== 'string') {
      // 如果是其他類型，嘗試轉換為字串
      return String(text);
    }

    // 用正則表達式找出數字（包含 NT$、%、人、筆等）和重點行動詞
    const parts = text.split(/(\d+(?:,\d{3})*(?:\.\d+)?%?|NT\$\s*\d+(?:,\d{3})*|\d+\s*(?:人|筆|%)|(?:增加|減少|提升|降低|優化|加強|分析|檢視|建議|持續|針對)[^，。、\n]*)/g);

    return parts.map((part, index) => {
      // 檢查是否為數字或金額
      if (/^\d+(?:,\d{3})*(?:\.\d+)?%?$/.test(part) ||
          /^NT\$\s*\d+(?:,\d{3})*$/.test(part) ||
          /^\d+\s*(?:人|筆|%)$/.test(part)) {
        return <strong key={index} className="text-gray-900">{part}</strong>;
      }
      // 檢查是否為行動建議
      if (/^(?:增加|減少|提升|降低|優化|加強|分析|檢視|建議|持續|針對)/.test(part)) {
        return <strong key={index} className="text-gray-800">{part}</strong>;
      }
      return part;
    });
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
  const renderComparisonIndicator = (change?: number, prevValue?: number, isAmount: boolean = false) => {
    if (change === undefined || change === null) return null;

    const isPositive = change > 0;
    const isNegative = change < 0;
    const isZero = change === 0;

    return (
      <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${
        isPositive ? 'text-green-600' :
        isNegative ? 'text-red-600' :
        'text-gray-700'
      }`}>
        {isPositive && <ArrowUp className="h-3 w-3" />}
        {isNegative && <ArrowDown className="h-3 w-3" />}
        {isZero && <Minus className="h-3 w-3" />}
        <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
        <span className={isZero ? 'text-gray-700 font-semibold' : 'text-muted-foreground'}>
          {isZero ? ' 持平 ' : ` vs ${compareWithPrevious ? '前期' : compareWithLastYear ? '去年同期' : ''}`}
          {prevValue !== undefined && !isZero && `: ${isAmount ? formatCurrency(prevValue) : prevValue}`}
        </span>
      </div>
    );
  };

  // 新增：箭頭指示器（簡化版 - 用於標題旁）
  const renderArrowIndicator = (change?: number) => {
    if (change === undefined || change === null) return null;
    if (!compareWithPrevious && !compareWithLastYear) return null;

    if (change > 0) return <ArrowUp className="inline h-4 w-4 text-green-600 ml-1" />;
    if (change < 0) return <ArrowDown className="inline h-4 w-4 text-red-600 ml-1" />;
    return <Minus className="inline h-4 w-4 text-gray-500 ml-1" />;
  };

  // 新增：緊湊變化指示器（用於表格內）
  const renderCompactChange = (change?: number) => {
    if (change === undefined || change === null) return null;
    if (!compareWithPrevious && !compareWithLastYear) return null;

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

  // 渲染名單來源的平均值對比
  const renderAverageComparison = (currentValue: number, avgValue?: number, change?: number, isAmount: boolean = false) => {
    if (avgValue === undefined || change === undefined) return formatNumber(currentValue);

    const isPositive = change > 0;
    const isNegative = change < 0;
    const isZero = change === 0;

    return (
      <div className="flex flex-col items-end">
        <span className="font-medium">{isAmount ? formatCurrency(currentValue) : formatNumber(currentValue)}</span>
        <span className={`text-[10px] ${
          isPositive ? 'text-green-600' :
          isNegative ? 'text-red-600' :
          'text-gray-500'
        }`}>
          {isPositive ? '+' : ''}{change.toFixed(1)}% vs 平均 {isAmount ? formatCurrency(avgValue) : formatNumber(avgValue)}
        </span>
      </div>
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

        {/* 篩選控件 - 戰報模式：快速切換按鈕 + 日曆選擇器 */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
              <Button
                variant={period === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPeriod('today');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                今天
              </Button>
              <Button
                variant={period === 'yesterday' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  const dateStr = yesterday.toISOString().split('T')[0];
                  setPeriod('custom');
                  setStartDate(dateStr);
                  setEndDate(dateStr);
                }}
              >
                昨天
              </Button>
              <Button
                variant={period === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPeriod('week');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                過去七天
              </Button>
              <Button
                variant={period === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPeriod('month');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                本月
              </Button>
              <Button
                variant={period === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setPeriod('all');
                  setStartDate('');
                  setEndDate('');
                }}
              >
                全部
              </Button>

              {/* 自訂日期 - 使用 Popover + Calendar */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={period === 'custom' && startDate && endDate ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    自訂日期
                    {period === 'custom' && startDate && endDate && (
                      <span className="ml-1 text-xs">
                        ({startDate} ~ {endDate})
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h4 className="font-semibold text-sm">選擇日期範圍</h4>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* 開始日期 */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          開始日期
                        </label>
                        <input
                          type="date"
                          value={tempStartDate || startDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>

                      {/* 結束日期 */}
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">
                          結束日期
                        </label>
                        <input
                          type="date"
                          value={tempEndDate || endDate}
                          onChange={(e) => setTempEndDate(e.target.value)}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                      </div>
                    </div>

                    {/* 快速選擇 */}
                    <div className="space-y-2 pt-2 border-t">
                      <label className="text-xs font-medium text-muted-foreground">
                        快速選擇
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const sevenDaysAgo = new Date();
                            sevenDaysAgo.setDate(today.getDate() - 7);
                            setTempStartDate(sevenDaysAgo.toISOString().split('T')[0]);
                            setTempEndDate(today.toISOString().split('T')[0]);
                          }}
                        >
                          過去 7 天
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const thirtyDaysAgo = new Date();
                            thirtyDaysAgo.setDate(today.getDate() - 30);
                            setTempStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
                            setTempEndDate(today.toISOString().split('T')[0]);
                          }}
                        >
                          過去 30 天
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                            setTempStartDate(firstDayOfMonth.toISOString().split('T')[0]);
                            setTempEndDate(today.toISOString().split('T')[0]);
                          }}
                        >
                          本月
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const today = new Date();
                            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                            const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                            setTempStartDate(lastMonth.toISOString().split('T')[0]);
                            setTempEndDate(lastDayOfLastMonth.toISOString().split('T')[0]);
                          }}
                        >
                          上月
                        </Button>
                      </div>
                    </div>

                    {/* 確認按鈕 */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          if (tempStartDate && tempEndDate) {
                            setStartDate(tempStartDate);
                            setEndDate(tempEndDate);
                            setPeriod('custom');
                          }
                        }}
                        disabled={!tempStartDate || !tempEndDate}
                      >
                        確認
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTempStartDate('');
                          setTempEndDate('');
                        }}
                      >
                        清除
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
          </div>

          {/* 顯示當前期間的日期範圍 */}
          {report?.metadata?.dateRange && (
            <div className="px-3 py-2 border rounded-md bg-muted text-sm">
              {report.metadata.dateRange.start} ~ {report.metadata.dateRange.end}
            </div>
          )}

          <select
            value={dealStatus}
            onChange={(e) => setDealStatus(e.target.value as DealStatus)}
            className="border rounded-md px-3 py-2"
          >
            <option value="all">全部狀態</option>
            <option value="closed">已成交</option>
            <option value="not_closed">未成交</option>
            <option value="pending">待成交</option>
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

      {/* KPI 卡片 - 戰報模式 7 個 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-4">
        {/* 諮詢數 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              諮詢數 {renderArrowIndicator(kpiData.consultationCountChange)}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpiData.consultationCount)}</div>
            {renderComparisonIndicator(kpiData.consultationCountChange, kpiData.prevConsultationCount)}
          </CardContent>
        </Card>

        {/* 成交數 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              成交數 {renderArrowIndicator(kpiData.dealCountChange)}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(kpiData.dealCount)}</div>
            {renderComparisonIndicator(kpiData.dealCountChange, kpiData.prevDealCount)}
            <p className="text-xs text-muted-foreground mt-1">
              成交率: {formatPercent(kpiData.closingRate)}
            </p>
          </CardContent>
        </Card>

        {/* 實收金額 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              實收金額 {renderArrowIndicator(kpiData.totalActualAmountChange)}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpiData.totalActualAmount)}</div>
            {renderComparisonIndicator(kpiData.totalActualAmountChange, kpiData.prevTotalActualAmount, true)}
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

        {/* 新增：上線數 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              上線數 {renderArrowIndicator(kpiData.showCountChange)}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatNumber(kpiData.showCount)}</div>
            {renderComparisonIndicator(kpiData.showCountChange, kpiData.prevShowCount)}
            <p className="text-xs text-muted-foreground mt-1">
              已完成體驗課並上線
            </p>
          </CardContent>
        </Card>

        {/* 新增：未上線數 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              未上線數 {renderArrowIndicator(kpiData.notShowCountChange)}
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatNumber(kpiData.notShowCount)}</div>
            {renderComparisonIndicator(kpiData.notShowCountChange, kpiData.prevNotShowCount)}
            <p className="text-xs text-muted-foreground mt-1">
              待上線或未上線
            </p>
          </CardContent>
        </Card>

        {/* 新增：成交率卡片 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              成交率 {renderArrowIndicator(kpiData.closingRateChange)}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(kpiData.closingRate)}</div>
            {renderComparisonIndicator(kpiData.closingRateChange)}
            <p className="text-xs text-muted-foreground mt-1">
              成交 / 諮詢總數
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AI 分析報告區塊 */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">AI 分析報告</CardTitle>
              {aiReport && (
                <>
                  <span className="text-xs text-muted-foreground">
                    {new Date(aiReport.generatedAt).toLocaleString('zh-TW')}
                  </span>
                  {aiReport.fromCache && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      快取
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* 複製按鈕 */}
              {aiReport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAIReport}
                  className="gap-1"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      已複製
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      複製
                    </>
                  )}
                </Button>
              )}
              {/* 傳送至 Slack 按鈕 */}
              {aiReport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendToSlack}
                  disabled={isSendingToSlack}
                  className="gap-1"
                >
                  {isSendingToSlack ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      傳送中...
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-4 w-4" />
                      Slack
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAIReport}
                disabled={generateAIReportMutation.isPending}
              >
                {generateAIReportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    重新生成
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAiReportExpanded(!aiReportExpanded)}
              >
                {aiReportExpanded ? '收合' : '展開'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {aiReportExpanded && (
          <CardContent>
            {generateAIReportMutation.isPending && !aiReport ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">正在生成報告...</span>
              </div>
            ) : generateAIReportMutation.isError ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <span className="text-sm text-red-600">生成失敗</span>
                <Button variant="outline" size="sm" onClick={handleGenerateAIReport}>
                  重試
                </Button>
              </div>
            ) : aiReport ? (
              <div className="space-y-4">
                {/* 總覽 - 簡化版 */}
                <div className="text-gray-700 leading-relaxed">
                  {formatAIContent(aiReport.summary)}
                </div>

                {/* 各區塊 - 更簡潔的樣式 */}
                <div className="space-y-4 pt-2 border-t">
                  {aiReport.sections.map((section, idx) => (
                    <div key={idx}>
                      <h4 className="font-semibold text-gray-900 mb-1.5">{section.title}</h4>
                      <div className="text-sm text-gray-600 leading-relaxed">
                        {formatAIContent(section.content)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 時間戳記 */}
                <div className="text-xs text-muted-foreground text-right pt-2 border-t">
                  {aiReport.dateRange.start} 至 {aiReport.dateRange.end}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                <span className="text-sm">點擊「重新生成」來獲取分析報告</span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 完整諮詢名單 */}
      {(() => {
        // 計算分頁
        const totalRecords = consultationList?.length || 0;
        const totalPages = Math.ceil(totalRecords / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentPageData = consultationList?.slice(startIndex, endIndex) || [];

        // 當 itemsPerPage 改變時，重置到第一頁
        const handleItemsPerPageChange = (value: string) => {
          setItemsPerPage(Number(value));
          setCurrentPage(1);
        };

        // 排序處理函數
        const handleSort = (column: string) => {
          if (sortBy === column) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
          } else {
            setSortBy(column);
            setSortOrder('DESC');
          }
          setCurrentPage(1); // 排序後回到第一頁
        };

        // 可排序的表頭組件
        const SortableHead = ({ column, children, className = '' }: { column: string; children: React.ReactNode; className?: string }) => (
          <TableHead
            className={`cursor-pointer hover:bg-muted/50 select-none whitespace-nowrap ${className}`}
            onClick={() => handleSort(column)}
          >
            <div className="flex items-center gap-1">
              {children}
              {sortBy === column ? (
                sortOrder === 'ASC' ? <ArrowUp className="h-3 w-3 flex-shrink-0" /> : <ArrowDown className="h-3 w-3 flex-shrink-0" />
              ) : (
                <ArrowUpDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </TableHead>
        );

        return (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>本期諮詢名單</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    本時間段內的所有諮詢記錄 · 共 {totalRecords} 筆
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">每頁顯示:</span>
                  <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 筆</SelectItem>
                      <SelectItem value="25">25 筆</SelectItem>
                      <SelectItem value="50">50 筆</SelectItem>
                      <SelectItem value="100">100 筆</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table className="min-w-[1400px]">
                  <TableHeader>
                    <TableRow>
                      <SortableHead column="student_name">學生姓名</SortableHead>
                      <SortableHead column="consultation_date">諮詢日期</SortableHead>
                      <SortableHead column="deal_date">成交日期</SortableHead>
                      <SortableHead column="closer_name">諮詢師</SortableHead>
                      <SortableHead column="deal_type">諮詢類型</SortableHead>
                      <SortableHead column="plan">成交方案</SortableHead>
                      <SortableHead column="is_show">是否上線</SortableHead>
                      <TableHead className="whitespace-nowrap">狀態</TableHead>
                      <SortableHead column="actual_amount" className="text-right">實收金額</SortableHead>
                      <SortableHead column="lead_source">名單來源</SortableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentPageData.length > 0 ? (
                      currentPageData.map((item: any, index: number) => (
                        <TableRow key={index} className={`hover:bg-muted/30 ${item._recordCount > 1 ? 'bg-amber-50' : ''}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStudent(item);
                                  setStudentDetailOpen(true);
                                }}
                                className={`hover:underline cursor-pointer ${item._recordCount > 1 ? 'text-amber-600 hover:text-amber-800 font-semibold' : 'text-blue-600 hover:text-blue-800'}`}
                              >
                                {item.studentName || '-'}
                              </button>
                              {item._recordCount > 1 && (
                                <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full font-medium">
                                  {item._recordCount}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {item.consultationDate ? new Date(item.consultationDate).toLocaleDateString('zh-TW') : '-'}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {item.dealDate ? new Date(item.dealDate).toLocaleDateString('zh-TW') : '-'}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{item.consultantName || '-'}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex flex-wrap gap-1">
                              {item._allDealTypes && item._allDealTypes.length > 0 ? (
                                item._allDealTypes.map((type: string, idx: number) => (
                                  <span key={idx} className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                    type === '諮詢' ? 'bg-purple-100 text-purple-700' :
                                    type === '體驗課' ? 'bg-blue-100 text-blue-700' :
                                    type === '續課' ? 'bg-green-100 text-green-700' :
                                    type === '補分期' ? 'bg-yellow-100 text-yellow-700' :
                                    type === '加購' ? 'bg-indigo-100 text-indigo-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {type}
                                  </span>
                                ))
                              ) : item.dealType ? (
                                <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                                  item.dealType === '諮詢' ? 'bg-purple-100 text-purple-700' :
                                  item.dealType === '體驗課' ? 'bg-blue-100 text-blue-700' :
                                  item.dealType === '續課' ? 'bg-green-100 text-green-700' :
                                  item.dealType === '補分期' ? 'bg-yellow-100 text-yellow-700' :
                                  item.dealType === '加購' ? 'bg-indigo-100 text-indigo-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.dealType}
                                </span>
                              ) : '-'}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{item.plan || '-'}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.isShow === '已上線'
                                ? 'bg-green-100 text-green-700'
                                : item.isShow === '未上線'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.isShow || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.consultationResult === '已成交'
                                ? 'bg-green-100 text-green-700'
                                : item.consultationResult === '未成交'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {item.consultationResult || '跟進中'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {item._totalActualAmount > 0 ? (
                              <span className={item._recordCount > 1 ? 'font-semibold text-amber-700' : ''}>
                                {formatCurrency(item._totalActualAmount)}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="text-sm">{item.leadSource || '-'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                          暫無諮詢記錄
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 分頁控制 */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    顯示 {startIndex + 1} 到 {Math.min(endIndex, totalRecords)} 筆，共 {totalRecords} 筆
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一頁
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // 顯示首頁、尾頁和當前頁附近的頁碼
                          return page === 1 ||
                                 page === totalPages ||
                                 (page >= currentPage - 1 && page <= currentPage + 1);
                        })
                        .map((page, index, array) => {
                          // 如果頁碼之間有間隔，顯示省略號
                          const showEllipsis = index > 0 && page - array[index - 1] > 1;
                          return (
                            <div key={page} className="flex items-center gap-1">
                              {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                              <Button
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="min-w-[40px]"
                              >
                                {page}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      下一頁
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* 圖表區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 名單來源分析 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>名單來源分析</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>來源</TableHead>
                      <TableHead className="text-right">諮詢數</TableHead>
                      <TableHead className="text-right">上線數</TableHead>
                      <TableHead className="text-right">成交數</TableHead>
                      <TableHead className="text-right">成交率</TableHead>
                      <TableHead className="text-right italic text-orange-600">平均成交率</TableHead>
                      <TableHead className="text-right">實收金額</TableHead>
                      <TableHead className="text-right italic text-orange-600">平均實收</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.leadSourceTable && report.leadSourceTable.length > 0 ? (
                      report.leadSourceTable.map((source) => (
                        <TableRow
                          key={source.leadSource}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setLeadSourceFilter(source.leadSource);
                            setConsultationListOpen(true);
                          }}
                        >
                          <TableCell className="font-medium">{source.leadSource}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{formatNumber(source.consultationCount)}</span>
                              {source.consultationCountChange !== undefined && source.consultationCountChange !== null && (
                                <span className={`text-[10px] ${
                                  source.consultationCountChange > 0 ? 'text-green-600' :
                                  source.consultationCountChange < 0 ? 'text-red-600' :
                                  'text-gray-500'
                                }`}>
                                  ({source.consultationCountChange > 0 ? '+' : ''}{source.consultationCountChange.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(source.showCount)}
                            {renderCompactChange(source.showCountChange)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(source.dealCount)}
                            {renderCompactChange(source.dealCountChange)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatPercent(source.closingRate)}
                            {renderCompactChange(source.closingRateChange)}
                          </TableCell>
                          <TableCell
                            className="text-right italic text-orange-600 cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadSourceForAverage(source.leadSource);
                              setAverageDetailsOpen(true);
                            }}
                          >
                            {source.avgClosingRate !== undefined ? formatPercent(source.avgClosingRate) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end">
                              <span className="font-medium">{formatCurrency(source.actualAmount)}</span>
                              {source.actualAmountChange !== undefined && source.actualAmountChange !== null && (
                                <span className={`text-[10px] ${
                                  source.actualAmountChange > 0 ? 'text-green-600' :
                                  source.actualAmountChange < 0 ? 'text-red-600' :
                                  'text-gray-500'
                                }`}>
                                  ({source.actualAmountChange > 0 ? '+' : ''}{source.actualAmountChange.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-right italic text-orange-600 cursor-pointer hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLeadSourceForAverage(source.leadSource);
                              setAverageDetailsOpen(true);
                            }}
                          >
                            {source.avgActualAmount !== undefined ? formatCurrency(source.avgActualAmount) : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          無資料
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </div>
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

        {/* 諮詢師成交分佈 */}
        <Card>
          <CardHeader>
            <CardTitle>諮詢師成交分佈</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ranking.map(consultant => ({
                    name: consultant.consultantName,
                    value: consultant.dealCount,
                    consultationCount: consultant.consultationCount,
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={(entry: any) => `${entry.name}: ${entry.value}成交 (${entry.consultationCount}諮詢)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ranking.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }: any) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-gray-300 rounded shadow">
                          <p className="font-semibold">{data.name}</p>
                          <p className="text-sm">成交數: {data.value}</p>
                          <p className="text-sm">諮詢數: {data.consultationCount}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 趨勢折線圖 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>成交額趨勢</CardTitle>
              <div className="flex gap-2">
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
                <Button
                  variant={trendGrouping === 'year' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTrendGrouping('year')}
                >
                  年線
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="flex items-center justify-center h-[300px]">
                <div className="text-muted-foreground">載入趨勢資料中...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      const year = date.getFullYear();
                      const month = (date.getMonth() + 1).toString().padStart(2, '0');
                      const day = date.getDate().toString().padStart(2, '0');

                      if (trendGrouping === 'year') {
                        // 年線顯示：YYYY 年
                        return `${year}年`;
                      } else if (trendGrouping === 'quarter') {
                        // 季線顯示：YYYY/Q1, YYYY/Q2, ...
                        const quarter = Math.floor((date.getMonth() / 3)) + 1;
                        return `${year}/Q${quarter}`;
                      } else if (trendGrouping === 'month') {
                        // 月線顯示：YYYY/MM
                        return `${year}/${month}`;
                      } else if (trendGrouping === 'week') {
                        // 週線顯示：YYYY/MM/DD 格式
                        return `${year}/${month}/${day}`;
                      }
                      return formatDate(value);
                    }}
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    tickFormatter={(value) => {
                      // Y軸顯示為千位數格式
                      if (value >= 1000) {
                        return `${(value / 1000).toFixed(0)}k`;
                      }
                      return value.toString();
                    }}
                  />
                  <Tooltip
                    labelFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('zh-TW');
                    }}
                    formatter={(value: any) => {
                      // 格式化成交額為貨幣格式
                      return formatCurrency(Number(value));
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    name="成交額"
                    strokeWidth={2}
                    dot={false}
                    opacity={0.9}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
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
              {/* 新增：篩選器區塊 */}
              <div className="mb-4 p-4 bg-muted/30 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 名單來源篩選 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      名單來源
                    </label>
                    <select
                      value={leadSourceFilter}
                      onChange={(e) => setLeadSourceFilter(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    >
                      <option value="">全部來源</option>
                      {report.leadSourceTable?.map((source) => (
                        <option key={source.leadSource} value={source.leadSource}>
                          {source.leadSource}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 狀態篩選 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      狀態
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                    >
                      <option value="">全部狀態</option>
                      <option value="已成交">已成交</option>
                      <option value="跟進中">跟進中</option>
                    </select>
                  </div>

                  {/* 排序選項 */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      排序
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                      >
                        <option value="consultation_date">諮詢日期</option>
                        <option value="deal_date">成交日期</option>
                        <option value="student_name">學生姓名</option>
                        <option value="closer_name">諮詢師</option>
                        <option value="setter_name">電訪人員</option>
                        <option value="lead_source">名單來源</option>
                      </select>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
                        className="w-24 px-3 py-2 border rounded-md text-sm bg-background"
                      >
                        <option value="DESC">降序</option>
                        <option value="ASC">升序</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 清除篩選按鈕 */}
                {(leadSourceFilter || statusFilter || sortBy !== 'consultation_date' || sortOrder !== 'DESC') && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setLeadSourceFilter('');
                        setStatusFilter('');
                        setSortBy('consultation_date');
                        setSortOrder('DESC');
                      }}
                    >
                      清除篩選
                    </Button>
                  </div>
                )}
              </div>

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
                      <th className="text-left py-3 px-4 font-medium">名單來源</th>
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
                        <td className="py-3 px-4 text-sm">{item.leadSource || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            item.consultationResult === '已成交'
                              ? 'bg-green-100 text-green-700'
                              : item.consultationResult === '未成交'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.consultationResult || '跟進中'}
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

      {/* 平均值詳情 Dialog */}
      <Dialog open={averageDetailsOpen} onOpenChange={setAverageDetailsOpen}>
        <DialogContent className="max-w-7xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              歷史數據詳情 - {selectedLeadSourceForAverage}
            </DialogTitle>
            <DialogDescription>
              顯示此來源的所有歷史成交紀錄，用於計算平均成交率與平均實收金額
            </DialogDescription>
          </DialogHeader>

          {averageDetailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : (
            <div className="mt-4">
              {averageDetailsData?.data?.records && averageDetailsData.data.records.length > 0 ? (
                <>
                  {/* 統計資訊 */}
                  {averageDetailsData.data.summary && (
                    <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                      <div className="grid grid-cols-6 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">總學生數</div>
                          <div className="text-lg font-semibold">{averageDetailsData.data.summary.totalStudents} 位</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">成交學生數</div>
                          <div className="text-lg font-semibold">{averageDetailsData.data.summary.uniqueStudents} 位</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">成交率</div>
                          <div className="text-lg font-semibold text-blue-600">{formatPercent(averageDetailsData.data.summary.closingRate)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">總成交筆數</div>
                          <div className="text-lg font-semibold">{averageDetailsData.data.summary.totalRecords} 筆</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">總實收金額</div>
                          <div className="text-lg font-semibold">{formatCurrency(averageDetailsData.data.summary.totalAmount)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">平均實收（每位學生）</div>
                          <div className="text-lg font-semibold text-orange-600">{formatCurrency(averageDetailsData.data.summary.avgAmount)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 表格 */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-3 py-2 text-center font-medium w-16">#</th>
                          <th
                            className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/70"
                            onClick={() => {
                              if (averageDetailsSortBy === 'studentName') {
                                setAverageDetailsSortOrder(averageDetailsSortOrder === 'ASC' ? 'DESC' : 'ASC');
                              } else {
                                setAverageDetailsSortBy('studentName');
                                setAverageDetailsSortOrder('ASC');
                              }
                            }}
                          >
                            學生姓名 {averageDetailsSortBy === 'studentName' && (averageDetailsSortOrder === 'ASC' ? '↑' : '↓')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium">Email</th>
                          <th
                            className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/70"
                            onClick={() => {
                              if (averageDetailsSortBy === 'consultationDate') {
                                setAverageDetailsSortOrder(averageDetailsSortOrder === 'ASC' ? 'DESC' : 'ASC');
                              } else {
                                setAverageDetailsSortBy('consultationDate');
                                setAverageDetailsSortOrder('DESC');
                              }
                            }}
                          >
                            諮詢日期 {averageDetailsSortBy === 'consultationDate' && (averageDetailsSortOrder === 'ASC' ? '↑' : '↓')}
                          </th>
                          <th
                            className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/70"
                            onClick={() => {
                              if (averageDetailsSortBy === 'dealDate') {
                                setAverageDetailsSortOrder(averageDetailsSortOrder === 'ASC' ? 'DESC' : 'ASC');
                              } else {
                                setAverageDetailsSortBy('dealDate');
                                setAverageDetailsSortOrder('DESC');
                              }
                            }}
                          >
                            成交日期 {averageDetailsSortBy === 'dealDate' && (averageDetailsSortOrder === 'ASC' ? '↑' : '↓')}
                          </th>
                          <th
                            className="px-3 py-2 text-left font-medium cursor-pointer hover:bg-muted/70"
                            onClick={() => {
                              if (averageDetailsSortBy === 'consultantName') {
                                setAverageDetailsSortOrder(averageDetailsSortOrder === 'ASC' ? 'DESC' : 'ASC');
                              } else {
                                setAverageDetailsSortBy('consultantName');
                                setAverageDetailsSortOrder('ASC');
                              }
                            }}
                          >
                            諮詢師 {averageDetailsSortBy === 'consultantName' && (averageDetailsSortOrder === 'ASC' ? '↑' : '↓')}
                          </th>
                          <th className="px-3 py-2 text-left font-medium">電訪人員</th>
                          <th className="px-3 py-2 text-left font-medium">方案</th>
                          <th
                            className="px-3 py-2 text-right font-medium cursor-pointer hover:bg-muted/70"
                            onClick={() => {
                              if (averageDetailsSortBy === 'actualAmount') {
                                setAverageDetailsSortOrder(averageDetailsSortOrder === 'ASC' ? 'DESC' : 'ASC');
                              } else {
                                setAverageDetailsSortBy('actualAmount');
                                setAverageDetailsSortOrder('DESC');
                              }
                            }}
                          >
                            實收金額 {averageDetailsSortBy === 'actualAmount' && (averageDetailsSortOrder === 'ASC' ? '↑' : '↓')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // 解析實收金額函數
                          const parseAmount = (amount: string | number | null | undefined): number => {
                            if (!amount) return 0;
                            if (typeof amount === 'number') return amount;
                            const cleaned = String(amount).replace(/[^0-9.-]/g, '');
                            return parseFloat(cleaned) || 0;
                          };

                          // 複製並排序資料
                          const sortedData = [...averageDetailsData.data.records].sort((a: any, b: any) => {
                            let aVal: any, bVal: any;

                            switch (averageDetailsSortBy) {
                              case 'studentName':
                                aVal = a.studentName || '';
                                bVal = b.studentName || '';
                                break;
                              case 'consultationDate':
                                aVal = new Date(a.consultationDate || 0).getTime();
                                bVal = new Date(b.consultationDate || 0).getTime();
                                break;
                              case 'dealDate':
                                aVal = new Date(a.dealDate || 0).getTime();
                                bVal = new Date(b.dealDate || 0).getTime();
                                break;
                              case 'consultantName':
                                aVal = a.consultantName || '';
                                bVal = b.consultantName || '';
                                break;
                              case 'actualAmount':
                                aVal = parseAmount(a.actualAmount);
                                bVal = parseAmount(b.actualAmount);
                                break;
                              default:
                                aVal = new Date(a.consultationDate || 0).getTime();
                                bVal = new Date(b.consultationDate || 0).getTime();
                            }

                            if (averageDetailsSortOrder === 'ASC') {
                              return aVal > bVal ? 1 : -1;
                            } else {
                              return aVal < bVal ? 1 : -1;
                            }
                          });

                          return sortedData.map((row: any, idx: number) => (
                            <tr
                              key={idx}
                              className="border-b hover:bg-muted/30 transition-colors"
                            >
                              <td className="px-3 py-2 text-center text-muted-foreground">{idx + 1}</td>
                              <td className="px-3 py-2">{row.studentName || '-'}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">{row.studentEmail || '-'}</td>
                              <td className="px-3 py-2">
                                {row.consultationDate ? new Date(row.consultationDate).toLocaleDateString('zh-TW') : '-'}
                              </td>
                              <td className="px-3 py-2">
                                {row.dealDate ? new Date(row.dealDate).toLocaleDateString('zh-TW') : '-'}
                              </td>
                              <td className="px-3 py-2">{row.consultantName || '-'}</td>
                              <td className="px-3 py-2">{row.setterName || '-'}</td>
                              <td className="px-3 py-2">{row.plan || '-'}</td>
                              <td className="px-3 py-2 text-right font-medium">
                                {row.actualAmount ? formatCurrency(parseAmount(row.actualAmount)) : '-'}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  暫無歷史成交資料
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 自訂日期選擇 Dialog */}
      <Dialog open={customDateDialogOpen} onOpenChange={setCustomDateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>選擇日期區間</DialogTitle>
            <DialogDescription>
              請選擇要查詢的開始日期與結束日期
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">開始日期</label>
              <input
                type="date"
                value={tempStartDate}
                onChange={(e) => setTempStartDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">結束日期</label>
              <input
                type="date"
                value={tempEndDate}
                onChange={(e) => setTempEndDate(e.target.value)}
                className="w-full border rounded-md px-3 py-2"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCustomDateDialogOpen(false);
                setTempStartDate('');
                setTempEndDate('');
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (tempStartDate && tempEndDate) {
                  setStartDate(tempStartDate);
                  setEndDate(tempEndDate);
                  setPeriod('custom');
                  setCustomDateDialogOpen(false);
                  setTempStartDate('');
                  setTempEndDate('');
                }
              }}
              disabled={!tempStartDate || !tempEndDate}
            >
              確認
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 學生詳細資料 Dialog */}
      <Dialog open={studentDetailOpen} onOpenChange={setStudentDetailOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              學生詳細資料
              {selectedStudent?._recordCount > 1 && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                  {selectedStudent._recordCount} 筆記錄
                </span>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedStudent?.studentName} 的完整諮詢記錄
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4 py-4">
              {/* 基本資料 */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">學生姓名</label>
                  <p className="text-base font-semibold mt-1">{selectedStudent.studentName || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="text-base mt-1">{selectedStudent.studentEmail || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">電話</label>
                  <p className="text-base mt-1">{selectedStudent.phoneNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">LINE ID</label>
                  <p className="text-base mt-1">{selectedStudent.lineId || '-'}</p>
                </div>
              </div>

              {/* 多筆記錄列表 */}
              {selectedStudent._allRecords && selectedStudent._allRecords.length > 1 ? (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    所有諮詢記錄
                    <span className="text-sm font-normal text-muted-foreground">
                      （共 {selectedStudent._allRecords.length} 筆）
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {selectedStudent._allRecords
                      .sort((a: any, b: any) => new Date(b.consultationDate || 0).getTime() - new Date(a.consultationDate || 0).getTime())
                      .map((record: any, idx: number) => (
                        <div key={idx} className={`p-4 rounded-lg border ${idx === 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">
                              {record.consultationDate
                                ? new Date(record.consultationDate).toLocaleDateString('zh-TW')
                                : '無日期'}
                              {idx === 0 && <span className="ml-2 px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-xs">最新</span>}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              record.dealDate
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {record.dealDate ? '已成交' : '跟進中'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">諮詢類型：</span>
                              <span className="font-medium">{record.dealType || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">諮詢師：</span>
                              <span className="font-medium">{record.consultantName || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">電訪人員：</span>
                              <span className="font-medium">{record.setterName || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">名單來源：</span>
                              <span className="font-medium">{record.leadSource || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">是否上線：</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs ${
                                record.isShow === '已上線'
                                  ? 'bg-green-100 text-green-700'
                                  : record.isShow === '未上線'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {record.isShow || '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">方案：</span>
                              <span className="font-medium">{record.plan || '-'}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">成交日期：</span>
                              <span className="font-medium">
                                {record.dealDate
                                  ? new Date(record.dealDate).toLocaleDateString('zh-TW')
                                  : '-'}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">實收金額：</span>
                              <span className="font-medium text-green-600">
                                {record.actualAmount
                                  ? formatCurrency(parseFloat(record.actualAmount.replace(/[^0-9.-]/g, '')))
                                  : '-'}
                              </span>
                            </div>
                          </div>
                          {record.note && (
                            <div className="mt-2 text-sm">
                              <span className="text-muted-foreground">備註：</span>
                              <span className="whitespace-pre-wrap">{record.note}</span>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* 單筆記錄顯示原本的格式 */}
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">諮詢資訊</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">諮詢日期</label>
                        <p className="text-base mt-1">
                          {selectedStudent.consultationDate
                            ? new Date(selectedStudent.consultationDate).toLocaleDateString('zh-TW')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">諮詢類型</label>
                        <p className="text-base mt-1">{selectedStudent.dealType || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">諮詢師</label>
                        <p className="text-base mt-1">{selectedStudent.consultantName || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">電訪人員</label>
                        <p className="text-base mt-1">{selectedStudent.setterName || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">名單來源</label>
                        <p className="text-base mt-1">{selectedStudent.leadSource || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">狀態資訊</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">是否上線</label>
                        <p className="text-base mt-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            selectedStudent.isShow === '已上線'
                              ? 'bg-green-100 text-green-700'
                              : selectedStudent.isShow === '未上線'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {selectedStudent.isShow || '-'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">狀態</label>
                        <p className="text-base mt-1">
                          <span className={`px-2 py-1 rounded text-xs ${
                            selectedStudent.dealDate
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {selectedStudent.dealDate ? '已成交' : '跟進中'}
                          </span>
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">成交日期</label>
                        <p className="text-base mt-1">
                          {selectedStudent.dealDate
                            ? new Date(selectedStudent.dealDate).toLocaleDateString('zh-TW')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">方案</label>
                        <p className="text-base mt-1">{selectedStudent.plan || '-'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-3">金額資訊</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">方案價格</label>
                        <p className="text-base mt-1 font-semibold">
                          {selectedStudent.packagePrice
                            ? formatCurrency(parseFloat(selectedStudent.packagePrice.replace(/[^0-9.-]/g, '')))
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">實收金額</label>
                        <p className="text-base mt-1 font-semibold text-green-600">
                          {selectedStudent.actualAmount
                            ? formatCurrency(parseFloat(selectedStudent.actualAmount.replace(/[^0-9.-]/g, '')))
                            : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedStudent.note && (
                    <div className="border-t pt-4">
                      <label className="text-sm font-medium text-muted-foreground">備註</label>
                      <p className="text-base mt-1 whitespace-pre-wrap">{selectedStudent.note}</p>
                    </div>
                  )}
                </>
              )}

              {/* AI 分析資訊 */}
              {studentAIAnalysis.data?.data?.[0] && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">AI 諮詢分析</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">諮詢分數</label>
                      <p className="text-2xl font-bold mt-1 text-blue-600">
                        {studentAIAnalysis.data.data[0].analysis_score || '-'}
                        {studentAIAnalysis.data.data[0].analysis_score && <span className="text-sm text-muted-foreground ml-1">/ 100</span>}
                      </p>
                    </div>
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          if (studentAIAnalysis.data?.data?.[0]?.id) {
                            setLocation(`/consultation-quality/${studentAIAnalysis.data.data[0].id}`);
                            setStudentDetailOpen(false);
                          }
                        }}
                        className="w-full"
                        variant="default"
                      >
                        <Lightbulb className="h-4 w-4 mr-2" />
                        查看 AI 分析結果
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDetailOpen(false)}>
              關閉
            </Button>
          </DialogFooter>
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

import { useEffect, useMemo, useState } from 'react';
import ReportsLayout from '../reports-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  RefreshCw,
  Plus,
  Wand2,
  Trash2,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Calculator,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CostProfitPrediction, CostProfitRecord } from '@/types/cost-profit';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

// ==================== Types ====================

type RowSource = 'existing' | 'ai' | 'manual';

interface EditableRow {
  id?: string;
  category: string;
  item: string;
  amount: string;
  notes: string;
  isConfirmed: boolean;
  source: RowSource;
  aiReason?: string;
  aiConfidence?: number;
  selected?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tempId?: string;
  currency?: 'TWD' | 'USD' | 'RMB';
  exchangeRateUsed?: number;
  amountInTWD?: number;
}

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
  currency?: 'TWD' | 'USD' | 'RMB';
  exchange_rate_used?: number;
  amount_in_twd?: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface MonthlyMetrics {
  month: string;
  revenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

// ==================== Constants ====================

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const CATEGORY_PRESETS = [
  '收入金額', '人力成本', '廣告費用', '系統費用', '網站費用',
  '軟體服務', '通訊費用', '金流費用', '顧問服務', '稅金費用', '其他費用',
];

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

const MONTH_MAP: Record<string, number> = {
  'January': 1, 'February': 2, 'March': 3, 'April': 4,
  'May': 5, 'June': 6, 'July': 7, 'August': 8,
  'September': 9, 'October': 10, 'November': 11, 'December': 12
};

const currentDate = new Date();
const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
const defaultYear = lastMonth.getFullYear();
const defaultMonth = MONTHS[lastMonth.getMonth()];

// ==================== Helper Functions ====================

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0 }).format(value);

const formatPercentage = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
};

const isRevenueCategory = (category: string) => category === '收入金額';

function mergePrediction(
  rows: EditableRow[],
  predictions: CostProfitPrediction[],
): EditableRow[] {
  const updated = [...rows];
  const now = new Date().toLocaleString('zh-TW');

  predictions.forEach((prediction) => {
    const existingIndex = updated.findIndex(
      (row) =>
        row.category.trim() === prediction.category_name.trim() &&
        row.item.trim() === prediction.item_name.trim(),
    );

    const amount = Number(prediction.predicted_amount.toFixed(2));

    if (existingIndex >= 0) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        amount: amount.toString(),
        aiReason: prediction.reason,
        aiConfidence: prediction.confidence,
        updatedAt: now,
        source: updated[existingIndex].source === 'existing' ? 'existing' : 'ai',
      };
    } else {
      updated.push({
        category: prediction.category_name,
        item: prediction.item_name,
        amount: amount.toString(),
        notes: '',
        isConfirmed: false,
        source: 'ai',
        aiReason: prediction.reason,
        aiConfidence: prediction.confidence,
        createdAt: now,
        currency: 'TWD',
      });
    }
  });

  return updated;
}

type SortField = 'category' | 'item' | 'amount' | 'createdAt' | 'none';
type SortOrder = 'asc' | 'desc';

// ==================== Main Component ====================

export default function CostProfitUnifiedPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ========== Shared State ==========
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [taxRate, setTaxRate] = useState<number>(5);
  const [exchangeRates, setExchangeRates] = useState({ USD: 31.5, RMB: 4.3 });

  // ========== Tab 1 State (編輯) ==========
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showDuplicates, setShowDuplicates] = useState(false);

  const years = useMemo(() => {
    const baseYear = defaultYear;
    return [baseYear - 1, baseYear, baseYear + 1];
  }, []);

  // ========== API Queries ==========

  // 1. 全局資料（用於圖表）
  const allDataQuery = useQuery<CostProfitData[]>({
    queryKey: ['/api/cost-profit'],
    queryFn: async () => {
      const response = await fetch('/api/cost-profit', { credentials: 'include' });
      if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // 2. 單月資料（用於編輯）
  const monthDataQuery = useQuery({
    queryKey: ['cost-profit-records', selectedYear, selectedMonth],
    queryFn: async () => {
      try {
        const params = new URLSearchParams({
          year: String(selectedYear),
          month: selectedMonth,
        });
        const response = await fetch(`/api/cost-profit/records?${params.toString()}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          if (response.status === 404) return [];
          throw new Error(`API Error: ${response.statusText}`);
        }

        const json = await response.json();
        if (!json?.success) return json?.data ?? [];
        return json.data as CostProfitRecord[];
      } catch (error) {
        console.error('API 查詢錯誤:', error);
        return [];
      }
    },
  });

  // ========== 匯率獲取 ==========
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
        const data = await response.json();

        if (data.rates) {
          const usdToTwd = 1 / data.rates.USD;
          const rmbToTwd = 1 / data.rates.CNY;

          setExchangeRates({
            USD: Number(usdToTwd.toFixed(2)),
            RMB: Number(rmbToTwd.toFixed(2)),
          });
        }
      } catch (error) {
        console.error('獲取匯率失敗，使用預設值:', error);
      }
    };

    fetchExchangeRates();
    const interval = setInterval(fetchExchangeRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ========== 轉換單月資料為可編輯格式 ==========
  useEffect(() => {
    if (monthDataQuery.data) {
      const converted: EditableRow[] = monthDataQuery.data.map((record: CostProfitRecord, index: number) => ({
        id: record.id,
        category: record.category_name ?? '',
        item: record.item_name ?? '',
        amount: record.amount === null || record.amount === undefined ? '' : String(record.amount),
        notes: record.notes ?? '',
        isConfirmed: record.is_confirmed ?? false,
        source: 'existing' as RowSource,
        selected: false,
        createdAt: record.created_at ? new Date(record.created_at).toLocaleString('zh-TW') : undefined,
        updatedAt: record.updated_at ? new Date(record.updated_at).toLocaleString('zh-TW') : undefined,
        tempId: `row-${Date.now()}-${index}`,
        currency: record.currency ?? 'TWD',
        exchangeRateUsed: record.exchange_rate_used,
        amountInTWD: record.amount_in_twd,
      }));
      setRows(converted);
    } else if (!monthDataQuery.isLoading) {
      setRows([]);
    }
  }, [monthDataQuery.data, monthDataQuery.isLoading]);

  // ========== Computed Values ==========

  const convertToTWD = (amount: number, currency: 'TWD' | 'USD' | 'RMB' = 'TWD'): number => {
    if (currency === 'TWD') return amount;
    if (currency === 'USD') return amount * exchangeRates.USD;
    if (currency === 'RMB') return amount * exchangeRates.RMB;
    return amount;
  };

  // 計算即時摘要
  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;

    rows.forEach((row) => {
      const amount = Number.parseFloat(row.amount);
      if (!Number.isFinite(amount)) return;

      let amountInTWD: number;

      if (row.amountInTWD !== undefined && row.amountInTWD !== null) {
        amountInTWD = Number(row.amountInTWD);
      } else {
        amountInTWD = convertToTWD(amount, row.currency);
      }

      if (!Number.isFinite(amountInTWD)) return;

      if (isRevenueCategory(row.category)) {
        revenue += amountInTWD;
      } else {
        cost += amountInTWD;
      }
    });

    const businessTax = revenue * (taxRate / 100);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { revenue, cost, profit, margin, businessTax };
  }, [rows, exchangeRates, taxRate]);

  // 篩選當前月份資料（用於圖表）
  const filteredData = useMemo(() => {
    if (!selectedMonth || !allDataQuery.data) return [];
    return allDataQuery.data.filter(item =>
      item.month === selectedMonth && item.year === selectedYear
    );
  }, [allDataQuery.data, selectedMonth, selectedYear]);

  // 計算當月指標
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

    return { revenue, totalCost, profit, profitMargin };
  }, [filteredData]);

  // 計算上月數據
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

    const prevData = (allDataQuery.data || []).filter(item =>
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
  }, [allDataQuery.data, selectedMonth, selectedYear]);

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

  // 分類佔比
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

  // 月度趨勢
  const monthlyTrend = useMemo((): MonthlyMetrics[] => {
    const monthlyData = new Map<string, { revenue: number; cost: number }>();

    (allDataQuery.data || []).forEach((item) => {
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
  }, [allDataQuery.data]);

  // AI 洞察（增強版 - 三層級分析）
  const aiInsights = useMemo(() => {
    const { revenue, totalCost, profit, profitMargin } = currentMonthMetrics;
    const insights: { type: 'success' | 'warning' | 'danger', message: string }[] = [];

    // 歌唱教育機構行業標準
    const INDUSTRY_STANDARDS = {
      profitMargin: { excellent: 35, good: 25, acceptable: 15 },
      laborCostRatio: { max: 45, warning: 50 },
      adCostRatio: { max: 12, warning: 15 },
      operatingCostRatio: { max: 20, warning: 25 },
    };

    // ============ 層級 1: 毛利率分析（差距分析 + 問題診斷）============
    if (profitMargin >= INDUSTRY_STANDARDS.profitMargin.excellent) {
      insights.push({
        type: 'success',
        message: `📊 毛利率 ${profitMargin.toFixed(1)}% 優於行業標準 ${INDUSTRY_STANDARDS.profitMargin.excellent}%，表現優異！維持現有成本控制策略。`
      });
    } else if (profitMargin >= INDUSTRY_STANDARDS.profitMargin.good) {
      const gap = INDUSTRY_STANDARDS.profitMargin.excellent - profitMargin;
      insights.push({
        type: 'success',
        message: `📊 毛利率 ${profitMargin.toFixed(1)}% 達行業良好水平（標準 ${INDUSTRY_STANDARDS.profitMargin.good}-${INDUSTRY_STANDARDS.profitMargin.excellent}%），距卓越還有 ${gap.toFixed(1)}% 提升空間。`
      });
    } else if (profitMargin >= INDUSTRY_STANDARDS.profitMargin.acceptable) {
      const gap = INDUSTRY_STANDARDS.profitMargin.good - profitMargin;
      insights.push({
        type: 'warning',
        message: `📊 毛利率 ${profitMargin.toFixed(1)}% 低於行業良好標準 ${INDUSTRY_STANDARDS.profitMargin.good}%，差距 ${gap.toFixed(1)}%。需檢討成本結構並優化。`
      });
    } else if (profitMargin >= 0) {
      const gap = INDUSTRY_STANDARDS.profitMargin.acceptable - profitMargin;
      insights.push({
        type: 'danger',
        message: `📊 毛利率 ${profitMargin.toFixed(1)}% 嚴重低於行業可接受標準 ${INDUSTRY_STANDARDS.profitMargin.acceptable}%，差距 ${gap.toFixed(1)}%。財務風險高，需立即改善！`
      });
    } else {
      insights.push({
        type: 'danger',
        message: `📊 當月虧損 ${formatCurrency(Math.abs(profit))}（毛利率 ${profitMargin.toFixed(1)}%），需緊急檢討營運模式與成本結構。`
      });
    }

    // ============ 層級 1+2: 人力成本分析（問題診斷 + 具體方案）============
    const laborCost = categoryBreakdown.find(c => c.category === '人力成本');
    if (laborCost && revenue > 0) {
      const laborRatio = (laborCost.amount / revenue) * 100;
      if (laborRatio > INDUSTRY_STANDARDS.laborCostRatio.warning) {
        const gap = laborRatio - INDUSTRY_STANDARDS.laborCostRatio.max;
        const savingTarget = (gap / 100) * revenue;
        insights.push({
          type: 'danger',
          message: `👥 人力成本 ${laborRatio.toFixed(1)}% 超出行業標準 ${INDUSTRY_STANDARDS.laborCostRatio.max}%，超出 ${gap.toFixed(1)}%（約 ${formatCurrency(savingTarget)}）。\n\n` +
          `🎯 層級 2 - 具體改善方案：\n` +
          `1. 優化排課：提升教師稼動率至 85% 以上（預估節省 10-15%）\n` +
          `2. 調整班型：大班制比例從目前提升至 40%（預估節省 12-18%）\n` +
          `3. 師資結構：引入 30% 兼職講師降低固定成本\n` +
          `4. 績效管理：設定人均營收目標 ${formatCurrency(revenue / 5)} 以上\n\n` +
          `📈 層級 3 - 可行性分析：根據過去 ${monthlyTrend.length} 個月數據，若執行以上方案可望降低人力成本至 ${INDUSTRY_STANDARDS.laborCostRatio.max}% 以內，提升毛利率約 ${gap.toFixed(1)}%。`
        });
      } else if (laborRatio > INDUSTRY_STANDARDS.laborCostRatio.max) {
        const gap = laborRatio - INDUSTRY_STANDARDS.laborCostRatio.max;
        insights.push({
          type: 'warning',
          message: `👥 人力成本 ${laborRatio.toFixed(1)}% 略高於標準 ${INDUSTRY_STANDARDS.laborCostRatio.max}%，建議優化教師排課與班型配置，目標降低 ${gap.toFixed(1)}%。`
        });
      } else {
        insights.push({
          type: 'success',
          message: `👥 人力成本 ${laborRatio.toFixed(1)}% 控制良好（低於標準 ${INDUSTRY_STANDARDS.laborCostRatio.max}%），維持現有人力配置策略。`
        });
      }
    }

    // ============ 層級 1+2: 廣告費用分析（問題診斷 + 具體方案）============
    const adCost = categoryBreakdown.find(c => c.category === '廣告費用');
    if (adCost && revenue > 0) {
      const adRatio = (adCost.amount / revenue) * 100;
      const adROI = adCost.amount > 0 ? ((revenue - totalCost) / adCost.amount) * 100 : 0;
      const cac = adCost.amount > 0 ? adCost.amount / (revenue / 50000) : 0; // 假設平均客單價 50000

      if (adRatio > INDUSTRY_STANDARDS.adCostRatio.warning) {
        const gap = adRatio - INDUSTRY_STANDARDS.adCostRatio.max;
        insights.push({
          type: 'warning',
          message: `📢 廣告費用 ${adRatio.toFixed(1)}% 超出行業標準 ${INDUSTRY_STANDARDS.adCostRatio.max}%，ROI ${adROI.toFixed(0)}%，獲客成本約 ${formatCurrency(cac)}。\n\n` +
          `🎯 層級 2 - 優化方案：\n` +
          `1. 渠道優化：分析各平台 ROI，停止 ROI < 150% 的渠道\n` +
          `2. 受眾精準化：縮小目標族群，提升轉換率至 15% 以上\n` +
          `3. 內容行銷：增加自然流量，降低付費廣告依賴度\n` +
          `4. 轉介紹計畫：設計學員推薦獎勵機制（目標 30% 來自轉介紹）\n\n` +
          `📈 層級 3 - 預期效益：若執行優化，預估可降低廣告成本 ${gap.toFixed(1)}%（約 ${formatCurrency((gap / 100) * revenue)}），提升整體毛利率 ${gap.toFixed(1)}%。`
        });
      } else if (adROI > 200) {
        insights.push({
          type: 'success',
          message: `📢 廣告 ROI ${adROI.toFixed(0)}% 表現優異（行業平均 150-200%），廣告費用 ${adRatio.toFixed(1)}% 合理。可考慮適度增加 10-15% 投放擴大市佔率。`
        });
      } else if (adROI < 100) {
        insights.push({
          type: 'danger',
          message: `📢 廣告 ROI ${adROI.toFixed(0)}% 低於成本（<100%），需立即暫停低效渠道並重新規劃投放策略。建議先降低 30% 預算，專注高轉換渠道。`
        });
      } else {
        insights.push({
          type: 'warning',
          message: `📢 廣告費用 ${adRatio.toFixed(1)}%，ROI ${adROI.toFixed(0)}% 尚可，但有優化空間。建議測試新素材與受眾，目標提升至 ROI 200% 以上。`
        });
      }
    }

    // ============ 層級 1: 成本變化趨勢分析 ============
    if (Math.abs(changes.costChange) > 10) {
      if (changes.costChange > 0) {
        insights.push({
          type: 'warning',
          message: `📈 成本較上月增加 ${changes.costChange.toFixed(1)}%，需檢視是否為季節性因素或新增項目。建議每週監控成本變化，確保不偏離預算。`
        });
      } else {
        insights.push({
          type: 'success',
          message: `📉 成本較上月降低 ${Math.abs(changes.costChange).toFixed(1)}%，成本控制有效！請記錄優化措施，作為未來參考標準。`
        });
      }
    }

    // ============ 層級 2+3: 綜合改善路徑（基於多項數據）============
    if (profitMargin < INDUSTRY_STANDARDS.profitMargin.good && insights.length >= 2) {
      const totalSavingPotential = categoryBreakdown
        .filter(c => c.category === '人力成本' || c.category === '廣告費用')
        .reduce((sum, c) => {
          const ratio = (c.amount / revenue) * 100;
          const standard = c.category === '人力成本'
            ? INDUSTRY_STANDARDS.laborCostRatio.max
            : INDUSTRY_STANDARDS.adCostRatio.max;
          return sum + Math.max(0, ratio - standard);
        }, 0);

      if (totalSavingPotential > 5) {
        insights.push({
          type: 'warning',
          message: `🎯 綜合改善路徑：\n\n` +
          `當前毛利率 ${profitMargin.toFixed(1)}% 可透過優化人力與廣告成本，預估提升 ${totalSavingPotential.toFixed(1)}% 至目標 ${(profitMargin + totalSavingPotential).toFixed(1)}%。\n\n` +
          `📊 執行優先序（3 個月計畫）：\n` +
          `第 1 月：立即優化廣告投放（快速見效）\n` +
          `第 2 月：調整班型與排課（中期效益）\n` +
          `第 3 月：優化師資結構（長期穩定）\n\n` +
          `📈 預期成果：3 個月後毛利率可達 ${(profitMargin + totalSavingPotential * 0.8).toFixed(1)}%，接近行業良好標準。`
        });
      }
    }

    return insights;
  }, [currentMonthMetrics, categoryBreakdown, changes, monthlyTrend]);

  // ========== 年度數據計算（用於年度總覽 Tab）==========
  const annualMetrics = useMemo(() => {
    const currentYearData = (allDataQuery.data || []).filter(item => item.year === selectedYear);
    const previousYearData = (allDataQuery.data || []).filter(item => item.year === selectedYear - 1);

    // 計算當前年度總計
    let currentRevenue = 0;
    let currentCost = 0;
    currentYearData.forEach((item) => {
      const amount = parseFloat(item.amount as string) || 0;
      if (item.category_name === '收入金額') {
        currentRevenue += amount;
      } else {
        currentCost += amount;
      }
    });
    const currentProfit = currentRevenue - currentCost;
    const currentMargin = currentRevenue > 0 ? (currentProfit / currentRevenue) * 100 : 0;

    // 計算去年同期總計
    let previousRevenue = 0;
    let previousCost = 0;
    previousYearData.forEach((item) => {
      const amount = parseFloat(item.amount as string) || 0;
      if (item.category_name === '收入金額') {
        previousRevenue += amount;
      } else {
        previousCost += amount;
      }
    });
    const previousProfit = previousRevenue - previousCost;
    const previousMargin = previousRevenue > 0 ? (previousProfit / previousRevenue) * 100 : 0;

    // 計算同比變化率（Year-over-Year）
    const yoyRevenueChange = previousRevenue > 0
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
      : 0;
    const yoyCostChange = previousCost > 0
      ? ((currentCost - previousCost) / previousCost) * 100
      : 0;
    const yoyProfitChange = previousProfit !== 0
      ? ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100
      : 0;
    const yoyMarginChange = currentMargin - previousMargin;

    // 計算每月平均
    const monthsWithData = new Set(currentYearData.map(item => item.month)).size;
    const avgMonthlyRevenue = monthsWithData > 0 ? currentRevenue / monthsWithData : 0;
    const avgMonthlyCost = monthsWithData > 0 ? currentCost / monthsWithData : 0;
    const avgMonthlyProfit = monthsWithData > 0 ? currentProfit / monthsWithData : 0;

    return {
      current: {
        revenue: currentRevenue,
        cost: currentCost,
        profit: currentProfit,
        margin: currentMargin,
        monthsWithData,
      },
      previous: {
        revenue: previousRevenue,
        cost: previousCost,
        profit: previousProfit,
        margin: previousMargin,
      },
      yoy: {
        revenueChange: yoyRevenueChange,
        costChange: yoyCostChange,
        profitChange: yoyProfitChange,
        marginChange: yoyMarginChange,
      },
      average: {
        revenue: avgMonthlyRevenue,
        cost: avgMonthlyCost,
        profit: avgMonthlyProfit,
      },
    };
  }, [allDataQuery.data, selectedYear]);

  // 年度月度趨勢（用於年度總覽圖表）
  const annualMonthlyTrend = useMemo(() => {
    const currentYearData = (allDataQuery.data || []).filter(item => item.year === selectedYear);

    const monthlyStats = MONTHS.map((month) => {
      const monthData = currentYearData.filter(item => item.month === month);

      let revenue = 0;
      let cost = 0;

      monthData.forEach((item) => {
        const amount = parseFloat(item.amount as string) || 0;
        if (item.category_name === '收入金額') {
          revenue += amount;
        } else {
          cost += amount;
        }
      });

      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        month: month.substring(0, 3), // Jan, Feb, Mar...
        revenue,
        cost,
        profit,
        margin,
      };
    });

    return monthlyStats;
  }, [allDataQuery.data, selectedYear]);

  // ========== 儲存 Mutation ==========
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      year: number;
      month: string;
      records: Array<{
        category_name: string;
        item_name: string;
        amount: number | null;
        currency: string;
        exchange_rate_used: number;
        amount_in_twd: number | null;
        notes: string | null;
        is_confirmed: boolean;
      }>;
    }) => {
      const response = await fetch('/api/cost-profit/save', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || '儲存失敗');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '儲存成功',
        description: `${selectedYear} 年 ${selectedMonth} 的成本獲利資料已更新`,
      });
      queryClient.invalidateQueries({ queryKey: ['cost-profit-records', selectedYear, selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ['/api/cost-profit'] });
    },
    onError: (error) => {
      toast({
        title: '儲存失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    },
  });

  // ========== Event Handlers ==========

  const handleSave = () => {
    const validationErrors: string[] = [];
    rows.forEach((row, index) => {
      if (!row.category.trim() || !row.item.trim()) {
        validationErrors.push(`第 ${index + 1} 列：分類或項目未填寫`);
      }
      if (row.amount.trim() !== '' && Number.isNaN(Number(row.amount))) {
        validationErrors.push(`第 ${index + 1} 列：金額必須為數字`);
      }
    });

    if (validationErrors.length > 0) {
      toast({
        title: '資料未完整',
        description: validationErrors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      year: selectedYear,
      month: selectedMonth,
      records: rows
        .filter((row) => row.category.trim() && row.item.trim())
        .map((row) => {
          const amount = row.amount.trim() === '' ? null : Number.parseFloat(row.amount.trim());

          let exchangeRateUsed = 1;
          let amountInTwd = amount;

          if (amount !== null && row.currency) {
            if (row.currency === 'USD') {
              exchangeRateUsed = exchangeRates.USD;
              amountInTwd = amount * exchangeRates.USD;
            } else if (row.currency === 'RMB') {
              exchangeRateUsed = exchangeRates.RMB;
              amountInTwd = amount * exchangeRates.RMB;
            }
          }

          return {
            category_name: row.category.trim(),
            item_name: row.item.trim(),
            amount: amount,
            currency: row.currency || 'TWD',
            exchange_rate_used: exchangeRateUsed,
            amount_in_twd: amountInTwd,
            notes: row.notes.trim() === '' ? null : row.notes.trim(),
            is_confirmed: row.isConfirmed,
          };
        }),
    };

    saveMutation.mutate(payload);
  };

  const handleAddRow = () => {
    const now = new Date().toLocaleString('zh-TW');
    setRows((prev) => [
      ...prev,
      {
        category: '',
        item: '',
        amount: '',
        notes: '',
        isConfirmed: false,
        source: 'manual',
        selected: false,
        tempId: `row-${Date.now()}-${prev.length}`,
        currency: 'TWD',
        createdAt: now,
        updatedAt: now,
      },
    ]);
  };

  const handleBatchAdd = (count: number = 5) => {
    const now = new Date().toLocaleString('zh-TW');
    const newRows: EditableRow[] = Array.from({ length: count }, (_, i) => ({
      category: '',
      item: '',
      amount: '',
      notes: '',
      isConfirmed: false,
      source: 'manual',
      selected: false,
      tempId: `row-${Date.now()}-${i}`,
      currency: 'TWD',
      createdAt: now,
      updatedAt: now,
    }));
    setRows((prev) => [...prev, ...newRows]);
  };

  const handleBatchDelete = () => {
    const selectedCount = rows.filter((row) => row.selected).length;
    if (selectedCount === 0) {
      toast({
        title: '未選擇任何項目',
        description: '請先勾選要刪除的項目',
        variant: 'destructive',
      });
      return;
    }

    setRows((prev) => prev.filter((row) => !row.selected));
    toast({ title: '批次刪除成功', description: `已刪除 ${selectedCount} 個項目` });
  };

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: keyof EditableRow, value: string | boolean) => {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? { ...row, [field]: value, updatedAt: new Date().toLocaleString('zh-TW') }
          : row,
      ),
    );
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setRows((prev) => prev.map((row) => ({ ...row, selected: checked })));
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        year: String(selectedYear),
        month: selectedMonth,
      });
      const response = await fetch(`/api/cost-profit/prediction?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('AI 預測失敗，請稍後再試');

      const json = await response.json();
      const suggestions: CostProfitPrediction[] = json?.data ?? [];

      if (!suggestions.length) {
        toast({
          title: '沒有預測結果',
          description: json?.warning || 'AI 無法提供建議，請手動填寫或確認歷史資料是否足夠。',
        });
        return;
      }

      setRows((prev) => mergePrediction(prev, suggestions));
      toast({ title: 'AI 建議已套用', description: '請檢查金額並可手動調整或新增項目。' });
    } catch (error) {
      toast({
        title: 'AI 預測錯誤',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyTax = () => {
    const now = new Date().toLocaleString('zh-TW');
    const taxAmount = totals.businessTax;

    const existingTaxIndex = rows.findIndex(
      (row) => row.category.trim() === '稅金費用' && row.item.trim() === '營業稅'
    );

    if (existingTaxIndex >= 0) {
      setRows((prev) => {
        const updated = [...prev];
        updated[existingTaxIndex] = {
          ...updated[existingTaxIndex],
          amount: taxAmount.toFixed(2),
          notes: `根據收入 ${formatCurrency(totals.revenue)} × ${taxRate}% 自動計算`,
          updatedAt: now,
        };
        return updated;
      });
      toast({ title: '已更新營業稅', description: `營業稅金額已更新為 ${formatCurrency(taxAmount)}` });
    } else {
      setRows((prev) => [
        ...prev,
        {
          category: '稅金費用',
          item: '營業稅',
          amount: taxAmount.toFixed(2),
          notes: `根據收入 ${formatCurrency(totals.revenue)} × ${taxRate}% 自動計算`,
          isConfirmed: true,
          source: 'manual',
          selected: false,
          tempId: `tax-${Date.now()}`,
          currency: 'TWD',
          createdAt: now,
          updatedAt: now,
        },
      ]);
      toast({ title: '已套用營業稅', description: `已新增營業稅項目：${formatCurrency(taxAmount)}` });
    }
  };

  const handleAddRowAfter = (index: number) => {
    const now = new Date().toLocaleString('zh-TW');
    setRows((prev) => {
      const newRow: EditableRow = {
        category: '',
        item: '',
        amount: '',
        notes: '',
        isConfirmed: false,
        source: 'manual',
        selected: false,
        tempId: `row-${Date.now()}-new`,
        currency: 'TWD',
        createdAt: now,
        updatedAt: now,
      };
      return [...prev.slice(0, index + 1), newRow, ...prev.slice(index + 1)];
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(rows);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setRows(items);
  };

  const handleSort = (field: SortField) => {
    if (field === 'none') {
      setSortField('none');
      return;
    }

    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 重複檢測
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, number[]>();

    rows.forEach((row, index) => {
      const key = `${row.category.trim().toLowerCase()}|||${row.item.trim().toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(index);
    });

    const duplicates = new Map<string, number[]>();
    groups.forEach((indices, key) => {
      if (indices.length > 1) {
        duplicates.set(key, indices);
      }
    });

    return duplicates;
  }, [rows]);

  const isDuplicate = (index: number): boolean => {
    const groupsArray = Array.from(duplicateGroups.values());
    for (const indices of groupsArray) {
      if (indices.includes(index)) return true;
    }
    return false;
  };

  // 排序後的 rows
  const sortedRows = useMemo(() => {
    if (sortField === 'none') return rows;

    const sorted = [...rows];
    sorted.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case 'category':
          aValue = a.category.trim().toLowerCase();
          bValue = b.category.trim().toLowerCase();
          break;
        case 'item':
          aValue = a.item.trim().toLowerCase();
          bValue = b.item.trim().toLowerCase();
          break;
        case 'amount':
          aValue = parseFloat(a.amount) || 0;
          bValue = parseFloat(b.amount) || 0;
          break;
        case 'createdAt':
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [rows, sortField, sortOrder]);

  const displayRows = useMemo(() => {
    if (!showDuplicates) return sortedRows;
    return sortedRows.filter((_, index) => {
      const originalIndex = rows.findIndex(r => r.tempId === sortedRows[index].tempId);
      return isDuplicate(originalIndex);
    });
  }, [sortedRows, showDuplicates, rows, duplicateGroups]);

  const categoryOptions = useMemo(() => {
    const existing = new Set<string>();
    rows.forEach((row) => {
      if (row.category.trim()) existing.add(row.category.trim());
    });
    CATEGORY_PRESETS.forEach((item) => existing.add(item));
    return Array.from(existing.values());
  }, [rows]);

  const isLoading = allDataQuery.isLoading || monthDataQuery.isLoading;

  // ==================== Render ====================

  if (isLoading) {
    return (
      <ReportsLayout title="成本獲利管理系統">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <div className="text-lg">載入中...</div>
        </div>
      </ReportsLayout>
    );
  }

  return (
    <ReportsLayout title="成本獲利管理系統">
      <div className="container mx-auto p-6 space-y-6">
        {/* 標題與選擇器 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">成本獲利管理系統</h1>
            <p className="text-muted-foreground mt-1">
              資料編輯、視覺分析、趨勢追蹤、AI 智能建議
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="選擇月份" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                allDataQuery.refetch();
                monthDataQuery.refetch();
              }}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              重新載入
            </Button>
          </div>
        </div>

        {/* 即時摘要區（固定顯示） */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>即時摘要</CardTitle>
                <CardDescription>
                  金額單位為新台幣（已自動換算外幣）｜匯率：1 USD = {exchangeRates.USD} TWD, 1 RMB = {exchangeRates.RMB} TWD
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-md border border-blue-200">
                <label htmlFor="tax-rate" className="text-sm font-medium whitespace-nowrap">
                  營業稅率：
                </label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-20 h-8 text-center"
                />
                <span className="text-sm">%</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">收入總額</div>
                <div className="text-2xl font-semibold mt-2">
                  {formatCurrency(totals.revenue)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">營業稅 ({taxRate}%)</div>
                <div className="text-2xl font-semibold mt-2 text-orange-600">
                  {formatCurrency(totals.businessTax)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">成本總額</div>
                <div className="text-2xl font-semibold mt-2 text-red-600">
                  {formatCurrency(totals.cost)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">淨利</div>
                <div className="text-2xl font-semibold mt-2">
                  {formatCurrency(totals.profit)}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-muted-foreground">淨利率</div>
                <div className="text-2xl font-semibold mt-2">
                  {totals.margin.toFixed(1)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab 區域 */}
        <Tabs defaultValue="edit" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="edit">📝 資料編輯</TabsTrigger>
            <TabsTrigger value="visual">📊 視覺分析</TabsTrigger>
            <TabsTrigger value="trend">📈 趨勢圖表</TabsTrigger>
            <TabsTrigger value="ai">🤖 AI 洞察</TabsTrigger>
            <TabsTrigger value="annual">📅 年度總覽</TabsTrigger>
          </TabsList>

          {/* TAB 1: 資料編輯 */}
          <TabsContent value="edit" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                      <CardTitle>成本／收入明細</CardTitle>
                      <CardDescription>
                        AI 建議列會附註來源，可直接調整金額；儲存後將覆蓋同月份資料。
                      </CardDescription>
                    </div>
                    <div className="text-xs text-blue-600 font-medium px-3 py-1.5 bg-blue-50 rounded-md whitespace-nowrap">
                      當前匯率：1 USD = {exchangeRates.USD.toFixed(2)} TWD（每小時更新）
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={handleGenerateAI}
                      disabled={isGenerating || isLoading}
                      size="sm"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Wand2 className="h-4 w-4 mr-2" />
                      )}
                      套用 AI 建議
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleApplyTax}
                      disabled={isLoading || totals.revenue === 0}
                      className="bg-orange-50 border-orange-200 hover:bg-orange-100"
                      size="sm"
                    >
                      <Calculator className="h-4 w-4 mr-2" />
                      套用營業稅
                    </Button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <Button variant="outline" onClick={handleAddRow} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      新增項目
                    </Button>
                    <Button variant="outline" onClick={() => handleBatchAdd(5)} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      批次新增 5 列
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleBatchDelete}
                      disabled={rows.filter(r => r.selected).length === 0}
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      批次刪除
                    </Button>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-md">
                      <Switch
                        checked={showDuplicates}
                        onCheckedChange={setShowDuplicates}
                        id="show-duplicates"
                      />
                      <label htmlFor="show-duplicates" className="text-xs cursor-pointer flex items-center gap-1 whitespace-nowrap">
                        {duplicateGroups.size > 0 && (
                          <AlertTriangle className="h-3 w-3 text-orange-500" />
                        )}
                        只顯示重複 {duplicateGroups.size > 0 && `(${duplicateGroups.size})`}
                      </label>
                    </div>
                    <div className="ml-auto">
                      <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending || isLoading}
                        size="sm"
                      >
                        {saveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        儲存月份資料
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]"></TableHead>
                        <TableHead className="w-[50px]">
                          <Checkbox
                            checked={rows.length > 0 && rows.every(r => r.selected)}
                            onCheckedChange={handleToggleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="min-w-[90px]">
                          <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-gray-100" onClick={() => handleSort('category')}>
                            分類
                            {sortField === 'category' ? (
                              sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="min-w-[150px]">
                          <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-gray-100" onClick={() => handleSort('item')}>
                            項目
                            {sortField === 'item' ? (
                              sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="min-w-[110px]">
                          <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-gray-100" onClick={() => handleSort('amount')}>
                            金額 / 幣別
                            {sortField === 'amount' ? (
                              sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="min-w-[150px]">備註</TableHead>
                        <TableHead className="text-center w-[80px]">已確認</TableHead>
                        <TableHead className="min-w-[130px]">
                          <Button variant="ghost" size="sm" className="h-8 px-2 hover:bg-gray-100" onClick={() => handleSort('createdAt')}>
                            記錄時間
                            {sortField === 'createdAt' ? (
                              sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                            ) : (
                              <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead className="w-[80px] text-center">刪除</TableHead>
                      </TableRow>
                    </TableHeader>
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="cost-profit-table">
                        {(provided) => (
                          <TableBody {...provided.droppableProps} ref={provided.innerRef}>
                            {isLoading ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8">
                                  <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                                  載入中...
                                </TableCell>
                              </TableRow>
                            ) : displayRows.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                  {showDuplicates ? '沒有找到重複項目' : '尚未有資料，請手動新增或套用 AI 建議。'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              displayRows.map((row, displayIndex) => {
                                const originalIndex = rows.findIndex(r => r.tempId === row.tempId);
                                const isRowDuplicate = isDuplicate(originalIndex);
                                return (
                                  <Draggable
                                    key={row.tempId || `row-${displayIndex}`}
                                    draggableId={row.tempId || `row-${displayIndex}`}
                                    index={displayIndex}
                                    isDragDisabled={sortField !== 'none'}
                                  >
                                    {(provided, snapshot) => (
                                      <>
                                        <TableRow
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`group relative ${snapshot.isDragging ? 'bg-muted' : ''} ${isRowDuplicate ? 'bg-orange-50 border-l-4 border-l-orange-400' : ''}`}
                                        >
                                          <TableCell {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                                            {sortField === 'none' ? (
                                              <GripVertical className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                              <div className="h-4 w-4" />
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Checkbox
                                              checked={row.selected || false}
                                              onCheckedChange={(checked) =>
                                                handleRowChange(originalIndex, 'selected', checked as boolean)
                                              }
                                            />
                                          </TableCell>
                                          <TableCell>
                                            <Select
                                              value={row.category || undefined}
                                              onValueChange={(value) =>
                                                handleRowChange(originalIndex, 'category', value)
                                              }
                                            >
                                              <SelectTrigger className="w-[150px]">
                                                <SelectValue placeholder="選擇分類" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {categoryOptions.map((option) => (
                                                  <SelectItem key={option} value={option}>
                                                    {option}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex items-center gap-2">
                                              {isRowDuplicate && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <AlertTriangle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                      <p>此項目可能重複登記</p>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}
                                              <Input
                                                value={row.item}
                                                placeholder="項目名稱"
                                                onChange={(event) =>
                                                  handleRowChange(originalIndex, 'item', event.target.value)
                                                }
                                                className={isRowDuplicate ? 'border-orange-300' : ''}
                                              />
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex gap-2 items-center min-w-[200px]">
                                              <Input
                                                className="text-right flex-1 min-w-[120px]"
                                                value={row.amount}
                                                placeholder="0"
                                                onChange={(event) =>
                                                  handleRowChange(originalIndex, 'amount', event.target.value)
                                                }
                                              />
                                              <Select
                                                value={row.currency || 'TWD'}
                                                onValueChange={(value) =>
                                                  handleRowChange(originalIndex, 'currency', value)
                                                }
                                              >
                                                <SelectTrigger className="w-[85px]">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="TWD">TWD</SelectItem>
                                                  <SelectItem value="USD">USD</SelectItem>
                                                  <SelectItem value="RMB">RMB</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <Input
                                              value={row.notes}
                                              placeholder="備註（可選）"
                                              onChange={(event) =>
                                                handleRowChange(originalIndex, 'notes', event.target.value)
                                              }
                                            />
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <div className="flex flex-col items-center gap-1.5">
                                              <Switch
                                                checked={row.isConfirmed}
                                                onCheckedChange={(checked) =>
                                                  handleRowChange(originalIndex, 'isConfirmed', checked)
                                                }
                                              />
                                              {row.source === 'ai' && row.aiReason && row.aiConfidence !== undefined && (
                                                <TooltipProvider>
                                                  <Tooltip>
                                                    <TooltipTrigger asChild>
                                                      <Badge
                                                        variant="outline"
                                                        className="cursor-help bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-[10px] px-1.5 py-0.5"
                                                      >
                                                        AI {(row.aiConfidence * 100).toFixed(0)}%
                                                      </Badge>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="top" className="max-w-xs">
                                                      <div className="space-y-1">
                                                        <div className="font-semibold">AI 建議原因：</div>
                                                        <div className="text-sm">{row.aiReason}</div>
                                                        <div className="text-xs text-muted-foreground pt-1 border-t">
                                                          信心指數：{(row.aiConfidence * 100).toFixed(0)}%
                                                        </div>
                                                      </div>
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </TooltipProvider>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground">
                                            <div className="flex flex-col gap-1">
                                              <div>{row.updatedAt || row.createdAt || '-'}</div>
                                              {row.currency !== 'TWD' && row.exchangeRateUsed && row.amountInTWD && (
                                                <div className="text-[10px] text-blue-600 font-medium">
                                                  {row.amount} {row.currency} × {Number(row.exchangeRateUsed).toFixed(2)} = {formatCurrency(row.amountInTWD)}
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-center">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleRemoveRow(originalIndex)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                        <tr className="group border-b hover:bg-muted/30">
                                          <td colSpan={9} className="p-0 h-2">
                                            <div className="relative h-full">
                                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                                                <Button
                                                  variant="outline"
                                                  size="sm"
                                                  className="h-6 px-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background shadow-md hover:shadow-lg hover:scale-105"
                                                  onClick={() => handleAddRowAfter(originalIndex)}
                                                  title="在此列下方新增"
                                                >
                                                  <Plus className="h-3 w-3 mr-1" />
                                                  <span className="text-xs">新增</span>
                                                </Button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </>
                                    )}
                                  </Draggable>
                                );
                              })
                            )}
                            {provided.placeholder}
                          </TableBody>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: 視覺分析 */}
          <TabsContent value="visual" className="space-y-4">
            {filteredData.length === 0 ? (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-5 w-5" />
                    當前月份暫無數據
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-700">
                    {selectedYear} 年 {selectedMonth} 目前沒有成本獲利數據。請先在「資料編輯」頁籤建立資料。
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
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
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
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
                          <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
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
              </>
            )}
          </TabsContent>

          {/* TAB 3: 趨勢圖表 */}
          <TabsContent value="trend" className="space-y-4">
            {monthlyTrend.length === 0 ? (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-5 w-5" />
                    暫無趨勢數據
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-700">
                    系統中目前沒有任何成本獲利數據。請先在「資料編輯」頁籤建立資料。
                  </p>
                </CardContent>
              </Card>
            ) : (
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
                      <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
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
            )}
          </TabsContent>

          {/* TAB 4: AI 洞察 */}
          <TabsContent value="ai" className="space-y-4">
            {filteredData.length === 0 ? (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-5 w-5" />
                    當前月份暫無數據
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-700">
                    {selectedYear} 年 {selectedMonth} 目前沒有成本獲利數據。請先在「資料編輯」頁籤建立資料。
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
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
                        className={`flex items-start gap-2 p-4 rounded-lg ${
                          insight.type === 'success' ? 'bg-green-100 text-green-800' :
                          insight.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {insight.type === 'success' && <TrendingUp className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        {insight.type === 'warning' && <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        {insight.type === 'danger' && <TrendingDown className="h-5 w-5 mt-0.5 flex-shrink-0" />}
                        <div className="text-sm font-medium whitespace-pre-line">
                          {insight.message}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* 成本結構卡片 */}
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
              </>
            )}
          </TabsContent>

          {/* TAB 5: 年度總覽 */}
          <TabsContent value="annual" className="space-y-4">
            {/* 年度總計卡片（含同比） */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* 年度總營收 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">年度總營收</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(annualMetrics.current.revenue)}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedYear - 1} 年: {formatCurrency(annualMetrics.previous.revenue)}
                    </p>
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    annualMetrics.yoy.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {annualMetrics.yoy.revenueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    同比 {formatPercentage(annualMetrics.yoy.revenueChange)}
                  </p>
                </CardContent>
              </Card>

              {/* 年度總成本 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">年度總成本</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatCurrency(annualMetrics.current.cost)}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedYear - 1} 年: {formatCurrency(annualMetrics.previous.cost)}
                    </p>
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    annualMetrics.yoy.costChange <= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {annualMetrics.yoy.costChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    同比 {formatPercentage(annualMetrics.yoy.costChange)}
                  </p>
                </CardContent>
              </Card>

              {/* 年度淨利 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">年度淨利</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${
                    annualMetrics.current.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(annualMetrics.current.profit)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedYear - 1} 年: {formatCurrency(annualMetrics.previous.profit)}
                    </p>
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    annualMetrics.yoy.profitChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {annualMetrics.yoy.profitChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    同比 {formatPercentage(annualMetrics.yoy.profitChange)}
                  </p>
                </CardContent>
              </Card>

              {/* 年度毛利率 */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">年度毛利率</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{annualMetrics.current.margin.toFixed(1)}%</div>
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedYear - 1} 年: {annualMetrics.previous.margin.toFixed(1)}%
                    </p>
                  </div>
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    annualMetrics.yoy.marginChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {annualMetrics.yoy.marginChange >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    同比 {annualMetrics.yoy.marginChange >= 0 ? '+' : ''}{annualMetrics.yoy.marginChange.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 月度平均數據 */}
            <Card>
              <CardHeader>
                <CardTitle>月度平均數據</CardTitle>
                <CardDescription>基於 {annualMetrics.current.monthsWithData} 個月的數據計算</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">平均月營收</div>
                    <div className="text-2xl font-semibold mt-2">
                      {formatCurrency(annualMetrics.average.revenue)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">平均月成本</div>
                    <div className="text-2xl font-semibold mt-2 text-red-600">
                      {formatCurrency(annualMetrics.average.cost)}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="text-sm text-muted-foreground">平均月淨利</div>
                    <div className={`text-2xl font-semibold mt-2 ${
                      annualMetrics.average.profit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(annualMetrics.average.profit)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 年度月度趨勢圖 */}
            <Card>
              <CardHeader>
                <CardTitle>年度月度趨勢</CardTitle>
                <CardDescription>{selectedYear} 年各月收支情況</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={annualMonthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="營收" fill="#10b981" />
                    <Bar dataKey="cost" name="成本" fill="#ef4444" />
                    <Bar dataKey="profit" name="淨利" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 年度毛利率趨勢 */}
            <Card>
              <CardHeader>
                <CardTitle>年度毛利率趨勢</CardTitle>
                <CardDescription>{selectedYear} 年各月毛利率變化</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={annualMonthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis
                      label={{ value: '毛利率 (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="margin"
                      name="毛利率"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    {/* 添加行業標準參考線 */}
                    <ReferenceLine y={35} stroke="#10b981" strokeDasharray="3 3" label="優秀 35%" />
                    <ReferenceLine y={25} stroke="#f59e0b" strokeDasharray="3 3" label="良好 25%" />
                    <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" label="及格 15%" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ReportsLayout>
  );
}

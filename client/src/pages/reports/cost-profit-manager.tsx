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
import {
  Loader2,
  RefreshCw,
  Plus,
  Wand2,
  Trash2,
  Info,
  CheckSquare,
  Square,
  GripVertical,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Calculator,
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
  tempId?: string; // 用於排序後追蹤原始索引
  currency?: 'TWD' | 'USD' | 'RMB';
  exchangeRateUsed?: number;  // 儲存時的匯率
  amountInTWD?: number;       // 換算後的 TWD 金額（鎖定值）
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const CATEGORY_PRESETS = [
  '收入金額',
  '人力成本',
  '廣告費用',
  '系統費用',
  '網站費用',
  '軟體服務',
  '通訊費用',
  '金流費用',
  '顧問服務',
  '稅金費用',
  '其他費用',
];

const currentDate = new Date();
// 預設為上個月
const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
const defaultYear = lastMonth.getFullYear();
const defaultMonth = MONTHS[lastMonth.getMonth()];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(
    value,
  );

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
        updatedAt: now,  // 設定更新時間
        source:
          updated[existingIndex].source === 'existing'
            ? 'existing'
            : 'ai',
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
        createdAt: now,  // 設定創建時間
        currency: 'TWD',
      });
    }
  });

  return updated;
}

type SortField = 'category' | 'item' | 'amount' | 'createdAt' | 'none';
type SortOrder = 'asc' | 'desc';

export default function CostProfitManagerPage() {
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] =
    useState<string>(defaultMonth);
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [taxRate, setTaxRate] = useState<number>(5); // 營業稅率（預設 5%）
  const [columnWidths, setColumnWidths] = useState({
    category: 150,
    item: 200,
    amount: 120,
    notes: 250,
    confirmed: 80,
    recordTime: 200,
  });
  const [exchangeRates, setExchangeRates] = useState<{
    USD: number;
    RMB: number;
  }>({
    USD: 31.5, // 預設匯率（USD to TWD）
    RMB: 4.3,  // 預設匯率（RMB to TWD）
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const years = useMemo(() => {
    const baseYear = defaultYear;
    return [baseYear - 1, baseYear, baseYear + 1];
  }, []);

  // 獲取即時匯率
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        // 使用免費的匯率 API (exchangerate-api.com)
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
        const data = await response.json();

        if (data.rates) {
          // 計算 USD 和 RMB 對 TWD 的匯率
          const usdToTwd = 1 / data.rates.USD;
          const rmbToTwd = 1 / data.rates.CNY;

          setExchangeRates({
            USD: Number(usdToTwd.toFixed(2)),
            RMB: Number(rmbToTwd.toFixed(2)),
          });
        }
      } catch (error) {
        console.error('獲取匯率失敗，使用預設值:', error);
        // 保持預設匯率
      }
    };

    fetchExchangeRates();
    // 每小時更新一次匯率
    const interval = setInterval(fetchExchangeRates, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const recordsQuery = useQuery({
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
          if (response.status === 404) {
            return [];
          }
          throw new Error(`API Error: ${response.statusText}`);
        }

        const json = await response.json();
        if (!json?.success) {
          return json?.data ?? [];
        }
        return json.data as CostProfitRecord[];
      } catch (error) {
        console.error('API 查詢錯誤:', error);
        return [];
      }
    },
  });

  useEffect(() => {
    if (recordsQuery.data) {
      const converted: EditableRow[] = recordsQuery.data.map((record: CostProfitRecord, index: number) => ({
        id: record.id,
        category: record.category_name ?? '',
        item: record.item_name ?? '',
        amount:
          record.amount === null || record.amount === undefined
            ? ''
            : String(record.amount),
        notes: record.notes ?? '',
        isConfirmed: record.is_confirmed ?? false,
        source: 'existing' as RowSource,
        selected: false,
        createdAt: record.created_at ? new Date(record.created_at).toLocaleString('zh-TW') : undefined,
        updatedAt: record.updated_at ? new Date(record.updated_at).toLocaleString('zh-TW') : undefined,
        tempId: `row-${Date.now()}-${index}`,
        // 匯率鎖定相關欄位
        currency: record.currency ?? 'TWD',
        exchangeRateUsed: record.exchange_rate_used,
        amountInTWD: record.amount_in_twd,
      }));
      setRows(converted);
    } else if (!recordsQuery.isLoading) {
      setRows([]);
    }
  }, [recordsQuery.data, recordsQuery.isLoading]);

  const saveMutation = useMutation({
    mutationFn: async (payload: {
      year: number;
      month: string;
      records: Array<{
        category_name: string;
        item_name: string;
        amount: number | null;
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
      queryClient.invalidateQueries({
        queryKey: ['cost-profit-records', selectedYear, selectedMonth],
      });
    },
    onError: (error) => {
      toast({
        title: '儲存失敗',
        description:
          error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    },
  });

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

  const handleApplyTax = () => {
    const now = new Date().toLocaleString('zh-TW');
    const taxAmount = totals.businessTax;

    // 檢查是否已經有營業稅項目
    const existingTaxIndex = rows.findIndex(
      (row) => row.category.trim() === '稅金費用' && row.item.trim() === '營業稅'
    );

    if (existingTaxIndex >= 0) {
      // 更新現有的營業稅項目
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
      toast({
        title: '已更新營業稅',
        description: `營業稅金額已更新為 ${formatCurrency(taxAmount)}`,
      });
    } else {
      // 新增營業稅項目
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
      toast({
        title: '已套用營業稅',
        description: `已新增營業稅項目：${formatCurrency(taxAmount)}`,
      });
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

  const handleRemoveRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(rows);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setRows(items);
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
    toast({
      title: '批次刪除成功',
      description: `已刪除 ${selectedCount} 個項目`,
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        selected: checked,
      })),
    );
  };

  const handleRowChange = (
    index: number,
    field: keyof EditableRow,
    value: string | boolean,
  ) => {
    setRows((prev) =>
      prev.map((row, idx) =>
        idx === index
          ? {
              ...row,
              [field]: value,
              updatedAt: new Date().toLocaleString('zh-TW'), // 更新修改時間
            }
          : row,
      ),
    );
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const params = new URLSearchParams({
        year: String(selectedYear),
        month: selectedMonth,
      });
      const response = await fetch(
        `/api/cost-profit/prediction?${params.toString()}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        throw new Error('AI 預測失敗，請稍後再試');
      }
      const json = await response.json();
      const suggestions: CostProfitPrediction[] = json?.data ?? [];

      if (!suggestions.length) {
        toast({
          title: '沒有預測結果',
          description:
            json?.warning ||
            'AI 無法提供建議，請手動填寫或確認歷史資料是否足夠。',
        });
        return;
      }

      setRows((prev) => mergePrediction(prev, suggestions));
      toast({
        title: 'AI 建議已套用',
        description: '請檢查金額並可手動調整或新增項目。',
      });
    } catch (error) {
      toast({
        title: 'AI 預測錯誤',
        description:
          error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // 排序功能
  const handleSort = (field: SortField) => {
    if (field === 'none') {
      setSortField('none');
      return;
    }

    if (sortField === field) {
      // Toggle sort order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 檢測重複項目
  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, number[]>();

    rows.forEach((row, index) => {
      const key = `${row.category.trim().toLowerCase()}|||${row.item.trim().toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(index);
    });

    // 只返回有重複的群組
    const duplicates = new Map<string, number[]>();
    groups.forEach((indices, key) => {
      if (indices.length > 1) {
        duplicates.set(key, indices);
      }
    });

    return duplicates;
  }, [rows]);

  // 檢查某行是否為重複項目
  const isDuplicate = (index: number): boolean => {
    const groupsArray = Array.from(duplicateGroups.values());
    for (const indices of groupsArray) {
      if (indices.includes(index)) {
        return true;
      }
    }
    return false;
  };

  // 排序後的 rows
  const sortedRows = useMemo(() => {
    if (sortField === 'none') {
      return rows;
    }

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

  // 過濾重複項目
  const displayRows = useMemo(() => {
    if (!showDuplicates) {
      return sortedRows;
    }
    return sortedRows.filter((_, index) => {
      const originalIndex = rows.findIndex(r => r.tempId === sortedRows[index].tempId);
      return isDuplicate(originalIndex);
    });
  }, [sortedRows, showDuplicates, rows, duplicateGroups]);

  // 轉換為 TWD 的輔助函數
  const convertToTWD = (amount: number, currency: 'TWD' | 'USD' | 'RMB' = 'TWD'): number => {
    if (currency === 'TWD') return amount;
    if (currency === 'USD') return amount * exchangeRates.USD;
    if (currency === 'RMB') return amount * exchangeRates.RMB;
    return amount;
  };

  const totals = useMemo(() => {
    let revenue = 0;
    let cost = 0;

    rows.forEach((row) => {
      const amount = Number.parseFloat(row.amount);
      if (!Number.isFinite(amount)) return;

      // 優先使用已鎖定的 TWD 金額（歷史資料）
      // 否則即時計算（新增/未儲存的資料）
      let amountInTWD: number;

      if (row.amountInTWD !== undefined && row.amountInTWD !== null) {
        // 使用已儲存的 TWD 金額（不受當前匯率影響）
        amountInTWD = row.amountInTWD;
      } else {
        // 即時計算（新增或修改中的資料）
        amountInTWD = convertToTWD(amount, row.currency);
      }

      if (isRevenueCategory(row.category)) {
        revenue += amountInTWD;
      } else {
        cost += amountInTWD;
      }
    });

    // 營業稅計算（使用可調整的稅率）
    const businessTax = revenue * (taxRate / 100);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      cost,
      profit,
      margin,
      businessTax,
    };
  }, [rows, exchangeRates, taxRate]);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    rows.forEach((row, index) => {
      if (!row.category.trim() || !row.item.trim()) {
        errors.push(`第 ${index + 1} 列：分類或項目未填寫`);
      }
      if (row.amount.trim() !== '' && Number.isNaN(Number(row.amount))) {
        errors.push(`第 ${index + 1} 列：金額必須為數字`);
      }
    });
    return errors;
  }, [rows]);

  const handleSave = () => {
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
          const amount = row.amount.trim() === ''
            ? null
            : Number.parseFloat(row.amount.trim());

          // 計算當時匯率和 TWD 金額
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

  const categoryOptions = useMemo(() => {
    const existing = new Set<string>();
    rows.forEach((row) => {
      if (row.category.trim()) {
        existing.add(row.category.trim());
      }
    });
    CATEGORY_PRESETS.forEach((item) => existing.add(item));
    return Array.from(existing.values());
  }, [rows]);

  const isLoading = recordsQuery.isLoading;

  return (
    <ReportsLayout title="成本獲利管理">
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <h1 className="text-3xl font-bold">成本獲利管理</h1>
            <p className="text-muted-foreground mt-1">
              建立或匯入成本資料，AI 協助預測下個月的支出與收入
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => {
                setSelectedYear(Number(value));
              }}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="年" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedMonth}
              onValueChange={(value) => setSelectedMonth(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="月份" />
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
              onClick={() => recordsQuery.refetch()}
              variant="outline"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${
                  isLoading ? 'animate-spin' : ''
                }`}
              />
              重新載入
            </Button>
          </div>
        </div>

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

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>成本／收入明細</CardTitle>
              <CardDescription className="space-y-1">
                <div>AI 建議列會附註來源，可直接調整金額；儲存後將覆蓋同月份資料。</div>
                <div className="text-xs text-blue-600 font-medium">
                  當前匯率：1 USD = {exchangeRates.USD.toFixed(2)} TWD | 1 RMB = {exchangeRates.RMB.toFixed(2)} TWD（每小時更新）
                </div>
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateAI}
                disabled={isGenerating || isLoading}
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
              >
                <Calculator className="h-4 w-4 mr-2" />
                套用營業稅
              </Button>
              <Button variant="outline" onClick={handleAddRow}>
                <Plus className="h-4 w-4 mr-2" />
                新增項目
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBatchAdd(5)}
              >
                <Plus className="h-4 w-4 mr-2" />
                批次新增 5 列
              </Button>
              <Button
                variant="outline"
                onClick={handleBatchDelete}
                disabled={rows.filter(r => r.selected).length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                批次刪除
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                <Switch
                  checked={showDuplicates}
                  onCheckedChange={setShowDuplicates}
                  id="show-duplicates"
                />
                <label htmlFor="show-duplicates" className="text-sm cursor-pointer flex items-center gap-1">
                  {duplicateGroups.size > 0 && (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                  只顯示重複項目 {duplicateGroups.size > 0 && `(${duplicateGroups.size} 組)`}
                </label>
              </div>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || isLoading}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                儲存月份資料
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {validationErrors.length > 0 && (
              <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                <div className="font-medium mb-1">提交前提醒：</div>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="w-full">
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
                    <TableHead className="min-w-[90px]" style={{ width: `${columnWidths.category}px` }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-gray-100"
                        onClick={() => handleSort('category')}
                      >
                        分類
                        {sortField === 'category' ? (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="min-w-[150px]" style={{ width: `${columnWidths.item}px` }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-gray-100"
                        onClick={() => handleSort('item')}
                      >
                        項目
                        {sortField === 'item' ? (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="min-w-[110px]" style={{ width: `${columnWidths.amount}px` }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-gray-100"
                        onClick={() => handleSort('amount')}
                      >
                        金額 / 幣別
                        {sortField === 'amount' ? (
                          sortOrder === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="min-w-[150px]" style={{ width: `${columnWidths.notes}px` }}>備註</TableHead>
                    <TableHead className="text-center" style={{ width: `${columnWidths.confirmed}px` }}>
                      已確認
                    </TableHead>
                    <TableHead className="min-w-[130px]" style={{ width: `${columnWidths.recordTime}px` }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 hover:bg-gray-100"
                        onClick={() => handleSort('createdAt')}
                      >
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
                      <TableCell
                        colSpan={9}
                        className="text-center py-8 text-muted-foreground"
                      >
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
                                handleRowChange(
                                  originalIndex,
                                  'item',
                                  event.target.value,
                                )
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
                                handleRowChange(
                                  originalIndex,
                                  'amount',
                                  event.target.value,
                                )
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
                                    handleRowChange(
                                      originalIndex,
                                      'notes',
                                      event.target.value,
                                    )
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
                            {/* 新增按鈕分隔行 */}
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
      </div>
    </ReportsLayout>
  );
}

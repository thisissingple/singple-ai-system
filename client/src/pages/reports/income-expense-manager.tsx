import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
import {
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Settings,
  X,
  ListPlus,
  Upload,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import type {
  TransactionType,
  Currency,
  IncomeExpenseRecord,
} from '@/types/income-expense';

interface EditableRow {
  id?: string;
  transaction_date: string;
  transaction_type: TransactionType;
  item_name: string;
  teacher_id: string;
  teacher_name?: string;
  customer_name: string;
  customer_email: string;
  amount: string;
  currency: Currency;
  notes: string;
  // 詳細資訊欄位
  payment_method?: string;
  setter_id?: string;
  setter_name?: string;
  consultant_id?: string;
  consultant_name?: string;
  created_by?: string;          // 填表人 ID（可編輯）
  created_by_name?: string;     // 填表人姓名（顯示用）
  created_at?: string;
  updated_at?: string;
  course_code?: string;
  course_type?: string;
  exchange_rate_used?: number;
  is_confirmed?: boolean;
  tempId?: string;
}

interface Teacher {
  id: string;
  name: string;
  roles?: string[];
}

interface MonthlySummary {
  month: string;
  total_income: number;
  total_expense: number;
  net_profit: number;
  record_count: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const currentDate = new Date();
const defaultYear = currentDate.getFullYear();
const defaultMonth = MONTHS[currentDate.getMonth()];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD' }).format(value);

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Taipei',  // 強制使用台灣時區
  });
};

export default function IncomeExpenseManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showConsultFields, setShowConsultFields] = useState(false); // 控制諮詢欄位顯示
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set()); // 批次選擇的列
  const [showBatchAddDialog, setShowBatchAddDialog] = useState(false); // 批次新增對話框
  const [batchAddCount, setBatchAddCount] = useState('5'); // 批次新增數量
  const [showImportDialog, setShowImportDialog] = useState(false); // CSV 匯入對話框
  const [importFile, setImportFile] = useState<File | null>(null); // 匯入的檔案
  const [importing, setImporting] = useState(false); // 匯入中
  const [errorRows, setErrorRows] = useState<Set<number>>(new Set()); // 錯誤列索引

  // 選項管理系統
  const defaultPaymentMethods = [
    '匯款',
    '現金',
    '信用卡',
    '超商',
    '支付寶',
    '微信',
    'PayPal',
    '零卡分期',
    '信用卡定期定額',
  ];

  const defaultTransactionTypes = [
    { value: 'income', label: '收入' },
    { value: 'expense', label: '支出' },
    { value: 'refund', label: '退款' },
  ];

  // 付款方式管理
  const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
    // 強制更新為新的付款方式
    localStorage.setItem('paymentMethods', JSON.stringify(defaultPaymentMethods));
    return defaultPaymentMethods;
  });

  // 交易類型管理（未來擴充用）
  const [transactionTypes, setTransactionTypes] = useState<Array<{value: string, label: string}>>(() => {
    const saved = localStorage.getItem('transactionTypes');
    return saved ? JSON.parse(saved) : defaultTransactionTypes;
  });

  const [showOptionsSettings, setShowOptionsSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'payment' | 'type'>('payment');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newTypeName, setNewTypeName] = useState('');

  // 選項變更時儲存到 localStorage
  useEffect(() => {
    localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    localStorage.setItem('transactionTypes', JSON.stringify(transactionTypes));
  }, [transactionTypes]);

  // 付款方式管理函數
  const handleAddPaymentMethod = () => {
    const trimmed = newPaymentMethod.trim();
    if (!trimmed) {
      toast({
        title: '請輸入付款方式',
        variant: 'destructive',
      });
      return;
    }
    if (paymentMethods.includes(trimmed)) {
      toast({
        title: '此付款方式已存在',
        variant: 'destructive',
      });
      return;
    }
    setPaymentMethods([...paymentMethods, trimmed]);
    setNewPaymentMethod('');
    toast({
      title: '新增成功',
      description: `已新增付款方式：${trimmed}`,
    });
  };

  const handleRemovePaymentMethod = (method: string) => {
    setPaymentMethods(paymentMethods.filter(m => m !== method));
    toast({
      title: '刪除成功',
      description: `已刪除付款方式：${method}`,
    });
  };

  const handleAddTransactionType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      toast({
        title: '請輸入類型名稱',
        variant: 'destructive',
      });
      return;
    }
    if (transactionTypes.some(t => t.label === trimmed)) {
      toast({
        title: '此類型已存在',
        variant: 'destructive',
      });
      return;
    }
    const newType = {
      value: trimmed.toLowerCase().replace(/\s+/g, '_'),
      label: trimmed,
    };
    setTransactionTypes([...transactionTypes, newType]);
    setNewTypeName('');
    toast({
      title: '新增成功',
      description: `已新增交易類型：${trimmed}`,
    });
  };

  const handleRemoveTransactionType = (value: string) => {
    // 保護預設的三個類型
    if (['income', 'expense', 'refund'].includes(value)) {
      toast({
        title: '無法刪除',
        description: '基本類型（收入、支出、退款）無法刪除',
        variant: 'destructive',
      });
      return;
    }
    setTransactionTypes(transactionTypes.filter(t => t.value !== value));
    toast({
      title: '刪除成功',
      description: '已刪除交易類型',
    });
  };

  const handleResetPaymentMethods = () => {
    setPaymentMethods(defaultPaymentMethods);
    toast({
      title: '已恢復預設',
      description: '付款方式已重置為預設選項',
    });
  };

  const handleResetTransactionTypes = () => {
    setTransactionTypes(defaultTransactionTypes);
    toast({
      title: '已恢復預設',
      description: '交易類型已重置為預設選項',
    });
  };

  // 載入教師列表
  const fetchTeachers = async () => {
    try {
      const response = await fetch('/api/teachers', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('載入教師列表失敗');
      }

      const data = await response.json();
      setTeachers(data || []);
    } catch (error) {
      console.error('載入教師列表失敗:', error);
    }
  };

  // 載入記錄
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const monthNumber = MONTHS.indexOf(selectedMonth as typeof MONTHS[number]) + 1;
      const monthStr = `${selectedYear}-${String(monthNumber).padStart(2, '0')}`;

      const response = await fetch(`/api/income-expense/records?month=${monthStr}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('載入記錄失敗');
      }

      const json = await response.json();
      const data = json.data?.records || [];

      const converted: EditableRow[] = data.map((record: IncomeExpenseRecord, index: number) => ({
        id: record.id,
        transaction_date: record.transaction_date?.slice(0, 10) || '',
        transaction_type: record.transaction_type || 'income',
        item_name: record.item_name || '',
        teacher_id: record.teacher_id || '',
        teacher_name: record.teacher_name,
        customer_name: record.student_name || '',  // 修正：從 student_name 讀取
        customer_email: record.student_email || '', // 修正：從 student_email 讀取
        amount: record.amount?.toString() || '',
        currency: record.currency || 'TWD',
        notes: record.notes || '',
        payment_method: record.payment_method,
        setter_id: record.setter_id,
        setter_name: record.setter_name,
        consultant_id: record.consultant_id,
        consultant_name: record.consultant_name,
        created_by: record.created_by,           // 填表人 ID
        created_by_name: record.created_by_name, // 填表人姓名
        // 強制使用台灣時區轉換
        created_at: record.created_at ? new Date(record.created_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : undefined,
        updated_at: record.updated_at ? new Date(record.updated_at).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : undefined,
        course_code: record.course_code,
        course_type: record.course_type,
        exchange_rate_used: record.exchange_rate_used,
        is_confirmed: record.is_confirmed,
        tempId: `row-${Date.now()}-${index}`,
      }));

      setRows(converted);
    } catch (error) {
      console.error('載入記錄失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入收支記錄',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 載入月度統計
  const fetchSummary = async () => {
    try {
      const monthNumber = MONTHS.indexOf(selectedMonth as typeof MONTHS[number]) + 1;
      const monthStr = `${selectedYear}-${String(monthNumber).padStart(2, '0')}`;

      const response = await fetch(`/api/income-expense/summary/${monthStr}`, {
        credentials: 'include',
      });

      if (!response.ok) return;

      const json = await response.json();
      setSummary(json.data);
    } catch (error) {
      console.error('載入統計失敗:', error);
    }
  };

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchSummary();
  }, [selectedYear, selectedMonth]);

  // 計算即時統計
  const liveStats = useMemo(() => {
    let income = 0;
    let expense = 0;

    rows.forEach((row) => {
      const amount = Number(row.amount) || 0;
      if (row.transaction_type === 'income') {
        income += amount;
      } else if (row.transaction_type === 'expense' || row.transaction_type === 'refund') {
        expense += amount;
      }
    });

    return {
      total_income: income,
      total_expense: expense,
      net_profit: income - expense,
      record_count: rows.length,
    };
  }, [rows]);

  // 新增空白列
  const handleAddRow = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newRow: EditableRow = {
      transaction_date: today,
      transaction_type: 'income',
      item_name: '',
      teacher_id: '',
      customer_name: '',
      customer_email: '',
      amount: '',
      currency: 'TWD',
      notes: '',
      tempId: `new-${Date.now()}`,
    };
    setRows([...rows, newRow]);
  };

  // 批次新增空白列
  const handleBatchAdd = () => {
    const count = parseInt(batchAddCount);
    if (isNaN(count) || count < 1 || count > 100) {
      toast({
        title: '數量無效',
        description: '請輸入 1-100 之間的數字',
        variant: 'destructive',
      });
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const newRows: EditableRow[] = Array.from({ length: count }, (_, i) => ({
      transaction_date: today,
      transaction_type: 'income',
      item_name: '',
      teacher_id: '',
      customer_name: '',
      customer_email: '',
      amount: '',
      currency: 'TWD',
      notes: '',
      tempId: `new-${Date.now()}-${i}`,
    }));

    setRows([...rows, ...newRows]);
    setShowBatchAddDialog(false);
    toast({
      title: '新增成功',
      description: `已新增 ${count} 列空白記錄`,
    });
  };

  // 刪除列
  const handleDeleteRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
    // 清除該列的選擇狀態
    const newSelectedRows = new Set(selectedRows);
    newSelectedRows.delete(index);
    setSelectedRows(newSelectedRows);
  };

  // 批次刪除選中的列
  const handleBatchDelete = () => {
    if (selectedRows.size === 0) {
      toast({
        title: '請選擇要刪除的記錄',
        variant: 'destructive',
      });
      return;
    }

    const newRows = rows.filter((_, index) => !selectedRows.has(index));
    setRows(newRows);
    setSelectedRows(new Set());
    toast({
      title: '刪除成功',
      description: `已刪除 ${selectedRows.size} 筆記錄`,
    });
  };

  // 切換單列選擇
  const toggleRowSelection = (index: number) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(index)) {
      newSelectedRows.delete(index);
    } else {
      newSelectedRows.add(index);
    }
    setSelectedRows(newSelectedRows);
  };

  // 全選/取消全選
  const toggleSelectAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_, index) => index)));
    }
  };

  // 更新列
  const handleUpdateRow = (index: number, field: keyof EditableRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  // 展開/收合詳細資訊
  const toggleExpand = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    const isExpanding = !newExpanded.has(rowId);

    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);

    // 如果是展開，自動滾動到展開按鈕位置（讓詳細欄位進入視野）
    if (isExpanding) {
      setTimeout(() => {
        const tableContainer = document.querySelector('.overflow-x-auto');
        if (tableContainer) {
          // 計算展開按鈕的位置（基本欄位總寬度）
          // 日期(150) + 類型(120) + 付款(150) + 項目(250) + 教練(180) +
          // 學生(200) + Email(240) + 金額(200) + 備註(280) + 操作(100) = 1870px
          const expandButtonPosition = 1870;

          tableContainer.scrollTo({
            left: expandButtonPosition - 200, // 減去一點讓展開按鈕不要靠最右邊
            behavior: 'smooth',
          });
        }
      }, 150); // 延遲讓 DOM 先更新
    }
  };

  // Email 格式驗證
  const isValidEmail = (email: string): boolean => {
    if (!email) return true; // 允許空值
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 儲存
  const handleSave = async () => {
    // 驗證並標記錯誤列
    const errors: string[] = [];
    const errorRowIndexes = new Set<number>();

    rows.forEach((row, index) => {
      let hasError = false;

      if (!row.transaction_date) {
        errors.push(`第 ${index + 1} 列：日期未填寫`);
        hasError = true;
      }
      if (!row.item_name.trim()) {
        errors.push(`第 ${index + 1} 列：項目未填寫`);
        hasError = true;
      }
      if (row.amount === undefined || row.amount === null || row.amount === '' || Number.isNaN(Number(row.amount))) {
        errors.push(`第 ${index + 1} 列：金額必須為數字`);
        hasError = true;
      }
      if (row.customer_email && !isValidEmail(row.customer_email)) {
        errors.push(`第 ${index + 1} 列：Email 格式不正確`);
        hasError = true;
      }

      if (hasError) {
        errorRowIndexes.add(index);
      }
    });

    if (errors.length > 0) {
      setErrorRows(errorRowIndexes);
      toast({
        title: '資料未完整',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    // 清除錯誤標記
    setErrorRows(new Set());

    setSaving(true);
    try {
      // 逐筆儲存
      for (const row of rows) {
        if (!row.item_name.trim()) continue;

        const payload = {
          transaction_date: row.transaction_date,
          transaction_type: row.transaction_type,
          category: row.transaction_type === 'income' ? '課程收入' : '其他支出', // 預設分類
          item_name: row.item_name.trim(),
          amount: Number(row.amount),
          currency: row.currency,
          student_name: row.customer_name?.trim() || null,  // 修正：使用 student_name
          student_email: row.customer_email?.trim() || null, // 修正：使用 student_email
          teacher_id: row.teacher_id || null,
          notes: row.notes.trim() || null,
          // 詳細資訊欄位
          payment_method: row.payment_method?.trim() || null,
          setter_id: row.setter_id || null,
          consultant_id: row.consultant_id || null,
          created_by: row.created_by || null,  // 填表人 ID
        };

        if (row.id) {
          // 更新
          await fetch(`/api/income-expense/records/${row.id}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        } else {
          // 新增
          await fetch('/api/income-expense/records', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
        }
      }

      toast({
        title: '儲存成功',
        description: `${selectedYear} 年 ${selectedMonth} 的收支記錄已更新`,
      });

      // 關閉所有展開的詳細資訊
      setExpandedRows(new Set());

      // 重新載入
      await fetchRecords();
      fetchSummary();
    } catch (error) {
      console.error('儲存失敗:', error);
      toast({
        title: '儲存失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // CSV 匯入處理
  const handleImportCSV = async () => {
    if (!importFile) {
      toast({ title: '請選擇檔案', variant: 'destructive' });
      return;
    }

    setImporting(true);
    try {
      const text = await importFile.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const data = result.data as any[];

      let importedCount = 0;
      const errors: string[] = [];

      for (const row of data) {
        // 只匯入 10 月 2025 年的資料
        if (!row.Date?.startsWith('10/') || !row.Year?.includes('2025')) continue;

        try {
          const amountStr = row['金額（台幣）'] || '';
          const amount = parseFloat(amountStr.replace(/[\$,]/g, ''));
          if (isNaN(amount) || amount === 0) continue;

          const [month, day, year] = row.Date.split('/');
          const transactionDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

          const response = await fetch('/api/income-expense/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transaction_date: transactionDate,
              transaction_type: row['收支類別'] === '收入' ? 'income' : 'expense',
              category: row['收支類別'] === '收入' ? '課程收入' : '支出',
              item_name: row['收入項目'] || row['支出項目'] || '未指定',
              amount: Math.abs(amount),
              currency: 'TWD',
              student_name: row['商家姓名/顧客姓名'],
              student_email: row['顧客Email'],
              notes: row['備註'],
              payment_method: row['付款方式'],
              course_type: row['課程類別'],
              source: 'imported',
              is_confirmed: true,
            }),
          });

          if (response.ok) {
            importedCount++;
          } else {
            const error = await response.json();
            errors.push(`${row.Date}: ${error.error || '未知錯誤'}`);
          }
        } catch (err: any) {
          errors.push(`${row.Date}: ${err.message}`);
        }
      }

      toast({
        title: '匯入完成',
        description: `成功匯入 ${importedCount} 筆記錄${errors.length > 0 ? `，${errors.length} 筆失敗` : ''}`,
      });

      setShowImportDialog(false);
      setImportFile(null);
      await fetchRecords();
      fetchSummary();
    } catch (error: any) {
      toast({
        title: '匯入失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - i);

  return (
    <DashboardLayout
      sidebarSections={sidebarConfig}
      title="收支記錄管理"
    >
      <div className="w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">收支記錄管理</h1>
            <p className="text-muted-foreground mt-1">管理每月收入與支出記錄</p>
          </div>
          <div className="flex items-center gap-3">
            {/* 匯入 CSV */}
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="h-4 w-4 mr-1" />
              匯入 CSV
            </Button>

            {/* 選項設定 */}
            <Dialog open={showOptionsSettings} onOpenChange={setShowOptionsSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  選項設定
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>管理選項設定</DialogTitle>
                </DialogHeader>

                <Tabs value={settingsTab} onValueChange={(v) => setSettingsTab(v as 'payment' | 'type')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="payment">付款方式</TabsTrigger>
                    <TabsTrigger value="type">交易類型</TabsTrigger>
                  </TabsList>

                  {/* 付款方式管理 */}
                  <TabsContent value="payment" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">管理付款方式選項</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetPaymentMethods}
                        className="text-xs"
                      >
                        恢復預設
                      </Button>
                    </div>

                    {/* 新增付款方式 */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="輸入新的付款方式"
                        value={newPaymentMethod}
                        onChange={(e) => setNewPaymentMethod(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddPaymentMethod();
                          }
                        }}
                      />
                      <Button onClick={handleAddPaymentMethod} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 付款方式列表 */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {paymentMethods.map((method) => (
                        <div
                          key={method}
                          className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                        >
                          <span>{method}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePaymentMethod(method)}
                          >
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 交易類型管理 */}
                  <TabsContent value="type" className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">管理交易類型選項</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetTransactionTypes}
                        className="text-xs"
                      >
                        恢復預設
                      </Button>
                    </div>

                    {/* 新增交易類型 */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="輸入新的交易類型"
                        value={newTypeName}
                        onChange={(e) => setNewTypeName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTransactionType();
                          }
                        }}
                      />
                      <Button onClick={handleAddTransactionType} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* 交易類型列表 */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {transactionTypes.map((type) => (
                        <div
                          key={type.value}
                          className="flex items-center justify-between p-2 border rounded hover:bg-muted/50"
                        >
                          <span>{type.label}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTransactionType(type.value)}
                            disabled={['income', 'expense', 'refund'].includes(type.value)}
                          >
                            <X className={`h-4 w-4 ${['income', 'expense', 'refund'].includes(type.value) ? 'text-gray-300' : 'text-red-500'}`} />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      ⓘ 基本類型（收入、支出、退款）無法刪除
                    </p>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
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
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={fetchRecords} variant="outline" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">總收入</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(liveStats.total_income)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">總支出</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(liveStats.total_expense)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">淨利</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(liveStats.net_profit)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">記錄數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{liveStats.record_count}</div>
            </CardContent>
          </Card>
        </div>

        {/* 資料表格 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>收支明細</CardTitle>
              <div className="flex gap-2">
                {/* 批次操作按鈕 */}
                {selectedRows.size > 0 && (
                  <Button
                    onClick={handleBatchDelete}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    刪除選中 ({selectedRows.size})
                  </Button>
                )}

                <Button onClick={handleAddRow} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  新增列
                </Button>

                {/* 批次新增對話框 */}
                <Dialog open={showBatchAddDialog} onOpenChange={setShowBatchAddDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <ListPlus className="h-4 w-4 mr-1" />
                      批次新增
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>批次新增空白記錄</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          新增數量（1-100）
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          value={batchAddCount}
                          onChange={(e) => setBatchAddCount(e.target.value)}
                          placeholder="輸入要新增的列數"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowBatchAddDialog(false)}
                        >
                          取消
                        </Button>
                        <Button onClick={handleBatchAdd}>
                          <Plus className="h-4 w-4 mr-1" />
                          新增
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button onClick={handleSave} disabled={saving || rows.length === 0}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  儲存
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className={expandedRows.size > 0 ? "min-w-[3280px]" : "min-w-[2080px]"}>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] whitespace-nowrap text-center">
                      <Checkbox
                        checked={rows.length > 0 && selectedRows.size === rows.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="w-[60px] whitespace-nowrap text-center">#</TableHead>
                    <TableHead className="w-[150px] whitespace-nowrap">日期</TableHead>
                    <TableHead className="w-[120px] whitespace-nowrap">類型</TableHead>
                    <TableHead className="w-[150px] whitespace-nowrap">付款方式</TableHead>
                    <TableHead className="w-[250px] whitespace-nowrap">項目</TableHead>
                    <TableHead className="w-[180px] whitespace-nowrap">授課教練</TableHead>
                    <TableHead className="w-[200px] whitespace-nowrap">商家/學生名稱</TableHead>
                    <TableHead className="w-[240px] whitespace-nowrap">Email</TableHead>
                    <TableHead className="w-[200px] whitespace-nowrap">金額</TableHead>
                    <TableHead className="w-[280px] whitespace-nowrap">備註</TableHead>
                    <TableHead className="w-[100px] whitespace-nowrap text-center">操作</TableHead>
                    <TableHead className="w-[80px] whitespace-nowrap text-center">展開</TableHead>
                    {/* 詳細欄位表頭（只在有展開時顯示） */}
                    {expandedRows.size > 0 && (
                      <>
                        <TableHead className="w-[180px] whitespace-nowrap">電訪人員</TableHead>
                        <TableHead className="w-[180px] whitespace-nowrap">諮詢人員</TableHead>
                        <TableHead className="w-[180px] whitespace-nowrap">填表人</TableHead>
                        <TableHead className="w-[200px] whitespace-nowrap">建立時間</TableHead>
                        <TableHead className="w-[200px] whitespace-nowrap">最後更新</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center text-muted-foreground py-8">
                        尚無記錄，點擊「新增列」開始輸入
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, index) => {
                      const rowKey = row.tempId || row.id || `row-${index}`;
                      const isExpanded = expandedRows.has(rowKey);

                      return (
                        <>
                          <TableRow
                            key={rowKey}
                            className={errorRows.has(index) ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
                          >
                            {/* 選擇 checkbox */}
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedRows.has(index)}
                                onCheckedChange={() => toggleRowSelection(index)}
                              />
                            </TableCell>

                            {/* 序號 */}
                            <TableCell className="text-center text-muted-foreground font-medium">
                              {index + 1}
                            </TableCell>

                            {/* 日期 */}
                            <TableCell>
                              <Input
                                type="date"
                                value={row.transaction_date}
                                onChange={(e) => handleUpdateRow(index, 'transaction_date', e.target.value)}
                                className="h-9"
                              />
                            </TableCell>

                            {/* 類型 */}
                            <TableCell>
                              <Select
                                value={row.transaction_type}
                                onValueChange={(value) => handleUpdateRow(index, 'transaction_type', value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {transactionTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* 付款方式 */}
                            <TableCell>
                              <Select
                                value={row.payment_method || "none"}
                                onValueChange={(value) => handleUpdateRow(index, 'payment_method', value === "none" ? "" : value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="選擇" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">未選擇</SelectItem>
                                  {paymentMethods.map((method) => (
                                    <SelectItem key={method} value={method}>
                                      {method}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* 項目 */}
                            <TableCell>
                              <Input
                                value={row.item_name}
                                onChange={(e) => handleUpdateRow(index, 'item_name', e.target.value)}
                                placeholder="項目名稱"
                                className="h-9"
                              />
                            </TableCell>

                            {/* 授課教練 */}
                            <TableCell>
                              <Select
                                value={row.teacher_id || "none"}
                                onValueChange={(value) => handleUpdateRow(index, 'teacher_id', value === "none" ? "" : value)}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="選擇教練" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">無</SelectItem>
                                  {teachers.map((teacher) => (
                                    <SelectItem key={teacher.id} value={teacher.id}>
                                      {teacher.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>

                            {/* 商家/學生名稱 */}
                            <TableCell>
                              <Input
                                value={row.customer_name}
                                onChange={(e) => handleUpdateRow(index, 'customer_name', e.target.value)}
                                placeholder="客戶名稱"
                                className="h-9"
                              />
                            </TableCell>

                            {/* Email */}
                            <TableCell>
                              <Input
                                type="email"
                                value={row.customer_email}
                                onChange={(e) => handleUpdateRow(index, 'customer_email', e.target.value)}
                                placeholder="email@example.com"
                                className={`h-9 ${row.customer_email && !isValidEmail(row.customer_email) ? 'border-red-500' : ''}`}
                              />
                            </TableCell>

                            {/* 金額 + 幣別 */}
                            <TableCell>
                              <div className="flex gap-1">
                                <Input
                                  type="number"
                                  value={row.amount}
                                  onChange={(e) => handleUpdateRow(index, 'amount', e.target.value)}
                                  placeholder="0"
                                  className="h-9 w-24"
                                />
                                <Select
                                  value={row.currency}
                                  onValueChange={(value) => handleUpdateRow(index, 'currency', value)}
                                >
                                  <SelectTrigger className="h-9 w-20">
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

                            {/* 備註 */}
                            <TableCell>
                              <Input
                                value={row.notes}
                                onChange={(e) => handleUpdateRow(index, 'notes', e.target.value)}
                                placeholder="備註"
                                className="h-9"
                              />
                            </TableCell>

                            {/* 操作 */}
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteRow(index)}
                                  title="刪除"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>

                            {/* 展開按鈕 */}
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpand(rowKey)}
                                className="h-8 w-8 p-0"
                                title={isExpanded ? "收合" : "展開詳細"}
                              >
                                {isExpanded ? (
                                  <ChevronLeft className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>

                            {/* 詳細欄位（只在展開時顯示） */}
                            {isExpanded && (
                              <>
                                {/* 電訪人員 */}
                                <TableCell>
                                  <Select
                                    value={row.setter_id || "none"}
                                    onValueChange={(value) => handleUpdateRow(index, 'setter_id', value === "none" ? "" : value)}
                                  >
                                    <SelectTrigger className="h-9 text-sm">
                                      <SelectValue placeholder="選擇" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">無</SelectItem>
                                      {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                          {teacher.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                {/* 諮詢人員 */}
                                <TableCell>
                                  <Select
                                    value={row.consultant_id || "none"}
                                    onValueChange={(value) => handleUpdateRow(index, 'consultant_id', value === "none" ? "" : value)}
                                  >
                                    <SelectTrigger className="h-9 text-sm">
                                      <SelectValue placeholder="選擇" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">無</SelectItem>
                                      {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                          {teacher.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                {/* 填表人 */}
                                <TableCell>
                                  <Select
                                    value={row.created_by || "none"}
                                    onValueChange={(value) => handleUpdateRow(index, 'created_by', value === "none" ? "" : value)}
                                  >
                                    <SelectTrigger className="h-9 text-sm">
                                      <SelectValue placeholder="選擇" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">系統</SelectItem>
                                      {teachers.map((teacher) => (
                                        <SelectItem key={teacher.id} value={teacher.id}>
                                          {teacher.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </TableCell>

                                {/* 建立時間 */}
                                <TableCell className="text-sm text-muted-foreground">
                                  {row.created_at || '-'}
                                </TableCell>

                                {/* 最後更新 */}
                                <TableCell className="text-sm text-muted-foreground">
                                  {row.updated_at || '-'}
                                </TableCell>
                              </>
                            )}
                          </TableRow>

                          {/* 舊的詳細資訊展開區已移除 - 改為橫向顯示 */}
                          {false && isExpanded && (
                            <TableRow>
                              <TableCell colSpan={10} className="bg-muted/30 p-0">
                                <div className="p-4 space-y-4">
                                  <h4 className="text-sm font-semibold mb-3">詳細資訊</h4>

                                  {/* 人員資訊（可編輯） */}
                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="text-xs text-muted-foreground mb-1 block">📞 電訪人員</label>
                                      <Select
                                        value={row.setter_id || "none"}
                                        onValueChange={(value) => handleUpdateRow(index, 'setter_id', value === "none" ? "" : value)}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="選擇電訪人員" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">無</SelectItem>
                                          {teachers.map((teacher) => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                              {teacher.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground mb-1 block">🎯 諮詢人員</label>
                                      <Select
                                        value={row.consultant_id || "none"}
                                        onValueChange={(value) => handleUpdateRow(index, 'consultant_id', value === "none" ? "" : value)}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="選擇諮詢人員" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">無</SelectItem>
                                          {teachers.map((teacher) => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                              {teacher.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-muted-foreground mb-1 block">✍️ 填表人</label>
                                      <Select
                                        value={row.created_by || "none"}
                                        onValueChange={(value) => handleUpdateRow(index, 'created_by', value === "none" ? "" : value)}
                                      >
                                        <SelectTrigger className="h-8">
                                          <SelectValue placeholder="選擇填表人" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">系統</SelectItem>
                                          {teachers.map((teacher) => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                              {teacher.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {/* 時間資訊（只讀） */}
                                  {row.id && (
                                    <div className="grid grid-cols-2 gap-4 pt-3 border-t text-sm">
                                      <div>
                                        <span className="text-muted-foreground">🕐 建立時間：</span>
                                        <span className="ml-2">{row.created_at || '-'}</span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground">🕑 最後更新：</span>
                                        <span className="ml-2">{row.updated_at || '-'}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* 匯率資訊（只讀） */}
                                  {row.exchange_rate_used && row.currency !== 'TWD' && (
                                    <div className="text-sm">
                                      <span className="text-muted-foreground">💱 使用匯率：</span>
                                      <span className="ml-2">
                                        1 {row.currency} = {row.exchange_rate_used} TWD
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* CSV 匯入對話框 */}
        <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>匯入 CSV 檔案</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">選擇 CSV 檔案</label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  將自動匯入 2025 年 10 月的收支記錄
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleImportCSV} disabled={!importFile || importing}>
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      匯入中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      開始匯入
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

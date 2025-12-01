/**
 * 薪資記錄頁面
 * 顯示已儲存的薪資計算記錄，支援狀態更新、刪除和展開詳情
 */

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2, CheckCircle, Clock, Banknote, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface SalaryRecord {
  id: string;
  employee_name: string;
  period_start: string;
  period_end: string;
  base_salary: number;
  original_bonus: number;
  total_revenue: number;
  commission_amount: number;
  point_contribution: number;
  online_course_revenue: number;
  other_income: number;
  total_commission_adjusted: number;
  phone_performance_bonus: number;
  performance_bonus: number;
  leave_deduction: number;
  subtotal_before_deductions: number;
  labor_insurance: number;
  health_insurance: number;
  retirement_fund: number;
  service_fee: number;
  performance_score: number | null;
  consecutive_full_score_count: number;
  consecutive_bonus: number;
  commission_deduction_rate: number;
  monthly_hours: number | null;
  hourly_wage_subtotal: number | null;
  role_type: string | null;
  contract_id: string | null;
  contract_name: string | null;
  total_salary: number;
  status: 'draft' | 'confirmed' | 'paid';
  calculation_details: any;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// 職位類型對應
const roleTypeLabels: Record<string, string> = {
  teacher: '教練',
  closer: 'Closer',
  setter: 'Setter',
};

const formatCurrency = (amount: number | null | undefined) => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = {
  draft: { label: '草稿', variant: 'secondary' as const, icon: Clock },
  confirmed: { label: '已確認', variant: 'default' as const, icon: CheckCircle },
  paid: { label: '已發放', variant: 'outline' as const, icon: Banknote },
};

// 詳情行組件 - 表格形式
function RecordDetailRow({ record }: { record: SalaryRecord }) {
  return (
    <TableRow className="bg-slate-50">
      <TableCell colSpan={11} className="p-0">
        <table className="w-full text-sm">
          <tbody>
            {/* 收入區塊 */}
            <tr className="border-b bg-blue-50/50">
              <td className="py-2 px-4 w-32 text-muted-foreground">底薪</td>
              <td className="py-2 px-4 w-32 text-right font-medium">{formatCurrency(record.base_salary)}</td>
              <td className="py-2 px-4 w-32 text-muted-foreground">業績總額</td>
              <td className="py-2 px-4 w-32 text-right font-medium">{formatCurrency(record.total_revenue)}</td>
              <td className="py-2 px-4 w-32 text-muted-foreground">業績抽成</td>
              <td className="py-2 px-4 text-right font-medium">{formatCurrency(record.total_commission_adjusted || record.commission_amount)}</td>
            </tr>

            {/* 績效區塊 */}
            <tr className="border-b bg-green-50/50">
              <td className="py-2 px-4 text-muted-foreground">績效分數</td>
              <td className={`py-2 px-4 text-right font-medium ${record.performance_score === 10 ? 'text-green-600' : ''}`}>
                {record.performance_score !== null ? `${record.performance_score} 分` : '-'}
              </td>
              <td className="py-2 px-4 text-muted-foreground">連續滿分</td>
              <td className={`py-2 px-4 text-right font-medium ${Number(record.consecutive_full_score_count) > 0 ? 'text-indigo-600' : ''}`}>
                {record.consecutive_full_score_count} 次 {Number(record.consecutive_full_score_count) > 0 && '🔥'}
              </td>
              <td className="py-2 px-4 text-muted-foreground">滿分加成</td>
              <td className={`py-2 px-4 text-right font-medium ${Number(record.consecutive_bonus) > 0 ? 'text-indigo-600' : ''}`}>
                {formatCurrency(record.consecutive_bonus)}
              </td>
            </tr>

            {/* 扣除區塊 */}
            <tr className="border-b bg-red-50/50">
              <td className="py-2 px-4 text-muted-foreground">勞保</td>
              <td className="py-2 px-4 text-right font-medium text-red-600">-{formatCurrency(record.labor_insurance)}</td>
              <td className="py-2 px-4 text-muted-foreground">健保</td>
              <td className="py-2 px-4 text-right font-medium text-red-600">-{formatCurrency(record.health_insurance)}</td>
              <td className="py-2 px-4 text-muted-foreground">手續費</td>
              <td className="py-2 px-4 text-right font-medium text-red-600">
                {Number(record.service_fee) > 0 ? `-${formatCurrency(record.service_fee)}` : '-'}
              </td>
            </tr>
            {/* 退休金獨立列 (非扣除項，僅供參考) */}
            {Number(record.retirement_fund) > 0 && (
              <tr className="border-b bg-slate-50/50">
                <td className="py-2 px-4 text-muted-foreground">退休金</td>
                <td className="py-2 px-4 text-right text-muted-foreground">{formatCurrency(record.retirement_fund)}</td>
                <td colSpan={4} className="py-2 px-4 text-xs text-muted-foreground">（公司提撥，非從薪資扣除）</td>
              </tr>
            )}

            {/* 總計區塊 */}
            <tr className="bg-white">
              <td className="py-3 px-4 text-muted-foreground">未扣保薪資</td>
              <td className="py-3 px-4 text-right font-medium">{formatCurrency(record.subtotal_before_deductions)}</td>
              <td colSpan={2}></td>
              <td className="py-3 px-4 text-right font-bold text-lg">實付薪資</td>
              <td className="py-3 px-4 text-right font-bold text-lg text-green-600">{formatCurrency(record.total_salary)}</td>
            </tr>
          </tbody>
        </table>
      </TableCell>
    </TableRow>
  );
}

// 取得月份選項 (最近 12 個月)
const getMonthOptions = () => {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = format(date, 'yyyy-MM');
    const label = format(date, 'yyyy年M月', { locale: zhTW });
    options.push({ value, label });
  }
  return options;
};

function SalaryRecordsContent() {
  const [records, setRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [employees, setEmployees] = useState<string[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const monthOptions = getMonthOptions();

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (employeeFilter && employeeFilter !== 'all') {
        params.append('employee_name', employeeFilter);
      }
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/salary/records?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        // 本地篩選月份（根據 period_start 的年月）
        let filteredRecords = data.data;
        if (monthFilter && monthFilter !== 'all') {
          filteredRecords = data.data.filter((r: SalaryRecord) => {
            const recordMonth = format(new Date(r.period_start), 'yyyy-MM');
            return recordMonth === monthFilter;
          });
        }
        setRecords(filteredRecords);
        const uniqueEmployees = [...new Set(data.data.map((r: SalaryRecord) => r.employee_name))];
        setEmployees(uniqueEmployees as string[]);
      }
    } catch (error) {
      console.error('載入記錄失敗:', error);
      toast({
        title: '載入失敗',
        description: '無法載入薪資記錄',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [employeeFilter, statusFilter, monthFilter]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/salary/records/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: '狀態已更新',
          description: `記錄狀態已更新為「${statusConfig[newStatus as keyof typeof statusConfig].label}」`,
        });
        loadRecords();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: '更新失敗',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!recordToDelete) return;

    try {
      const response = await fetch(`/api/salary/records/${recordToDelete}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: '刪除成功',
          description: '薪資記錄已刪除',
        });
        loadRecords();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({
        title: '刪除失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return <Badge variant="outline">{status}</Badge>;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">薪資記錄</h1>
          <p className="text-muted-foreground mt-1">
            點擊列展開詳情
          </p>
        </div>
        <Button onClick={loadRecords} variant="outline" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          重新載入
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="w-40">
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇月份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部月份</SelectItem>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇員工" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部員工</SelectItem>
                  {employees.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇狀態" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="draft">草稿</SelectItem>
                  <SelectItem value="confirmed">已確認</SelectItem>
                  <SelectItem value="paid">已發放</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">載入中...</div>
            </div>
          ) : records.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">尚無薪資記錄</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>月份</TableHead>
                  <TableHead>員工</TableHead>
                  <TableHead>職位</TableHead>
                  <TableHead>計算期間</TableHead>
                  <TableHead className="text-right">底薪</TableHead>
                  <TableHead className="text-right">業績抽成</TableHead>
                  <TableHead className="text-right">績效</TableHead>
                  <TableHead className="text-right">實付薪資</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <>
                    <TableRow
                      key={record.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(record.id)}
                    >
                      <TableCell className="w-8">
                        {expandedRows.has(record.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {format(new Date(record.period_start), 'M月', { locale: zhTW })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.employee_name}
                      </TableCell>
                      <TableCell>
                        {record.role_type ? (
                          <Badge variant="outline" className="text-xs">
                            {roleTypeLabels[record.role_type] || record.role_type}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(record.period_start), 'yyyy/MM/dd', { locale: zhTW })}
                        {' ~ '}
                        {format(new Date(record.period_end), 'MM/dd', { locale: zhTW })}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.base_salary)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(record.total_commission_adjusted || record.commission_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {record.performance_score !== null ? (
                          <span className={record.performance_score >= 8 ? 'text-green-600 font-medium' : ''}>
                            {record.performance_score}分
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        {Number(record.consecutive_full_score_count) > 0 && (
                          <span className="ml-1">🔥</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(record.total_salary)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={record.status}
                          onValueChange={(value) => handleStatusChange(record.id, value)}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue>
                              {getStatusBadge(record.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3" />
                                草稿
                              </div>
                            </SelectItem>
                            <SelectItem value="confirmed">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3" />
                                已確認
                              </div>
                            </SelectItem>
                            <SelectItem value="paid">
                              <div className="flex items-center gap-2">
                                <Banknote className="w-3 h-3" />
                                已發放
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRecordToDelete(record.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRows.has(record.id) && (
                      <RecordDetailRow key={`${record.id}-detail`} record={record} />
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除此記錄嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。刪除後，此薪資計算記錄將永久移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SalaryRecords() {
  return (
    <DashboardLayout sidebarSections={sidebarConfig} title="薪資記錄">
      <SalaryRecordsContent />
    </DashboardLayout>
  );
}

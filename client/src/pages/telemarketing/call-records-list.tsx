/**
 * 電訪記錄列表頁面
 * 顯示所有電訪記錄，支援篩選、搜尋、新增
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'wouter';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Phone,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  TrendingUp,
  PhoneCall,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

interface TelemarketingCall {
  id: string;
  student_name: string;
  student_phone: string;
  student_email?: string;
  caller_name: string;
  call_date: string;
  call_time?: string;
  call_duration?: number;
  call_result: string;
  contact_status?: string;
  scheduled_callback_date?: string;
  interest_level?: string;
  interested_package?: string;
  budget_range?: string;
  forwarded_to_consultant: boolean;
  consultant_name?: string;
  notes?: string;
  created_at: string;
}

interface CallStats {
  total: number;
  today: number;
  this_week: number;
  connected: number;
  interested: number;
  forwarded: number;
}

export default function CallRecordsList() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 查詢電訪記錄
  const { data: calls = [], isLoading } = useQuery<TelemarketingCall[]>({
    queryKey: ['/api/telemarketing/calls'],
    queryFn: async () => {
      const response = await fetch('/api/telemarketing/calls', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入電訪記錄');
      return response.json();
    },
  });

  // 查詢統計資料
  const { data: stats } = useQuery<CallStats>({
    queryKey: ['/api/telemarketing/calls/stats'],
    queryFn: async () => {
      const response = await fetch('/api/telemarketing/calls/stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入統計資料');
      return response.json();
    },
  });

  // 篩選資料
  const filteredCalls = calls.filter((call) => {
    const matchSearch =
      searchTerm === '' ||
      call.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      call.student_phone?.includes(searchTerm) ||
      call.caller_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchResult = filterResult === 'all' || call.call_result === filterResult;
    const matchStatus = filterStatus === 'all' || call.contact_status === filterStatus;

    return matchSearch && matchResult && matchStatus;
  });

  // 取得結果標籤樣式
  const getResultBadge = (result: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      '已接通': { variant: 'default', icon: CheckCircle },
      '未接通': { variant: 'secondary', icon: Clock },
      '拒接': { variant: 'destructive', icon: XCircle },
      '無效號碼': { variant: 'outline', icon: AlertCircle },
    };

    const config = variants[result] || { variant: 'outline', icon: Phone };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {result}
      </Badge>
    );
  };

  // 取得意向標籤樣式
  const getInterestBadge = (level?: string) => {
    if (!level) return null;

    const variants: Record<string, string> = {
      '高': 'default',
      '中': 'secondary',
      '低': 'outline',
    };

    return <Badge variant={variants[level] as any}>{level}意願</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* 標題與統計 */}
      <div>
        <h1 className="text-3xl font-bold mb-2">電訪記錄</h1>
        <p className="text-muted-foreground">
          管理所有電訪聯絡記錄，追蹤學員意向
        </p>
      </div>

      {/* 統計卡片 */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">總記錄數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">今日記錄</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">本週記錄</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.this_week}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">已接通</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.connected}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.connected / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">有意願</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.interested}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.interested / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">已轉諮詢</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.forwarded}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0 ? ((stats.forwarded / stats.total) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 篩選與搜尋 */}
      <Card>
        <CardHeader>
          <CardTitle>篩選條件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>搜尋</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋學員姓名、電話、電訪人員..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>聯絡結果</Label>
              <Select value={filterResult} onValueChange={setFilterResult}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部結果</SelectItem>
                  <SelectItem value="已接通">已接通</SelectItem>
                  <SelectItem value="未接通">未接通</SelectItem>
                  <SelectItem value="拒接">拒接</SelectItem>
                  <SelectItem value="無效號碼">無效號碼</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>聯絡狀態</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部狀態</SelectItem>
                  <SelectItem value="有意願">有意願</SelectItem>
                  <SelectItem value="考慮中">考慮中</SelectItem>
                  <SelectItem value="無意願">無意願</SelectItem>
                  <SelectItem value="再聯絡">再聯絡</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              顯示 {filteredCalls.length} / {calls.length} 筆記錄
            </p>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setFilterResult('all');
              setFilterStatus('all');
            }}>
              清除篩選
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 記錄列表 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>電訪記錄列表</CardTitle>
            <Button onClick={() => window.location.href = '/forms?tab=telemarketing'}>
              <Plus className="mr-2 h-4 w-4" />
              新增記錄
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : filteredCalls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || filterResult !== 'all' || filterStatus !== 'all'
                ? '沒有符合條件的記錄'
                : '尚無電訪記錄'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>學員資訊</TableHead>
                    <TableHead>電訪人員</TableHead>
                    <TableHead>聯絡結果</TableHead>
                    <TableHead>意向程度</TableHead>
                    <TableHead>後續狀態</TableHead>
                    <TableHead>備註</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCalls.map((call) => (
                    <TableRow key={call.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {format(new Date(call.call_date), 'MM/dd', { locale: zhTW })}
                            </div>
                            {call.call_time && (
                              <div className="text-xs text-muted-foreground">
                                {call.call_time.slice(0, 5)}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div>
                          <div className="font-medium">{call.student_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {call.student_phone}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {call.caller_name}
                        </div>
                      </TableCell>

                      <TableCell>{getResultBadge(call.call_result)}</TableCell>

                      <TableCell>{getInterestBadge(call.interest_level)}</TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {call.contact_status && (
                            <Badge variant="outline">{call.contact_status}</Badge>
                          )}
                          {call.forwarded_to_consultant && (
                            <Badge variant="default">已轉諮詢</Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="max-w-xs">
                        <div className="text-sm truncate" title={call.notes || ''}>
                          {call.notes || '-'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

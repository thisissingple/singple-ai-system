/**
 * 廣告名單列表頁面
 * 功能：查看、篩選、認領 Facebook Lead Ads 名單
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Phone, UserCheck, Filter, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface AdLead {
  id: string;
  student_name: string;
  student_phone: string;
  student_email: string;
  campaign_name: string;
  ad_name: string;
  claim_status: 'unclaimed' | 'claimed';
  claimed_by: string | null;
  contact_status: string;
  stage1_status: string;
  stage2_status: string;
  stage3_status: string;
  created_at: string;
  claimed_at: string | null;
}

export default function AdLeadsList() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    claim_status: '',
    stage1_status: '',
    stage2_status: '',
    stage3_status: '',
  });
  const [selectedLead, setSelectedLead] = useState<AdLead | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 查詢名單列表
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/leads/ad-leads', page, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        ),
      });

      const response = await fetch(`/api/leads/ad-leads?${params}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('載入名單失敗');
      }

      return response.json();
    },
  });

  // 認領名單
  const claimMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/leads/ad-leads/${leadId}/claim`, {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '認領失敗');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '認領成功',
        description: '名單已認領，可以開始聯絡',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/leads/ad-leads'] });
    },
    onError: (error: Error) => {
      toast({
        title: '認領失敗',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // 狀態標籤顏色
  const getStatusBadge = (status: string, type: 'claim' | 'stage1' | 'stage2' | 'stage3') => {
    const variants: Record<string, any> = {
      claim: {
        unclaimed: { label: '未認領', variant: 'outline' },
        claimed: { label: '已認領', variant: 'default' },
      },
      stage1: {
        pending: { label: '待預約', variant: 'secondary' },
        scheduled: { label: '已預約', variant: 'default' },
        rejected: { label: '拒絕', variant: 'destructive' },
      },
      stage2: {
        pending: { label: '待上線', variant: 'secondary' },
        showed: { label: '已上線', variant: 'default' },
        no_show: { label: '未出席', variant: 'destructive' },
      },
      stage3: {
        pending: { label: '待成交', variant: 'secondary' },
        converted: { label: '已成交', variant: 'default' },
        trial_only: { label: '體驗課', variant: 'outline' },
        lost: { label: '流失', variant: 'destructive' },
      },
    };

    const config = variants[type]?.[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const leads = data?.data || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* 頁面標題 */}
        <div>
          <h1 className="text-3xl font-bold">廣告名單</h1>
          <p className="text-muted-foreground">
            管理 Facebook Lead Ads 名單，追蹤三階段轉換
          </p>
        </div>

        {/* 統計卡片 */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">總名單數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pagination.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">未認領</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {leads.filter((l: AdLead) => l.claim_status === 'unclaimed').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">已預約</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {leads.filter((l: AdLead) => l.stage1_status === 'scheduled').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">已成交</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {leads.filter((l: AdLead) => l.stage3_status === 'converted').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 篩選區 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              篩選條件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <Label>認領狀態</Label>
                <Select
                  value={filters.claim_status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, claim_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="unclaimed">未認領</SelectItem>
                    <SelectItem value="claimed">已認領</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>階段 1（預約）</Label>
                <Select
                  value={filters.stage1_status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, stage1_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="pending">待預約</SelectItem>
                    <SelectItem value="scheduled">已預約</SelectItem>
                    <SelectItem value="rejected">拒絕</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>階段 2（上線）</Label>
                <Select
                  value={filters.stage2_status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, stage2_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="pending">待上線</SelectItem>
                    <SelectItem value="showed">已上線</SelectItem>
                    <SelectItem value="no_show">未出席</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>階段 3（成交）</Label>
                <Select
                  value={filters.stage3_status}
                  onValueChange={(value) =>
                    setFilters({ ...filters, stage3_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">全部</SelectItem>
                    <SelectItem value="pending">待成交</SelectItem>
                    <SelectItem value="converted">已成交</SelectItem>
                    <SelectItem value="trial_only">僅體驗課</SelectItem>
                    <SelectItem value="lost">流失</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    claim_status: '',
                    stage1_status: '',
                    stage2_status: '',
                    stage3_status: '',
                  })
                }
              >
                清除篩選
              </Button>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                重新整理
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 名單列表 */}
        <Card>
          <CardHeader>
            <CardTitle>名單列表</CardTitle>
            <CardDescription>
              共 {pagination.total} 筆名單，第 {pagination.page} / {pagination.totalPages} 頁
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">載入中...</div>
            ) : leads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                目前沒有名單
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>學員姓名</TableHead>
                      <TableHead>聯絡電話</TableHead>
                      <TableHead>廣告活動</TableHead>
                      <TableHead>認領狀態</TableHead>
                      <TableHead>階段 1</TableHead>
                      <TableHead>階段 2</TableHead>
                      <TableHead>階段 3</TableHead>
                      <TableHead>建立時間</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead: AdLead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.student_name}
                        </TableCell>
                        <TableCell>{lead.student_phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {lead.campaign_name || '未知'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(lead.claim_status, 'claim')}
                          {lead.claimed_by && (
                            <div className="text-xs text-muted-foreground mt-1">
                              認領人：{lead.claimed_by}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(lead.stage1_status, 'stage1')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(lead.stage2_status, 'stage2')}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(lead.stage3_status, 'stage3')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {lead.claim_status === 'unclaimed' && (
                              <Button
                                size="sm"
                                onClick={() => claimMutation.mutate(lead.id)}
                                disabled={claimMutation.isPending}
                              >
                                <UserCheck className="mr-1 h-3 w-3" />
                                認領
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedLead(lead);
                                setShowDetailDialog(true);
                              }}
                            >
                              詳情
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 分頁 */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    顯示第 {(page - 1) * 20 + 1} - {Math.min(page * 20, pagination.total)} 筆，
                    共 {pagination.total} 筆
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一頁
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                    >
                      下一頁
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 詳情對話框 */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>名單詳情</DialogTitle>
              <DialogDescription>
                查看完整的名單資訊與轉換狀態
              </DialogDescription>
            </DialogHeader>

            {selectedLead && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">學員姓名</Label>
                    <div className="font-medium">{selectedLead.student_name}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">聯絡電話</Label>
                    <div className="font-medium">{selectedLead.student_phone}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <div className="font-medium">
                      {selectedLead.student_email || '-'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">建立時間</Label>
                    <div className="font-medium">
                      {format(new Date(selectedLead.created_at), 'yyyy-MM-dd HH:mm')}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">廣告資訊</Label>
                  <div className="mt-1 space-y-1">
                    <div>活動：{selectedLead.campaign_name || '-'}</div>
                    <div>廣告：{selectedLead.ad_name || '-'}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">轉換狀態</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-24">階段 1：</span>
                      {getStatusBadge(selectedLead.stage1_status, 'stage1')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24">階段 2：</span>
                      {getStatusBadge(selectedLead.stage2_status, 'stage2')}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-24">階段 3：</span>
                      {getStatusBadge(selectedLead.stage3_status, 'stage3')}
                    </div>
                  </div>
                </div>

                {selectedLead.claimed_by && (
                  <div>
                    <Label className="text-muted-foreground">認領資訊</Label>
                    <div className="mt-1">
                      認領人：{selectedLead.claimed_by}
                      {selectedLead.claimed_at && (
                        <div className="text-sm text-muted-foreground">
                          認領時間：{format(new Date(selectedLead.claimed_at), 'yyyy-MM-dd HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

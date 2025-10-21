import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Trash2, Search } from 'lucide-react';
import { format } from 'date-fns';

interface TrialClassRecord {
  id: string;
  student_name: string;
  student_email: string;
  class_date: string;
  teacher_name: string;
  class_transcript?: string;
  no_conversion_reason?: string;
  created_at: string;
}

export default function TrialClassRecords() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [editingRecord, setEditingRecord] = useState<TrialClassRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 查詢記錄列表
  const { data, isLoading } = useQuery({
    queryKey: ['/api/forms/trial-class', page],
    queryFn: async () => {
      const response = await fetch(`/api/forms/trial-class?page=${page}&limit=10`);
      if (!response.ok) throw new Error('查詢失敗');
      return response.json();
    },
  });

  // 更新記錄
  const updateMutation = useMutation({
    mutationFn: async (record: TrialClassRecord) => {
      const response = await fetch(`/api/forms/trial-class/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: record.student_name,
          studentEmail: record.student_email,
          classDate: record.class_date,
          teacherName: record.teacher_name,
          notes: record.class_transcript,
          noConversionReason: record.no_conversion_reason,
        }),
      });
      if (!response.ok) throw new Error('更新失敗');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms/trial-class'] });
      toast({ title: '成功', description: '記錄已更新' });
      setEditingRecord(null);
    },
    onError: () => {
      toast({ title: '錯誤', description: '更新失敗', variant: 'destructive' });
    },
  });

  // 刪除記錄
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/forms/trial-class/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('刪除失敗');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/forms/trial-class'] });
      toast({ title: '成功', description: '記錄已刪除' });
      setDeletingId(null);
    },
    onError: () => {
      toast({ title: '錯誤', description: '刪除失敗', variant: 'destructive' });
    },
  });

  const filteredRecords = data?.data?.filter((record: TrialClassRecord) =>
    record.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.student_email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>體驗課打卡記錄</CardTitle>
          <CardDescription>查看、編輯和管理所有體驗課打卡記錄</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 搜尋 */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="搜尋學員姓名或 Email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* 表格 */}
          {isLoading ? (
            <div className="text-center py-8">載入中...</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>學員姓名</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>上課日期</TableHead>
                    <TableHead>授課老師</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record: TrialClassRecord) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.student_name}</TableCell>
                      <TableCell>{record.student_email}</TableCell>
                      <TableCell>{format(new Date(record.class_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{record.teacher_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingRecord(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeletingId(record.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分頁 */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-500">
                  共 {data?.pagination?.total || 0} 筆記錄
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    上一頁
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= (data?.pagination?.totalPages || 1)}
                    onClick={() => setPage(p => p + 1)}
                  >
                    下一頁
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 編輯對話框 */}
      {editingRecord && (
        <Dialog open={!!editingRecord} onOpenChange={() => setEditingRecord(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>編輯記錄</DialogTitle>
              <DialogDescription>修改體驗課打卡記錄</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>學員姓名</Label>
                <Input
                  value={editingRecord.student_name}
                  onChange={(e) => setEditingRecord({ ...editingRecord, student_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editingRecord.student_email}
                  onChange={(e) => setEditingRecord({ ...editingRecord, student_email: e.target.value })}
                />
              </div>
              <div>
                <Label>上課日期</Label>
                <Input
                  type="date"
                  value={editingRecord.class_date}
                  onChange={(e) => setEditingRecord({ ...editingRecord, class_date: e.target.value })}
                />
              </div>
              <div>
                <Label>授課老師</Label>
                <Input
                  value={editingRecord.teacher_name}
                  onChange={(e) => setEditingRecord({ ...editingRecord, teacher_name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingRecord(null)}>取消</Button>
              <Button onClick={() => updateMutation.mutate(editingRecord)}>儲存</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* 刪除確認對話框 */}
      {deletingId && (
        <Dialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>確認刪除</DialogTitle>
              <DialogDescription>確定要刪除這筆記錄嗎？此操作無法復原。</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingId(null)}>取消</Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deletingId)}>刪除</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

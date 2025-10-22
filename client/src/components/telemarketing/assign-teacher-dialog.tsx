/**
 * 分配教師對話框組件
 * 用於將未開始的學生分配給教師
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Users } from 'lucide-react';

interface AssignTeacherDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    student_name: string;
    student_email: string;
    package_name: string;
  };
}

interface Teacher {
  id: string;
  name: string;
  active_students?: number;
}

export function AssignTeacherDialog({ isOpen, onClose, student }: AssignTeacherDialogProps) {
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 查詢教師列表
  const { data: teachers = [], isLoading: teachersLoading } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
    queryFn: async () => {
      const response = await fetch('/api/teachers', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入教師列表');
      const data = await response.json();
      // 假設 API 返回 { teachers: [...] } 格式
      return data.teachers || data;
    },
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // 這裡需要呼叫 API 更新學生的教師分配
      // 可能需要建立新的 API 端點來處理
      const response = await fetch('/api/students/assign-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('分配失敗');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ 教師分配成功',
        description: `已將 ${student.student_name} 分配給 ${selectedTeacher}`,
      });

      // 刷新資料
      queryClient.invalidateQueries({ queryKey: ['/api/reports/total-report'] });

      // 重置表單
      setSelectedTeacher('');
      setScheduledDate('');

      onClose();
    },
    onError: (error: any) => {
      toast({
        title: '❌ 分配失敗',
        description: error.message || '無法分配教師',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!selectedTeacher) {
      toast({
        title: '請選擇教師',
        variant: 'destructive',
      });
      return;
    }

    mutation.mutate({
      student_email: student.student_email,
      student_name: student.student_name,
      teacher_name: selectedTeacher,
      scheduled_date: scheduledDate,
    });
  };

  // 推薦教師（負載最低的教師）
  const recommendedTeacher = teachers.length > 0
    ? [...teachers].sort((a, b) => (a.active_students || 0) - (b.active_students || 0))[0]
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            分配教師
          </DialogTitle>
          <DialogDescription>
            為 {student.student_name} 分配體驗課教師
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 學生資訊 */}
          <div className="space-y-2 p-3 bg-muted rounded-md">
            <div className="text-sm font-medium">學生資訊</div>
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">姓名：</span>{student.student_name}</div>
              <div><span className="text-muted-foreground">Email：</span>{student.student_email}</div>
              <div><span className="text-muted-foreground">方案：</span>{student.package_name}</div>
            </div>
          </div>

          {/* 選擇教師 */}
          <div className="space-y-2">
            <Label htmlFor="teacher">選擇教師 *</Label>
            {teachersLoading ? (
              <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                載入教師列表...
              </div>
            ) : (
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="請選擇教師..." />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.name}>
                      <div className="flex items-center justify-between w-full">
                        <span>{teacher.name}</span>
                        {teacher.active_students !== undefined && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({teacher.active_students} 位學生)
                          </span>
                        )}
                        {recommendedTeacher?.id === teacher.id && (
                          <span className="text-xs text-green-600 ml-2">推薦</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {recommendedTeacher && (
              <p className="text-xs text-muted-foreground">
                💡 推薦教師：{recommendedTeacher.name}（目前負載較低）
              </p>
            )}
          </div>

          {/* 預約時間 */}
          <div className="space-y-2">
            <Label htmlFor="scheduled_date">預約首次上課時間（選填）</Label>
            <Input
              id="scheduled_date"
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              可選擇預約的首次上課日期，教師將收到通知
            </p>
          </div>

          {/* 統計資訊 */}
          {teachers.length > 0 && (
            <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium text-blue-900">教師概況</div>
                  <div className="text-blue-700 mt-1">
                    目前有 {teachers.length} 位教師可分配
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending || teachersLoading}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            確認分配
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 撥打電話對話框組件
 * 用於記錄電話聯絡結果
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Phone, Loader2 } from 'lucide-react';

interface CallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    student_name: string;
    student_email: string;
    phone?: string;
    current_status: string;
  };
}

export function CallDialog({ isOpen, onClose, student }: CallDialogProps) {
  const [callResult, setCallResult] = useState('');
  const [contactStatus, setContactStatus] = useState('');
  const [interestLevel, setInterestLevel] = useState('');
  const [notes, setNotes] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/telemarketing/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('儲存失敗');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '✅ 通話記錄已儲存',
        description: '已成功記錄本次通話內容',
      });

      // 刷新資料
      queryClient.invalidateQueries({ queryKey: ['/api/reports/total-report'] });
      queryClient.invalidateQueries({ queryKey: ['/api/telemarketing/calls'] });

      // 重置表單
      setCallResult('');
      setContactStatus('');
      setInterestLevel('');
      setNotes('');

      onClose();
    },
    onError: (error: any) => {
      toast({
        title: '❌ 儲存失敗',
        description: error.message || '無法儲存通話記錄',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!callResult) {
      toast({
        title: '請選擇聯絡結果',
        variant: 'destructive',
      });
      return;
    }

    mutation.mutate({
      student_name: student.student_name,
      student_email: student.student_email,
      student_phone: student.phone,
      call_date: new Date().toISOString().split('T')[0],
      call_time: new Date().toTimeString().slice(0, 5),
      call_result: callResult,
      contact_status: contactStatus,
      interest_level: interestLevel,
      notes: notes,
      forwarded_to_consultant: false,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            撥打電話
          </DialogTitle>
          <DialogDescription>
            記錄與 {student.student_name} 的通話結果
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 學生資訊 */}
          <div className="space-y-2 p-3 bg-muted rounded-md">
            <div className="text-sm font-medium">學生資訊</div>
            <div className="text-sm space-y-1">
              <div><span className="text-muted-foreground">姓名：</span>{student.student_name}</div>
              <div><span className="text-muted-foreground">Email：</span>{student.student_email}</div>
              <div><span className="text-muted-foreground">電話：</span>{student.phone || '無資料'}</div>
              <div><span className="text-muted-foreground">狀態：</span>{student.current_status}</div>
            </div>
          </div>

          {/* 聯絡結果 */}
          <div className="space-y-2">
            <Label htmlFor="call_result">聯絡結果 *</Label>
            <Select value={callResult} onValueChange={setCallResult}>
              <SelectTrigger id="call_result">
                <SelectValue placeholder="請選擇..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="已接通">✅ 已接通</SelectItem>
                <SelectItem value="未接通">⏰ 未接通</SelectItem>
                <SelectItem value="拒接">❌ 拒接</SelectItem>
                <SelectItem value="無效號碼">⚠️ 無效號碼</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 聯絡狀態（僅在已接通時顯示） */}
          {callResult === '已接通' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="contact_status">聯絡狀態</Label>
                <Select value={contactStatus} onValueChange={setContactStatus}>
                  <SelectTrigger id="contact_status">
                    <SelectValue placeholder="請選擇..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="有意願">😊 有意願</SelectItem>
                    <SelectItem value="考慮中">🤔 考慮中</SelectItem>
                    <SelectItem value="無意願">😐 無意願</SelectItem>
                    <SelectItem value="再聯絡">📞 再聯絡</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="interest_level">意向程度</Label>
                <Select value={interestLevel} onValueChange={setInterestLevel}>
                  <SelectTrigger id="interest_level">
                    <SelectValue placeholder="請選擇..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="高">🔴 高意願</SelectItem>
                    <SelectItem value="中">🟡 中意願</SelectItem>
                    <SelectItem value="低">🟢 低意願</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* 備註 */}
          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              placeholder="記錄通話內容、學生需求、下次跟進事項..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            儲存記錄
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

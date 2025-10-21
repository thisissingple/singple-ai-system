/**
 * 體驗課打卡表單
 * 老師填寫學生上課記錄
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Save, Loader2, List } from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 表單驗證 Schema
const trialClassFormSchema = z.object({
  studentName: z.string().min(1, '請輸入學員姓名'),
  studentEmail: z.string().email('請輸入有效的 Email'),
  classDate: z.string().min(1, '請選擇上課日期'),
  teacherName: z.string().min(1, '請選擇授課老師'),
  notes: z.string().optional(),
  noConversionReason: z.string().optional(),
});

type TrialClassFormData = z.infer<typeof trialClassFormSchema>;

export default function TrialClassForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // 查詢統計資料
  const { data: stats } = useQuery({
    queryKey: ['/api/forms/trial-class/stats'],
    queryFn: async () => {
      const response = await fetch('/api/forms/trial-class/stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入統計資料');
      return response.json() as Promise<{ today: number; week: number; month: number }>;
    },
    refetchInterval: 30000, // 每 30 秒自動更新
  });

  // 查詢老師名單
  const { data: teachers } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: async () => {
      const response = await fetch('/api/teachers', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入老師名單');
      return response.json() as Promise<{ id: string; name: string }[]>;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<TrialClassFormData>({
    resolver: zodResolver(trialClassFormSchema),
    defaultValues: {
      classDate: new Date().toISOString().split('T')[0], // 預設今天
    },
  });

  const onSubmit = async (data: TrialClassFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/forms/trial-class', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('提交失敗');
      }

      toast({
        title: '✅ 提交成功',
        description: `已記錄 ${data.studentName} 的體驗課出席`,
      });

      // 刷新統計資料
      queryClient.invalidateQueries({ queryKey: ['/api/forms/trial-class/stats'] });

      // 重置表單
      reset({
        studentName: '',
        studentEmail: '',
        classDate: new Date().toISOString().split('T')[0],
        teacherName: data.teacherName, // 保留老師姓名
        notes: '',
        noConversionReason: '',
      });
    } catch (error) {
      toast({
        title: '❌ 提交失敗',
        description: error instanceof Error ? error.message : '請稍後再試',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              體驗課打卡記錄
            </CardTitle>
            <CardDescription>
              記錄學生體驗課出席情況，資料將即時同步至體驗課報表
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/forms/trial-class/records')}
          >
            <List className="h-4 w-4 mr-2" />
            查看記錄
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 學員資訊 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="studentName">
                學員姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="studentName"
                placeholder="請輸入學員姓名"
                {...register('studentName')}
                className={errors.studentName ? 'border-red-500' : ''}
              />
              {errors.studentName && (
                <p className="text-sm text-red-500">{errors.studentName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentEmail">
                學員 Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="studentEmail"
                type="email"
                placeholder="student@example.com"
                {...register('studentEmail')}
                className={errors.studentEmail ? 'border-red-500' : ''}
              />
              {errors.studentEmail && (
                <p className="text-sm text-red-500">{errors.studentEmail.message}</p>
              )}
            </div>
          </div>

          {/* 課程資訊 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="classDate">
                上課日期 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="classDate"
                type="date"
                {...register('classDate')}
                className={errors.classDate ? 'border-red-500' : ''}
              />
              {errors.classDate && (
                <p className="text-sm text-red-500">{errors.classDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacherName">
                授課老師 <span className="text-red-500">*</span>
              </Label>
              <Select onValueChange={(value) => setValue('teacherName', value)}>
                <SelectTrigger className={errors.teacherName ? 'border-red-500' : ''}>
                  <SelectValue placeholder="請選擇授課老師" />
                </SelectTrigger>
                <SelectContent>
                  {teachers && teachers.length > 0 ? (
                    teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.name}>
                        {teacher.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="loading" disabled>
                      載入中...
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {errors.teacherName && (
                <p className="text-sm text-red-500">{errors.teacherName.message}</p>
              )}
            </div>
          </div>

          {/* 課程文字檔（可直接貼上文字） */}
          <div className="space-y-2">
            <Label htmlFor="notes">課程文字檔（可直接貼上文字）</Label>
            <Textarea
              id="notes"
              placeholder="課後記錄、學生表現、特殊事項等..."
              rows={4}
              {...register('notes')}
            />
          </div>

          {/* 未轉單原因 */}
          <div className="space-y-2">
            <Label htmlFor="noConversionReason">未轉單原因</Label>
            <Textarea
              id="noConversionReason"
              placeholder="如果學生未轉單，請填寫原因..."
              rows={2}
              {...register('noConversionReason')}
            />
          </div>

          {/* 提交按鈕 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              清除
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  提交記錄
                </>
              )}
            </Button>
          </div>
        </form>

        {/* 統計資訊 */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.today ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">今日已填</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats?.week ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">本週已填</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.month ?? 0}
              </div>
              <div className="text-sm text-muted-foreground">本月已填</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

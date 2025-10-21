/**
 * 諮詢記錄表單
 * 諮詢師填寫學生諮詢與成交記錄
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
import { Briefcase, Save, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// 表單驗證 Schema
const consultationFormSchema = z.object({
  studentName: z.string().min(1, '請輸入學生姓名'),
  studentEmail: z.string().email('請輸入有效的 Email').or(z.string().length(0)),
  callerName: z.string().optional(),
  closerName: z.string().min(1, '請輸入諮詢人員姓名'),
  isOnline: z.string().optional(),
  leadSource: z.string().optional(),
  consultationResult: z.string().min(1, '請選擇諮詢結果'),
  dealPackage: z.string().optional(),
  packageQuantity: z.string().optional(),
  paymentMethod: z.string().optional(),
  installmentPeriods: z.string().optional(),
  packagePrice: z.string().optional(),
  actualAmount: z.string().optional(),
  consultationDate: z.string().min(1, '請選擇諮詢日期'),
  dealDate: z.string().optional(),
  notes: z.string().optional(),
});

type ConsultationFormData = z.infer<typeof consultationFormSchema>;

export default function ConsultationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 查詢統計資料
  const { data: stats } = useQuery({
    queryKey: ['/api/forms/consultation/stats'],
    queryFn: async () => {
      const response = await fetch('/api/forms/consultation/stats', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('無法載入統計資料');
      return response.json() as Promise<{ today: number; week: number; month: number }>;
    },
    refetchInterval: 30000,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ConsultationFormData>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      consultationDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: ConsultationFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/forms/consultation', {
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
        description: `已記錄 ${data.studentName} 的諮詢記錄`,
      });

      // 刷新統計資料
      queryClient.invalidateQueries({ queryKey: ['/api/forms/consultation/stats'] });

      // 重置表單
      reset({
        studentName: '',
        studentEmail: '',
        callerName: '',
        closerName: data.closerName, // 保留諮詢師姓名
        isOnline: '',
        leadSource: '',
        consultationResult: '',
        dealPackage: '',
        packageQuantity: '',
        paymentMethod: '',
        installmentPeriods: '',
        packagePrice: '',
        actualAmount: '',
        consultationDate: new Date().toISOString().split('T')[0],
        dealDate: '',
        notes: '',
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
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          諮詢記錄（EODs for Closers）
        </CardTitle>
        <CardDescription>
          記錄學生諮詢與成交情況，資料將即時同步至諮詢報表
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 基本資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">基本資訊</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="studentName">
                  學生姓名 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="studentName"
                  placeholder="請輸入學生姓名"
                  {...register('studentName')}
                  className={errors.studentName ? 'border-red-500' : ''}
                />
                {errors.studentName && (
                  <p className="text-sm text-red-500">{errors.studentName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentEmail">學生 Email</Label>
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

              <div className="space-y-2">
                <Label htmlFor="callerName">電話負責人</Label>
                <Input
                  id="callerName"
                  placeholder="電訪人員姓名"
                  {...register('callerName')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="closerName">
                  諮詢人員 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="closerName"
                  placeholder="請輸入諮詢人員姓名"
                  {...register('closerName')}
                  className={errors.closerName ? 'border-red-500' : ''}
                />
                {errors.closerName && (
                  <p className="text-sm text-red-500">{errors.closerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadSource">名單來源</Label>
                <Input
                  id="leadSource"
                  placeholder="例如：Facebook、Google、推薦..."
                  {...register('leadSource')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="isOnline">是否上線</Label>
                <Select onValueChange={(value) => setValue('isOnline', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="是">是</SelectItem>
                    <SelectItem value="否">否</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 諮詢結果 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">諮詢結果</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="consultationDate">
                  諮詢日期 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="consultationDate"
                  type="date"
                  {...register('consultationDate')}
                  className={errors.consultationDate ? 'border-red-500' : ''}
                />
                {errors.consultationDate && (
                  <p className="text-sm text-red-500">{errors.consultationDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultationResult">
                  諮詢結果 <span className="text-red-500">*</span>
                </Label>
                <Select
                  onValueChange={(value) => setValue('consultationResult', value)}
                >
                  <SelectTrigger className={errors.consultationResult ? 'border-red-500' : ''}>
                    <SelectValue placeholder="請選擇諮詢結果" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="成交">成交</SelectItem>
                    <SelectItem value="未成交">未成交</SelectItem>
                    <SelectItem value="考慮中">考慮中</SelectItem>
                    <SelectItem value="無意願">無意願</SelectItem>
                    <SelectItem value="未接通">未接通</SelectItem>
                  </SelectContent>
                </Select>
                {errors.consultationResult && (
                  <p className="text-sm text-red-500">{errors.consultationResult.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* 成交資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">成交資訊（若成交）</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dealDate">成交日期</Label>
                <Input id="dealDate" type="date" {...register('dealDate')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealPackage">成交方案</Label>
                <Input
                  id="dealPackage"
                  placeholder="例如：12 堂體驗課程"
                  {...register('dealPackage')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="packageQuantity">方案數量</Label>
                <Input
                  id="packageQuantity"
                  type="number"
                  placeholder="1"
                  {...register('packageQuantity')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="packagePrice">方案價格</Label>
                <Input
                  id="packagePrice"
                  type="number"
                  placeholder="0"
                  {...register('packagePrice')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actualAmount">實收金額</Label>
                <Input
                  id="actualAmount"
                  type="number"
                  placeholder="0"
                  {...register('actualAmount')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">付款方式</Label>
                <Select onValueChange={(value) => setValue('paymentMethod', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="現金">現金</SelectItem>
                    <SelectItem value="轉帳">轉帳</SelectItem>
                    <SelectItem value="信用卡">信用卡</SelectItem>
                    <SelectItem value="分期">分期</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="installmentPeriods">分期期數</Label>
                <Input
                  id="installmentPeriods"
                  type="number"
                  placeholder="0"
                  {...register('installmentPeriods')}
                />
              </div>
            </div>
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              placeholder="諮詢過程記錄、學生需求、特殊事項等..."
              rows={3}
              {...register('notes')}
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

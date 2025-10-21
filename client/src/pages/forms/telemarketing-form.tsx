/**
 * 電訪記錄表單
 * 電訪人員記錄電話聯絡情況
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
import { Phone, Save, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// 表單驗證 Schema
const telemarketingFormSchema = z.object({
  studentName: z.string().min(1, '請輸入學生姓名'),
  studentPhone: z.string().min(1, '請輸入聯絡電話'),
  studentEmail: z.string().email('請輸入有效的 Email').or(z.string().length(0)),
  callerName: z.string().min(1, '請輸入電訪人員姓名'),
  callDate: z.string().min(1, '請選擇電話日期'),
  callTime: z.string().optional(),
  callDuration: z.string().optional(),
  callResult: z.string().min(1, '請選擇聯絡結果'),
  contactStatus: z.string().optional(),
  scheduledCallbackDate: z.string().optional(),
  interestLevel: z.string().optional(),
  interestedPackage: z.string().optional(),
  budgetRange: z.string().optional(),
  forwardedToConsultant: z.boolean().default(false),
  consultantName: z.string().optional(),
  notes: z.string().optional(),
});

type TelemarketingFormData = z.infer<typeof telemarketingFormSchema>;

export default function TelemarketingForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forwardToConsultant, setForwardToConsultant] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 查詢統計資料
  const { data: stats } = useQuery({
    queryKey: ['/api/forms/telemarketing/stats'],
    queryFn: async () => {
      const response = await fetch('/api/forms/telemarketing/stats', {
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
  } = useForm<TelemarketingFormData>({
    resolver: zodResolver(telemarketingFormSchema),
    defaultValues: {
      callDate: new Date().toISOString().split('T')[0],
      callTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      forwardedToConsultant: false,
    },
  });

  const onSubmit = async (data: TelemarketingFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/forms/telemarketing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          forwardedToConsultant: forwardToConsultant,
        }),
      });

      if (!response.ok) {
        throw new Error('提交失敗');
      }

      toast({
        title: '✅ 提交成功',
        description: `已記錄與 ${data.studentName} 的電話聯絡`,
      });

      // 刷新統計資料
      queryClient.invalidateQueries({ queryKey: ['/api/forms/telemarketing/stats'] });

      // 重置表單
      setForwardToConsultant(false);
      reset({
        studentName: '',
        studentPhone: '',
        studentEmail: '',
        callerName: data.callerName, // 保留電訪人員姓名
        callDate: new Date().toISOString().split('T')[0],
        callTime: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        callDuration: '',
        callResult: '',
        contactStatus: '',
        scheduledCallbackDate: '',
        interestLevel: '',
        interestedPackage: '',
        budgetRange: '',
        forwardedToConsultant: false,
        consultantName: '',
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
          <Phone className="h-5 w-5" />
          電訪記錄
        </CardTitle>
        <CardDescription>
          記錄每次電話聯絡情況，追蹤潛在學生意向
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 學生資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">學生資訊</h3>
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
                <Label htmlFor="studentPhone">
                  聯絡電話 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="studentPhone"
                  placeholder="0912-345-678"
                  {...register('studentPhone')}
                  className={errors.studentPhone ? 'border-red-500' : ''}
                />
                {errors.studentPhone && (
                  <p className="text-sm text-red-500">{errors.studentPhone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentEmail">Email</Label>
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
          </div>

          {/* 電訪資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">電訪資訊</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="callerName">
                  電訪人員 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="callerName"
                  placeholder="請輸入電訪人員姓名"
                  {...register('callerName')}
                  className={errors.callerName ? 'border-red-500' : ''}
                />
                {errors.callerName && (
                  <p className="text-sm text-red-500">{errors.callerName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="callDate">
                  電話日期 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="callDate"
                  type="date"
                  {...register('callDate')}
                  className={errors.callDate ? 'border-red-500' : ''}
                />
                {errors.callDate && (
                  <p className="text-sm text-red-500">{errors.callDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="callTime">通話時間</Label>
                <Input
                  id="callTime"
                  type="time"
                  {...register('callTime')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="callDuration">通話時長（分鐘）</Label>
                <Input
                  id="callDuration"
                  type="number"
                  placeholder="5"
                  {...register('callDuration')}
                />
              </div>
            </div>
          </div>

          {/* 聯絡結果 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">聯絡結果</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="callResult">
                  聯絡結果 <span className="text-red-500">*</span>
                </Label>
                <Select onValueChange={(value) => setValue('callResult', value)}>
                  <SelectTrigger className={errors.callResult ? 'border-red-500' : ''}>
                    <SelectValue placeholder="請選擇聯絡結果" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="已接通">已接通</SelectItem>
                    <SelectItem value="未接通">未接通</SelectItem>
                    <SelectItem value="拒接">拒接</SelectItem>
                    <SelectItem value="無效號碼">無效號碼</SelectItem>
                    <SelectItem value="忙線中">忙線中</SelectItem>
                  </SelectContent>
                </Select>
                {errors.callResult && (
                  <p className="text-sm text-red-500">{errors.callResult.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactStatus">聯絡狀態</Label>
                <Select onValueChange={(value) => setValue('contactStatus', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="有意願">有意願</SelectItem>
                    <SelectItem value="考慮中">考慮中</SelectItem>
                    <SelectItem value="無意願">無意願</SelectItem>
                    <SelectItem value="再聯絡">再聯絡</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledCallbackDate">預約回電日期</Label>
                <Input
                  id="scheduledCallbackDate"
                  type="date"
                  {...register('scheduledCallbackDate')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interestLevel">意向程度</Label>
                <Select onValueChange={(value) => setValue('interestLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="請選擇" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="高">高</SelectItem>
                    <SelectItem value="中">中</SelectItem>
                    <SelectItem value="低">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 意向資訊 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">意向資訊</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="interestedPackage">感興趣的方案</Label>
                <Input
                  id="interestedPackage"
                  placeholder="例如：12 堂體驗課程"
                  {...register('interestedPackage')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="budgetRange">預算範圍</Label>
                <Input
                  id="budgetRange"
                  placeholder="例如：5000-10000"
                  {...register('budgetRange')}
                />
              </div>
            </div>
          </div>

          {/* 後續處理 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">後續處理</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="forwardedToConsultant"
                  checked={forwardToConsultant}
                  onCheckedChange={(checked) => setForwardToConsultant(checked === true)}
                />
                <Label htmlFor="forwardedToConsultant" className="cursor-pointer">
                  已轉給諮詢師跟進
                </Label>
              </div>

              {forwardToConsultant && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="consultantName">諮詢師姓名</Label>
                  <Input
                    id="consultantName"
                    placeholder="請輸入諮詢師姓名"
                    {...register('consultantName')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 備註 */}
          <div className="space-y-2">
            <Label htmlFor="notes">備註</Label>
            <Textarea
              id="notes"
              placeholder="通話內容摘要、學生需求、特殊事項等..."
              rows={3}
              {...register('notes')}
            />
          </div>

          {/* 提交按鈕 */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForwardToConsultant(false);
                reset();
              }}
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

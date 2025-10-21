/**
 * Dynamic Form Renderer
 * 動態表單渲染器
 *
 * 根據表單配置動態生成表單UI並處理提交
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { FormConfig } from '@/types/custom-form';

interface DynamicFormRendererProps {
  formConfig: FormConfig;
  onSuccess?: () => void;
}

export function DynamicFormRenderer({ formConfig, onSuccess }: DynamicFormRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // 載入老師列表（如果有欄位需要）
  const needsTeachers = formConfig.fields.some(f =>
    f.dataSource && typeof f.dataSource === 'object' && f.dataSource.endpoint === '/api/teachers'
  );
  const { data: teachers } = useQuery({
    queryKey: ['/api/teachers'],
    queryFn: async () => {
      const response = await fetch('/api/teachers', { credentials: 'include' });
      if (!response.ok) throw new Error('無法載入老師名單');
      return response.json() as Promise<{ id: string; name: string }[]>;
    },
    enabled: needsTeachers,
  });

  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    // 清除該欄位的錯誤訊息
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of formConfig.fields) {
      const value = formData[field.id];

      // 必填驗證
      if (field.required && (value === undefined || value === null || value === '')) {
        newErrors[field.id] = `${field.label}為必填`;
        continue;
      }

      // 類型驗證
      if (value !== undefined && value !== null && value !== '') {
        switch (field.type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
              newErrors[field.id] = '請輸入有效的 Email';
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              newErrors[field.id] = '請輸入有效的數字';
            } else {
              const num = Number(value);
              if (field.min !== undefined && num < field.min) {
                newErrors[field.id] = `最小值為 ${field.min}`;
              }
              if (field.max !== undefined && num > field.max) {
                newErrors[field.id] = `最大值為 ${field.max}`;
              }
            }
            break;
          case 'tel':
            if (!/^[\d\s\-()]+$/.test(value)) {
              newErrors[field.id] = '請輸入有效的電話號碼';
            }
            break;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast({
        title: '驗證失敗',
        description: '請檢查表單欄位',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/forms/custom/${formConfig.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: formData }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: '成功',
          description: '表單已提交',
        });
        setFormData({});
        setErrors({});
        onSuccess?.();
      } else {
        throw new Error(result.error || '提交失敗');
      }
    } catch (error: any) {
      console.error('提交失敗:', error);
      toast({
        title: '錯誤',
        description: error.message || '提交表單失敗',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
          />
        );

      case 'select':
        // 根據資料來源決定選項
        let options = field.options || [];

        // 檢查是否有 API 資料來源
        if (field.dataSource && typeof field.dataSource === 'object') {
          if (field.dataSource.endpoint === '/api/teachers' && teachers) {
            options = teachers.map(t => t.name);
          }
        }

        return (
          <Select
            value={value}
            onValueChange={(v) => handleChange(field.id, v)}
          >
            <SelectTrigger id={field.id}>
              <SelectValue placeholder={field.placeholder || '請選擇...'} />
            </SelectTrigger>
            <SelectContent>
              {options.length > 0 ? (
                options.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="loading" disabled>
                  載入中...
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {(field.options || []).map((option: string) => {
              const checked = Array.isArray(value) && value.includes(option);
              return (
                <div key={option} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.id}-${option}`}
                    checked={checked}
                    onCheckedChange={(c) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = c
                        ? [...currentValues, option]
                        : currentValues.filter((v: string) => v !== option);
                      handleChange(field.id, newValues);
                    }}
                  />
                  <Label
                    htmlFor={`${field.id}-${option}`}
                    className="font-normal cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              );
            })}
          </div>
        );

      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        );

      case 'number':
        return (
          <Input
            id={field.id}
            type="number"
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
          />
        );

      default: // text, email, tel
        return (
          <Input
            id={field.id}
            type={field.type}
            value={value}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formConfig.name}</CardTitle>
        {formConfig.description && (
          <CardDescription>{formConfig.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formConfig.fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={field.id}>
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              {renderField(field)}
              {errors[field.id] && (
                <p className="text-sm text-destructive">{errors[field.id]}</p>
              )}
            </div>
          ))}

          <div className="pt-4">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? '提交中...' : '提交'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

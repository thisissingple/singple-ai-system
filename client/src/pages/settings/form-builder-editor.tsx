/**
 * Form Builder Editor Page
 * 表單編輯器主頁面
 */

import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TableMappingEditor } from '@/components/forms/table-mapping-editor';
import { FieldEditor } from '@/components/forms/field-editor';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';
import type { FormField, DisplayLocations, StorageType, CreateFormInput } from '@/types/custom-form';

export default function FormBuilderEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isEditMode = !!id;

  // 表單基本資訊
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // 資料存放方式
  const [storageType, setStorageType] = useState<StorageType>('form_submissions');
  const [targetTable, setTargetTable] = useState('');
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});

  // 欄位設定
  const [fields, setFields] = useState<FormField[]>([]);

  // 載入中狀態
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      loadForm();
    }
  }, [id]);

  const loadForm = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/forms/custom/${id}`);
      const data = await response.json();

      if (data.success && data.form) {
        const form = data.form;
        setName(form.name);
        setDescription(form.description || '');
        setStorageType(form.storage_type);
        setTargetTable(form.target_table || '');
        setFieldMappings(form.field_mappings || {});
        setFields(form.fields);
      } else {
        throw new Error('載入表單失敗');
      }
    } catch (error) {
      console.error('載入表單失敗:', error);
      toast({
        title: '錯誤',
        description: '無法載入表單',
        variant: 'destructive',
      });
      setLocation('/settings/form-builder');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // 驗證
    if (!name.trim()) {
      toast({
        title: '驗證失敗',
        description: '請輸入表單名稱',
        variant: 'destructive',
      });
      return;
    }

    if (fields.length === 0) {
      toast({
        title: '驗證失敗',
        description: '請至少新增一個欄位',
        variant: 'destructive',
      });
      return;
    }

    if (storageType === 'custom_table') {
      if (!targetTable) {
        toast({
          title: '驗證失敗',
          description: '請選擇目標資料表',
          variant: 'destructive',
        });
        return;
      }

      const unmappedFields = fields.filter(f => !fieldMappings[f.id]);
      if (unmappedFields.length > 0) {
        toast({
          title: '驗證失敗',
          description: '請完成所有欄位的映射設定',
          variant: 'destructive',
        });
        return;
      }
    }

    setSaving(true);
    try {
      // 預設不顯示在任何位置，稍後在表單填寫頁面配置
      const formData: CreateFormInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        display_locations: {
          tabs: [],
          sidebar: false,
        },
        storage_type: storageType,
        target_table: storageType === 'custom_table' ? targetTable : undefined,
        field_mappings: storageType === 'custom_table' ? fieldMappings : undefined,
        fields,
      };

      const url = isEditMode ? `/api/forms/custom/${id}` : '/api/forms/custom';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '成功',
          description: isEditMode ? '表單已更新' : '表單已建立',
        });
        setLocation('/settings/form-builder');
      } else {
        throw new Error(data.error || '儲存失敗');
      }
    } catch (error: any) {
      console.error('儲存表單失敗:', error);
      toast({
        title: '錯誤',
        description: error.message || '儲存表單失敗',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">載入中...</div>
      </div>
    );
  }

  return (
    <DashboardLayout sidebarSections={sidebarConfig}>
      <div className="p-6 space-y-6">
      {/* 頁首 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation('/settings/form-builder')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditMode ? '編輯表單' : '建立新表單'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isEditMode ? '修改表單設定' : '設計自訂表單'}
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? '儲存中...' : '儲存表單'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左側：設定區 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本資訊 */}
          <Card>
            <CardHeader>
              <CardTitle>基本資訊</CardTitle>
              <CardDescription>設定表單的名稱和說明</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">表單名稱 *</Label>
                <Input
                  id="form-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例如：學員問卷"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="form-description">表單說明</Label>
                <Textarea
                  id="form-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="簡短描述這個表單的用途"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* 資料存放方式 */}
          <TableMappingEditor
            storageType={storageType}
            targetTable={targetTable}
            fieldMappings={fieldMappings}
            fields={fields}
            onStorageTypeChange={setStorageType}
            onTargetTableChange={setTargetTable}
            onFieldMappingsChange={setFieldMappings}
          />

          {/* 欄位編輯 */}
          <FieldEditor fields={fields} onChange={setFields} />
        </div>

        {/* 右側：預覽區 */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card>
              <CardHeader>
                <CardTitle>即時預覽</CardTitle>
                <CardDescription>表單實際顯示效果</CardDescription>
              </CardHeader>
              <CardContent>
                {fields.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    新增欄位後即可預覽
                  </div>
                ) : (
                  <div className="space-y-4">
                    {name && (
                      <div>
                        <h3 className="font-semibold text-lg">{name}</h3>
                        {description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {description}
                          </p>
                        )}
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-4">
                      {fields.map((field) => (
                        <div key={field.id} className="space-y-1.5">
                          <Label>
                            {field.label}
                            {field.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {field.type === 'textarea' ? (
                            <Textarea
                              placeholder={field.placeholder}
                              disabled
                              rows={3}
                            />
                          ) : field.type === 'select' ? (
                            <div className="h-10 rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
                              {field.placeholder || '請選擇...'}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <div className="space-y-2">
                              {(field.options || []).slice(0, 3).map((option, i) => (
                                <div key={i} className="flex items-center space-x-2">
                                  <div className="h-4 w-4 rounded border" />
                                  <span className="text-sm">{option}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Input
                              type={field.type}
                              placeholder={field.placeholder}
                              disabled
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <Separator />
                    <Button className="w-full" disabled>
                      提交
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>
    </DashboardLayout>
  );
}

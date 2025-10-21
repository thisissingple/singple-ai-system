/**
 * Form Builder List Page
 * 自訂表單列表頁面
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Archive, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FormConfig } from '@/types/custom-form';
import { ROLE_LABELS } from '@/types/custom-form';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { sidebarConfig } from '@/config/sidebar-config';

export default function FormBuilderList() {
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteFormId, setDeleteFormId] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const response = await fetch('/api/forms/custom?status=active');
      const data = await response.json();

      if (data.success) {
        setForms(data.forms);
      }
    } catch (error) {
      console.error('載入表單失敗:', error);
      toast({
        title: '錯誤',
        description: '無法載入表單列表',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (formId: string) => {
    try {
      const response = await fetch(`/api/forms/custom/${formId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: '成功',
          description: '表單已刪除',
        });
        loadForms();
      } else {
        throw new Error('刪除失敗');
      }
    } catch (error) {
      toast({
        title: '錯誤',
        description: '刪除表單失敗',
        variant: 'destructive',
      });
    } finally {
      setDeleteFormId(null);
    }
  };

  const handleCopyLink = async (form: FormConfig) => {
    const shareUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/forms/share/${form.id}`
        : `/forms/share/${form.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: '已複製表單連結',
        description: '貼上即可分享給需要填寫的老師',
      });
    } catch (error) {
      console.error('複製連結失敗:', error);
      toast({
        title: '無法自動複製',
        description: '請手動複製以下連結',
        variant: 'destructive',
      });
      window.prompt?.('請複製以下表單連結', shareUrl);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <DashboardLayout sidebarSections={sidebarConfig}>
      <div className="p-6 space-y-6">
      {/* 頁首 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">表單管理</h1>
          <p className="text-muted-foreground mt-1">建立和管理自訂表單</p>
        </div>
        <Button onClick={() => setLocation('/settings/form-builder/new')}>
          <Plus className="mr-2 h-4 w-4" />
          建立新表單
        </Button>
      </div>

      {/* 表單列表 */}
      <Card>
        <CardHeader>
          <CardTitle>所有表單</CardTitle>
          <CardDescription>
            共 {forms.length} 個表單
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">載入中...</div>
          ) : forms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>尚無表單</p>
              <p className="text-sm mt-2">點擊「建立新表單」開始</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>表單名稱</TableHead>
                  <TableHead>顯示位置</TableHead>
                  <TableHead>欄位數量</TableHead>
                  <TableHead>儲存方式</TableHead>
                  <TableHead>建立日期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">
                      {form.name}
                      {form.description && (
                        <p className="text-sm text-muted-foreground">
                          {form.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {form.display_locations.tabs.map((tab) => (
                          <Badge key={tab} variant="secondary">
                            {ROLE_LABELS[tab]}
                          </Badge>
                        ))}
                        {form.display_locations.sidebar && (
                          <Badge variant="outline">側邊選單</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{form.fields.length} 個欄位</TableCell>
                    <TableCell>
                      {form.storage_type === 'form_submissions' ? (
                        <Badge variant="default">統一表</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {form.target_table}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(form.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(form)}
                          title="複製表單連結"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setLocation(`/settings/form-builder/edit/${form.id}`)}
                          title="編輯表單"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteFormId(form.id)}
                          title="刪除表單"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 刪除確認對話框 */}
      <AlertDialog open={!!deleteFormId} onOpenChange={() => setDeleteFormId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確認刪除表單？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作無法復原。表單及其所有提交記錄都將被永久刪除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFormId && handleDelete(deleteFormId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              確認刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </DashboardLayout>
  );
}

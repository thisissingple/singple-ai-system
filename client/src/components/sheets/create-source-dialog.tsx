/**
 * 新增 Google Sheets 資料來源對話框
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CreateSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateSourceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateSourceDialogProps) {
  const [name, setName] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !sheetUrl.trim()) {
      toast({
        title: '請填寫所有欄位',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/sheets/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sheet_url: sheetUrl.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '新增成功',
          description: '資料來源已新增',
        });
        setName('');
        setSheetUrl('');
        onSuccess();
      } else {
        throw new Error(data.message || '新增失敗');
      }
    } catch (error: any) {
      toast({
        title: '新增失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增 Google Sheets 資料來源</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">資料來源名稱</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: 銷售資料"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheetUrl">Google Sheets URL</Label>
            <Input
              id="sheetUrl"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              請貼上完整的 Google Sheets 網址
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '新增中...' : '新增'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

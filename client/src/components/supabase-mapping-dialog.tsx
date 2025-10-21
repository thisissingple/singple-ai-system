import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSupabaseTables, useSetWorksheetSupabaseMapping, useCreateSupabaseTable } from '@/hooks/use-sheets';
import { useToast } from '@/hooks/use-toast';
import { Database, Plus } from 'lucide-react';
import type { Worksheet } from '@shared/schema';

interface SupabaseMappingDialogProps {
  worksheet: Worksheet | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupabaseMappingDialog({ worksheet, open, onOpenChange }: SupabaseMappingDialogProps) {
  const { toast } = useToast();
  const { data: tables = [], isLoading: tablesLoading, error: tablesError } = useSupabaseTables();
  const setMappingMutation = useSetWorksheetSupabaseMapping();
  const createTableMutation = useCreateSupabaseTable();

  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTableName, setNewTableName] = useState('');

  // 當 worksheet 或 dialog 開啟時，同步更新 selectedTable
  useEffect(() => {
    if (open && worksheet) {
      setSelectedTable(worksheet.supabaseTable || '');
      setIsCreating(false);
      setNewTableName('');
    }
  }, [worksheet, open]);

  // Debug: Log tables when they change
  console.log('Supabase tables:', tables, 'Loading:', tablesLoading, 'Error:', tablesError);

  const handleSave = async () => {
    if (!worksheet) return;

    try {
      let tableName = selectedTable;

      // If creating a new table
      if (isCreating && newTableName) {
        await createTableMutation.mutateAsync({ tableName: newTableName });
        tableName = newTableName;
      }

      if (!tableName) {
        toast({
          title: '錯誤',
          description: '請選擇或創建一個 Supabase 表',
          variant: 'destructive',
        });
        return;
      }

      await setMappingMutation.mutateAsync({
        worksheetId: worksheet.id,
        supabaseTable: tableName,
      });

      toast({
        title: '設定成功',
        description: `工作表 "${worksheet.worksheetName}" 已對應到 Supabase 表 "${tableName}"`,
      });

      onOpenChange(false);
      setIsCreating(false);
      setNewTableName('');
    } catch (error: any) {
      toast({
        title: '設定失敗',
        description: error.message || '無法設定 Supabase 對應',
        variant: 'destructive',
      });
    }
  };

  if (!worksheet) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            設定 Supabase 表對應
          </DialogTitle>
          <DialogDescription>
            為工作表 "<strong>{worksheet.worksheetName}</strong>" 選擇要同步的 Supabase 表
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!isCreating ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="supabase-table">選擇現有的表</Label>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger id="supabase-table">
                    <SelectValue placeholder={tablesLoading ? "載入中..." : tables.length === 0 ? "無可用的表（可創建新表）" : "選擇 Supabase 表"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tables.length === 0 && !tablesLoading ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        無可用的表，請創建新表
                      </div>
                    ) : (
                      tables.map((table) => (
                        <SelectItem key={table} value={table}>
                          {table}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {tablesError && (
                  <p className="text-sm text-destructive">
                    載入表列表時發生錯誤
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center">
                <span className="text-sm text-muted-foreground">或</span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                創建新表
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="new-table-name">新表名稱</Label>
                <Input
                  id="new-table-name"
                  placeholder="輸入表名稱（例如：worksheet_data）"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  表將使用預設結構建立（id, data, created_at 等）
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsCreating(false);
                  setNewTableName('');
                }}
              >
                取消創建，返回選擇
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setIsCreating(false);
              setNewTableName('');
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={setMappingMutation.isPending || createTableMutation.isPending || (!selectedTable && !newTableName)}
          >
            {setMappingMutation.isPending || createTableMutation.isPending ? '處理中...' : '確認'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

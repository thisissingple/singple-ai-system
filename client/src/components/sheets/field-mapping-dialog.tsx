/**
 * 欄位映射設定對話框
 * 讓使用者手動映射 Google Sheets 欄位到 Supabase 表格欄位
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceId: string;
  onSuccess: () => void;
}

interface FieldMapping {
  googleColumn: string;
  supabaseColumn: string;
}

export function FieldMappingDialog({
  open,
  onOpenChange,
  sourceId,
  onSuccess,
}: FieldMappingDialogProps) {
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [tables, setTables] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [googleColumns, setGoogleColumns] = useState<string[]>([]);
  const [supabaseColumns, setSupabaseColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // 載入工作表列表
  useEffect(() => {
    if (open && sourceId) {
      loadWorksheets();
      loadTables();
    }
  }, [open, sourceId]);

  // 當選擇工作表時,載入欄位
  useEffect(() => {
    if (selectedWorksheet) {
      loadGoogleColumns();
    }
  }, [selectedWorksheet]);

  // 當選擇表格時,載入欄位
  useEffect(() => {
    if (selectedTable) {
      loadSupabaseColumns();
    }
  }, [selectedTable]);

  const loadWorksheets = async () => {
    try {
      const response = await fetch(`/api/sheets/${sourceId}/worksheets`);
      const data = await response.json();
      if (data.success) {
        setWorksheets(data.data);
      }
    } catch (error) {
      console.error('載入工作表失敗:', error);
    }
  };

  const loadTables = async () => {
    try {
      const response = await fetch('/api/supabase/tables');
      const data = await response.json();
      if (data.success) {
        setTables(data.data);
      }
    } catch (error) {
      console.error('載入表格失敗:', error);
    }
  };

  const loadGoogleColumns = async () => {
    try {
      const response = await fetch(
        `/api/sheets/${sourceId}/worksheets/${encodeURIComponent(selectedWorksheet)}/headers`
      );
      const data = await response.json();
      if (data.success) {
        setGoogleColumns(data.data);
      }
    } catch (error) {
      console.error('載入 Google Sheets 欄位失敗:', error);
    }
  };

  const loadSupabaseColumns = async () => {
    try {
      const response = await fetch(`/api/database/tables/${selectedTable}/columns`);
      const data = await response.json();
      // API 回傳格式: { columns: [{ column_name, data_type, ... }] }
      if (data.columns) {
        setSupabaseColumns(data.columns.map((col: any) => col.column_name));
      }
    } catch (error) {
      console.error('載入 Supabase 欄位失敗:', error);
    }
  };

  const handleAddMapping = () => {
    setMappings([...mappings, { googleColumn: '', supabaseColumn: '' }]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (
    index: number,
    field: 'googleColumn' | 'supabaseColumn',
    value: string
  ) => {
    const newMappings = [...mappings];
    newMappings[index][field] = value;
    setMappings(newMappings);
  };

  const handleSubmit = async () => {
    // 驗證
    if (!selectedWorksheet || !selectedTable) {
      toast({
        title: '請選擇工作表和目標表格',
        variant: 'destructive',
      });
      return;
    }

    if (mappings.length === 0) {
      toast({
        title: '請至少新增一個欄位映射',
        variant: 'destructive',
      });
      return;
    }

    // 檢查是否有未完成的映射
    const incompleteMappings = mappings.filter(
      (m) => !m.googleColumn || !m.supabaseColumn
    );
    if (incompleteMappings.length > 0) {
      toast({
        title: '請完成所有欄位映射',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/sheets/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_id: sourceId,
          worksheet_name: selectedWorksheet,
          target_table: selectedTable,
          field_mappings: mappings,
          is_enabled: isEnabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: '儲存成功',
          description: '欄位映射已儲存',
        });
        // 重置表單
        setSelectedWorksheet('');
        setSelectedTable('');
        setMappings([]);
        setIsEnabled(true);
        onSuccess();
      } else {
        throw new Error(data.message || '儲存失敗');
      }
    } catch (error: any) {
      toast({
        title: '儲存失敗',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>設定欄位映射</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 選擇工作表 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Google Sheets 工作表</Label>
              <Select
                value={selectedWorksheet}
                onValueChange={setSelectedWorksheet}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇工作表" />
                </SelectTrigger>
                <SelectContent>
                  {worksheets.map((worksheet) => (
                    <SelectItem key={worksheet} value={worksheet}>
                      {worksheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>目標 Supabase 表格</Label>
              <Select
                value={selectedTable}
                onValueChange={setSelectedTable}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選擇表格" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table} value={table}>
                      {table}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 欄位映射 */}
          {selectedWorksheet && selectedTable && (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>欄位映射</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMapping}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    新增映射
                  </Button>
                </div>

                {mappings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    點擊「新增映射」開始設定欄位對應關係
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappings.map((mapping, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <Select
                            value={mapping.googleColumn}
                            onValueChange={(value) =>
                              handleMappingChange(index, 'googleColumn', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Google Sheets 欄位" />
                            </SelectTrigger>
                            <SelectContent>
                              {googleColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

                        <div className="flex-1">
                          <Select
                            value={mapping.supabaseColumn}
                            onValueChange={(value) =>
                              handleMappingChange(index, 'supabaseColumn', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Supabase 欄位" />
                            </SelectTrigger>
                            <SelectContent>
                              {supabaseColumns.map((col) => (
                                <SelectItem key={col} value={col}>
                                  {col}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMapping(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 啟用開關 */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label>啟用自動同步</Label>
                  <p className="text-sm text-muted-foreground">
                    每天凌晨 2:00 自動同步此映射
                  </p>
                </div>
                <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
              </div>
            </>
          )}
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
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? '儲存中...' : '儲存映射'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
